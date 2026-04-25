
import { GoogleGenAI, Type, GenerateContentResponse, Part, Chat } from '@google/genai';
import { Document, DocumentCategory, Issuance, ReleasedDocument, ReceivedDocument } from '../types';
import { mockFirebaseService } from './mockFirebaseService';

// This function is a helper to convert a File object to a GoogleGenerativeAI.Part
async function fileToGenerativePart(file: File): Promise<Part> {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type,
      },
    };
}

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    console.warn("Gemini API key not found. AI features will not work. Please set the API_KEY environment variable.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY! });


const smartSearchSchema = {
    type: Type.OBJECT,
    properties: {
        matchingDocumentIds: {
            type: Type.ARRAY,
            description: "An array of document IDs that strictly match the user's query.",
            items: { type: Type.STRING }
        }
    }
};

const allFieldsSchema = {
    type: Type.OBJECT,
    properties: {
        // Issuance
        controlNumberSequence: { type: Type.STRING, description: "The control number." },
        releaseDate: { type: Type.STRING, description: "Format as YYYY-MM-DD" },
        releaseTime: { type: Type.STRING, description: "Format as HH:MM" },
        dateOfDocument: { type: Type.STRING, description: "Format as YYYY-MM-DD" },
        headingAddressee: { type: Type.STRING },
        subject: { type: Type.STRING },
        signatory: { type: Type.STRING },
        // Released/Received
        grdsCode: { type: Type.STRING },
        internalCode: { type: Type.STRING },
        documentNo: { type: Type.STRING },
        dateReleased: { type: Type.STRING, description: "Format as YYYY-MM-DD" },
        timeReleased: { type: Type.STRING, description: "Format as HH:MM" },
        typeOfDocument: { type: Type.STRING },
        details: { type: Type.STRING },
        sender: { type: Type.STRING },
        receiver: { type: Type.STRING },
        copyFurnished: { type: Type.STRING },
        receivedBy: { type: Type.STRING },
        dateDelivered: { type: Type.STRING, description: "Format as YYYY-MM-DD" },
        timeDelivered: { type: Type.STRING, description: "Format as HH:MM" },
        // Received only
        senderOffice: { type: Type.STRING },
        remarks: { type: Type.STRING, description: "Any additional remarks." },
    },
};

const categorizationAndExtractionSchema = {
    type: Type.OBJECT,
    properties: {
        category: {
            type: Type.STRING,
            enum: [DocumentCategory.Issuance, DocumentCategory.Released, DocumentCategory.Received]
        },
        data: {
            type: Type.OBJECT,
            properties: allFieldsSchema.properties,
        }
    }
};

const getExtractionSchemaForCategory = (category: DocumentCategory) => {
    let properties = {};
    if (category === DocumentCategory.Issuance) {
        properties = {
            controlNumberSequence: { type: Type.STRING, description: "The control number." },
            releaseDate: { type: Type.STRING, description: "Format as YYYY-MM-DD" },
            releaseTime: { type: Type.STRING, description: "Format as HH:MM" },
            dateOfDocument: { type: Type.STRING, description: "Format as YYYY-MM-DD" },
            headingAddressee: { type: Type.STRING },
            subject: { type: Type.STRING },
            signatory: { type: Type.STRING },
            remarks: { type: Type.STRING },
        };
    } else { // Released or Received
        properties = {
            grdsCode: { type: Type.STRING },
            internalCode: { type: Type.STRING },
            documentNo: { type: Type.STRING },
            dateReleased: { type: Type.STRING, description: "Format as YYYY-MM-DD" },
            timeReleased: { type: Type.STRING, description: "Format as HH:MM" },
            typeOfDocument: { type: Type.STRING },
            dateOfDocument: { type: Type.STRING, description: "Format as YYYY-MM-DD" },
            details: { type: Type.STRING },
            sender: { type: Type.STRING },
            receiver: { type: Type.STRING },
            copyFurnished: { type: Type.STRING },
            receivedBy: { type: Type.STRING },
            dateDelivered: { type: Type.STRING, description: "Format as YYYY-MM-DD" },
            timeDelivered: { type: Type.STRING, description: "Format as HH:MM" },
            remarks: { type: Type.STRING },
            ...(category === DocumentCategory.Received && { senderOffice: { type: Type.STRING } })
        };
    }
    return { type: Type.OBJECT, properties };
};


export const geminiService = {
  smartSearch: async (query: string, documents: Document[]): Promise<string[]> => {
    if (!API_KEY) return [];
    const simplifiedDocs = documents.map(doc => ({
        id: doc.id,
        category: doc.category,
        ...('subject' in doc && { subject: doc.subject }),
        ...('details' in doc && { details: doc.details }),
        ...('tags' in doc && { tags: doc.tags.map(t => t.label) }),
    }));

    const systemInstruction = "You are a search assistant for a records management system. Analyze the user's query and the provided JSON list of documents. Return only the IDs of the documents that are a clear and direct match to the query. Do not infer or guess. Be precise.";
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${systemInstruction}\n\nUSER QUERY: "${query}"\n\nDOCUMENTS:\n${JSON.stringify(simplifiedDocs)}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: smartSearchSchema,
        },
    });

    try {
        const json = JSON.parse(response.text);
        return json.matchingDocumentIds || [];
    } catch (e) {
        console.error("Failed to parse Gemini smart search response:", e);
        return [];
    }
  },

  analyzeAndCategorizeDocument: async (file: File): Promise<{ category: DocumentCategory; data: Partial<Document> }> => {
    if (!API_KEY) throw new Error("API key not configured");
    const imagePart = await fileToGenerativePart(file);
    const textPart = {
        text: `Analyze the following document. First, classify it into one of three categories: 'Issuance' (internal memo/order), 'Released' (sent externally), or 'Received' (received from external party). Second, extract all relevant data fields based on its content. Return the result in the specified JSON format.`
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: categorizationAndExtractionSchema,
        },
    });

    try {
        const json = JSON.parse(response.text);
        return {
            category: json.category as DocumentCategory,
            data: json.data || {}
        };
    } catch (e) {
        console.error("Failed to parse Gemini categorization response:", e);
        throw new Error("AI analysis returned invalid format.");
    }
  },
  
  extractDataFromDocument: async (file: File, category: DocumentCategory): Promise<Partial<Document>> => {
    if (!API_KEY) throw new Error("API key not configured");
    const imagePart = await fileToGenerativePart(file);
    const textPart = {
        text: `This document is known to be a '${category}'. Extract all relevant data fields for this category from the document image. Be precise with dates and names. Return the data in the specified JSON format.`
    };
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: getExtractionSchemaForCategory(category),
        },
    });
    
    try {
        const json = JSON.parse(response.text);
        return json;
    } catch (e) {
        console.error("Failed to parse Gemini extraction response:", e);
        throw new Error("AI extraction returned invalid format.");
    }
  },

  summarizeDocument: async (file: File): Promise<string> => {
    if (!API_KEY) throw new Error("API key not configured");
    const imagePart = await fileToGenerativePart(file);
    const textPart = {
        text: `Analyze this document and provide a concise summary. Focus on the key information, decisions, and action items. Present the summary as a short paragraph followed by the most important points as a bulleted list.`
    };
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });
    return response.text;
  },

  startChat: async (): Promise<Chat> => {
    if (!API_KEY) throw new Error("API key not configured");
    const documents = await mockFirebaseService.getDocuments();
    const simplifiedDocs = documents.map(doc => ({
        id: doc.id,
        category: doc.category,
        fileName: doc.fileName,
        createdAt: doc.createdAt,
        ...('subject' in doc && { subject: doc.subject }),
        ...('details' in doc && { details: doc.details }),
        ...('typeOfDocument' in doc && { typeOfDocument: doc.typeOfDocument }),
        ...('tags' in doc && { tags: doc.tags.map(t => t.label) }),
    }));

    const systemInstruction = `You are a helpful and intelligent AI assistant for a Records Management System. Your purpose is to help users find and understand the documents they manage.
    - Be conversational and helpful.
    - When asked to find documents, you can refer to the JSON data provided below. Mention the document ID or file name when referencing a document.
    - If the user's query seems to require information from the public web (like current events or general knowledge), use the search tool to find answers and cite your sources.
    - Here are the documents currently in the system:\n${JSON.stringify(simplifiedDocs, null, 2)}`;

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
        },
    });
    return chat;
  },

  sendMessageStream(chat: Chat, message: string, useGoogleSearch: boolean) {
    if (!API_KEY) throw new Error("API key not configured");
    
    const config: any = {};
    if (useGoogleSearch) {
        config.tools = [{googleSearch: {}}];
    }
    
    return chat.sendMessageStream({
        message,
        config,
    });
  },
};

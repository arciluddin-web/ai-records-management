import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import multer from 'multer';
import { requireAuth } from '../middleware';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const MODEL = 'claude-sonnet-4-6';

const CHAT_SYSTEM = `You are a helpful and intelligent AI assistant for a Records Management System. Your purpose is to help users find and understand the documents they manage.
- Be conversational and helpful.
- When asked to find documents, refer to the document context provided in the conversation.
- Mention the document ID or file name when referencing specific documents.
- Be precise with dates and document details.`;

router.post('/smart-search', requireAuth, async (req, res) => {
  const { query, documents } = req.body;
  if (!query || !documents) return res.status(400).json({ error: 'Missing query or documents' });

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [{
        name: 'return_matching_documents',
        description: 'Return the IDs of documents that match the user query',
        input_schema: {
          type: 'object' as const,
          properties: {
            matchingDocumentIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of document IDs that clearly match the query',
            },
          },
          required: ['matchingDocumentIds'],
        },
      }],
      tool_choice: { type: 'tool', name: 'return_matching_documents' },
      system: 'You are a search assistant for a records management system. Analyze the user\'s query and the provided JSON list of documents. Return only the IDs of the documents that are a clear and direct match to the query. Do not infer or guess. Be precise.',
      messages: [{
        role: 'user',
        content: `USER QUERY: "${query}"\n\nDOCUMENTS:\n${JSON.stringify(documents)}`,
      }],
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (toolUse?.type === 'tool_use') {
      const input = toolUse.input as { matchingDocumentIds: string[] };
      return res.json({ matchingDocumentIds: input.matchingDocumentIds || [] });
    }
    return res.json({ matchingDocumentIds: [] });
  } catch (err) {
    console.error('smart-search error:', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

router.post('/analyze', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileBase64 = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype as Anthropic.Base64ImageSource['media_type'] | 'application/pdf';

  const fileContent = mimeType === 'application/pdf'
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: fileBase64 } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: mimeType as Anthropic.Base64ImageSource['media_type'], data: fileBase64 } };

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      tools: [{
        name: 'categorize_and_extract',
        description: 'Categorize the document and extract its fields',
        input_schema: {
          type: 'object' as const,
          properties: {
            category: { type: 'string', enum: ['Issuance', 'Released', 'Received'] },
            data: {
              type: 'object',
              properties: {
                controlNumberSequence: { type: 'string' },
                releaseDate: { type: 'string', description: 'YYYY-MM-DD' },
                releaseTime: { type: 'string', description: 'HH:MM' },
                dateOfDocument: { type: 'string', description: 'YYYY-MM-DD' },
                headingAddressee: { type: 'string' },
                subject: { type: 'string' },
                signatory: { type: 'string' },
                grdsCode: { type: 'string' },
                internalCode: { type: 'string' },
                documentNo: { type: 'string' },
                dateReleased: { type: 'string', description: 'YYYY-MM-DD' },
                timeReleased: { type: 'string', description: 'HH:MM' },
                typeOfDocument: { type: 'string' },
                details: { type: 'string' },
                sender: { type: 'string' },
                receiver: { type: 'string' },
                copyFurnished: { type: 'string' },
                receivedBy: { type: 'string' },
                dateDelivered: { type: 'string', description: 'YYYY-MM-DD' },
                timeDelivered: { type: 'string', description: 'HH:MM' },
                senderOffice: { type: 'string' },
                remarks: { type: 'string' },
              },
            },
          },
          required: ['category', 'data'],
        },
      }],
      tool_choice: { type: 'tool', name: 'categorize_and_extract' },
      messages: [{
        role: 'user',
        content: [
          fileContent,
          { type: 'text', text: 'Analyze this document. Classify it as Issuance, Released, or Received, then extract all relevant fields.' },
        ],
      }],
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (toolUse?.type === 'tool_use') return res.json(toolUse.input);
    res.status(500).json({ error: 'AI returned unexpected response' });
  } catch (err) {
    console.error('analyze error:', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

router.post('/extract', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Missing category' });

  const fileBase64 = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype as Anthropic.Base64ImageSource['media_type'] | 'application/pdf';

  const fileContent = mimeType === 'application/pdf'
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: fileBase64 } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: mimeType as Anthropic.Base64ImageSource['media_type'], data: fileBase64 } };

  const isIssuance = category === 'Issuance';
  const properties: Record<string, object> = isIssuance
    ? {
        controlNumberSequence: { type: 'string' },
        releaseDate: { type: 'string', description: 'YYYY-MM-DD' },
        releaseTime: { type: 'string', description: 'HH:MM' },
        dateOfDocument: { type: 'string', description: 'YYYY-MM-DD' },
        headingAddressee: { type: 'string' },
        subject: { type: 'string' },
        signatory: { type: 'string' },
        remarks: { type: 'string' },
      }
    : {
        grdsCode: { type: 'string' },
        internalCode: { type: 'string' },
        documentNo: { type: 'string' },
        dateReleased: { type: 'string', description: 'YYYY-MM-DD' },
        timeReleased: { type: 'string', description: 'HH:MM' },
        typeOfDocument: { type: 'string' },
        dateOfDocument: { type: 'string', description: 'YYYY-MM-DD' },
        details: { type: 'string' },
        sender: { type: 'string' },
        receiver: { type: 'string' },
        copyFurnished: { type: 'string' },
        receivedBy: { type: 'string' },
        dateDelivered: { type: 'string', description: 'YYYY-MM-DD' },
        timeDelivered: { type: 'string', description: 'HH:MM' },
        remarks: { type: 'string' },
        ...(category === 'Received' ? { senderOffice: { type: 'string' } } : {}),
      };

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      tools: [{
        name: 'extract_document_data',
        description: `Extract fields from this ${category} document`,
        input_schema: { type: 'object' as const, properties },
      }],
      tool_choice: { type: 'tool', name: 'extract_document_data' },
      messages: [{
        role: 'user',
        content: [
          fileContent,
          { type: 'text', text: `This is a '${category}' document. Extract all relevant fields precisely.` },
        ],
      }],
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (toolUse?.type === 'tool_use') return res.json(toolUse.input);
    res.status(500).json({ error: 'AI returned unexpected response' });
  } catch (err) {
    console.error('extract error:', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

router.post('/summarize', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileBase64 = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype as Anthropic.Base64ImageSource['media_type'] | 'application/pdf';

  const fileContent = mimeType === 'application/pdf'
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: fileBase64 } }
    : { type: 'image' as const, source: { type: 'base64' as const, media_type: mimeType as Anthropic.Base64ImageSource['media_type'], data: fileBase64 } };

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          fileContent,
          { type: 'text', text: 'Analyze this document and provide a concise summary. Focus on key information, decisions, and action items. Write a short paragraph followed by the most important points as a bulleted list.' },
        ],
      }],
    });

    const text = response.content.find(b => b.type === 'text');
    res.json({ summary: text?.type === 'text' ? text.text : '' });
  } catch (err) {
    console.error('summarize error:', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

router.post('/chat', requireAuth, async (req, res) => {
  const { messages, systemContext } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: 'text', text: CHAT_SYSTEM, cache_control: { type: 'ephemeral' } },
  ];
  if (systemContext) {
    systemBlocks.push({ type: 'text', text: systemContext, cache_control: { type: 'ephemeral' } });
  }

  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      system: systemBlocks,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('chat error:', err);
    res.write(`data: ${JSON.stringify({ error: 'AI request failed' })}\n\n`);
    res.end();
  }
});

export default router;

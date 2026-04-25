import { v4 as uuidv4 } from 'uuid';
import { Document, DocumentCategory, Tag, HistoryEntry, Issuance, ReleasedDocument, ReceivedDocument, User } from '../types';

// --- Mock Data ---
export const mockUser: User = {
    uid: 'mock-user-123',
    displayName: 'Jane Doe',
    email: 'jane.doe@example.com',
    photoURL: 'https://picsum.photos/id/237/100/100',
};


let mockDocuments: Document[] = [
    {
        id: 'iss-001',
        category: DocumentCategory.Issuance,
        controlNumberSequence: 'MEMO-2023-08-001',
        subject: 'Q3 Budget Review and Planning',
        signatory: 'John Smith, CFO',
        releaseDate: '2023-08-15',
        releaseTime: '10:00',
        dateOfDocument: '2023-08-14',
        headingAddressee: 'All Department Heads',
        remarks: 'Immediate attention required.',
        tags: [{ label: 'Urgent', color: 'bg-red-500' }, { label: 'Budget', color: 'bg-teal-500' }],
        history: [{ date: '2023-08-15T10:00:00Z', action: 'Created', details: 'Initial creation', user: 'admin@example.com' }],
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        fileName: 'q3-budget-memo.pdf',
        fileMimeType: 'application/pdf',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    },
    {
        id: 'rel-001',
        category: DocumentCategory.Released,
        documentNo: 'PO-2023-582',
        typeOfDocument: 'Purchase Order',
        details: 'Order for new office workstations',
        sender: 'Procurement Dept.',
        receiver: 'Supreme Office Supplies Inc.',
        dateReleased: '2023-08-20',
        tags: [{ label: 'External', color: 'bg-green-500' }],
        history: [{ date: '2023-08-20T14:30:00Z', action: 'Created', details: 'Initial creation', user: 'procurement@example.com' }],
        createdAt: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000).toISOString(),
        grdsCode: 'GRD-123',
        internalCode: 'INT-456',
        timeReleased: '14:30',
        dateOfDocument: '2023-08-20',
        remarks: 'Deliver by end of month.',
        copyFurnished: 'Accounting Dept.',
        receivedBy: '',
        dateDelivered: '',
        timeDelivered: '',
    },
    {
        id: 'rec-001',
        category: DocumentCategory.Received,
        documentNo: 'INV-9876',
        typeOfDocument: 'Invoice',
        details: 'Invoice for catering services',
        sender: 'Gourmet Catering Co.',
        receiver: 'Events Department',
        senderOffice: 'Billing Department',
        dateReleased: '2023-08-18',
        tags: [{ label: 'Invoice', color: 'bg-yellow-500' }],
        history: [{ date: '2023-08-18T09:00:00Z', action: 'Created', details: 'Logged upon receipt', user: 'reception@example.com' }],
        createdAt: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000).toISOString(),
        grdsCode: 'GRD-789',
        internalCode: 'INT-101',
        timeReleased: '09:00',
        dateOfDocument: '2023-08-17',
        remarks: 'Payment due in 30 days.',
        copyFurnished: 'Finance Dept.',
        receivedBy: 'Jane Doe',
        dateDelivered: '2023-08-18',
        timeDelivered: '09:00',
    },
    {
        id: 'iss-002',
        category: DocumentCategory.Issuance,
        controlNumberSequence: 'MEMO-2024-01-001',
        subject: 'New Year Office Protocols',
        signatory: 'HR Department',
        releaseDate: '2024-01-02',
        releaseTime: '11:00',
        dateOfDocument: '2024-01-02',
        headingAddressee: 'All Employees',
        remarks: 'Please read carefully.',
        tags: [{ label: 'Internal', color: 'bg-blue-500' }, { label: 'Memo', color: 'bg-indigo-500' }],
        history: [{ date: new Date().toISOString(), action: 'Created', details: 'Initial creation', user: 'hr@example.com' }],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        fileName: 'ny-protocols.pdf',
        fileMimeType: 'application/pdf',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    },
    {
        id: 'rec-002',
        category: DocumentCategory.Received,
        documentNo: 'TECH-PRO-2024',
        typeOfDocument: 'Project Proposal',
        details: 'Proposal for new CRM system',
        sender: 'Innovate Solutions Ltd.',
        receiver: 'IT Department',
        senderOffice: 'Sales',
        dateReleased: '2024-02-10',
        tags: [{ label: 'Project Proposal', color: 'bg-yellow-500' }],
        history: [{ date: '2024-02-10T11:00:00Z', action: 'Created', details: 'Logged upon receipt', user: 'reception@example.com' }],
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        grdsCode: 'GRD-101',
        internalCode: 'INT-102',
        timeReleased: '11:00',
        dateOfDocument: '2024-02-09',
        remarks: 'For review by CTO.',
        copyFurnished: 'CTO Office',
        receivedBy: 'Mike Ross',
        dateDelivered: '2024-02-10',
        timeDelivered: '11:00',
    },
];

// Simulate a slow network
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


// --- Mock Service ---
export const mockFirebaseService = {
  getDocuments: async (category?: DocumentCategory): Promise<Document[]> => {
    await delay(500);
    // return documents sorted by createdAt date descending
    const sortedDocs = [...mockDocuments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (category) {
      return sortedDocs.filter(doc => doc.category === category);
    }
    return sortedDocs;
  },

  getDocument: async (id: string): Promise<Document | undefined> => {
    await delay(300);
    return mockDocuments.find(doc => doc.id === id);
  },

  addDocument: async (doc: Document, file?: File): Promise<Document> => {
    await delay(700);
    const newDoc = { ...doc };
    if (file) {
      newDoc.fileName = file.name;
      newDoc.fileMimeType = file.type;
      newDoc.fileUrl = URL.createObjectURL(file); // Simulate storage URL
    }
    mockDocuments.unshift(newDoc); // Add to beginning of array
    return newDoc;
  },

  updateDocument: async (id: string, updates: Partial<Document>, file?: File): Promise<Document> => {
    await delay(700);
    let docToUpdate = mockDocuments.find(doc => doc.id === id);
    if (!docToUpdate) {
      throw new Error("Document not found");
    }
    if (file) {
      updates.fileName = file.name;
      updates.fileMimeType = file.type;
      updates.fileUrl = URL.createObjectURL(file); // Simulate new storage URL
    }
    const updatedDoc = { ...docToUpdate, ...updates } as Document;
    mockDocuments = mockDocuments.map(doc => doc.id === id ? updatedDoc : doc);
    return updatedDoc;
  },

  deleteDocument: async (id: string, fileName?: string): Promise<void> => {
    await delay(500);
    // In a real app, you'd also delete from Firebase Storage using fileName
    const initialLength = mockDocuments.length;
    mockDocuments = mockDocuments.filter(doc => doc.id !== id);
    if (mockDocuments.length === initialLength) {
        throw new Error("Document not found");
    }
  },

  deleteMultipleDocuments: async (ids: string[]): Promise<void> => {
    await delay(800);
    const idSet = new Set(ids);
    const initialLength = mockDocuments.length;
    mockDocuments = mockDocuments.filter(doc => !idSet.has(doc.id));
    if (mockDocuments.length !== initialLength - idSet.size) {
        console.warn("Some documents to be deleted were not found.");
    }
  },

  addTagToMultipleDocuments: async (ids: string[], tag: Tag): Promise<void> => {
    await delay(600);
    const idSet = new Set(ids);
    mockDocuments = mockDocuments.map(doc => {
      if (idSet.has(doc.id)) {
        const newDoc = { ...doc };
        const existingTags = newDoc.tags || [];
        if (!existingTags.some(t => t.label.toLowerCase() === tag.label.toLowerCase())) {
          newDoc.tags = [...existingTags, tag];
        }
        return newDoc;
      }
      return doc;
    });
  },
};

// --- Mock Auth ---
let authStateListener: ((user: User | null) => void) | null = null;
let currentMockUser: User | null = sessionStorage.getItem('mockUserLoggedIn') ? mockUser : null;

export const mockAuth = {
    onAuthStateChanged: (listener: (user: User | null) => void): (() => void) => {
        authStateListener = listener;
        // Immediately call listener with current state
        setTimeout(() => listener(currentMockUser), 0);
        
        // Return an unsubscribe function
        return () => {
            authStateListener = null;
        };
    },
    signInWithGoogle: () => {
        currentMockUser = mockUser;
        sessionStorage.setItem('mockUserLoggedIn', 'true');
        if (authStateListener) {
            authStateListener(currentMockUser);
        }
    },
    signOut: () => {
        currentMockUser = null;
        sessionStorage.removeItem('mockUserLoggedIn');
        if (authStateListener) {
            authStateListener(null);
        }
    }
};
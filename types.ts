
export enum DocumentCategory {
  Issuance = 'Issuance',
  Released = 'Released',
  Received = 'Received',
}

export interface Tag {
  label: string;
  color: string;
}

export type HistoryAction = 'Created' | 'Updated' | 'AI Analyzed' | 'AI Categorized';

export interface HistoryEntry {
  date: string;
  action: HistoryAction;
  details: string;
  user: string;
}

export interface BaseDocument {
  id: string;
  category: DocumentCategory;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  tags: Tag[];
  history: HistoryEntry[];
  createdAt: string;
}

export interface Issuance extends BaseDocument {
  category: DocumentCategory.Issuance;
  controlNumberSequence: string;
  releaseDate: string;
  releaseTime: string;
  dateOfDocument: string;
  headingAddressee: string;
  subject: string;
  signatory: string;
  remarks: string;
}

export interface ReleasedDocument extends BaseDocument {
  category: DocumentCategory.Released;
  grdsCode: string;
  internalCode: string;
  documentNo: string;
  dateReleased: string;
  timeReleased: string;
  typeOfDocument: string;
  dateOfDocument: string;
  details: string;
  remarks: string;
  sender: string;
  receiver: string;
  copyFurnished: string;
  receivedBy: string;
  dateDelivered: string;
  timeDelivered: string;
}

export interface ReceivedDocument extends BaseDocument {
  category: DocumentCategory.Received;
  grdsCode: string;
  internalCode: string;
  documentNo: string;
  dateReleased: string;
  timeReleased: string;
  typeOfDocument: string;
  dateOfDocument: string;
  details: string;
  remarks: string;
  sender: string;
  receiver: string;
  copyFurnished: string;
  receivedBy: string;
  dateDelivered: string;
  timeDelivered: string;
  senderOffice: string;
}

export type Document = Issuance | ReleasedDocument | ReceivedDocument;

// Simplified User interface for mock purposes
export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}
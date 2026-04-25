import { Document, DocumentCategory, Tag } from '../types';
import { getAuthToken } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API error');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiService = {
  getDocuments: async (category?: DocumentCategory): Promise<Document[]> => {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiFetch<Document[]>(`/api/documents${query}`);
  },

  getDocument: async (id: string): Promise<Document | undefined> => {
    try {
      return await apiFetch<Document>(`/api/documents/${id}`);
    } catch {
      return undefined;
    }
  },

  addDocument: async (doc: Document, file?: File): Promise<Document> => {
    const created = await apiFetch<Document>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(doc),
    });
    if (file) {
      return apiService.uploadFile(created.id, file);
    }
    return created;
  },

  updateDocument: async (id: string, updates: Partial<Document>, file?: File): Promise<Document> => {
    const updated = await apiFetch<Document>(`/api/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (file) {
      return apiService.uploadFile(id, file);
    }
    return updated;
  },

  deleteDocument: async (id: string, _fileName?: string): Promise<void> => {
    return apiFetch<void>(`/api/documents/${id}`, { method: 'DELETE' });
  },

  deleteMultipleDocuments: async (ids: string[]): Promise<void> => {
    return apiFetch<void>('/api/documents/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  addTagToMultipleDocuments: async (ids: string[], tag: Tag): Promise<void> => {
    return apiFetch<void>('/api/documents/bulk-tag', {
      method: 'POST',
      body: JSON.stringify({ ids, tag }),
    });
  },

  uploadFile: async (documentId: string, file: File): Promise<Document> => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/api/documents/${documentId}/file`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('File upload failed');
    const { fileUrl, fileName, fileMimeType } = await res.json();
    // Return the document with updated file info
    const doc = await apiService.getDocument(documentId);
    return { ...doc!, fileUrl, fileName, fileMimeType };
  },
};

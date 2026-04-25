import { Document, DocumentCategory } from '../types';
import { getAuthToken } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type ChatRole = 'user' | 'assistant';
export interface ChatHistoryMessage { role: ChatRole; content: string; }

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'AI request failed');
  }
  return res.json() as Promise<T>;
}

export const claudeService = {
  smartSearch: async (query: string, documents: Document[]): Promise<string[]> => {
    const simplified = documents.map(doc => ({
      id: doc.id,
      category: doc.category,
      ...('subject' in doc && { subject: doc.subject }),
      ...('details' in doc && { details: doc.details }),
      ...('tags' in doc && { tags: doc.tags.map(t => t.label) }),
    }));
    const result = await apiFetch<{ matchingDocumentIds: string[] }>('/api/ai/smart-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, documents: simplified }),
    });
    return result.matchingDocumentIds || [];
  },

  analyzeAndCategorizeDocument: async (file: File): Promise<{ category: DocumentCategory; data: Partial<Document> }> => {
    const token = getAuthToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/api/ai/analyze`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error('AI analysis failed');
    return res.json();
  },

  extractDataFromDocument: async (file: File, category: DocumentCategory): Promise<Partial<Document>> => {
    const token = getAuthToken();
    const form = new FormData();
    form.append('file', file);
    form.append('category', category);
    const res = await fetch(`${API_URL}/api/ai/extract`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error('AI extraction failed');
    return res.json();
  },

  summarizeDocument: async (file: File): Promise<string> => {
    const token = getAuthToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/api/ai/summarize`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error('AI summarization failed');
    const { summary } = await res.json();
    return summary;
  },

  startChatStream: async (
    messages: ChatHistoryMessage[],
    systemContext: string,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: string) => void,
  ): Promise<void> => {
    const token = getAuthToken();
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages, systemContext }),
      });
    } catch {
      onError('Failed to connect to AI service');
      return;
    }

    if (!res.ok || !res.body) {
      onError('AI service returned an error');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) { onError(parsed.error); return; }
          if (parsed.text) onChunk(parsed.text);
        } catch { /* ignore malformed chunk */ }
      }
    }
    onDone();
  },
};

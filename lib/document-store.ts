// Simple store for sharing document state between components
import { create } from 'zustand';

interface DocumentState {
  content: string;
  fileName: string;
  summary: string | null;
  setDocument: (content: string, fileName: string) => void;
  setSummary: (summary: string) => void;
  clearDocument: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  content: '',
  fileName: '',
  summary: null,
  setDocument: (content, fileName) => set({ content, fileName }),
  setSummary: (summary) => set({ summary }),
  clearDocument: () => set({ content: '', fileName: '', summary: null }),
}));

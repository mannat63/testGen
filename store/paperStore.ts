import { create } from 'zustand';

interface PaperState {
  generatedPaperHtml: string | null;
  config: any | null;
  setPaper: (html: string, config: any) => void;
  clearPaper: () => void;
}

export const usePaperStore = create<PaperState>((set) => ({
  generatedPaperHtml: null,
  config: null,
  setPaper: (html, config) => set({ generatedPaperHtml: html, config }),
  clearPaper: () => set({ generatedPaperHtml: null }),
}));

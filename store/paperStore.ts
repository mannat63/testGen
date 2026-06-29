import { create } from 'zustand';

interface PaperConfig {
  board: string;
  class_grade: string;
  subject: string;
  chapters: { chapterId: string; chapterName: string; weightage: number }[];
  sections: any[];
  difficulty: { easy: number; medium: number; hard: number };
  totalMarks: number;
  duration: number;
  language: string;
  schoolName: string;
  examName: string;
  examDate: string;
  examDuration: string;
  numSets: number;
  sourceMix?: { questionBank: number; coaching: number; ai: number };
}

interface PaperState {
  generatedPapers: string[];
  generatedPaperHtml: string | null;
  config: PaperConfig | null;
  lastUsedConfig: PaperConfig | null;
  setPapers: (htmls: string[], config: PaperConfig) => void;
  setPaper: (html: string, config: PaperConfig) => void;
  clearPaper: () => void;
  resetConfig: () => void;
}

export const usePaperStore = create<PaperState>((set) => ({
  generatedPapers: [],
  generatedPaperHtml: null,
  config: null,
  lastUsedConfig: null,
  setPapers: (htmls, config) => set({
    generatedPapers: htmls,
    generatedPaperHtml: htmls[0] || null,
    config,
    lastUsedConfig: config,
  }),
  setPaper: (html, config) => set({
    generatedPapers: [html],
    generatedPaperHtml: html,
    config,
    lastUsedConfig: config,
  }),
  clearPaper: () => set({
    generatedPapers: [],
    generatedPaperHtml: null,
    config: null,
  }),
  resetConfig: () => set({
    generatedPapers: [],
    generatedPaperHtml: null,
    config: null,
    lastUsedConfig: null,
  }),
}));

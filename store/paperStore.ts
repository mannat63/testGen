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
  answerKeys: string[];
  generatedPaperHtml: string | null;
  config: PaperConfig | null;
  lastUsedConfig: PaperConfig | null;
  setPapers: (htmls: string[], config: PaperConfig, answerKeys?: string[]) => void;
  setPaper: (html: string, config: PaperConfig) => void;
  clearPaper: () => void;
  resetConfig: () => void;
}

export const usePaperStore = create<PaperState>((set) => ({
  generatedPapers: [],
  answerKeys: [],
  generatedPaperHtml: null,
  config: null,
  lastUsedConfig: null,
  setPapers: (htmls, config, answerKeys) => set({
    generatedPapers: htmls,
    answerKeys: answerKeys || [],
    generatedPaperHtml: htmls[0] || null,
    config,
    lastUsedConfig: config,
  }),
  setPaper: (html, config) => set({
    generatedPapers: [html],
    answerKeys: [],
    generatedPaperHtml: html,
    config,
    lastUsedConfig: config,
  }),
  clearPaper: () => set({
    generatedPapers: [],
    answerKeys: [],
    generatedPaperHtml: null,
    config: null,
  }),
  resetConfig: () => set({
    generatedPapers: [],
    answerKeys: [],
    generatedPaperHtml: null,
    config: null,
    lastUsedConfig: null,
  }),
}));

import { create } from 'zustand';
import type { ValidationReport } from '@/lib/validatePaper';

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
  validation: ValidationReport | null;
  generatedPaperHtml: string | null;
  config: PaperConfig | null;
  lastUsedConfig: PaperConfig | null;
  setPapers: (htmls: string[], config: PaperConfig, answerKeys?: string[], validation?: ValidationReport | null) => void;
  setPaper: (html: string, config: PaperConfig) => void;
  setValidation: (validation: ValidationReport | null) => void;
  clearPaper: () => void;
  resetConfig: () => void;
}

export const usePaperStore = create<PaperState>((set) => ({
  generatedPapers: [],
  answerKeys: [],
  validation: null,
  generatedPaperHtml: null,
  config: null,
  lastUsedConfig: null,
  setPapers: (htmls, config, answerKeys, validation) => set({
    generatedPapers: htmls,
    answerKeys: answerKeys || [],
    validation: validation || null,
    generatedPaperHtml: htmls[0] || null,
    config,
    lastUsedConfig: config,
  }),
  setPaper: (html, config) => set({
    generatedPapers: [html],
    answerKeys: [],
    validation: null,
    generatedPaperHtml: html,
    config,
    lastUsedConfig: config,
  }),
  setValidation: (validation) => set({ validation }),
  clearPaper: () => set({
    generatedPapers: [],
    answerKeys: [],
    validation: null,
    generatedPaperHtml: null,
    config: null,
  }),
  resetConfig: () => set({
    generatedPapers: [],
    answerKeys: [],
    validation: null,
    generatedPaperHtml: null,
    config: null,
    lastUsedConfig: null,
  }),
}));

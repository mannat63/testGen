import { PaperPlan, QuestionSlot } from './paperAlgorithm';

export interface SourceMix {
  questionBank: number;
  coaching: number;
  ai: number;
}

export interface PromptConfig {
  board: string;
  class_grade: string;
  subject: string;
  chapters: { chapterId: string; chapterName: string; weightage: number }[];
  sections: {
    name: string;
    questionTypes: { type: string; label: string; marksEach: number; count: number; negativeMarking?: number }[];
  }[];
  difficulty: { easy: number; medium: number; hard: number };
  totalMarks: number;
  duration: number;
  language: string;
  schoolName: string;
  examName: string;
  examDate: string;
  examDuration: string;
  numSets: number;
  setLabel?: string;
  sourceMix?: SourceMix;
}

const TYPE_SHORT: Record<string, string> = {
  mcq: 'MCQ',
  sa1: 'SA',
  sa2: 'SA',
  la: 'LA',
  numerical: 'NUM',
  case_study: 'CASE',
  assertion_reason: 'AR',
};

export const TOKEN_BUDGET: Record<string, number> = {
  mcq: 110,
  sa1: 55,
  sa2: 70,
  la: 180,
  numerical: 70,
  case_study: 280,
  assertion_reason: 130,
};

export interface ReferenceQuestion {
  question: string;
  type: string;
  difficulty: string;
}

/**
 * Build prompt for only the AI-needed slots.
 * `aiSlotIndices` tells which slots in the plan need LLM generation.
 * `referenceQuestions` provides sample questions from the DB for style matching.
 */
export function generateTestPrompt(
  config: PromptConfig,
  plan: PaperPlan,
  aiSlotIndices?: number[],
  referenceQuestions?: Map<string, ReferenceQuestion[]>,
): string {
  const allSlots: QuestionSlot[] = plan.sections.flatMap(s => s.slots);

  const slotsToGenerate = aiSlotIndices
    ? aiSlotIndices.map(i => allSlots[i])
    : allSlots;

  if (slotsToGenerate.length === 0) return '';

  const uniqueChapters = [...new Set(slotsToGenerate.map(sl => sl.chapterName))];
  const chapterMap: Record<string, string> = {};
  uniqueChapters.forEach((ch, i) => { chapterMap[ch] = `C${i + 1}`; });
  const chapterIndex = uniqueChapters.map((ch, i) => `C${i + 1}=${ch}`).join('; ');

  let qList = '';
  slotsToGenerate.forEach((slot, i) => {
    const cKey = chapterMap[slot.chapterName] || 'C1';
    const type = TYPE_SHORT[slot.questionType] || slot.questionType.toUpperCase();
    const diff = slot.difficulty[0].toUpperCase();
    qList += `Q${i + 1}. ${type}[${cKey},${diff}]\n`;
  });

  // Build reference section from DB questions for AI curation
  let refSection = '';
  if (referenceQuestions && referenceQuestions.size > 0) {
    const refLines: string[] = [];
    for (const chapter of uniqueChapters) {
      const refs = referenceQuestions.get(chapter);
      if (!refs || refs.length === 0) continue;
      const cKey = chapterMap[chapter];
      for (const ref of refs) {
        refLines.push(`[${cKey}/${ref.type || '?'}/${ref.difficulty || '?'}] ${ref.question}`);
      }
    }
    if (refLines.length > 0) {
      refSection = `\nReference questions from the question bank (match this style, difficulty level, and academic rigor):\n${refLines.join('\n')}\n`;
    }
  }

  const classText = config.class_grade.toLowerCase().startsWith('class') ? config.class_grade : `Class ${config.class_grade}`;
  return `${config.board} ${config.subject} ${classText} question paper setter.
Write ONLY question text. No marks, no answers, no section headers.

Types: MCQ=question+(a)(b)(c)(d) | SA=short answer | LA=long answer | NUM=numerical with units | AR=Assertion+Reason+(a)(b)(c)(d) | CASE=passage+sub-questions

Chapters: ${chapterIndex}
Difficulty: E=easy M=medium H=hard
${refSection}
Please generate ALL ${slotsToGenerate.length} questions listed below:
${qList}
Rules:
- Begin with Q1. exactly. No preamble.
- You MUST generate all ${slotsToGenerate.length} questions. Do not stop early.
- MCQ/AR: options on new lines labelled (a)(b)(c)(d)
- Match specified chapter and difficulty
- ${config.board}-standard exam quality${refSection ? '\n- Match the style and academic standard of the reference questions above' : ''}
- NO answers, NO answer keys, NO marks`;
}

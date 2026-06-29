import { Chapter } from '@/config/chapters';
import { PaperSection } from '@/config/examPatterns';

export interface ChapterSelection {
  chapter: Chapter;
  weightage: number;
}

export interface QuestionSlot {
  chapterName: string;
  chapterId: string;
  questionType: string;
  marksEach: number;
  difficulty: 'easy' | 'medium' | 'hard';
  sectionName: string;
  originalIndex?: number;
}

export interface PaperPlan {
  sections: {
    name: string;
    slots: QuestionSlot[];
  }[];
  totalMarks: number;
  totalQuestions: number;
}

export function buildPaperPlan(
  chapters: ChapterSelection[],
  sections: PaperSection[],
  difficultyDist: { easy: number; medium: number; hard: number },
): PaperPlan {
  const totalWeightage = chapters.reduce((s, c) => s + c.weightage, 0);
  if (totalWeightage === 0 || chapters.length === 0) {
    throw new Error('No chapters selected');
  }

  const chapterWeights = chapters.map(c => ({
    ...c,
    normalizedWeight: c.weightage / totalWeightage,
  }));

  const planSections: PaperPlan['sections'] = [];
  let totalMarks = 0;
  let totalQuestions = 0;

  for (const section of sections) {
    const slots: QuestionSlot[] = [];

    for (const qt of section.questionTypes) {
      const questionCount = qt.count;
      const distributed = distributeToChapters(questionCount, chapterWeights);

      for (const { chapter, count } of distributed) {
        for (let i = 0; i < count; i++) {
          const diff = pickDifficulty(difficultyDist, slots.length + totalQuestions);
          slots.push({
            chapterName: chapter.chapter.name,
            chapterId: chapter.chapter.id,
            questionType: qt.type,
            marksEach: qt.marksEach,
            difficulty: diff,
            sectionName: section.name,
          });
        }
      }
    }

    totalMarks += slots.reduce((s, sl) => s + sl.marksEach, 0);
    totalQuestions += slots.length;
    planSections.push({ name: section.name, slots });
  }

  let idx = 0;
  for (const sec of planSections) {
    for (const slot of sec.slots) {
      slot.originalIndex = idx++;
    }
  }

  return { sections: planSections, totalMarks, totalQuestions };
}

function distributeToChapters(
  totalCount: number,
  chapters: (ChapterSelection & { normalizedWeight: number })[],
): { chapter: ChapterSelection & { normalizedWeight: number }; count: number }[] {
  if (chapters.length === 0) return [];

  const rawCounts = chapters.map(c => ({
    chapter: c,
    raw: c.normalizedWeight * totalCount,
    count: 0,
  }));

  rawCounts.forEach(r => { r.count = Math.floor(r.raw); });

  let assigned = rawCounts.reduce((s, r) => s + r.count, 0);
  const remainders = rawCounts
    .map((r, i) => ({ index: i, remainder: r.raw - r.count }))
    .sort((a, b) => b.remainder - a.remainder);

  let idx = 0;
  while (assigned < totalCount) {
    rawCounts[remainders[idx % remainders.length].index].count++;
    assigned++;
    idx++;
  }

  return rawCounts.filter(r => r.count > 0).map(r => ({
    chapter: r.chapter,
    count: r.count,
  }));
}

function pickDifficulty(
  dist: { easy: number; medium: number; hard: number },
  index: number,
): 'easy' | 'medium' | 'hard' {
  const total = dist.easy + dist.medium + dist.hard;
  if (total === 0) return 'medium';
  const easySlots = dist.easy / total;
  const mediumSlots = dist.medium / total;
  const cycleLen = 100;
  const pos = index % cycleLen;
  const easyEnd = Math.round(easySlots * cycleLen);
  const medEnd = easyEnd + Math.round(mediumSlots * cycleLen);

  if (pos < easyEnd) return 'easy';
  if (pos < medEnd) return 'medium';
  return 'hard';
}

export function generateSetVariants(plan: PaperPlan, setCount: number): PaperPlan[] {
  if (setCount <= 1) return [plan];

  const sets: PaperPlan[] = [];
  for (let s = 0; s < setCount; s++) {
    const variant: PaperPlan = {
      totalMarks: plan.totalMarks,
      totalQuestions: plan.totalQuestions,
      sections: plan.sections.map(sec => ({
        name: sec.name,
        slots: shuffleWithSeed([...sec.slots], s + 1),
      })),
    };
    sets.push(variant);
  }
  return sets;
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function estimateSolvingTime(questionType: string, difficulty: string): number {
  const baseTimes: Record<string, number> = {
    mcq: 1.5,
    sa1: 4,
    sa2: 6,
    la: 12,
    numerical: 5,
    case_study: 8,
    assertion_reason: 2,
  };
  const diffMult: Record<string, number> = { easy: 0.8, medium: 1.0, hard: 1.3 };
  const base = baseTimes[questionType] || 3;
  const mult = diffMult[difficulty] || 1.0;
  return Math.round(base * mult * 10) / 10;
}

export function difficultyScore(difficulty: string): number {
  const scores: Record<string, number> = { easy: 2, medium: 5, hard: 8 };
  return scores[difficulty] || 5;
}

export interface QuestionTypeSpec {
  type: 'mcq' | 'sa1' | 'sa2' | 'la' | 'numerical' | 'case_study' | 'assertion_reason';
  label: string;
  marksEach: number;
  count: number;
  negativeMarking?: number;
}

export interface PaperSection {
  name: string;
  questionTypes: QuestionTypeSpec[];
}

export interface ExamPattern {
  id: string;
  name: string;
  totalMarks: number;
  duration: number;
  sections: PaperSection[];
}

export const EXAM_PATTERNS: Record<string, ExamPattern> = {
  'GSEB-12': {
    id: 'GSEB-12',
    name: 'GSEB Class 12 Board Pattern',
    totalMarks: 100,
    duration: 180,
    sections: [
      {
        name: 'Part A — MCQ (OMR Sheet)',
        questionTypes: [
          { type: 'mcq', label: 'MCQ', marksEach: 1, count: 50 },
        ],
      },
      {
        name: 'Part B — Descriptive',
        questionTypes: [
          { type: 'sa1', label: 'Short Answer I', marksEach: 2, count: 8 },
          { type: 'sa2', label: 'Short Answer II', marksEach: 3, count: 6 },
          { type: 'la', label: 'Long Answer', marksEach: 4, count: 4 },
        ],
      },
    ],
  },

  'GSEB-11': {
    id: 'GSEB-11',
    name: 'GSEB Class 11 Internal Pattern',
    totalMarks: 100,
    duration: 180,
    sections: [
      {
        name: 'Section A — MCQ',
        questionTypes: [
          { type: 'mcq', label: 'MCQ', marksEach: 1, count: 20 },
        ],
      },
      {
        name: 'Section B — Short Answer',
        questionTypes: [
          { type: 'sa1', label: 'Short Answer I', marksEach: 2, count: 10 },
          { type: 'sa2', label: 'Short Answer II', marksEach: 3, count: 8 },
        ],
      },
      {
        name: 'Section C — Long Answer',
        questionTypes: [
          { type: 'la', label: 'Long Answer', marksEach: 5, count: 6 },
        ],
      },
    ],
  },

  'CBSE-12-Physics': {
    id: 'CBSE-12-Physics',
    name: 'CBSE Class 12 Physics Pattern',
    totalMarks: 70,
    duration: 180,
    sections: [
      {
        name: 'Section A — MCQ',
        questionTypes: [
          { type: 'mcq', label: 'MCQ', marksEach: 1, count: 16 },
        ],
      },
      {
        name: 'Section B — Short Answer I',
        questionTypes: [
          { type: 'sa1', label: 'Short Answer (2 marks)', marksEach: 2, count: 5 },
        ],
      },
      {
        name: 'Section C — Short Answer II',
        questionTypes: [
          { type: 'sa2', label: 'Short Answer (3 marks)', marksEach: 3, count: 7 },
        ],
      },
      {
        name: 'Section D — Case Study',
        questionTypes: [
          { type: 'case_study', label: 'Case-Based', marksEach: 4, count: 2 },
        ],
      },
      {
        name: 'Section E — Long Answer',
        questionTypes: [
          { type: 'la', label: 'Long Answer', marksEach: 5, count: 3 },
        ],
      },
    ],
  },

  'CBSE-12-Chemistry': {
    id: 'CBSE-12-Chemistry',
    name: 'CBSE Class 12 Chemistry Pattern',
    totalMarks: 70,
    duration: 180,
    sections: [
      {
        name: 'Section A — MCQ',
        questionTypes: [{ type: 'mcq', label: 'MCQ', marksEach: 1, count: 16 }],
      },
      {
        name: 'Section B — Short Answer I',
        questionTypes: [{ type: 'sa1', label: 'Short Answer (2 marks)', marksEach: 2, count: 5 }],
      },
      {
        name: 'Section C — Short Answer II',
        questionTypes: [{ type: 'sa2', label: 'Short Answer (3 marks)', marksEach: 3, count: 7 }],
      },
      {
        name: 'Section D — Case Study',
        questionTypes: [{ type: 'case_study', label: 'Case-Based', marksEach: 4, count: 2 }],
      },
      {
        name: 'Section E — Long Answer',
        questionTypes: [{ type: 'la', label: 'Long Answer', marksEach: 5, count: 3 }],
      },
    ],
  },

  'CBSE-12-Mathematics': {
    id: 'CBSE-12-Mathematics',
    name: 'CBSE Class 12 Mathematics Pattern',
    totalMarks: 80,
    duration: 180,
    sections: [
      {
        name: 'Section A — MCQ',
        questionTypes: [{ type: 'mcq', label: 'MCQ', marksEach: 1, count: 20 }],
      },
      {
        name: 'Section B — Very Short Answer',
        questionTypes: [{ type: 'sa1', label: 'VSA (2 marks)', marksEach: 2, count: 5 }],
      },
      {
        name: 'Section C — Short Answer',
        questionTypes: [{ type: 'sa2', label: 'SA (3 marks)', marksEach: 3, count: 6 }],
      },
      {
        name: 'Section D — Long Answer',
        questionTypes: [{ type: 'la', label: 'Long Answer', marksEach: 5, count: 4 }],
      },
      {
        name: 'Section E — Case Study',
        questionTypes: [{ type: 'case_study', label: 'Case-Based', marksEach: 4, count: 3 }],
      },
    ],
  },

  'CBSE-12-Biology': {
    id: 'CBSE-12-Biology',
    name: 'CBSE Class 12 Biology Pattern',
    totalMarks: 70,
    duration: 180,
    sections: [
      {
        name: 'Section A — MCQ',
        questionTypes: [{ type: 'mcq', label: 'MCQ', marksEach: 1, count: 16 }],
      },
      {
        name: 'Section B — Short Answer I',
        questionTypes: [{ type: 'sa1', label: 'Short Answer (2 marks)', marksEach: 2, count: 5 }],
      },
      {
        name: 'Section C — Short Answer II',
        questionTypes: [{ type: 'sa2', label: 'Short Answer (3 marks)', marksEach: 3, count: 7 }],
      },
      {
        name: 'Section D — Case Study',
        questionTypes: [{ type: 'case_study', label: 'Case-Based', marksEach: 4, count: 2 }],
      },
      {
        name: 'Section E — Long Answer',
        questionTypes: [{ type: 'la', label: 'Long Answer', marksEach: 5, count: 3 }],
      },
    ],
  },

  'CBSE-11': {
    id: 'CBSE-11',
    name: 'CBSE Class 11 Internal Pattern',
    totalMarks: 80,
    duration: 180,
    sections: [
      {
        name: 'Section A — MCQ',
        questionTypes: [{ type: 'mcq', label: 'MCQ', marksEach: 1, count: 16 }],
      },
      {
        name: 'Section B — Short Answer I',
        questionTypes: [{ type: 'sa1', label: 'Short Answer (2 marks)', marksEach: 2, count: 6 }],
      },
      {
        name: 'Section C — Short Answer II',
        questionTypes: [{ type: 'sa2', label: 'Short Answer (3 marks)', marksEach: 3, count: 6 }],
      },
      {
        name: 'Section D — Long Answer',
        questionTypes: [{ type: 'la', label: 'Long Answer', marksEach: 5, count: 4 }],
      },
    ],
  },

  'JEE-Main': {
    id: 'JEE-Main',
    name: 'JEE Main (Per Subject)',
    totalMarks: 100,
    duration: 60,
    sections: [
      {
        name: 'Section A — MCQ',
        questionTypes: [
          { type: 'mcq', label: 'MCQ (4 marks, -1 negative)', marksEach: 4, count: 20, negativeMarking: -1 },
        ],
      },
      {
        name: 'Section B — Numerical',
        questionTypes: [
          { type: 'numerical', label: 'Numerical Value', marksEach: 4, count: 5 },
        ],
      },
    ],
  },

  'NEET': {
    id: 'NEET',
    name: 'NEET (Per Subject)',
    totalMarks: 180,
    duration: 50,
    sections: [
      {
        name: 'Section A',
        questionTypes: [
          { type: 'mcq', label: 'MCQ (4 marks, -1 negative)', marksEach: 4, count: 35, negativeMarking: -1 },
        ],
      },
      {
        name: 'Section B (Attempt any 10)',
        questionTypes: [
          { type: 'mcq', label: 'MCQ (4 marks, -1 negative)', marksEach: 4, count: 15, negativeMarking: -1 },
        ],
      },
    ],
  },

  'Weekly-25': {
    id: 'Weekly-25',
    name: 'Weekly Test (25 marks)',
    totalMarks: 25,
    duration: 45,
    sections: [
      {
        name: 'Section A — MCQ',
        questionTypes: [{ type: 'mcq', label: 'MCQ', marksEach: 1, count: 10 }],
      },
      {
        name: 'Section B — Short Answer',
        questionTypes: [{ type: 'sa1', label: 'Short Answer', marksEach: 2, count: 5 }],
      },
      {
        name: 'Section C — Descriptive',
        questionTypes: [{ type: 'sa2', label: 'Descriptive', marksEach: 3, count: 1 }, { type: 'la', label: 'Long', marksEach: 2, count: 1 }],
      },
    ],
  },

  'Monthly-50': {
    id: 'Monthly-50',
    name: 'Monthly Test (50 marks)',
    totalMarks: 50,
    duration: 90,
    sections: [
      {
        name: 'Section A — MCQ',
        questionTypes: [{ type: 'mcq', label: 'MCQ', marksEach: 1, count: 15 }],
      },
      {
        name: 'Section B — Short Answer',
        questionTypes: [
          { type: 'sa1', label: 'Short Answer I', marksEach: 2, count: 5 },
          { type: 'sa2', label: 'Short Answer II', marksEach: 3, count: 5 },
        ],
      },
      {
        name: 'Section C — Long Answer',
        questionTypes: [{ type: 'la', label: 'Long Answer', marksEach: 5, count: 2 }],
      },
    ],
  },

  'Revision-80': {
    id: 'Revision-80',
    name: 'Revision Test (80 marks)',
    totalMarks: 80,
    duration: 150,
    sections: [
      {
        name: 'Section A — MCQ',
        questionTypes: [{ type: 'mcq', label: 'MCQ', marksEach: 1, count: 20 }],
      },
      {
        name: 'Section B — Short Answer',
        questionTypes: [
          { type: 'sa1', label: 'Short Answer I', marksEach: 2, count: 6 },
          { type: 'sa2', label: 'Short Answer II', marksEach: 3, count: 6 },
        ],
      },
      {
        name: 'Section C — Long Answer',
        questionTypes: [{ type: 'la', label: 'Long Answer', marksEach: 5, count: 6 }],
      },
    ],
  },
};

export function getDefaultPattern(board: string, classLevel: string, subject?: string): ExamPattern | null {
  const classNum = classLevel.replace(/\D/g, '');

  if (board === 'JEE') return EXAM_PATTERNS['JEE-Main'];
  if (board === 'NEET') return EXAM_PATTERNS['NEET'];

  if (board === 'CBSE' && classNum === '12' && subject) {
    const key = `CBSE-12-${subject}`;
    if (EXAM_PATTERNS[key]) return EXAM_PATTERNS[key];
  }
  if (board === 'CBSE' && classNum === '11') return EXAM_PATTERNS['CBSE-11'];
  if (board === 'CBSE' && classNum === '12') return EXAM_PATTERNS['CBSE-12-Physics'];

  if (board === 'GSEB' && classNum === '12') return EXAM_PATTERNS['GSEB-12'];
  if (board === 'GSEB' && classNum === '11') return EXAM_PATTERNS['GSEB-11'];

  return EXAM_PATTERNS['CBSE-11'];
}

export function computePatternTotal(pattern: ExamPattern): number {
  return pattern.sections.reduce((sum, sec) =>
    sum + sec.questionTypes.reduce((s, qt) => s + qt.marksEach * qt.count, 0), 0);
}

export function computePatternQuestionCount(pattern: ExamPattern): number {
  return pattern.sections.reduce((sum, sec) =>
    sum + sec.questionTypes.reduce((s, qt) => s + qt.count, 0), 0);
}

export const QUESTION_TYPE_OPTIONS: { value: QuestionTypeSpec['type']; label: string }[] = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'sa1', label: 'Short Answer (2-mark)' },
  { value: 'sa2', label: 'Short Answer (3-mark)' },
  { value: 'la', label: 'Long Answer (5-mark)' },
  { value: 'numerical', label: 'Numerical' },
  { value: 'case_study', label: 'Case-Based' },
  { value: 'assertion_reason', label: 'Assertion-Reason' },
];

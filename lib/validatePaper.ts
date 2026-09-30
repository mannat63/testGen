import { PromptConfig } from './generatePrompt';

export interface ValidationIssue {
  qNum: number;
  severity: 'error' | 'warning';
  category: string;
  message: string;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  totalChecked: number;
  errorCount: number;
  warningCount: number;
  passed: boolean;
}

export interface ValidationInput {
  qNum: number;
  text: string;
  questionType: string;
  chapterName: string;
  difficulty: string;
  marksEach: number;
  source: string;
}

const FALLBACK_MARKERS = ['[question could not', '[question not generated', 'add manually'];
const CHOICE_TYPES = new Set(['mcq', 'assertion_reason']);

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([a-d]\)/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractOptions(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^(\([a-dA-D]\)|[a-dA-D][\.\)])\s*/.test(l));
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter(w => w.length > 2));
  const setB = new Set(b.split(' ').filter(w => w.length > 2));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Deterministic structural validation — no LLM, fast, reliable.
 * Catches empty questions, malformed MCQs, duplicate options,
 * near-duplicate questions across the paper, and broken numericals.
 */
export function validateStructure(questions: ValidationInput[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const normalizedTexts: { qNum: number; norm: string }[] = [];

  for (const q of questions) {
    const text = (q.text || '').trim();
    const lowerText = text.toLowerCase();

    // Empty or fallback placeholder
    if (!text || FALLBACK_MARKERS.some(marker => lowerText.includes(marker))) {
      issues.push({
        qNum: q.qNum,
        severity: 'error',
        category: 'missing',
        message: 'Question text is empty or failed to generate.',
      });
      continue;
    }

    // Too short to be a real question
    if (text.length < 10) {
      issues.push({
        qNum: q.qNum,
        severity: 'error',
        category: 'too-short',
        message: 'Question text is suspiciously short.',
      });
    }

    // MCQ / Assertion-Reason must have options
    if (CHOICE_TYPES.has(q.questionType)) {
      const options = extractOptions(text);
      if (options.length < 2) {
        issues.push({
          qNum: q.qNum,
          severity: 'error',
          category: 'missing-options',
          message: `${q.questionType.toUpperCase()} has ${options.length} option(s); expected 4.`,
        });
      } else if (options.length < 4) {
        issues.push({
          qNum: q.qNum,
          severity: 'warning',
          category: 'few-options',
          message: `${q.questionType.toUpperCase()} has only ${options.length} options (expected 4).`,
        });
      }

      // Duplicate option text
      const optTexts = options.map(o => o.replace(/^(\([a-dA-D]\)|[a-dA-D][\.\)])\s*/, '').trim().toLowerCase());
      const seen = new Set<string>();
      let hasDup = false;
      for (const ot of optTexts) {
        if (ot && seen.has(ot)) hasDup = true;
        seen.add(ot);
      }
      if (hasDup) {
        issues.push({
          qNum: q.qNum,
          severity: 'error',
          category: 'duplicate-options',
          message: 'Two or more answer options are identical.',
        });
      }
    }

    // Numerical questions should contain at least one number
    if (q.questionType === 'numerical' && !/\d/.test(text)) {
      issues.push({
        qNum: q.qNum,
        severity: 'warning',
        category: 'numerical-no-number',
        message: 'Numerical question contains no numeric values.',
      });
    }

    normalizedTexts.push({ qNum: q.qNum, norm: normalizeForCompare(text) });
  }

  // Near-duplicate question detection across the paper
  for (let i = 0; i < normalizedTexts.length; i++) {
    for (let j = i + 1; j < normalizedTexts.length; j++) {
      const a = normalizedTexts[i];
      const b = normalizedTexts[j];
      if (!a.norm || !b.norm) continue;

      if (a.norm === b.norm) {
        issues.push({
          qNum: b.qNum,
          severity: 'error',
          category: 'duplicate',
          message: `Identical to Q${a.qNum}.`,
        });
      } else if (jaccardSimilarity(a.norm, b.norm) >= 0.8) {
        issues.push({
          qNum: b.qNum,
          severity: 'warning',
          category: 'near-duplicate',
          message: `Very similar to Q${a.qNum} — may test the same concept.`,
        });
      }
    }
  }

  return issues;
}

export function buildValidationReport(issues: ValidationIssue[], totalChecked: number): ValidationReport {
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  return {
    issues: issues.sort((a, b) => a.qNum - b.qNum),
    totalChecked,
    errorCount,
    warningCount,
    passed: errorCount === 0,
  };
}

/**
 * Build a prompt for LLM-based semantic validation of AI-generated questions.
 * Checks chapter fit and ambiguity — issues deterministic checks can't catch.
 */
export function buildSemanticValidationPrompt(
  config: PromptConfig,
  questions: ValidationInput[],
): string {
  if (questions.length === 0) return '';

  const classText = config.class_grade.toLowerCase().startsWith('class') ? config.class_grade : `Class ${config.class_grade}`;

  let qList = '';
  for (const q of questions) {
    const truncated = q.text.length > 250 ? q.text.substring(0, 250) + '...' : q.text;
    qList += `Q${q.qNum} [assigned chapter: ${q.chapterName}]: ${truncated.replace(/\n/g, ' ')}\n\n`;
  }

  return `You are a ${config.board} ${config.subject} ${classText} exam reviewer.
Review each question below. Report ONLY questions that have a clear problem:
- WRONG_CHAPTER: question does not belong to its assigned chapter
- AMBIGUOUS: question is unclear, unanswerable, or has no correct answer
- OFF_SYLLABUS: content is above or below ${classText} level

${qList}
Respond with ONE line per problematic question in this exact format:
Q<number>|<PROBLEM_CODE>|<brief reason under 12 words>

If a question is fine, do NOT list it. If ALL questions are fine, respond with exactly: OK`;
}

export function parseSemanticValidation(rawText: string, validQNums: Set<number>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (/^\s*OK\s*$/i.test(rawText.trim())) return issues;

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const CATEGORY_MAP: Record<string, string> = {
    WRONG_CHAPTER: 'chapter-mismatch',
    AMBIGUOUS: 'ambiguous',
    OFF_SYLLABUS: 'off-syllabus',
  };

  for (const line of lines) {
    const m = line.match(/Q\.?\s*(\d+)\s*[|\-:]\s*([A-Z_]+)\s*[|\-:]\s*(.+)/i);
    if (!m) continue;
    const qNum = parseInt(m[1]);
    if (!validQNums.has(qNum)) continue;
    const code = m[2].toUpperCase();
    const category = CATEGORY_MAP[code] || 'quality';
    issues.push({
      qNum,
      severity: category === 'chapter-mismatch' ? 'error' : 'warning',
      category,
      message: m[3].trim(),
    });
  }

  return issues;
}

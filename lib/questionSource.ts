import { QuestionSlot, PaperPlan } from './paperAlgorithm';
import { getCommonDBModel } from '@/models/CommonDB';

export interface SourcedQuestion {
  text: string;
  source: string;
}

export interface SourceMix {
  questionBank: number;
  coaching: number;
  ai: number;
}

const STOP_WORDS = new Set([
  'and', 'the', 'of', 'for', 'with', 'from', 'in', 'on', 'its', 'an', 'a',
  'to', 'at', 'by', 'is', 'are', 'was', 'be', 'as', 'or', 'not',
]);

const SUBJECT_ALIASES: Record<string, string[]> = {
  'Physics':     ['physics', 'phy'],
  'Chemistry':   ['chemistry', 'chem'],
  'Biology':     ['biology', 'bio'],
  'Mathematics': ['mathematics', 'maths', 'math'],
  'English':     ['english', 'eng'],
};

const TYPE_PATTERNS: Record<string, RegExp> = {
  mcq:              /^(mcq|multiple.?choice|objective)$/i,
  sa1:              /^(short.?answer|sa[12]?|vsa|very.?short|subjective_2m|subjective_1m)$/i,
  sa2:              /^(short.?answer|sa[12]?|short.?answer.?ii|subjective_3m)$/i,
  la:               /^(long.?answer|la|essay|descriptive|subjective_4m|subjective_5m|subjective_6m|subjective)$/i,
  numerical:        /^(numerical|numeric|num|calculation)$/i,
  case_study:       /^(case.?study|case.?based|passage.?based)$/i,
  assertion_reason: /^(assertion.?reason|ar)$/i,
};

interface NormalizedDoc {
  questionText: string;
  options: string[];
  source: string;
  chapter: string;
  questionType: string;
  difficulty: string;
  marks: number;
}

function normalizeDoc(doc: any): NormalizedDoc {
  let questionText =
    doc.question ?? doc.question_text ?? doc.questionText ?? doc.text ?? doc.content ??
    doc.Question ?? doc.questiontext ?? doc.q ?? doc.stmt ??
    doc.questionStatement ?? doc.body ?? doc.description ?? '';

  if (!questionText) {
    let maxLen = 0;
    for (const [k, v] of Object.entries(doc)) {
      if (
        typeof v === 'string' && v.length > maxLen &&
        !['_id', 'source', 'chapter', 'chapterName', 'topic', 'board', 'subject',
          'difficulty', 'type', 'question_type', 'questionType', 'answer', 'subtopic',
          'createdAt', 'updatedAt'].includes(k)
      ) {
        maxLen = v.length;
        questionText = v;
      }
    }
  }

  const rawOptions = doc.options ?? doc.choices ?? doc.Options ?? doc.mcqOptions ?? [];
  const options: string[] = Array.isArray(rawOptions)
    ? rawOptions.map((o: any) => (typeof o === 'string' ? o : String(o))).filter(Boolean)
    : [];

  const chapter = String(doc.chapter ?? doc.chapterName ?? doc.Chapter ?? doc.unit ?? '').trim();
  const source = String(doc.source ?? doc.Source ?? 'Question Bank');
  const questionType = String(doc.question_type ?? doc.questionType ?? doc.type ?? doc.Type ?? '').trim();
  const difficulty = String(doc.difficulty ?? doc.Difficulty ?? doc.level ?? '').trim().toLowerCase();
  const marks = Number(doc.marks ?? doc.marksEach ?? doc.Marks ?? 0) || 0;

  return { questionText: String(questionText).trim(), options, source, chapter, questionType, difficulty, marks };
}

function chapterKeywords(chapter: string): string[] {
  return chapter
    .toLowerCase()
    .split(/[\s\-,&\/()]+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

function chapterScore(dbChapter: string, targetChapter: string): number {
  const db = dbChapter.toLowerCase().trim();
  const target = targetChapter.toLowerCase().trim();
  if (!db || !target) return 0;
  if (db === target) return 100;
  if (db.includes(target) || target.includes(db)) return 80;

  const targetWords = chapterKeywords(target);
  if (targetWords.length === 0) return 0;
  const dbLower = db;
  const matches = targetWords.filter(w => dbLower.includes(w)).length;
  return Math.round((matches / targetWords.length) * 60);
}

function isTypeMatch(dbType: string, slotType: string): boolean {
  if (!dbType) return false;
  const pattern = TYPE_PATTERNS[slotType];
  if (!pattern) return dbType.toLowerCase() === slotType.toLowerCase();
  return pattern.test(dbType);
}

function extractClassNum(val: any): string {
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val.replace(/\D/g, '');
  return '';
}

/**
 * Broad fetch from common_db: loads all matching board+subject docs once,
 * then does chapter/type/difficulty matching in JS for maximum reliability.
 */
async function fetchFromCommonDB(
  slots: QuestionSlot[],
  board: string,
  subject: string,
  classLevel: string,
  maxCount: number,
  seenIds: Set<string>,
): Promise<Map<number, SourcedQuestion>> {
  const result = new Map<number, SourcedQuestion>();
  if (maxCount <= 0 || slots.length === 0) return result;

  let model: any;
  try {
    model = await getCommonDBModel();
  } catch (e) {
    console.error('[CommonDB] connect error:', e);
    return result;
  }

  // Build a simple, broad query: just board + subject
  const subjectAliases = SUBJECT_ALIASES[subject] || [subject.toLowerCase()];
  const subjectRegex = subjectAliases.join('|');

  let allDocs: any[];
  try {
    allDocs = await model.find({
      board: { $regex: `^${board}$`, $options: 'i' },
      subject: { $regex: subjectRegex, $options: 'i' },
    }).lean();

    console.log(`[CommonDB] Loaded ${allDocs.length} docs for ${board}/${subject}`);
  } catch (e) {
    console.error('[CommonDB] query error:', e);
    return result;
  }

  if (allDocs.length === 0) {
    console.warn(`[CommonDB] No documents found for board="${board}" subject="${subject}"`);
    return result;
  }

  // Normalize all docs once
  const targetClassNum = classLevel.replace(/\D/g, '');
  const normalized = allDocs
    .map(doc => {
      const docId = doc._id ? doc._id.toString() : '';
      if (docId && seenIds.has(docId)) return null;
      const norm = normalizeDoc(doc);
      if (!norm.questionText || norm.questionText.length < 5) return null;

      // Class filter (soft — skip if DB doc has wrong class)
      const docClassNum = extractClassNum(doc.class ?? doc.classLevel ?? doc.class_level ?? '');
      if (targetClassNum && docClassNum && docClassNum !== targetClassNum) return null;

      return { norm, docId, rawDoc: doc };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  console.log(`[CommonDB] ${normalized.length} docs after normalization/class filter`);

  // Group slots by (chapter, questionType) for targeted assignment
  const groups = new Map<string, { chapter: string; qType: string; indices: number[] }>();
  for (let i = 0; i < slots.length; i++) {
    const key = `${slots[i].chapterName}|||${slots[i].questionType}`;
    if (!groups.has(key)) {
      groups.set(key, { chapter: slots[i].chapterName, qType: slots[i].questionType, indices: [] });
    }
    groups.get(key)!.indices.push(i);
  }

  let filled = 0;

  for (const [, group] of groups) {
    if (filled >= maxCount) break;
    const unfilled = group.indices.filter(i => !result.has(i));
    if (unfilled.length === 0) continue;
    const needed = Math.min(unfilled.length, maxCount - filled);

    // Score each normalized doc for this group
    const scored = normalized
      .map(item => {
        if (item.docId && seenIds.has(item.docId)) return null;

        const chapScore = chapterScore(item.norm.chapter, group.chapter);
        if (chapScore < 15) return null;

        let score = chapScore;

        // Type match bonus (+30 for exact match)
        if (isTypeMatch(item.norm.questionType, group.qType)) {
          score += 30;
        } else {
          // If type doesn't match and we have type info, penalize heavily
          if (item.norm.questionType) score -= 20;
        }

        // Difficulty match bonus
        const slotDiff = slots[unfilled[0]]?.difficulty || 'medium';
        if (item.norm.difficulty === slotDiff) score += 10;

        return { ...item, score };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.score >= 20)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) continue;

    // Shuffle within same score tier (Fisher-Yates per tier)
    const tiers = new Map<number, typeof scored>();
    for (const item of scored) {
      if (!tiers.has(item.score)) tiers.set(item.score, []);
      tiers.get(item.score)!.push(item);
    }
    const shuffled: typeof scored = [];
    for (const [, tierItems] of [...tiers.entries()].sort((a, b) => b[0] - a[0])) {
      for (let i = tierItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tierItems[i], tierItems[j]] = [tierItems[j], tierItems[i]];
      }
      shuffled.push(...tierItems);
    }

    let qi = 0;
    for (const slotIdx of unfilled) {
      if (qi >= shuffled.length || filled >= maxCount) break;
      const { norm, docId } = shuffled[qi++];

      let text = norm.questionText.trim();
      if (norm.options.length > 0) {
        const labels = ['(a)', '(b)', '(c)', '(d)'];
        text += '\n' + norm.options
          .map((opt, i) => `${labels[i] ?? `(${String.fromCharCode(97 + i)})`} ${opt}`)
          .join('\n');
      }
      if (!text) continue;

      if (docId) seenIds.add(docId);
      result.set(slotIdx, { text, source: 'Question Bank' });
      filled++;
    }
  }

  console.log(`[CommonDB] Filled ${filled}/${maxCount} slots from DB`);
  return result;
}

/**
 * Fetch reference questions from CommonDB for AI curation.
 */
export async function fetchReferenceQuestions(
  board: string,
  subject: string,
  classLevel: string,
  chapters: string[],
  maxPerChapter: number = 2,
): Promise<Map<string, { question: string; type: string; difficulty: string }[]>> {
  const refs = new Map<string, { question: string; type: string; difficulty: string }[]>();

  try {
    const model = await getCommonDBModel();
    const subjectAliases = SUBJECT_ALIASES[subject] || [subject.toLowerCase()];

    const allDocs = await model.find({
      board: { $regex: `^${board}$`, $options: 'i' },
      subject: { $regex: subjectAliases.join('|'), $options: 'i' },
    }).lean();

    if (allDocs.length === 0) return refs;

    const targetClassNum = classLevel.replace(/\D/g, '');

    for (const chapter of chapters) {
      const matching = allDocs
        .map(doc => {
          const norm = normalizeDoc(doc);
          if (!norm.questionText || norm.questionText.length < 10) return null;

          const docClassNum = extractClassNum(doc.class ?? doc.classLevel ?? '');
          if (targetClassNum && docClassNum && docClassNum !== targetClassNum) return null;

          const score = chapterScore(norm.chapter, chapter);
          if (score < 20) return null;

          return { norm, score };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.score - a.score);

      if (matching.length === 0) continue;

      // Shuffle top matches and pick diverse samples
      const top = matching.slice(0, maxPerChapter * 4);
      for (let i = top.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [top[i], top[j]] = [top[j], top[i]];
      }

      const samples: { question: string; type: string; difficulty: string }[] = [];
      for (const item of top) {
        if (samples.length >= maxPerChapter) break;
        let text = item.norm.questionText;
        if (item.norm.options.length > 0) {
          text += ' | Options: ' + item.norm.options.join(' / ');
        }
        samples.push({
          question: text.substring(0, 200),
          type: item.norm.questionType,
          difficulty: item.norm.difficulty,
        });
      }

      if (samples.length > 0) refs.set(chapter, samples);
    }
  } catch (e) {
    console.error('[CommonDB] reference fetch error:', e);
  }

  return refs;
}

export async function sourceQuestions(
  plan: PaperPlan,
  board: string,
  subject: string,
  sourceMix: SourceMix,
  language: string = 'English',
  classLevel: string = '',
): Promise<(SourcedQuestion | null)[]> {
  const allSlots = plan.sections.flatMap(s => s.slots);
  const total = allSlots.length;
  const result: (SourcedQuestion | null)[] = new Array(total).fill(null);
  const seenIds = new Set<string>();

  const dbCount = Math.round(((sourceMix.questionBank + sourceMix.coaching) / 100) * total);

  if (dbCount > 0) {
    try {
      const dbMap = await fetchFromCommonDB(allSlots, board, subject, classLevel, dbCount, seenIds);
      for (const [idx, q] of dbMap) {
        result[idx] = q;
      }
    } catch (e) {
      console.error('[CommonDB] source error:', e);
    }
  }

  return result;
}

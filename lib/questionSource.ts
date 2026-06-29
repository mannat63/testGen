import { QuestionSlot, PaperPlan } from './paperAlgorithm';
import { getQuestionBankModel } from '@/models/QuestionBank';
import { getCoachingQuestionBankModel } from '@/models/CoachingQuestionBank';

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

const BOARD_ALIASES: Record<string, string[]> = {
  JEE_MAIN: ['jee', 'jee_main', 'jee main', 'jeemain'],
  JEE_ADV:  ['jee', 'jee_adv', 'jee advanced', 'advanced'],
  NEET:     ['neet'],
  CBSE:     ['cbse'],
  GSEB:     ['gseb'],
  ICSE:     ['icse'],
  ISC:      ['isc'],
};

const SUBJECT_ALIASES: Record<string, string[]> = {
  'Physics':     ['physics', 'phy'],
  'Chemistry':   ['chemistry', 'chem'],
  'Biology':     ['biology', 'bio'],
  'Mathematics': ['mathematics', 'maths', 'math'],
  'English':     ['english', 'eng'],
  'History':     ['history', 'hist'],
  'Geography':   ['geography', 'geo'],
  'Economics':   ['economics', 'eco'],
  'Accountancy': ['accountancy', 'accounts'],
};

/**
 * Normalize a raw DB document into a consistent shape.
 * Tries every common field name variant the user might have used.
 * As a last resort, picks the longest string field in the document.
 */
function normalizeDoc(doc: any): { questionText: string; options: string[]; source: string; chapter: string } {
  // Question text — try all common names
  let questionText =
    doc.question_text ?? doc.questionText ?? doc.question ?? doc.text ?? doc.content ??
    doc.Question ?? doc.questiontext ?? doc.q ?? doc.stmt ??
    doc.questionStatement ?? doc.body ?? doc.description ?? '';

  // If still empty, pick the longest string-valued field (heuristic)
  if (!questionText) {
    let maxLen = 0;
    for (const [k, v] of Object.entries(doc)) {
      if (
        typeof v === 'string' &&
        v.length > maxLen &&
        !['_id', 'source', 'chapter', 'chapterName', 'topic', 'board', 'subject', 'difficulty', 'type'].includes(k)
      ) {
        maxLen = v.length;
        questionText = v;
      }
    }
  }

  // Options — try all common names
  const rawOptions =
    doc.options ?? doc.choices ?? doc.answers ?? doc.Options ??
    doc.mcqOptions ?? doc.opts ?? [];

  const options: string[] = Array.isArray(rawOptions)
    ? rawOptions.map((o: any) => (typeof o === 'string' ? o : String(o))).filter(Boolean)
    : [];

  const chapter =
    doc.chapter ?? doc.chapterName ?? doc.Chapter ??
    doc.topic ?? doc.Topic ?? doc.unit ?? doc.Unit ?? '';

  const source = doc.source ?? doc.Source ?? 'Question Bank';

  return { questionText: String(questionText).trim(), options, source, chapter };
}

function boardRegexes(board: string): string[] {
  const aliases = BOARD_ALIASES[board] ?? [board];
  return [...new Set([board, board.toLowerCase(), ...aliases])];
}

function subjectRegexes(subject: string): string[] {
  const key = Object.keys(SUBJECT_ALIASES).find(
    k => k.toLowerCase() === subject.toLowerCase(),
  );
  const aliases = key ? SUBJECT_ALIASES[key] : [];
  return [...new Set([subject, subject.toLowerCase(), ...aliases])];
}

function chapterKeywords(chapter: string): string[] {
  return chapter
    .split(/[\s\-,&\/()]+/)
    .map(w => w.trim())
    .filter(w => w.length >= 4 && !STOP_WORDS.has(w.toLowerCase()));
}

function chapterScore(dbChapter: string, targetChapter: string): number {
  const db = (dbChapter || '').toLowerCase();
  const target = targetChapter.toLowerCase();
  if (!db) return 0;
  if (db === target) return 100;
  if (db.includes(target) || target.includes(db)) return 80;
  const targetWords = target.split(/\s+/).filter(w => w.length >= 4 && !STOP_WORDS.has(w));
  if (targetWords.length === 0) return 0;
  const matches = targetWords.filter(w => db.includes(w)).length;
  return Math.round((matches / targetWords.length) * 60);
}

async function fetchFromBank(
  model: any,
  slots: QuestionSlot[],
  board: string,
  subject: string,
  maxCount: number,
  sourceLabel: string,
  language: string,
  seenIds: Set<string>
): Promise<Map<number, SourcedQuestion>> {
  const result = new Map<number, SourcedQuestion>();
  if (maxCount <= 0 || slots.length === 0) return result;

  // Group slots by chapter
  const chapterGroups: Record<string, number[]> = {};
  for (let i = 0; i < slots.length; i++) {
    const ch = slots[i].chapterName;
    if (!chapterGroups[ch]) chapterGroups[ch] = [];
    chapterGroups[ch].push(i);
  }

  const boardPats = boardRegexes(board);
  const subjectPats = subjectRegexes(subject);

  let filled = 0;

  for (const [chapter, slotIndices] of Object.entries(chapterGroups)) {
    if (filled >= maxCount) break;
    const unfilled = slotIndices.filter(i => !result.has(i));
    if (unfilled.length === 0) continue;

    const needed = Math.min(unfilled.length, maxCount - filled);
    const keywords = chapterKeywords(chapter);

    // Build chapter $or: exact → substring → keywords
    const chapterOr: object[] = [
      { chapter: { $regex: chapter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    ];
    // Also check alternative field names
    const altFields = ['chapterName', 'topic', 'unit', 'Chapter'];
    for (const field of altFields) {
      chapterOr.push({ [field]: { $regex: chapter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } });
    }
    for (const kw of keywords) {
      chapterOr.push({ chapter: { $regex: kw, $options: 'i' } });
      for (const field of altFields) {
        chapterOr.push({ [field]: { $regex: kw, $options: 'i' } });
      }
    }

    // Try first with board+subject+chapter
    const boardOr = boardPats.map(p => ({ board: { $regex: p, $options: 'i' } }));
    const subjectOr = subjectPats.map(p => ({ subject: { $regex: p, $options: 'i' } }));

    let raw: any[] = [];

    const langFilter = language ? { language: { $regex: `^${language}$`, $options: 'i' } } : {};

    try {
      // STRICT FILTER: board + subject + chapter + language
      raw = await model.find({
        $and: [
          { $or: boardOr },
          { $or: subjectOr },
          { $or: chapterOr },
          langFilter
        ],
      }).limit(needed * 6).lean();

    } catch (e) {
      console.error(`[QB] query error for chapter "${chapter}":`, e);
      continue;
    }

    if (raw.length === 0) continue;

    // Normalize and score
    const scored = raw
      .map(doc => {
        const docId = doc._id ? doc._id.toString() : '';
        if (docId && seenIds.has(docId)) return null;

        const norm = normalizeDoc(doc);
        if (!norm.questionText) return null; // skip if no question text
        return {
          norm,
          docId,
          score: chapterScore(norm.chapter || doc.chapter || doc.chapterName || '', chapter),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.score >= 10)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) continue;

    // Shuffle within same score tier to avoid always picking the same question
    const tiers = new Map<number, typeof scored>();
    for (const item of scored) {
      const tier = item.score;
      if (!tiers.has(tier)) tiers.set(tier, []);
      tiers.get(tier)!.push(item);
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
      const { norm } = shuffled[qi++];

      let text = norm.questionText.trim();
      if (norm.options.length > 0) {
        const labels = ['(a)', '(b)', '(c)', '(d)'];
        text += '\n' + norm.options
          .map((opt, i) => `${labels[i] ?? `(${String.fromCharCode(97 + i)})`} ${opt}`)
          .join('\n');
      }

      if (!text) continue;

      if (shuffled[qi - 1].docId) seenIds.add(shuffled[qi - 1].docId);

      const displaySource = (norm.source && norm.source !== 'Question Bank') ? norm.source : sourceLabel;
      result.set(slotIdx, { text, source: displaySource });
      filled++;
    }
  }

  return result;
}

export async function sourceQuestions(
  plan: PaperPlan,
  board: string,
  subject: string,
  sourceMix: SourceMix,
  language: string = 'English',
): Promise<(SourcedQuestion | null)[]> {
  const allSlots = plan.sections.flatMap(s => s.slots);
  const total = allSlots.length;
  const result: (SourcedQuestion | null)[] = new Array(total).fill(null);
  const seenIds = new Set<string>();

  // How many slots each source should fill
  const qbCount = Math.round((sourceMix.questionBank / 100) * total);
  const coachingCount = Math.round((sourceMix.coaching / 100) * total);
  // ai count = whatever remains unfilled

  // Fetch from common question bank
  if (qbCount > 0) {
    try {
      const QBModel = await getQuestionBankModel();
      const qbMap = await fetchFromBank(QBModel, allSlots, board, subject, qbCount, 'Question Bank', language, seenIds);
      for (const [idx, q] of qbMap) {
        result[idx] = q;
      }
    } catch (e) {
      console.error('[QB] connect/fetch error:', e);
    }
  }

  // Fetch from coaching material (private DB, separate connection)
  if (coachingCount > 0) {
    try {
      const CoachingModel = await getCoachingQuestionBankModel();
      // Only pass slots not yet filled
      const remaining = allSlots
        .map((slot, i) => ({ slot, idx: i }))
        .filter(x => !result[x.idx]);
      const coachingSlots = remaining.map(x => x.slot);
      const indexMap = remaining.map(x => x.idx);

      const coachingMap = await fetchFromBank(
        CoachingModel, coachingSlots, board, subject, coachingCount, 'Coaching Material', language, seenIds
      );
      for (const [localIdx, q] of coachingMap) {
        result[indexMap[localIdx]] = q;
      }
    } catch (e) {
      console.error('[Coaching] connect/fetch error:', e);
    }
  }

  return result;
}

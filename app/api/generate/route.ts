import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { currentUser } from '@clerk/nextjs/server';
import { generateTestPrompt, PromptConfig, TOKEN_BUDGET } from '@/lib/generatePrompt';
import { parseQuestions, buildPaperHtml } from '@/lib/formatPaper';
import { buildPaperPlan, generateSetVariants, ChapterSelection } from '@/lib/paperAlgorithm';
import { sourceQuestions, fetchReferenceQuestions, SourcedQuestion } from '@/lib/questionSource';
import { PaperSection } from '@/config/examPatterns';
import { getGenerationLogModel } from '@/models/GenerationLog';

export const maxDuration = 180;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build',
});

const CHUNK_SIZE = 8;
const CHUNK_DELAY_MS = 12_000;

async function generateChunk(
  config: PromptConfig,
  plan: any,
  allSlots: any[],
  chunkIndices: number[],
  refs: Map<string, any[]> | undefined,
): Promise<{ questions: string[]; tokensUsed: number }> {
  const prompt = generateTestPrompt(config, plan, chunkIndices, refs);
  const aiSlots = chunkIndices.map(i => allSlots[i]);
  const estimatedOutput = aiSlots.reduce(
    (sum, slot) => sum + (TOKEN_BUDGET[slot.questionType] ?? 100), 0,
  );
  const max_tokens = Math.min(Math.max(estimatedOutput + 150, 500), 3000);

  let retries = 0;
  while (retries < 3) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens,
        top_p: 1,
      });
      const raw = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;
      return { questions: parseQuestions(raw, chunkIndices.length), tokensUsed };
    } catch (err: any) {
      const status = err?.status;
      const code = err?.error?.code || err?.error?.error?.code;
      const isRateLimit = status === 429 || status === 413 || code === 'rate_limit_exceeded';

      if (isRateLimit) {
        retries++;
        if (retries >= 3) break;
        const waitSec = status === 413 ? 10_000 : 15_000 * retries;
        console.log(`[AI] Rate limited (${status}), waiting ${waitSec / 1000}s before retry ${retries}/3`);
        await new Promise(r => setTimeout(r, waitSec));
      } else {
        throw err;
      }
    }
  }

  const fallback = '[Question could not be generated. Please add manually.]';
  return { questions: new Array(chunkIndices.length).fill(fallback), tokensUsed: 0 };
}

export async function POST(req: Request) {
  try {
    const config: PromptConfig = await req.json();
    const user = await currentUser();

    const chapterSelections: ChapterSelection[] = config.chapters.map(c => ({
      chapter: { id: c.chapterId, name: c.chapterName, defaultMarks: c.weightage },
      weightage: c.weightage,
    }));

    const sections = config.sections as PaperSection[];
    const difficulty = config.difficulty || { easy: 30, medium: 50, hard: 20 };
    const numSets = config.numSets || 1;
    const sourceMix = config.sourceMix || { questionBank: 70, coaching: 0, ai: 30 };

    const basePlan = buildPaperPlan(chapterSelections, sections, difficulty);
    config.totalMarks = basePlan.totalMarks;

    const allSlots = basePlan.sections.flatMap(s => s.slots);
    const totalSlots = allSlots.length;

    let totalTokensUsed = 0;

    // Fetch questions from common_db
    const sourced = await sourceQuestions(
      basePlan, config.board, config.subject, sourceMix,
      (config as any).language || 'English',
      config.class_grade,
    );

    const finalQuestions: string[] = new Array(totalSlots).fill('');
    const finalSources: (SourcedQuestion['source'] | null)[] = new Array(totalSlots).fill(null);
    const aiNeededIndices: number[] = [];

    for (let i = 0; i < totalSlots; i++) {
      const sq = sourced[i];
      if (sq) {
        finalQuestions[i] = sq.text;
        finalSources[i] = sq.source;
      } else {
        aiNeededIndices.push(i);
      }
    }

    // Generate AI questions in chunks to stay within Groq TPM limits
    if (aiNeededIndices.length > 0) {
      if (!process.env.GROQ_API_KEY) {
        return NextResponse.json({ error: 'Groq API Key is not configured.' }, { status: 500 });
      }

      // Fetch reference questions (limited to 1 per chapter, max 3 total)
      const aiChapters = [...new Set(aiNeededIndices.map(i => allSlots[i].chapterName))];
      let referenceQuestions: Map<string, any[]> | undefined;
      try {
        referenceQuestions = await fetchReferenceQuestions(
          config.board, config.subject, config.class_grade,
          aiChapters.slice(0, 3), 1,
        );
      } catch { /* non-critical */ }

      // Split into chunks of CHUNK_SIZE questions
      const chunks: number[][] = [];
      for (let i = 0; i < aiNeededIndices.length; i += CHUNK_SIZE) {
        chunks.push(aiNeededIndices.slice(i, i + CHUNK_SIZE));
      }

      console.log(`[AI] Generating ${aiNeededIndices.length} questions in ${chunks.length} chunks of ≤${CHUNK_SIZE}`);

      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c];
        // Only include reference questions for the first chunk
        const refs = c === 0 ? referenceQuestions : undefined;

        try {
          const { questions, tokensUsed } = await generateChunk(
            config, basePlan, allSlots, chunk, refs,
          );
          totalTokensUsed += tokensUsed;

          for (let j = 0; j < chunk.length; j++) {
            finalQuestions[chunk[j]] = questions[j];
            finalSources[chunk[j]] = 'AI Generated';
          }
        } catch (err: any) {
          console.error(`[AI] Chunk ${c + 1}/${chunks.length} failed:`, err.message);
          for (const idx of chunk) {
            finalQuestions[idx] = '[Question could not be generated. Please add manually.]';
            finalSources[idx] = 'AI Generated';
          }
        }

        // Delay between chunks to respect TPM (skip after last chunk)
        if (c < chunks.length - 1) {
          console.log(`[AI] Chunk ${c + 1}/${chunks.length} done, waiting ${CHUNK_DELAY_MS / 1000}s for TPM cooldown...`);
          await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
        }
      }

      console.log(`[AI] All chunks done. Total tokens: ${totalTokensUsed}`);
    }

    // Build HTML for each set
    const setPlans = generateSetVariants(basePlan, numSets);
    const setLabels = ['A', 'B', 'C'];
    const results: string[] = [];

    for (let s = 0; s < setPlans.length; s++) {
      const setLabel = numSets > 1 ? setLabels[s] : undefined;
      const html = buildPaperHtml(setPlans[s], finalQuestions, config, setLabel, finalSources);
      results.push(html);
    }

    // Log generation
    try {
      if (user) {
        const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || '';
        const GenerationLog = await getGenerationLogModel();
        const totalQ = sections.reduce((sum: number, sec: any) =>
          sum + sec.questionTypes.reduce((s: number, qt: any) => s + qt.count, 0), 0);
        await GenerationLog.create({
          userId: user.id,
          userEmail: email,
          board: config.board,
          classLevel: config.class_grade,
          subject: config.subject,
          chapters: config.chapters.map(c => ({ chapterId: c.chapterId, chapterName: c.chapterName })),
          totalMarks: config.totalMarks,
          totalQuestions: totalQ,
          numSets: numSets,
          tokensUsed: totalTokensUsed,
          examName: config.examName,
          difficulty: config.difficulty,
        });
      }
    } catch { /* logging failure shouldn't block generation */ }

    return NextResponse.json({ data: results });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate paper' },
      { status: 500 },
    );
  }
}

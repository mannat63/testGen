import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { currentUser } from '@clerk/nextjs/server';
import { generateTestPrompt, PromptConfig, TOKEN_BUDGET } from '@/lib/generatePrompt';
import { parseQuestions, buildPaperHtml } from '@/lib/formatPaper';
import { buildPaperPlan, generateSetVariants, ChapterSelection } from '@/lib/paperAlgorithm';
import { sourceQuestions, SourcedQuestion } from '@/lib/questionSource';
import { PaperSection } from '@/config/examPatterns';
import { getGenerationLogModel } from '@/models/GenerationLog';

export const maxDuration = 60;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build',
});

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
    const sourceMix = config.sourceMix || { questionBank: 0, coaching: 0, ai: 100 };

    // 1. Algorithm builds the complete plan
    const basePlan = buildPaperPlan(chapterSelections, sections, difficulty);
    config.totalMarks = basePlan.totalMarks;

    const allSlots = basePlan.sections.flatMap(s => s.slots);
    const totalSlots = allSlots.length;

    let totalTokensUsed = 0;

    // 2. Fetch questions from question bank and coaching material
    const sourced = await sourceQuestions(basePlan, config.board, config.subject, sourceMix, (config as any).language || 'English');

    // 3. Build final questions array and source tracking
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

    // 4. Use LLM only for remaining unfilled slots
    if (aiNeededIndices.length > 0) {
      if (!process.env.GROQ_API_KEY) {
        return NextResponse.json({ error: 'Groq API Key is not configured.' }, { status: 500 });
      }

      const prompt = generateTestPrompt(config, basePlan, aiNeededIndices);

      const aiSlots = aiNeededIndices.map(i => allSlots[i]);
      const estimatedOutput = aiSlots.reduce(
        (sum, slot) => sum + (TOKEN_BUDGET[slot.questionType] ?? 100),
        0,
      );
      const max_tokens = Math.min(Math.max(estimatedOutput + 300, 1200), 5200);

      let retries = 0;
      let rawContent = '';
      while (retries < 3) {
        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-8b-instant',
            temperature: 0.7,
            max_tokens,
            top_p: 1,
          });
          rawContent = chatCompletion.choices[0]?.message?.content || '';
          totalTokensUsed += chatCompletion.usage?.total_tokens || 0;
          break;
        } catch (llmErr: any) {
          if (llmErr?.status === 429 || llmErr?.error?.code === 'rate_limit_exceeded') {
            retries++;
            if (retries >= 3) {
              return NextResponse.json(
                { error: 'API rate limit reached. Please wait 60 seconds and try again.' },
                { status: 429 },
              );
            }
            await new Promise(r => setTimeout(r, 15000 * retries));
          } else {
            throw llmErr;
          }
        }
      }

      const aiQuestions = parseQuestions(rawContent, aiNeededIndices.length);

      for (let j = 0; j < aiNeededIndices.length; j++) {
        finalQuestions[aiNeededIndices[j]] = aiQuestions[j];
        finalSources[aiNeededIndices[j]] = 'AI Generated';
      }
    }

    // 5. Build HTML for each set using the algorithm-built structure
    const setPlans = generateSetVariants(basePlan, numSets);
    const setLabels = ['A', 'B', 'C'];
    const results: string[] = [];

    for (let s = 0; s < setPlans.length; s++) {
      const setLabel = numSets > 1 ? setLabels[s] : undefined;
      const html = buildPaperHtml(setPlans[s], finalQuestions, config, setLabel, finalSources);
      results.push(html);
    }

    // 6. Log generation
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

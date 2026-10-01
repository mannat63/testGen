import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { currentUser } from '@clerk/nextjs/server';
import { getGenerationLogModel } from '@/models/GenerationLog';
import { GROQ_LIGHTWEIGHT_MODEL, GROQ_FALLBACK_MODEL } from '@/lib/aiModels';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build',
});

const TYPE_DESC: Record<string, string> = {
  mcq: 'MCQ with four options labelled (a)(b)(c)(d)',
  sa1: 'Short Answer requiring 2-3 lines',
  sa2: 'Short Answer requiring 5-6 lines',
  la: 'Long Answer requiring a detailed response',
  numerical: 'Numerical problem with units',
  case_study: 'Case-Based question with a passage and sub-questions',
  assertion_reason: 'Assertion-Reason question with four options labelled (a)(b)(c)(d)',
};

function cleanQuestionText(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')          // strip any reasoning block
    .replace(/^\s*Q\.?\s*\d+[\.\)]\s*/i, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\n\s*(Answer|Ans|Correct Answer|Solution|Explanation|Note)\s*[:\-].*/gi, '')
    .replace(/\n\s*(Answer|Ans)\s*:\s*\([a-d]\).*/gi, '')
    .trim();
}

function isRateLimit(err: any): boolean {
  const code = err?.error?.error?.code || err?.error?.code;
  return err?.status === 429 || err?.status === 413 || code === 'rate_limit_exceeded';
}

function isModelNotFound(err: any): boolean {
  const code = err?.error?.error?.code || err?.error?.code;
  return err?.status === 404 || code === 'model_not_found' || code === 'model_decommissioned';
}

async function callModel(model: string, prompt: string) {
  // gpt-oss models spend tokens on a hidden reasoning channel; give them
  // headroom and keep reasoning minimal so the content field isn't starved.
  const isReasoning = model.includes('gpt-oss');
  const params: any = {
    messages: [{ role: 'user', content: prompt }],
    model,
    temperature: 0.85,
    max_tokens: isReasoning ? 1200 : 500,
    top_p: 1,
  };
  if (isReasoning) params.reasoning_effort = 'low';
  return groq.chat.completions.create(params);
}

export async function POST(req: Request) {
  // 1. Environment check
  if (!process.env.GROQ_API_KEY) {
    console.error('[regenerate] GROQ_API_KEY is not configured');
    return NextResponse.json({ error: 'AI service is not configured on the server.' }, { status: 503 });
  }

  // 2. Parse + validate the request body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }

  const { board, subject, class_grade, chapterName, questionType, difficulty, marksEach } = body || {};
  const missing = ['board', 'subject', 'class_grade', 'chapterName', 'questionType', 'difficulty']
    .filter((k) => !body?.[k] || typeof body[k] !== 'string' || !String(body[k]).trim());
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing or invalid question data: ${missing.join(', ')}.` },
      { status: 400 },
    );
  }

  const prompt = `Generate exactly 1 ${TYPE_DESC[questionType] || questionType} question for ${board} ${class_grade} ${subject}, chapter: ${chapterName}, difficulty: ${difficulty}, worth ${marksEach ?? 1} marks.
Write ONLY the question text. No marks, no answers, no preamble, no "Q1." prefix.
${questionType === 'mcq' || questionType === 'assertion_reason' ? 'Include options on new lines labelled (a)(b)(c)(d).' : ''}
${board}-standard exam quality. NO answers, NO solution, NO explanation.`;

  // 3. Call the model with bounded retries on rate limits, plus a one-time
  //    fallback model if the primary has been decommissioned.
  let text = '';
  let tokensUsed = 0;
  let modelUsed = GROQ_LIGHTWEIGHT_MODEL;
  let retries = 0;
  let triedFallback = false;

  while (retries < 2) {
    try {
      const completion = await callModel(modelUsed, prompt);
      text = cleanQuestionText(completion.choices[0]?.message?.content || '');
      tokensUsed = completion.usage?.total_tokens || 0;

      if (!text) {
        // Empty output (e.g. a reasoning model that spent its budget on reasoning).
        console.error(`[regenerate] Model ${modelUsed} returned empty content`);
        return NextResponse.json(
          { error: 'The AI model returned an empty question. Please try again.' },
          { status: 502 },
        );
      }
      break;
    } catch (llmErr: any) {
      if (isRateLimit(llmErr)) {
        retries++;
        if (retries >= 2) {
          console.error('[regenerate] rate limited after retries');
          return NextResponse.json(
            { error: 'API rate limit reached. Please wait 60 seconds and try again.' },
            { status: 429 },
          );
        }
        await new Promise((r) => setTimeout(r, 10_000));
        continue;
      }

      if (isModelNotFound(llmErr) && !triedFallback) {
        console.error(`[regenerate] Model ${modelUsed} not found; trying fallback ${GROQ_FALLBACK_MODEL}`);
        triedFallback = true;
        modelUsed = GROQ_FALLBACK_MODEL;
        continue;
      }

      // Any other error: surface it clearly instead of a generic opaque 500.
      const detail = llmErr?.error?.error?.message || llmErr?.message || 'Unknown AI error';
      console.error('[regenerate] LLM call failed:', llmErr?.status, detail);
      return NextResponse.json(
        { error: `AI generation failed: ${detail}` },
        { status: 502 },
      );
    }
  }

  // 4. Best-effort usage logging — never block the response on it.
  try {
    const user = await currentUser();
    if (user && tokensUsed > 0) {
      const email = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress || '';
      const GenerationLog = await getGenerationLogModel();
      await GenerationLog.create({
        userId: user.id,
        userEmail: email,
        board,
        subject,
        classLevel: class_grade,
        totalMarks: 0,
        totalQuestions: 1,
        numSets: 0,
        tokensUsed,
        examName: '(regeneration)',
      });
    }
  } catch (logErr: any) {
    console.error('[regenerate] usage logging failed (non-fatal):', logErr?.message);
  }

  return NextResponse.json({ question: text });
}

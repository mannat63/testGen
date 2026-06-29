import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { currentUser } from '@clerk/nextjs/server';
import { getGenerationLogModel } from '@/models/GenerationLog';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build',
});

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API Key is not configured.' }, { status: 500 });
    }

    const user = await currentUser();
    const { board, subject, class_grade, chapterName, questionType, difficulty, marksEach } = await req.json();

    const typeDesc: Record<string, string> = {
      mcq: 'MCQ with four options labelled (a)(b)(c)(d)',
      sa1: 'Short Answer requiring 2-3 lines',
      sa2: 'Short Answer requiring 5-6 lines',
      la: 'Long Answer requiring a detailed response',
      numerical: 'Numerical problem with units',
      case_study: 'Case-Based question with a passage and sub-questions',
      assertion_reason: 'Assertion-Reason question with four options labelled (a)(b)(c)(d)',
    };

    const prompt = `Generate exactly 1 ${typeDesc[questionType] || questionType} question for ${board} ${class_grade} ${subject}, chapter: ${chapterName}, difficulty: ${difficulty}, worth ${marksEach} marks.
Write ONLY the question text. No marks, no answers, no preamble, no "Q1." prefix.
${questionType === 'mcq' || questionType === 'assertion_reason' ? 'Include options on new lines labelled (a)(b)(c)(d).' : ''}
${board}-standard exam quality. NO answers, NO solution, NO explanation.`;

    let text = '';
    let tokensUsed = 0;
    let retries = 0;
    while (retries < 2) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.1-8b-instant',
          temperature: 0.85,
          max_tokens: 400,
          top_p: 1,
        });
        text = completion.choices[0]?.message?.content || '';
        tokensUsed = completion.usage?.total_tokens || 0;
        break;
      } catch (llmErr: any) {
        if (llmErr?.status === 429 || llmErr?.error?.code === 'rate_limit_exceeded') {
          retries++;
          if (retries >= 2) {
            return NextResponse.json(
              { error: 'API rate limit reached. Please wait 60 seconds and try again.' },
              { status: 429 },
            );
          }
          await new Promise(r => setTimeout(r, 10000));
        } else {
          throw llmErr;
        }
      }
    }
    text = text.replace(/^\s*Q\.?\s*\d+[\.\)]\s*/i, '');
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    text = text.replace(/`(.*?)`/g, '$1');
    text = text
      .replace(/\n\s*(Answer|Ans|Correct Answer|Solution|Explanation|Note)\s*[:\-].*/gi, '')
      .replace(/\n\s*(Answer|Ans)\s*:\s*\([a-d]\).*/gi, '')
      .trim();

    // Log token usage for regeneration
    try {
      if (user && tokensUsed > 0) {
        const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || '';
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
    } catch { /* logging failure shouldn't block */ }

    return NextResponse.json({ question: text });
  } catch (error: any) {
    console.error('Regenerate error:', error);
    return NextResponse.json({ error: error.message || 'Failed to regenerate question' }, { status: 500 });
  }
}

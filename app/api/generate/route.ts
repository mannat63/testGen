import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { generateTestPrompt, PromptConfig } from '@/lib/generatePrompt';
import { formatPaper } from '@/lib/formatPaper';

// Allow this API route to run for longer duration
export const maxDuration = 60; 

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build',
});

export async function POST(req: Request) {
  try {
    const config: PromptConfig = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API Key is not configured in the environment.' }, { status: 500 });
    }

    const prompt = generateTestPrompt(config);

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
      max_tokens: 4000,
      top_p: 1,
    });

    const content = chatCompletion.choices[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('No content generated');
    }

    // Format the markdown content into HTML
    const formattedHtml = formatPaper(content, config);

    return NextResponse.json({ data: formattedHtml });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate paper' },
      { status: 500 }
    );
  }
}

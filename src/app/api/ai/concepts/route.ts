import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Please provide at least 50 characters of text' },
        { status: 400 }
      );
    }

    // Generate concepts using OpenAI
    const openai = getOpenAIClient();
    
    const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a concept extraction expert. Extract key concepts from the provided text and show how they relate.

Return ONLY valid JSON in this format:
{
  "concepts": [
    {
      "title": "Concept name",
      "importance": "High|Medium|Low",
      "detail": "Brief explanation"
    }
  ],
  "conceptMap": [
    ["Concept A", "Concept B"],
    ["Concept B", "Concept C"]
  ]
}

The conceptMap shows relationships: [from, to] means "from leads to to".`,
        },
        {
          role: 'user',
          content: `Extract key concepts from this text:\n\n${text.substring(0, 8000)}`,
        },
        ],
        temperature: 0.7,
        max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    let conceptData: {
      concepts: Array<{ title: string; importance: string; detail: string }>;
      conceptMap: string[][];
    };
    
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }
      conceptData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse concept response:', responseText);
      return NextResponse.json(
        { error: 'Failed to extract concepts. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      concepts: conceptData.concepts || [],
      conceptMap: conceptData.conceptMap || [],
    });
  } catch (error) {
    console.error('Error extracting concepts:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to extract concepts',
      },
      { status: 500 }
    );
  }
}

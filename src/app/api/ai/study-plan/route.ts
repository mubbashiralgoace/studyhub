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

    const userId = session.user.id;
    const { focusArea, duration = 3 } = await request.json();

    // Get user's recent content
    const { data: documents } = await supabase
      .from('documents')
      .select('filename')
      .eq('user_id', userId)
      .limit(5);

    const { data: videos } = await supabase
      .from('video_summaries')
      .select('video_title')
      .eq('user_id', userId)
      .limit(5);

    const contentSummary = `
Available materials:
- Documents: ${documents?.map(d => d.filename).join(', ') || 'None'}
- Videos: ${videos?.map(v => v.video_title).join(', ') || 'None'}
Focus area: ${focusArea || 'General study'}
Duration: ${duration} days
`;

    // Generate study plan using OpenAI
    const openai = getOpenAIClient();
    
    const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a study plan generator. Create a ${duration}-day study plan based on available materials.

Return ONLY valid JSON in this format:
{
  "plan": [
    {
      "title": "Day 1 — Phase name",
      "focus": "Main focus area",
      "actions": ["Action 1", "Action 2", "Action 3"]
    }
  ]
}

Make the plan practical with specific, actionable steps.`,
        },
        {
          role: 'user',
          content: `Generate a ${duration}-day study plan:\n\n${contentSummary}`,
        },
        ],
        temperature: 0.7,
        max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    let planData: {
      plan: Array<{ title: string; focus: string; actions: string[] }>;
    };
    
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }
      planData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse plan response:', responseText);
      return NextResponse.json(
        { error: 'Failed to generate study plan. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: planData.plan || [],
    });
  } catch (error) {
    console.error('Error generating study plan:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate study plan',
      },
      { status: 500 }
    );
  }
}

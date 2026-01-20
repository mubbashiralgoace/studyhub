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

    // Get user's study activity
    const { count: docCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: videoCount } = await supabase
      .from('video_summaries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const activitySummary = `
User study activity:
- Documents uploaded: ${docCount || 0}
- Video summaries: ${videoCount || 0}
- Last activity: Recent
`;

    // Generate recommendations using OpenAI
    const openai = getOpenAIClient();
    
    const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a personalized learning advisor. Analyze the user's study activity and provide 3-4 actionable recommendations.

Return ONLY valid JSON in this format:
{
  "recommendations": [
    {
      "title": "Recommendation title",
      "reason": "Why this is recommended",
      "action": "Specific action to take"
    }
  ]
}

Make recommendations practical and helpful.`,
        },
        {
          role: 'user',
          content: `Analyze this study activity and provide recommendations:\n\n${activitySummary}`,
        },
        ],
        temperature: 0.7,
        max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    let recData: {
      recommendations: Array<{ title: string; reason: string; action: string }>;
    };
    
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }
      recData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse recommendations response:', responseText);
      return NextResponse.json(
        { error: 'Failed to generate recommendations. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recommendations: recData.recommendations || [],
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate recommendations',
      },
      { status: 500 }
    );
  }
}

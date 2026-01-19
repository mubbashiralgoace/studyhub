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

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { sourceType, sourceId, questionCount = 5, difficulty = 'medium' } = await request.json();

    if (!sourceType || !sourceId) {
      return NextResponse.json(
        { error: 'sourceType and sourceId are required' },
        { status: 400 }
      );
    }

    let contentForQuiz = '';
    let sourceName = '';

    // Get content based on source type
    if (sourceType === 'document') {
      // Fetch document chunks
      const { data: chunks, error } = await supabase
        .from('document_chunks')
        .select('text, filename')
        .eq('document_id', sourceId)
        .eq('user_id', userId)
        .order('chunk_index', { ascending: true })
        .limit(10);

      if (error || !chunks || chunks.length === 0) {
        return NextResponse.json(
          { error: 'Document not found or no content available' },
          { status: 404 }
        );
      }

      contentForQuiz = chunks.map(c => c.text).join('\n\n');
      sourceName = chunks[0]?.filename || 'Document';
    } else if (sourceType === 'video') {
      // Fetch video summary
      const { data: video, error } = await supabase
        .from('video_summaries')
        .select('summary, video_title, transcript')
        .eq('id', sourceId)
        .eq('user_id', userId)
        .single();

      if (error || !video) {
        return NextResponse.json(
          { error: 'Video summary not found' },
          { status: 404 }
        );
      }

      // Use summary and some transcript for quiz generation
      contentForQuiz = `Summary: ${video.summary}\n\nKey Content: ${video.transcript?.substring(0, 5000) || ''}`;
      sourceName = video.video_title || 'YouTube Video';
    } else {
      return NextResponse.json(
        { error: 'Invalid sourceType. Use "document" or "video"' },
        { status: 400 }
      );
    }

    if (contentForQuiz.length < 100) {
      return NextResponse.json(
        { error: 'Not enough content to generate quiz. Please use a source with more content.' },
        { status: 400 }
      );
    }

    // Generate quiz using OpenAI
    const openai = getOpenAIClient();
    
    const difficultyInstructions = {
      easy: 'Make questions straightforward with obvious correct answers.',
      medium: 'Make questions moderately challenging that test understanding.',
      hard: 'Make questions challenging that require deep understanding and critical thinking.',
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `You are a quiz generator for educational content. Generate exactly ${questionCount} multiple choice questions based on the provided content.

${difficultyInstructions[difficulty as keyof typeof difficultyInstructions] || difficultyInstructions.medium}

IMPORTANT: Return ONLY valid JSON in this exact format, no other text:
{
  "questions": [
    {
      "id": 1,
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Rules:
- Each question must have exactly 4 options
- correctAnswer is the index (0-3) of the correct option
- Make questions diverse - test different concepts
- Questions should be clear and unambiguous
- All content must be based on the provided material`,
        },
        {
          role: 'user',
          content: `Generate ${questionCount} quiz questions from this content:\n\n${contentForQuiz.substring(0, 8000)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse JSON response
    let quizData: { questions: QuizQuestion[] };
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      quizData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse quiz response:', responseText);
      return NextResponse.json(
        { error: 'Failed to generate quiz. Please try again.' },
        { status: 500 }
      );
    }

    if (!quizData.questions || quizData.questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions generated. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quiz: {
        sourceType,
        sourceId,
        sourceName,
        difficulty,
        questions: quizData.questions,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate quiz',
      },
      { status: 500 }
    );
  }
}

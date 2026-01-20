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
    const { sourceType, sourceId, count = 6, customText, focus } = await request.json();

    let content = '';

    // Get content based on source type
    if (sourceType === 'documents' && sourceId) {
      const { data: chunks, error } = await supabase
        .from('document_chunks')
        .select('text, filename')
        .eq('document_id', sourceId)
        .eq('user_id', userId)
        .order('chunk_index', { ascending: true })
        .limit(10);

      if (error || !chunks || chunks.length === 0) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      content = chunks.map(c => c.text).join('\n\n');
    } else if (sourceType === 'youtube' && sourceId) {
      const { data: video, error } = await supabase
        .from('video_summaries')
        .select('summary, transcript')
        .eq('id', sourceId)
        .eq('user_id', userId)
        .single();

      if (error || !video) {
        return NextResponse.json(
          { error: 'Video summary not found' },
          { status: 404 }
        );
      }

      content = `${video.summary}\n\n${video.transcript?.substring(0, 5000) || ''}`;
    } else if (sourceType === 'custom' && customText) {
      content = customText;
    } else {
      return NextResponse.json(
        { error: 'Invalid source type or missing content' },
        { status: 400 }
      );
    }

    if (content.length < 100) {
      return NextResponse.json(
        { error: 'Not enough content to generate flashcards' },
        { status: 400 }
      );
    }

    // Generate flashcards using OpenAI
    const openai = getOpenAIClient();
    const focusPrompt = focus ? ` Focus on: ${focus}.` : '';
    
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a flashcard generator. Create ${count} flashcards from the provided content.
Each flashcard should have:
- front: A clear question or prompt
- back: A concise answer or explanation
- tag: A category (e.g., "Core idea", "Keywords", "Application", "Pitfall")

Return ONLY valid JSON in this format:
{
  "flashcards": [
    {
      "front": "Question or prompt",
      "back": "Answer or explanation",
      "tag": "Category"
    }
  ]
}

Make flashcards diverse and useful for spaced repetition.${focusPrompt}`,
          },
          {
            role: 'user',
            content: `Generate ${count} flashcards from this content:\n\n${content.substring(0, 8000)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError);
      const errorMessage = openaiError?.message || openaiError?.error?.message || 'OpenAI API error';
      return NextResponse.json(
        { error: `OpenAI API error: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Check response structure
    if (!completion.choices || completion.choices.length === 0) {
      console.error('No choices in OpenAI response:', JSON.stringify(completion, null, 2));
      return NextResponse.json(
        { 
          error: 'No choices returned from AI model',
          details: process.env.NODE_ENV === 'development' ? JSON.stringify(completion, null, 2) : undefined,
        },
        { status: 500 }
      );
    }

    const firstChoice = completion.choices[0];
    const responseText = firstChoice?.message?.content || '';
    const finishReason = firstChoice?.finish_reason;
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('OpenAI response:', {
        hasContent: !!responseText,
        contentLength: responseText.length,
        finishReason,
        model: completion.model,
      });
    }
    
    if (!responseText) {
      const errorDetails = {
        finishReason,
        model: completion.model,
        choicesCount: completion.choices.length,
        firstChoiceMessage: firstChoice?.message,
      };
      console.error('Empty response from OpenAI:', errorDetails);
      return NextResponse.json(
        { 
          error: `No response from AI model. Finish reason: ${finishReason || 'unknown'}. This might indicate the model hit a token limit or was stopped.`,
          details: process.env.NODE_ENV === 'development' ? JSON.stringify(errorDetails, null, 2) : undefined,
        },
        { status: 500 }
      );
    }
    
    let flashcardData: { flashcards: Array<{ front: string; back: string; tag: string }> };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response:', responseText.substring(0, 500));
        return NextResponse.json(
          { error: `Failed to parse AI response. Response: ${responseText.substring(0, 200)}` },
          { status: 500 }
        );
      }
      flashcardData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse flashcard response:', responseText.substring(0, 500));
      return NextResponse.json(
        { error: `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. Response preview: ${responseText.substring(0, 200)}` },
        { status: 500 }
      );
    }

    if (!flashcardData.flashcards || flashcardData.flashcards.length === 0) {
      return NextResponse.json(
        { error: 'No flashcards generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      flashcards: flashcardData.flashcards,
    });
  } catch (error) {
    console.error('Error generating flashcards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate flashcards';
    const errorDetails = error instanceof Error && error.stack ? error.stack : String(error);
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}

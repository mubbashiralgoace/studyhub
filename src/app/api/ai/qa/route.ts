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
    const { question, searchIn = 'all' } = await request.json();

    if (!question || question.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a valid question (at least 10 characters)' },
        { status: 400 }
      );
    }

    // Search in documents and videos
    let relevantContent: Array<{ text: string; source: string }> = [];

    if (searchIn === 'all' || searchIn === 'documents') {
      // Search document chunks
      const queryWords = question.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const { data: docChunks } = await supabase
        .from('document_chunks')
        .select('text, filename')
        .eq('user_id', userId)
        .limit(10);

      if (docChunks) {
        const relevant = docChunks
          .filter((chunk) => {
            const chunkText = chunk.text.toLowerCase();
            return queryWords.some((word: string) => chunkText.includes(word));
          })
          .slice(0, 3)
          .map((chunk) => ({
            text: chunk.text.substring(0, 1000),
            source: `notes:${chunk.filename}`,
          }));

        relevantContent.push(...relevant);
      }
    }

    if (searchIn === 'all' || searchIn === 'videos') {
      // Search video summaries
      const { data: videos } = await supabase
        .from('video_summaries')
        .select('summary, video_title, video_id')
        .eq('user_id', userId)
        .limit(5);

      if (videos) {
        const relevant = videos
          .slice(0, 2)
          .map((video) => ({
            text: video.summary.substring(0, 1000),
            source: `youtube:${video.video_id}`,
          }));

        relevantContent.push(...relevant);
      }
    }

    if (relevantContent.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find relevant information in your content. Please upload documents or video summaries first.",
        citations: [],
      });
    }

    // Build context
    const context = relevantContent
      .map((item) => `[From ${item.source}]\n${item.text}`)
      .join('\n\n---\n\n');

    // Generate answer with citations using OpenAI
    const openai = getOpenAIClient();
    
    const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions based on provided context.
Always cite your sources. Return ONLY valid JSON in this format:
{
  "answer": "Your answer text",
  "citations": [
    {
      "source": "notes:filename.pdf or youtube:videoId",
      "snippet": "Relevant quote from source"
    }
  ]
}

Include 2-3 citations that directly support your answer.`,
        },
        {
          role: 'user',
          content: `Context:\n\n${context}\n\nQuestion: ${question}\n\nAnswer with citations:`,
        },
        ],
        temperature: 0.7,
        max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    let qaData: {
      answer: string;
      citations: Array<{ source: string; snippet: string }>;
    };
    
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }
      qaData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // Fallback: use the text as answer
      qaData = {
        answer: responseText || 'Unable to generate answer.',
        citations: relevantContent.slice(0, 2).map((item) => ({
          source: item.source,
          snippet: item.text.substring(0, 150),
        })),
      };
    }

    return NextResponse.json({
      success: true,
      answer: qaData.answer,
      citations: qaData.citations || [],
    });
  } catch (error) {
    console.error('Error in Q&A:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to answer question',
      },
      { status: 500 }
    );
  }
}

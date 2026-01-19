import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
};

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

    const { query, documentId } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Search chunks in Supabase using full-text search
    // Try RPC function first, fallback to simple query
    interface RelevantChunk {
      text: string;
      filename: string;
      documentId: string;
      score: number;
    }

    interface SearchResult {
      text: string;
      filename: string;
      document_id: string;
      similarity: number;
    }

    interface FallbackChunk {
      text: string;
      filename: string;
      document_id: string;
    }

    let relevantChunks: RelevantChunk[] = [];
    
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_chunks', {
        search_query: query,
        p_user_id: userId,
        p_document_id: documentId || null,
        limit_count: 5,
      });

    if (!searchError && searchResults && searchResults.length > 0) {
      // Use RPC search results
      relevantChunks = (searchResults as SearchResult[])
        .filter((result) => result.similarity && result.similarity > 0.1)
        .map((result) => ({
          text: result.text,
          filename: result.filename,
          documentId: result.document_id,
          score: result.similarity,
        }));
    } else {
      // Fallback: Simple text search (search for query keywords in chunks)
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      let fallbackQuery = supabase
        .from('document_chunks')
        .select('id, document_id, filename, file_type, chunk_index, text')
        .eq('user_id', userId)
        .limit(10);

      if (documentId) {
        fallbackQuery = fallbackQuery.eq('document_id', documentId);
      }

      const { data: fallbackResults, error: fallbackError } = await fallbackQuery;

      if (!fallbackError && fallbackResults && fallbackResults.length > 0) {
        // Filter chunks that contain query words
        relevantChunks = (fallbackResults as FallbackChunk[])
          .filter((chunk) => {
            const chunkText = chunk.text.toLowerCase();
            return queryWords.some(word => chunkText.includes(word));
          })
          .slice(0, 5)
          .map((chunk) => ({
            text: chunk.text,
            filename: chunk.filename,
            documentId: chunk.document_id,
            score: 0.8,
          }));
      }
    }

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        answer:
          "I couldn't find relevant information in your uploaded notes. Please try rephrasing your question or upload more documents.",
        sources: [],
      });
    }

    // Build context from relevant chunks
    const context = relevantChunks
      .map((chunk) => `[From ${chunk.filename}]\n${chunk.text}`)
      .join('\n\n---\n\n');

    // Generate answer using OpenAI
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano', // or 'gpt-3.5-turbo' for cheaper option
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions based on university notes provided by the user. 
Use only the information from the provided context. If the answer is not in the context, say so.
Be concise and clear. Format your answers with proper structure when needed.`,
        },
        {
          role: 'user',
          content: `Context from notes:\n\n${context}\n\nQuestion: ${query}\n\nAnswer based on the context above:`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const answer = completion.choices[0]?.message?.content || 'Unable to generate answer.';

    // Get unique sources
    const sources = Array.from(
      new Map(
        relevantChunks.map((chunk) => [chunk.documentId, chunk.filename])
      ).entries()
    ).map(([docId, filename]) => ({ documentId: docId, filename }));

    return NextResponse.json({
      answer,
      sources,
      relevantChunks: relevantChunks.length,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process chat request',
      },
      { status: 500 }
    );
  }
}

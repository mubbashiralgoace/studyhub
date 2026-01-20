import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseDocument } from '@/lib/documents/parser';
import { chunkText } from '@/lib/documents/chunker';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for processing

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

    // Check quota limit - free users can only upload 1 document
    const FREE_DOCUMENT_LIMIT = 10;
    const { count: documentCount, error: countError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error checking document count:', countError);
    }

    if (documentCount !== null && documentCount >= FREE_DOCUMENT_LIMIT) {
      return NextResponse.json(
        { 
          error: 'Quota limit exceeded',
          message: `You have reached your free limit of ${FREE_DOCUMENT_LIMIT} document(s). Please upgrade to upload more documents.`,
          quotaExceeded: true,
          currentCount: documentCount,
          limit: FREE_DOCUMENT_LIMIT,
        },
        { status: 403 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const allowedExtensions = ['pdf', 'docx', 'txt'];

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension || '')
    ) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOCX, and TXT files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Parse document
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsedDoc = await parseDocument(buffer, file.name, file.type);

    // Chunk the text (no embeddings needed - just text chunks)
    const chunks = chunkText(parsedDoc.text, 1000, 200);

    // Generate document ID
    const documentId = randomUUID();

    // Store document metadata in Supabase
    const { error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        user_id: userId,
        filename: parsedDoc.metadata.filename,
        file_type: parsedDoc.metadata.fileType,
        file_size: file.size,
        page_count: parsedDoc.metadata.pageCount,
        word_count: parsedDoc.metadata.wordCount,
        chunks_count: chunks.length,
      });

    if (docError) {
      console.error('Error storing document metadata:', docError);
      throw new Error('Failed to store document metadata');
    }

    // Store chunks in Supabase
    const chunksToInsert = chunks.map((chunk) => ({
      user_id: userId,
      document_id: documentId,
      filename: parsedDoc.metadata.filename,
      file_type: parsedDoc.metadata.fileType,
      chunk_index: chunk.chunkIndex,
      text: chunk.text,
      start_index: chunk.startIndex,
      end_index: chunk.endIndex,
    }));

    // Insert chunks in batches (Supabase has a limit per insert)
    const batchSize = 100;
    for (let i = 0; i < chunksToInsert.length; i += batchSize) {
      const batch = chunksToInsert.slice(i, i + batchSize);
      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert(batch);

      if (chunkError) {
        console.error('Error storing chunks:', chunkError);
        throw new Error('Failed to store document chunks');
      }
    }

    return NextResponse.json({
      success: true,
      documentId,
      filename: parsedDoc.metadata.filename,
      chunks: chunks.length,
      metadata: parsedDoc.metadata,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Provide more detailed error message
    let errorMessage = 'Failed to upload document';
    if (error instanceof Error) {
      errorMessage = error.message;
      // Add stack trace in development
      if (process.env.NODE_ENV === 'development') {
        errorMessage += `\n\nStack: ${error.stack}`;
      }
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : String(error))
          : undefined,
      },
      { status: 500 }
    );
  }
}

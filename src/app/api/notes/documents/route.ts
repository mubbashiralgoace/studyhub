import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
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

    // Get all documents from Supabase
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, filename, file_type, file_size, page_count, word_count, chunks_count, uploaded_at')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      throw new Error('Failed to fetch documents');
    }

    // Format documents for response
    const formattedDocuments = (documents || []).map((doc) => ({
      documentId: doc.id,
      filename: doc.filename,
      fileType: doc.file_type,
      uploadedAt: doc.uploaded_at,
      chunks: doc.chunks_count || 0,
    }));

    return NextResponse.json({ documents: formattedDocuments });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch documents',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    // Get count of chunks before deletion
    const { count: chunksCount } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('document_id', documentId);

    // Delete all chunks for this document
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('user_id', userId)
      .eq('document_id', documentId);

    if (chunksError) {
      console.error('Error deleting chunks:', chunksError);
      throw new Error('Failed to delete document chunks');
    }

    // Delete document metadata
    const { error: docError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (docError) {
      console.error('Error deleting document:', docError);
      throw new Error('Failed to delete document');
    }

    return NextResponse.json({ success: true, deleted: chunksCount || 0 });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete document',
      },
      { status: 500 }
    );
  }
}

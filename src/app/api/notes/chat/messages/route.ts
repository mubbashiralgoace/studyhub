import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET - Load chat messages for a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId') || null;

    // Get messages for this user and document (if specified)
    let query = supabase
      .from('chat_messages')
      .select('id, message_text, sender, sources, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (documentId) {
      query = query.eq('document_id', documentId);
    } else {
      query = query.is('document_id', null);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Failed to fetch messages');
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error('Error in GET messages:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
      },
      { status: 500 }
    );
  }
}

// POST - Save a chat message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { messageText, sender, documentId, sources } = await request.json();

    if (!messageText || !sender) {
      return NextResponse.json(
        { error: 'messageText and sender are required' },
        { status: 400 }
      );
    }

    if (sender !== 'user' && sender !== 'assistant') {
      return NextResponse.json(
        { error: 'sender must be "user" or "assistant"' },
        { status: 400 }
      );
    }

    // Normalize documentId - convert empty string to null
    const normalizedDocumentId = documentId && documentId.trim() !== '' ? documentId : null;

    console.log('Saving message:', {
      userId,
      documentId: normalizedDocumentId,
      sender,
      messageTextLength: messageText.length,
    });

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        document_id: normalizedDocumentId,
        message_text: messageText,
        sender: sender,
        sources: sources || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message to Supabase:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: `Failed to save message: ${error.message}`, details: error },
        { status: 500 }
      );
    }

    console.log('Message saved successfully:', message);
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error in POST messages:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to save message',
      },
      { status: 500 }
    );
  }
}

// DELETE - Clear chat messages for a user/document
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId') || null;

    let query = supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId);

    if (documentId) {
      query = query.eq('document_id', documentId);
    } else {
      query = query.is('document_id', null);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting messages:', error);
      throw new Error('Failed to delete messages');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE messages:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete messages',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET - List all video summaries for user
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const { data: videos, error } = await supabase
      .from('video_summaries')
      .select('id, video_id, video_url, video_title, summary, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
      // Check if table doesn't exist
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json(
          {
            error: 'Video summaries table not found. Please run the SQL migration in Supabase.',
            details: 'Run youtube-migration.sql in your Supabase SQL Editor',
          },
          { status: 500 }
        );
      }
      throw new Error(`Failed to fetch videos: ${error.message || 'Unknown error'}`);
    }

    return NextResponse.json({ videos: videos || [] });
  } catch (error) {
    console.error('Error in GET videos:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch videos',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : String(error))
          : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a video summary
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
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('video_summaries')
      .delete()
      .eq('user_id', userId)
      .eq('video_id', videoId);

    if (error) {
      console.error('Error deleting video:', error);
      throw new Error('Failed to delete video');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE video:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete video',
      },
      { status: 500 }
    );
  }
}

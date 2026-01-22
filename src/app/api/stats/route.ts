import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all stats in parallel
    const [
      documentsResult,
      videosResult,
      quizzesResult,
      sharesResult,
    ] = await Promise.all([
      // Total documents
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      
      // Total videos
      supabase
        .from("youtube_summaries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      
      // Total quizzes attempted (if table exists)
      supabase
        .from("quiz_attempts")
        .select("id, score", { count: "exact" })
        .eq("user_id", user.id),
      
      // Total shares
      supabase
        .from("shared_content")
        .select("id, view_count", { count: "exact" })
        .eq("user_id", user.id),
    ]);

    // Get recent activity - last 5 documents
    const { data: recentDocs } = await supabase
      .from("documents")
      .select("id, filename, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Get recent videos
    const { data: recentVideos } = await supabase
      .from("youtube_summaries")
      .select("id, video_title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Calculate quiz stats
    let totalQuizzes = 0;
    let averageScore = 0;
    let totalCorrect = 0;
    
    if (quizzesResult.data && quizzesResult.data.length > 0) {
      totalQuizzes = quizzesResult.count || quizzesResult.data.length;
      const scores = quizzesResult.data.map((q: { score: number }) => q.score || 0);
      averageScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      totalCorrect = scores.reduce((a: number, b: number) => a + b, 0);
    }

    // Calculate total views on shares
    let totalShareViews = 0;
    if (sharesResult.data && sharesResult.data.length > 0) {
      totalShareViews = sharesResult.data.reduce(
        (acc: number, share: { view_count: number }) => acc + (share.view_count || 0), 
        0
      );
    }

    const stats = {
      documents: {
        total: documentsResult.count || 0,
        recent: recentDocs || [],
      },
      videos: {
        total: videosResult.count || 0,
        recent: recentVideos || [],
      },
      quizzes: {
        total: totalQuizzes,
        averageScore: Math.round(averageScore),
        totalCorrect,
      },
      shares: {
        total: sharesResult.count || 0,
        totalViews: totalShareViews,
      },
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

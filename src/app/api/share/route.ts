import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

// Helper to generate unique share ID
function generateShareId(): string {
  return nanoid(10); // 10 character unique ID
}

// POST - Create a new share link
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { type, title, content, expiresIn } = body;

    // Validate required fields
    if (!type || !content) {
      return NextResponse.json(
        { error: "Type and content are required" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["flashcards", "summary", "quiz", "study-plan", "concepts"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid share type" },
        { status: 400 }
      );
    }

    const shareId = generateShareId();
    
    // Calculate expiration date (default 7 days)
    const expirationDays = expiresIn || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Insert into database
    const { data, error } = await supabase
      .from("shared_content")
      .insert({
        share_id: shareId,
        user_id: user.id,
        type,
        title: title || `Shared ${type}`,
        content: JSON.stringify(content),
        expires_at: expiresAt.toISOString(),
        view_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating share:", error);
      return NextResponse.json(
        { error: "Failed to create share link" },
        { status: 500 }
      );
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/share/${shareId}`;

    return NextResponse.json({
      success: true,
      shareId,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error in share POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get shared content by ID (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("id");

    if (!shareId) {
      return NextResponse.json(
        { error: "Share ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get shared content
    const { data, error } = await supabase
      .from("shared_content")
      .select("*")
      .eq("share_id", shareId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Share not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      );
    }

    // Increment view count
    await supabase
      .from("shared_content")
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq("share_id", shareId);

    return NextResponse.json({
      success: true,
      share: {
        id: data.share_id,
        type: data.type,
        title: data.title,
        content: JSON.parse(data.content),
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        viewCount: data.view_count + 1,
      },
    });
  } catch (error) {
    console.error("Error in share GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a share link
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("id");

    if (!shareId) {
      return NextResponse.json(
        { error: "Share ID is required" },
        { status: 400 }
      );
    }

    // Delete share (only if owned by user)
    const { error } = await supabase
      .from("shared_content")
      .delete()
      .eq("share_id", shareId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete share" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in share DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { getSubtitles, getVideoDetails } from 'youtube-caption-extractor';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for processing

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
};

// Extract YouTube video ID from URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
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
    const { videoUrl } = await request.json();

    if (!videoUrl || typeof videoUrl !== 'string') {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }

    // Extract video ID
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL. Please provide a valid YouTube video link.' },
        { status: 400 }
      );
    }

    // Check if summary already exists
    const { data: existingSummary } = await supabase
      .from('video_summaries')
      .select('id, summary, video_title, video_id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single();

    if (existingSummary) {
      return NextResponse.json({
        success: true,
        videoId,
        summary: existingSummary.summary,
        videoTitle: existingSummary.video_title,
        cached: true,
      });
    }

    // Fetch transcript from YouTube
    let transcriptText = '';
    let videoTitle = 'YouTube Video';

    try {
      // Try to fetch transcript with multiple language attempts
      let transcriptData;
      let lastError: Error | null = null;
      
      // First, try without language parameter (should use default/auto)
      try {
        console.log(`Attempting to fetch transcript without language parameter (auto-detect)`);
        transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
        if (transcriptData && transcriptData.length > 0) {
          console.log(`✅ Successfully fetched transcript (auto), segments: ${transcriptData.length}`);
        } else {
          throw new Error('Transcript returned empty');
        }
      } catch (autoError) {
        console.log(`Auto-detect failed, extracting available languages from error`);
        lastError = autoError instanceof Error ? autoError : new Error(String(autoError));
        
        // Extract available languages from error message
        const errorMsg = lastError.message;
        const langMatch = errorMsg.match(/Available languages:\s*([^\n.]+)/i);
        
        if (langMatch) {
          // Extract exact language codes as they appear (including variants like pt-BR)
          const availableLanguages = langMatch[1]
            .split(',')
            .map(l => l.trim())
            .filter(l => l.length > 0)
            // Remove duplicates while preserving order
            .filter((lang, index, self) => self.indexOf(lang) === index);
          
          console.log(`Found available languages:`, availableLanguages);
          
          // Try each available language exactly as listed
          for (const lang of availableLanguages) {
            try {
              console.log(`Attempting language: ${lang}`);
              transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
                lang: lang.toLowerCase(),
              });
              
              if (transcriptData && transcriptData.length > 0) {
                console.log(`✅ Successfully fetched with language: ${lang}, segments: ${transcriptData.length}`);
                break;
              }
            } catch (langError) {
              console.log(`Language ${lang} failed:`, langError instanceof Error ? langError.message : langError);
              lastError = langError instanceof Error ? langError : new Error(String(langError));
              continue;
            }
          }
        } else {
          // If we can't extract languages, try common ones
          console.log(`Could not extract available languages, trying common languages`);
          const commonLangs = ['en', 'ar', 'zh', 'es', 'fr', 'it', 'pt', 'ru', 'ja', 'ko'];
          for (const lang of commonLangs) {
            try {
              console.log(`Attempting common language: ${lang}`);
              transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
                lang: lang,
              });
              if (transcriptData && transcriptData.length > 0) {
                console.log(`✅ Successfully fetched with common language: ${lang}`);
                break;
              }
            } catch (langError) {
              continue;
            }
          }
        }
      }

      // If youtube-transcript failed, try alternative library (youtube-caption-extractor)
      if (!transcriptData || transcriptData.length === 0) {
        console.log('Trying alternative method: youtube-caption-extractor');
        try {
          // Try to get video details (includes title and subtitles)
          const videoDetails = await getVideoDetails({
            videoID: videoId,
            lang: 'en', // Try English first
          });
          
          if (videoDetails && videoDetails.subtitles && videoDetails.subtitles.length > 0) {
            // Convert to same format as youtube-transcript
            transcriptData = videoDetails.subtitles.map((item: any) => ({
              text: item.text || '',
              offset: parseFloat(item.start) || 0,
              duration: parseFloat(item.dur) || 0,
            }));
            
            // Also update video title if available
            if (videoDetails.title) {
              videoTitle = videoDetails.title;
            }
            
            console.log(`✅ Successfully fetched transcript using alternative method, segments: ${transcriptData.length}`);
          } else {
            // Try getSubtitles directly
            const subtitles = await getSubtitles({
              videoID: videoId,
              lang: 'en',
            });
            
            if (subtitles && subtitles.length > 0) {
              transcriptData = subtitles.map((item: any) => ({
                text: item.text || '',
                offset: parseFloat(item.start) || 0,
                duration: parseFloat(item.dur) || 0,
              }));
              console.log(`✅ Successfully fetched transcript using getSubtitles, segments: ${transcriptData.length}`);
            } else {
              // Try without language parameter (auto-detect)
              const autoSubtitles = await getSubtitles({
                videoID: videoId,
              });
              
              if (autoSubtitles && autoSubtitles.length > 0) {
                transcriptData = autoSubtitles.map((item: any) => ({
                  text: item.text || '',
                  offset: parseFloat(item.start) || 0,
                  duration: parseFloat(item.dur) || 0,
                }));
                console.log(`✅ Successfully fetched transcript using auto-detect, segments: ${transcriptData.length}`);
              }
            }
          }
        } catch (altError) {
          console.log('Alternative method also failed:', altError instanceof Error ? altError.message : altError);
          // Continue to error handling below
        }
      }

      if (!transcriptData || transcriptData.length === 0) {
        const errorMsg = lastError?.message || 'No transcript available';
        console.error('All methods failed. No transcript data found:', errorMsg);
        console.error('Video ID:', videoId);
        
        return NextResponse.json(
          { 
            error: 'Unable to fetch transcript for this video. The video may not have captions available (neither manual nor auto-generated).',
            details: errorMsg,
            suggestion: 'Please try a different video that has captions enabled. You can check by watching the video and looking for the CC (Closed Captions) button.',
            videoId: videoId,
          },
          { status: 400 }
        );
      }

      transcriptText = transcriptData.map((item) => item.text).join(' ');

      if (transcriptText.trim().length === 0) {
        return NextResponse.json(
          { 
            error: 'Transcript is empty. The video may have captions but they are not accessible.',
            suggestion: 'Try a different video or ensure captions are properly enabled.',
          },
          { status: 400 }
        );
      }

      console.log(`Transcript fetched successfully. Length: ${transcriptText.length} characters`);

      // Try to get video title (optional, may not always work)
      try {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        const html = await response.text();
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          videoTitle = titleMatch[1].replace(' - YouTube', '').trim();
        }
      } catch (error) {
        console.log('Could not fetch video title:', error);
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        {
          error: 'Failed to fetch video transcript. The video may not have captions enabled or may be unavailable.',
          details: errorMessage,
          suggestion: 'Please verify that: 1) The video has captions enabled, 2) The video is public and accessible, 3) Try a different video URL.',
        },
        { status: 400 }
      );
    }

    // Generate summary using OpenAI
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that creates concise and comprehensive summaries of YouTube video transcripts. 
Create a well-structured summary that includes:
1. Main topics covered
2. Key points and concepts
3. Important takeaways
4. Any actionable insights

Format the summary with clear headings and bullet points where appropriate.`,
        },
        {
          role: 'user',
          content: `Please summarize the following YouTube video transcript:\n\n${transcriptText.substring(0, 15000)}`, // Limit to avoid token limits
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary.';

    // Save summary to Supabase
    const { data: savedSummary, error: saveError } = await supabase
      .from('video_summaries')
      .insert({
        user_id: userId,
        video_id: videoId,
        video_url: videoUrl,
        video_title: videoTitle,
        transcript: transcriptText.substring(0, 50000), // Store first 50k chars
        summary: summary,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving summary:', saveError);
      // Still return the summary even if save fails
    }

    return NextResponse.json({
      success: true,
      videoId,
      summary,
      videoTitle,
      videoUrl,
      cached: false,
    });
  } catch (error) {
    console.error('Error in YouTube summarize:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process video',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : String(error))
          : undefined,
      },
      { status: 500 }
    );
  }
}

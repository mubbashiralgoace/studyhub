"use client";

import React, { useState, useEffect } from "react";
import { VideoSummaryUpload } from "@/components/youtube/VideoSummaryUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Youtube, Trash2, Loader2, ExternalLink, Share2 } from "lucide-react";
import { ShareDialog } from "@/components/share/ShareDialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VideoSummary {
  id: string;
  video_id: string;
  video_url: string;
  video_title: string | null;
  summary: string;
  created_at: string;
}

export default function YouTubePage() {
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoSummary | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/youtube/videos");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to load videos");
      }
      
      setVideos(data.videos || []);
    } catch (error) {
      console.error("Error loading videos:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load video summaries";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    loadVideos();
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video summary?")) {
      return;
    }

    try {
      setIsDeleting(videoId);
      const response = await fetch(`/api/youtube/videos?videoId=${videoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete video");
      }

      setVideos((prev) => prev.filter((v) => v.video_id !== videoId));
      if (selectedVideo?.video_id === videoId) {
        setSelectedVideo(null);
      }

      toast({
        title: "Success",
        description: "Video summary deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting video:", error);
      toast({
        title: "Error",
        description: "Failed to delete video summary",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      const trimmedLine = line.trim();
      
      // Handle numbered lists
      const numberedListMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberedListMatch) {
        const content = renderInlineMarkdown(numberedListMatch[2]);
        return (
          <div key={lineIndex} className="mb-2">
            <span className="font-semibold text-slate-900">{numberedListMatch[1]}.</span> {content}
          </div>
        );
      }
      
      // Handle bullet points
      const bulletMatch = trimmedLine.match(/^[\-\*]\s+(.+)$/);
      if (bulletMatch) {
        const content = renderInlineMarkdown(bulletMatch[1]);
        return (
          <div key={lineIndex} className="mb-1 ml-4">
            <span className="mr-2">•</span> {content}
          </div>
        );
      }
      
      // Headers
      if (trimmedLine.startsWith('##')) {
        return (
          <h3 key={lineIndex} className="text-lg font-bold text-slate-900 mt-4 mb-2">
            {renderInlineMarkdown(trimmedLine.replace(/^##+\s*/, ''))}
          </h3>
        );
      }
      
      if (trimmedLine.startsWith('#')) {
        return (
          <h2 key={lineIndex} className="text-xl font-bold text-slate-900 mt-4 mb-2">
            {renderInlineMarkdown(trimmedLine.replace(/^#+\s*/, ''))}
          </h2>
        );
      }
      
      // Regular line
      if (trimmedLine) {
        return (
          <div key={lineIndex} className="mb-2">
            {renderInlineMarkdown(trimmedLine)}
          </div>
        );
      }
      
      return <div key={lineIndex} className="h-2" />;
    });
  };

  const renderInlineMarkdown = (text: string): React.ReactElement => {
    const parts: (string | React.ReactElement)[] = [];
    let key = 0;

    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      parts.push(
        <strong key={key++} className="font-semibold text-slate-900">
          {match[1]}
        </strong>
      );
      
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    if (parts.length === 0) {
      return <>{text}</>;
    }

    return <>{parts}</>;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-2 mb-6 flex-shrink-0">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          YouTube Video Summaries
        </h2>
        <p className="text-slate-600 text-lg">
          Get AI-powered summaries of YouTube videos to help you learn faster
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 flex-1 min-h-0 overflow-hidden">
        {/* Left Panel - Upload & List */}
        <div className="space-y-6 overflow-y-auto">
          <VideoSummaryUpload onUploadSuccess={handleUploadSuccess} />

          <Card className="border border-slate-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200">
              <CardTitle className="text-indigo-700">Your Video Summaries</CardTitle>
              <CardDescription className="text-slate-600">
                View and manage your saved video summaries
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
                    <Youtube className="h-8 w-8 text-indigo-600" />
                  </div>
                  <p className="text-slate-600 font-medium">
                    No video summaries yet. Upload your first video to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className={cn(
                        "p-4 border rounded-xl bg-white hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer",
                        selectedVideo?.video_id === video.video_id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200"
                      )}
                      onClick={() => setSelectedVideo(video)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Youtube className="h-5 w-5 text-red-600 flex-shrink-0" />
                            <h3 className="font-semibold text-slate-900 truncate">
                              {video.video_title || "YouTube Video"}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">
                            {formatDate(video.created_at)}
                          </p>
                          <a
                            href={video.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Watch on YouTube
                          </a>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(video.video_id);
                          }}
                          disabled={isDeleting === video.video_id}
                          className="hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                        >
                          {isDeleting === video.video_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Summary Display */}
        <div className="h-full min-h-0 overflow-hidden">
          <Card className="h-full border border-slate-200 shadow-lg flex flex-col">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Video Summary</CardTitle>
                  <CardDescription className="text-indigo-100">
                    {selectedVideo 
                      ? `Summary for: ${selectedVideo.video_title || 'YouTube Video'}`
                      : "Select a video to view its summary"}
                  </CardDescription>
                </div>
                {selectedVideo && (
                  <ShareDialog
                    type="summary"
                    title={selectedVideo.video_title || "YouTube Video Summary"}
                    content={selectedVideo.summary}
                    trigger={
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                    }
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-6">
              {selectedVideo ? (
                <div className="prose prose-slate max-w-none">
                  <div className="text-sm leading-relaxed text-slate-700">
                    {renderMarkdown(selectedVideo.summary)}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <Youtube className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600">
                      Select a video from the list to view its summary
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Youtube, Loader2, Sparkles } from "lucide-react";

interface VideoSummaryUploadProps {
  onUploadSuccess?: () => void;
}

export function VideoSummaryUpload({ onUploadSuccess }: VideoSummaryUploadProps) {
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube video URL",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
      toast({
        title: "Error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/youtube/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoUrl: videoUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if quota exceeded
        if (data.quotaExceeded) {
          toast({
            title: "Quota Limit Exceeded",
            description: data.message || `You have reached your free limit. Please upgrade to generate more summaries.`,
            variant: "destructive",
          });
          return;
        }
        
        const errorMsg = data.error || "Failed to generate summary";
        const details = data.details ? `\n\nDetails: ${data.details}` : '';
        const suggestion = data.suggestion ? `\n\n${data.suggestion}` : '';
        throw new Error(`${errorMsg}${details}${suggestion}`);
      }

      toast({
        title: data.cached ? "Summary Retrieved" : "Summary Generated",
        description: data.cached 
          ? "Found existing summary for this video"
          : "Video summary generated successfully!",
      });

      setVideoUrl("");
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-slate-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200">
        <CardTitle className="flex items-center gap-2 text-indigo-700">
          <Youtube className="h-5 w-5" />
          YouTube Video Summary
        </CardTitle>
        <CardDescription className="text-slate-600">
          Paste a YouTube video URL to get an AI-generated summary
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="videoUrl" className="text-sm font-medium text-slate-700">
              YouTube Video URL
            </label>
            <Input
              id="videoUrl"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={isLoading}
              className="border-slate-300 focus:border-indigo-500"
            />
            <p className="text-xs text-slate-500">
              Supports youtube.com and youtu.be links. Video must have captions enabled.
            </p>
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-800">
                <p className="mb-2">
                  <strong>Note:</strong> If you get an error even with captions enabled, the video might have:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1 mb-2">
                  <li>Region-restricted captions</li>
                  <li>Auto-generated captions that aren't accessible</li>
                  <li>Age-restricted or private video settings</li>
                </ul>
                <p>
                  Try a different video or ensure captions are manually added by the creator.
                </p>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !videoUrl.trim()}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Summary...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Summary
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

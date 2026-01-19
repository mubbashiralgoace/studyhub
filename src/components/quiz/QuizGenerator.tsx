"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, Youtube, Loader2, Brain, Sparkles, ChevronDown } from "lucide-react";

interface Document {
  documentId: string;
  filename: string;
  fileType: string;
  uploadedAt: string;
  chunks: number;
}

interface Video {
  id: string;
  video_id: string;
  video_title: string;
  created_at: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  sourceType: string;
  sourceId: string;
  sourceName: string;
  difficulty: string;
  questions: QuizQuestion[];
  generatedAt: string;
}

interface QuizGeneratorProps {
  onQuizGenerated: (quiz: Quiz) => void;
}

export function QuizGenerator({ onQuizGenerated }: QuizGeneratorProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [sourceType, setSourceType] = useState<"document" | "video" | "">("");
  const [sourceId, setSourceId] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>("medium");

  // Load documents and videos on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        // Load documents
        const docsResponse = await fetch("/api/notes/documents");
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          setDocuments(docsData.documents || []);
        }

        // Load videos
        const videosResponse = await fetch("/api/youtube/videos");
        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          setVideos(videosData.videos || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  const handleGenerate = async () => {
    if (!sourceType || !sourceId) {
      toast({
        title: "Selection Required",
        description: "Please select a source type and content to generate quiz from.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceType,
          sourceId,
          questionCount,
          difficulty,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz");
      }

      toast({
        title: "Quiz Generated!",
        description: `${data.quiz.questions.length} questions created from ${data.quiz.sourceName}`,
      });

      onQuizGenerated(data.quiz);
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate quiz",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedSourceName = () => {
    if (!sourceId) return "";
    if (sourceType === "document") {
      const doc = documents.find(d => d.documentId === sourceId);
      return doc?.filename || "";
    } else {
      const video = videos.find(v => v.id === sourceId);
      return video?.video_title || "";
    }
  };

  return (
    <Card className="border border-slate-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200">
        <CardTitle className="flex items-center gap-2 text-indigo-700">
          <Brain className="h-5 w-5" />
          Quiz Generator
        </CardTitle>
        <CardDescription className="text-slate-600">
          Generate quiz questions from your uploaded documents or YouTube video summaries
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-slate-600">Loading your content...</span>
          </div>
        ) : (
          <>
            {/* Source Type Selection - Custom Buttons */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">Select Source Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSourceType("document");
                    setSourceId("");
                  }}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                    sourceType === "document"
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                >
                  <FileText className={`h-8 w-8 ${sourceType === "document" ? "text-blue-600" : "text-slate-400"}`} />
                  <span className={`font-medium ${sourceType === "document" ? "text-blue-700" : "text-slate-600"}`}>
                    Documents
                  </span>
                  <span className="text-xs text-slate-500">{documents.length} available</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setSourceType("video");
                    setSourceId("");
                  }}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                    sourceType === "video"
                      ? "border-red-500 bg-red-50 shadow-md"
                      : "border-slate-200 hover:border-red-300 hover:bg-red-50/50"
                  }`}
                >
                  <Youtube className={`h-8 w-8 ${sourceType === "video" ? "text-red-600" : "text-slate-400"}`} />
                  <span className={`font-medium ${sourceType === "video" ? "text-red-700" : "text-slate-600"}`}>
                    YouTube Videos
                  </span>
                  <span className="text-xs text-slate-500">{videos.length} available</span>
                </button>
              </div>
            </div>

            {/* Source Selection - Custom Dropdown */}
            {sourceType && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">
                  Select {sourceType === "document" ? "Document" : "Video"}
                </label>
                
                {sourceType === "document" && documents.length === 0 && (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <FileText className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-600">No documents found</p>
                    <p className="text-sm text-slate-500">Upload some documents first in the Notes section</p>
                  </div>
                )}
                
                {sourceType === "video" && videos.length === 0 && (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <Youtube className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-600">No videos found</p>
                    <p className="text-sm text-slate-500">Add some YouTube video summaries first</p>
                  </div>
                )}

                {sourceType === "document" && documents.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {documents.map((doc, index) => {
                      const docId = doc.documentId || `doc-fallback-${index}`;
                      return (
                        <button
                          key={`doc-${docId}-${index}`}
                          type="button"
                          onClick={() => {
                            console.log("Setting sourceId to:", docId);
                            setSourceId(docId);
                          }}
                          className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all ${
                            sourceId === docId
                              ? "bg-blue-100 border-2 border-blue-500"
                              : "bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                          }`}
                        >
                          <FileText className={`h-5 w-5 flex-shrink-0 ${sourceId === docId ? "text-blue-600" : "text-slate-400"}`} />
                          <span className={`truncate ${sourceId === docId ? "text-blue-700 font-medium" : "text-slate-700"}`}>
                            {doc.filename}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {sourceType === "video" && videos.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {videos.map((video, index) => {
                      const videoId = video.id || `video-fallback-${index}`;
                      return (
                        <button
                          key={`video-${videoId}-${index}`}
                          type="button"
                          onClick={() => {
                            console.log("Setting sourceId to:", videoId);
                            setSourceId(videoId);
                          }}
                          className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all ${
                            sourceId === videoId
                              ? "bg-red-100 border-2 border-red-500"
                              : "bg-white border border-slate-200 hover:bg-red-50 hover:border-red-300"
                          }`}
                        >
                          <Youtube className={`h-5 w-5 flex-shrink-0 ${sourceId === videoId ? "text-red-600" : "text-slate-400"}`} />
                          <span className={`truncate ${sourceId === videoId ? "text-red-700 font-medium" : "text-slate-700"}`}>
                            {video.video_title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {sourceId && sourceId !== "" && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-green-600 text-sm">✓ Selected:</span>
                    <span className="text-green-800 font-medium text-sm truncate">{getSelectedSourceName()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quiz Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">Quiz Settings</label>
              <div className="grid grid-cols-2 gap-4">
                {/* Question Count */}
                <div className="space-y-2">
                  <span className="text-xs text-slate-500">Number of Questions</span>
                  <div className="flex gap-2">
                    {[3, 5, 10, 15].map((count) => (
                      <button
                        key={`count-${count}`}
                        type="button"
                        onClick={() => setQuestionCount(count)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          questionCount === count
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                  <span className="text-xs text-slate-500">Difficulty Level</span>
                  <div className="flex gap-2">
                    {[
                      { value: "easy", label: "Easy", color: "green" },
                      { value: "medium", label: "Med", color: "yellow" },
                      { value: "hard", label: "Hard", color: "red" },
                    ].map((level) => (
                      <button
                        key={`difficulty-${level.value}`}
                        type="button"
                        onClick={() => setDifficulty(level.value)}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          difficulty === level.value
                            ? level.color === "green"
                              ? "bg-green-600 text-white shadow-md"
                              : level.color === "yellow"
                              ? "bg-yellow-500 text-white shadow-md"
                              : "bg-red-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isLoading || sourceType === "" || sourceId === ""}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all text-base disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Quiz
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

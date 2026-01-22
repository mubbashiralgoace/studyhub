"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  BookOpen,
  Youtube,
  Brain,
  Map,
  ClipboardList,
  ListChecks,
  Lamp,
  MessageSquare,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Share2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ShareDialog } from "@/components/share/ShareDialog";

type Flashcard = {
  front: string;
  back: string;
  tag: string;
};

type Concept = {
  title: string;
  importance: string;
  detail: string;
};

type PlanItem = {
  title: string;
  focus: string;
  actions: string[];
};

type Recommendation = {
  title: string;
  reason: string;
  action: string;
};

type Citation = {
  source: string;
  snippet: string;
};

type Answer = {
  text: string;
  citations: Citation[];
};

export default function AILabPage() {
  const { toast } = useToast();

  // Documents and Videos
  const [documents, setDocuments] = useState<Array<{ documentId: string; filename: string }>>([]);
  const [videos, setVideos] = useState<Array<{ id: string; video_title: string }>>([]);

  // Flashcard state
  const [flashcardSource, setFlashcardSource] = useState("documents");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [customText, setCustomText] = useState("");
  const [flashcardCount, setFlashcardCount] = useState(6);
  const [flashcardFocus, setFlashcardFocus] = useState("");
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

  // Concepts state
  const [conceptInput, setConceptInput] = useState("");
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [conceptMap, setConceptMap] = useState<string[][]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  // Study plan state
  const [focusArea, setFocusArea] = useState("");
  const [duration, setDuration] = useState(3);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);

  // Q&A state
  const [question, setQuestion] = useState("");
  const [searchIn, setSearchIn] = useState("all");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);

  // Load documents and videos on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [docsRes, videosRes] = await Promise.all([
          fetch("/api/notes/documents"),
          fetch("/api/youtube/videos"),
        ]);

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData.documents || []);
        }

        if (videosRes.ok) {
          const videosData = await videosRes.json();
          setVideos(videosData.videos || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, []);

  const handleGenerateFlashcards = async () => {
    if (flashcardSource === "documents" && !selectedDocId) {
      toast({
        title: "Error",
        description: "Please select a document",
        variant: "destructive",
      });
      return;
    }

    if (flashcardSource === "youtube" && !selectedVideoId) {
      toast({
        title: "Error",
        description: "Please select a video",
        variant: "destructive",
      });
      return;
    }

    if (flashcardSource === "custom" && !customText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingFlashcards(true);
    try {
      const response = await fetch("/api/ai/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: flashcardSource === "documents" ? "documents" : flashcardSource === "youtube" ? "youtube" : "custom",
          sourceId: flashcardSource === "documents" ? selectedDocId : flashcardSource === "youtube" ? selectedVideoId : null,
          customText: flashcardSource === "custom" ? customText : null,
          count: flashcardCount,
          focus: flashcardFocus || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to generate flashcards";
        const details = data.details ? `\n\nDetails: ${data.details}` : '';
        throw new Error(`${errorMsg}${details}`);
      }

      setFlashcards(data.flashcards || []);
      toast({
        title: "Success",
        description: `Generated ${data.flashcards?.length || 0} flashcards`,
      });
    } catch (error) {
      console.error("Error generating flashcards:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate flashcards",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleExtractConcepts = async () => {
    if (!conceptInput.trim() || conceptInput.trim().length < 50) {
      toast({
        title: "Error",
        description: "Please enter at least 50 characters of text",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      const response = await fetch("/api/ai/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: conceptInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract concepts");
      }

      setConcepts(data.concepts || []);
      setConceptMap(data.conceptMap || []);
      toast({
        title: "Success",
        description: `Extracted ${data.concepts?.length || 0} key concepts`,
      });
    } catch (error) {
      console.error("Error extracting concepts:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to extract concepts",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGeneratePlan = async () => {
    setIsPlanning(true);
    try {
      const response = await fetch("/api/ai/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focusArea: focusArea || "General study",
          duration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate study plan");
      }

      setPlan(data.plan || []);
      toast({
        title: "Success",
        description: "Study plan generated successfully",
      });
    } catch (error) {
      console.error("Error generating plan:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate study plan",
        variant: "destructive",
      });
    } finally {
      setIsPlanning(false);
    }
  };

  const handleRecommendations = async () => {
    setIsRecommending(true);
    try {
      const response = await fetch("/api/ai/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate recommendations");
      }

      setRecommendations(data.recommendations || []);
      toast({
        title: "Success",
        description: "Recommendations updated",
      });
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate recommendations",
        variant: "destructive",
      });
    } finally {
      setIsRecommending(false);
    }
  };

  const handleAnswerQuestion = async () => {
    if (!question.trim() || question.trim().length < 10) {
      toast({
        title: "Error",
        description: "Please enter a valid question (at least 10 characters)",
        variant: "destructive",
      });
      return;
    }

    setIsAnswering(true);
    try {
      const response = await fetch("/api/ai/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          searchIn,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to answer question");
      }

      setAnswer({
        text: data.answer,
        citations: data.citations || [],
      });
      toast({
        title: "Success",
        description: "Answer generated with citations",
      });
    } catch (error) {
      console.error("Error answering question:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to answer question",
        variant: "destructive",
      });
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          <Sparkles className="h-4 w-4" />
          Enhanced AI Features
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          AI Lab
        </h1>
        <p className="text-slate-600 max-w-3xl">
          Generate flashcards, extract key concepts, build study plans, get
          personalized recommendations, and ask citation-backed questions.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 border border-slate-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
            <CardTitle className="flex items-center gap-2 text-indigo-800">
              <ClipboardList className="h-5 w-5" />
              Flashcard Generator
            </CardTitle>
            <CardDescription>
              Create targeted flashcards from notes, video summaries, or custom text.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Source type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "documents", label: "Notes", icon: BookOpen },
                    { value: "youtube", label: "YouTube", icon: Youtube },
                    { value: "custom", label: "Custom", icon: Sparkles },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = flashcardSource === item.value;
                    return (
                      <Button
                        key={item.value}
                        variant={active ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start",
                          active
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                            : ""
                        )}
                        onClick={() => setFlashcardSource(item.value)}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  How many?
                </label>
                <Input
                  type="number"
                  min={3}
                  max={12}
                  value={flashcardCount}
                  onChange={(e) => setFlashcardCount(Number(e.target.value))}
                />
              </div>
            </div>

            {flashcardSource === "documents" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Select Document
                </label>
                {documents.length === 0 ? (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center text-sm text-slate-600">
                    No documents found. Upload documents in the Notes section first.
                  </div>
                ) : (
                  <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a document" />
                    </SelectTrigger>
                    <SelectContent className="!w-[var(--radix-select-trigger-width)] max-w-[500px]">
                      {documents.map((doc) => (
                        <SelectItem 
                          key={doc.documentId} 
                          value={doc.documentId}
                          title={doc.filename}
                        >
                          {doc.filename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {flashcardSource === "youtube" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Select Video
                </label>
                {videos.length === 0 ? (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center text-sm text-slate-600">
                    No videos found. Add YouTube video summaries first.
                  </div>
                ) : (
                  <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a video" />
                    </SelectTrigger>
                    <SelectContent className="!w-[var(--radix-select-trigger-width)] max-w-[500px]">
                      {videos.map((video) => (
                        <SelectItem 
                          key={video.id} 
                          value={video.id}
                          title={video.video_title || "Untitled Video"}
                        >
                          {video.video_title || "Untitled Video"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {flashcardSource === "custom" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Enter Text
                </label>
                <Textarea
                  placeholder="Paste your text here..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Focus (optional)
              </label>
              <Input
                placeholder="e.g., focus on mechanisms and pitfalls"
                value={flashcardFocus}
                onChange={(e) => setFlashcardFocus(e.target.value)}
              />
            </div>

            <Button
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
              onClick={handleGenerateFlashcards}
              disabled={isGeneratingFlashcards}
            >
              {isGeneratingFlashcards ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Flashcards
                </>
              )}
            </Button>

            {flashcards.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    {flashcards.length} Flashcards Generated
                  </p>
                  <ShareDialog
                    type="flashcards"
                    title={`${flashcards.length} Flashcards`}
                    content={flashcards}
                    trigger={
                      <Button variant="outline" size="sm" className="gap-2">
                        <Share2 className="h-4 w-4" />
                        Share Flashcards
                      </Button>
                    }
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {flashcards.map((card, idx) => (
                    <div
                      key={`${card.front}-${idx}`}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{card.tag}</Badge>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                      <p className="font-semibold text-slate-900">{card.front}</p>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        {card.back}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border border-slate-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Brain className="h-5 w-5" />
                Key Concepts & Map
              </CardTitle>
              <CardDescription>
                Extract key ideas and see how they connect.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Textarea
                placeholder="Describe the topic or paste text (min 50 chars)..."
                value={conceptInput}
                onChange={(e) => setConceptInput(e.target.value)}
                rows={4}
              />
              <Button
                className="w-full"
                variant="secondary"
                onClick={handleExtractConcepts}
                disabled={isExtracting || !conceptInput.trim()}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Map className="mr-2 h-4 w-4" />
                    Extract Concepts
                  </>
                )}
              </Button>
              {concepts.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      {concepts.length} Concepts Extracted
                    </p>
                    <ShareDialog
                      type="concepts"
                      title={`${concepts.length} Key Concepts`}
                      content={{ concepts, conceptMap }}
                      trigger={
                        <Button variant="outline" size="sm" className="gap-2">
                          <Share2 className="h-4 w-4" />
                          Share
                        </Button>
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    {concepts.map((concept, idx) => (
                      <div
                        key={`${concept.title}-${idx}`}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900">
                            {concept.title}
                          </p>
                          <Badge variant="outline">{concept.importance}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {concept.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                  {conceptMap.length > 0 && (
                    <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50 p-3 text-sm text-indigo-800">
                      <p className="font-semibold mb-1">Concept Map</p>
                      <div className="space-y-1">
                        {conceptMap.map(([from, to], idx) => (
                          <div key={`${from}-${to}-${idx}`} className="flex items-center gap-2">
                            <span className="font-medium">{from}</span>
                            <ChevronRight className="h-4 w-4 text-indigo-500" />
                            <span className="text-slate-700">{to}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b">
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <Lamp className="h-5 w-5" />
                Personalized Recommendations
              </CardTitle>
              <CardDescription>
                Quick guidance based on your study activity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRecommendations}
                disabled={isRecommending}
              >
                {isRecommending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Get Recommendations
                  </>
                )}
              </Button>
              {recommendations.length > 0 && (
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <div
                      key={`${rec.title}-${idx}`}
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <p className="font-semibold text-slate-900">{rec.title}</p>
                      <p className="text-sm text-slate-600">{rec.reason}</p>
                      <p className="mt-1 text-sm font-medium text-indigo-700">
                        Next: {rec.action}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-slate-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <ListChecks className="h-5 w-5" />
              Study Plan Generator
            </CardTitle>
            <CardDescription>
              Build a personalized study plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Focus area
                </label>
                <Input
                  placeholder="e.g., Retrieval practice"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Duration (days)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={14}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>
            </div>
            <Button
              onClick={handleGeneratePlan}
              disabled={isPlanning}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
            >
              {isPlanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Generate Plan
                </>
              )}
            </Button>
            {plan.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    {plan.length}-Day Study Plan
                  </p>
                  <ShareDialog
                    type="study-plan"
                    title={`${plan.length}-Day Study Plan: ${focusArea || "General"}`}
                    content={plan}
                    trigger={
                      <Button variant="outline" size="sm" className="gap-2">
                        <Share2 className="h-4 w-4" />
                        Share Plan
                      </Button>
                    }
                  />
                </div>
                <div className="space-y-3">
                  {plan.map((item, idx) => (
                    <div
                      key={`${item.title}-${idx}`}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <Badge variant="outline">Day {idx + 1}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{item.focus}</p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700 list-disc list-inside">
                        {item.actions.map((action, actIdx) => (
                          <li key={`${action}-${actIdx}`}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-b">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Question Answering with Citations
            </CardTitle>
            <CardDescription className="text-indigo-100">
              Ask questions and see evidence from your notes and videos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Textarea
              placeholder="Ask a question, e.g., Why does spaced repetition work better than rereading?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
            />
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={searchIn === "all" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setSearchIn("all")}
              >
                <Brain className="mr-2 h-4 w-4" />
                All
              </Button>
              <Button
                variant={searchIn === "documents" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setSearchIn("documents")}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Notes
              </Button>
              <Button
                variant={searchIn === "videos" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setSearchIn("videos")}
              >
                <Youtube className="mr-2 h-4 w-4" />
                Videos
              </Button>
            </div>
            <Button
              onClick={handleAnswerQuestion}
              disabled={isAnswering || !question.trim()}
              className="w-full bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
            >
              {isAnswering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Answer with Citations
                </>
              )}
            </Button>
            {answer && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-900">
                <p className="font-semibold">Answer</p>
                <p className="mt-1 text-sm leading-relaxed">{answer.text}</p>
                {answer.citations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="font-semibold text-sm">Citations:</p>
                    {answer.citations.map((cite, idx) => (
                      <div
                        key={`${cite.source}-${idx}`}
                        className="rounded-lg bg-white/70 px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-indigo-800">{cite.source}</p>
                        <p className="text-slate-700">{cite.snippet}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

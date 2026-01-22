"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Clock,
  Eye,
  BookOpen,
  Brain,
  Sparkles,
  ClipboardList,
  Map,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Home,
} from "lucide-react";
import Link from "next/link";

interface ShareData {
  id: string;
  type: string;
  title: string;
  content: unknown;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
}

interface Flashcard {
  front: string;
  back: string;
  tag: string;
}

interface Concept {
  title: string;
  importance: string;
  detail: string;
}

interface PlanItem {
  title: string;
  focus: string;
  actions: string[];
}

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);

  useEffect(() => {
    const fetchShare = async () => {
      try {
        const response = await fetch(`/api/share?id=${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load shared content");
        }

        setShareData(data.share);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchShare();
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      flashcards: <ClipboardList className="h-5 w-5" />,
      summary: <BookOpen className="h-5 w-5" />,
      quiz: <Brain className="h-5 w-5" />,
      "study-plan": <Sparkles className="h-5 w-5" />,
      concepts: <Map className="h-5 w-5" />,
    };
    return icons[type] || <BookOpen className="h-5 w-5" />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      flashcards: "Flashcards",
      summary: "Summary",
      quiz: "Quiz",
      "study-plan": "Study Plan",
      concepts: "Concepts",
    };
    return labels[type] || type;
  };

  const renderContent = () => {
    if (!shareData) return null;

    switch (shareData.type) {
      case "flashcards":
        return renderFlashcards(shareData.content as Flashcard[]);
      case "concepts":
        return renderConcepts(shareData.content as { concepts: Concept[]; conceptMap: string[][] });
      case "study-plan":
        return renderStudyPlan(shareData.content as PlanItem[]);
      case "summary":
        return renderSummary(shareData.content as string);
      default:
        return (
          <div className="text-slate-600">
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(shareData.content, null, 2)}
            </pre>
          </div>
        );
    }
  };

  const renderFlashcards = (flashcards: Flashcard[]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {flashcards.map((card, idx) => (
        <div
          key={`${card.front}-${idx}`}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              {card.tag}
            </Badge>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="font-semibold text-slate-900">{card.front}</p>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{card.back}</p>
        </div>
      ))}
    </div>
  );

  const renderConcepts = (data: { concepts: Concept[]; conceptMap: string[][] }) => (
    <div className="space-y-4">
      <div className="space-y-3">
        {data.concepts?.map((concept, idx) => (
          <div
            key={`${concept.title}-${idx}`}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">{concept.title}</p>
              <Badge variant="outline">{concept.importance}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">{concept.detail}</p>
          </div>
        ))}
      </div>
      {data.conceptMap && data.conceptMap.length > 0 && (
        <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-sm text-indigo-800">
          <p className="font-semibold mb-2">Concept Map</p>
          <div className="space-y-1">
            {data.conceptMap.map(([from, to], idx) => (
              <div key={`${from}-${to}-${idx}`} className="flex items-center gap-2">
                <span className="font-medium">{from}</span>
                <ChevronRight className="h-4 w-4 text-indigo-500" />
                <span className="text-slate-700">{to}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStudyPlan = (plan: PlanItem[]) => (
    <div className="space-y-3">
      {plan.map((item, idx) => (
        <div
          key={`${item.title}-${idx}`}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">{item.title}</p>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Day {idx + 1}
            </Badge>
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
  );

  const renderSummary = (summary: string) => (
    <div className="prose prose-slate max-w-none">
      <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
        {summary}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Content Not Available
            </h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4">
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              StudyHub
            </span>
          </Link>
          <p className="text-slate-500 text-sm">Shared Content</p>
        </div>

        {/* Main Content Card */}
        <Card className="shadow-xl border-slate-200">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                {getTypeIcon(shareData?.type || "")}
              </div>
              <div>
                <CardTitle className="text-white text-xl">
                  {shareData?.title}
                </CardTitle>
                <CardDescription className="text-indigo-100">
                  {getTypeLabel(shareData?.type || "")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Expires: {formatDate(shareData?.expiresAt || "")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Eye className="h-4 w-4 text-blue-500" />
                <span>{shareData?.viewCount} views</span>
              </div>
            </div>

            {/* Content */}
            {renderContent()}
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <div className="text-center mt-8">
          <p className="text-slate-600 mb-4">
            Want to create your own study materials?
          </p>
          <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <Link href="/auth/signup">
              <Sparkles className="mr-2 h-4 w-4" />
              Join StudyHub Free
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Youtube,
  Brain,
  Share2,
  TrendingUp,
  Clock,
  Eye,
  ArrowRight,
  Sparkles,
  BookOpen,
  Trophy,
  Target,
  Zap,
  Activity,
  CheckCircle,
  Circle,
} from "lucide-react";
import { useUserStore } from "@/store/useUserStore";
import { usePathname } from "next/navigation";
import { useActivityTracker } from "@/hooks/useActivityTracker";

interface Stats {
  documents: {
    total: number;
    recent: Array<{ id: string; filename: string; created_at: string }>;
  };
  videos: {
    total: number;
    recent: Array<{ id: string; video_title: string; created_at: string }>;
  };
  quizzes: {
    total: number;
    averageScore: number;
    totalCorrect: number;
  };
  shares: {
    total: number;
    totalViews: number;
  };
}

export default function DashboardPage() {
  const { user } = useUserStore();
  const pathname = usePathname();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Activity Tracker - Auto tracks productive time
  const {
    isActive,
    todayFormatted,
    thisWeekFormatted,
    allTimeFormatted,
    pageStats,
  } = useActivityTracker(pathname);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats");
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getUserName = () => {
    if (!user?.email) return "Student";
    return user.email.split("@")[0];
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <span className="text-indigo-200 text-sm font-medium">
              {getGreeting()}
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {getUserName()}!
          </h1>
          <p className="text-indigo-100 max-w-xl">
            Track your study progress, manage your notes, and boost your learning with AI-powered tools.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Documents Card */}
        <Card className="border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Documents
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold text-slate-900">
                  {stats?.documents.total || 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  <BookOpen className="inline h-3 w-3 mr-1" />
                  Notes uploaded
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Videos Card */}
        <Card className="border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Video Summaries
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Youtube className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold text-slate-900">
                  {stats?.videos.total || 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  Videos summarized
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quizzes Card */}
        <Card className="border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Quizzes Taken
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Brain className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold text-slate-900">
                  {stats?.quizzes.total || 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  <Trophy className="inline h-3 w-3 mr-1" />
                  Avg Score: {stats?.quizzes.averageScore || 0}%
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Shares Card */}
        <Card className="border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Shared Content
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold text-slate-900">
                  {stats?.shares.total || 0}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  <Eye className="inline h-3 w-3 mr-1" />
                  {stats?.shares.totalViews || 0} total views
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Tracker */}
      <Card className="border-slate-200 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <Activity className="h-5 w-5" />
              Activity Tracker
              {isActive ? (
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                  <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
                  Active
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  <Circle className="h-2 w-2 fill-slate-400 text-slate-400" />
                  Idle
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Auto-tracks your productive time
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Today's Time */}
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-emerald-600 mb-1">
                {todayFormatted}
              </div>
              <p className="text-sm text-slate-500">Today&apos;s productive time</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-slate-800">{thisWeekFormatted}</div>
                <p className="text-xs text-slate-500">This Week</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-slate-800">{allTimeFormatted}</div>
                <p className="text-xs text-slate-500">All Time</p>
              </div>
            </div>

            {/* Page-wise Breakdown */}
            {pageStats.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 mb-2">Time by Section</p>
                {pageStats.slice(0, 4).map((stat) => (
                  <div key={stat.page} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-slate-600 capitalize">
                        {stat.page === "dashboard" ? "Dashboard" : stat.page.replace("-", " ")}
                      </span>
                    </div>
                    <span className="font-medium text-slate-800">{stat.formatted}</span>
                  </div>
                ))}
              </div>
            )}

            {/* How it works */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                Automatically tracks when you&apos;re active. Pauses after 2 min of inactivity.
              </p>
            </div>
          </CardContent>
        </Card>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Zap className="h-5 w-5 text-amber-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Jump right into your study activities
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/dashboard/notes">
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-4 hover:border-blue-300 hover:bg-blue-50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">Upload Notes</p>
                    <p className="text-xs text-slate-500">Add PDF, DOCX, or TXT files</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Button>
            </Link>

            <Link href="/dashboard/youtube">
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-4 hover:border-red-300 hover:bg-red-50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                    <Youtube className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">Summarize Video</p>
                    <p className="text-xs text-slate-500">Get AI summary of YouTube videos</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
              </Button>
            </Link>

            <Link href="/dashboard/quiz">
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-4 hover:border-emerald-300 hover:bg-emerald-50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                    <Brain className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">Take a Quiz</p>
                    <p className="text-xs text-slate-500">Test your knowledge with AI quizzes</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </Button>
            </Link>

            <Link href="/dashboard/ai-lab">
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-4 hover:border-purple-300 hover:bg-purple-50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900">AI Lab</p>
                    <p className="text-xs text-slate-500">Flashcards, study plans & more</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Clock className="h-5 w-5 text-indigo-500" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Your latest uploads and summaries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Recent Documents */}
                {stats?.documents.recent.slice(0, 2).map((doc) => (
                  <Link
                    key={doc.id}
                    href="/dashboard/notes"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate group-hover:text-blue-600">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </Link>
                ))}

                {/* Recent Videos */}
                {stats?.videos.recent.slice(0, 2).map((video) => (
                  <Link
                    key={video.id}
                    href="/dashboard/youtube"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <Youtube className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate group-hover:text-red-600">
                        {video.video_title || "YouTube Video"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(video.created_at)}
                      </p>
                    </div>
                  </Link>
                ))}

                {/* Empty State */}
                {(!stats?.documents.recent.length && !stats?.videos.recent.length) && (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No activity yet</p>
                    <p className="text-sm text-slate-500">
                      Start by uploading notes or summarizing a video
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Study Tips */}
      <Card className="border-slate-200 shadow-lg bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Sparkles className="h-5 w-5 text-amber-600" />
            Study Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-medium text-amber-900">Use Flashcards</p>
                <p className="text-sm text-amber-700">
                  Spaced repetition improves long-term memory retention
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-medium text-amber-900">Take Quizzes</p>
                <p className="text-sm text-amber-700">
                  Active recall is more effective than passive reading
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-medium text-amber-900">Review Summaries</p>
                <p className="text-sm text-amber-700">
                  Summarizing helps identify key concepts quickly
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { QuizGenerator } from "@/components/quiz/QuizGenerator";
import { QuizDisplay } from "@/components/quiz/QuizDisplay";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Sparkles, FileText, Youtube } from "lucide-react";

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

export default function QuizPage() {
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);

  const handleQuizGenerated = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
  };

  const handleReset = () => {
    setCurrentQuiz(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <Brain className="h-7 w-7 text-indigo-600" />
              Quiz Generator
            </h2>
            <p className="text-slate-600 mt-1">
              Test your knowledge with AI-generated quizzes from your study materials
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Quiz Generator or Display */}
          <div className="space-y-6">
            {currentQuiz ? (
              <QuizDisplay quiz={currentQuiz} onReset={handleReset} />
            ) : (
              <QuizGenerator onQuizGenerated={handleQuizGenerated} />
            )}
          </div>

          {/* Right Column - Info/Tips */}
          <div className="space-y-6">
            {!currentQuiz && (
              <>
                {/* Features Card */}
                <Card className="border border-slate-200 shadow-lg">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                      How It Works
                    </h3>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">Select Source</p>
                          <p className="text-sm text-slate-500">
                            Choose from your uploaded documents or YouTube video summaries
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">Configure Quiz</p>
                          <p className="text-sm text-slate-500">
                            Set number of questions and difficulty level
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                          3
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">Take Quiz</p>
                          <p className="text-sm text-slate-500">
                            Answer questions and get instant feedback with explanations
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Source Types Card */}
                <Card className="border border-slate-200 shadow-lg">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-slate-800 mb-4">
                      Supported Sources
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">Documents</p>
                          <p className="text-sm text-blue-600">
                            Generate quizzes from PDF, DOCX, or TXT files you've uploaded
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                        <Youtube className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">YouTube Videos</p>
                          <p className="text-sm text-red-600">
                            Create quizzes from your saved YouTube video summaries
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tips Card */}
                <Card className="border border-slate-200 shadow-lg bg-gradient-to-r from-amber-50 to-yellow-50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-amber-800 mb-3">💡 Pro Tips</h3>
                    <ul className="space-y-2 text-sm text-amber-700">
                      <li>• Start with "Medium" difficulty to gauge your knowledge</li>
                      <li>• Use "Easy" for quick revision before exams</li>
                      <li>• Try "Hard" to challenge yourself on familiar topics</li>
                      <li>• Read explanations carefully to learn from mistakes</li>
                      <li>• Retry quizzes to improve your score</li>
                    </ul>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Quiz Stats when quiz is active */}
            {currentQuiz && (
              <Card className="border border-slate-200 shadow-lg">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-slate-800 mb-4">Quiz Info</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Source</span>
                      <span className="font-medium text-slate-800 truncate max-w-[150px]">
                        {currentQuiz.sourceName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Type</span>
                      <span className="font-medium text-slate-800 capitalize">
                        {currentQuiz.sourceType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Questions</span>
                      <span className="font-medium text-slate-800">
                        {currentQuiz.questions.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Difficulty</span>
                      <span className="font-medium text-slate-800 capitalize">
                        {currentQuiz.difficulty}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

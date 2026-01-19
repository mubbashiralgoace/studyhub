"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Trophy, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  Youtube
} from "lucide-react";

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

interface QuizDisplayProps {
  quiz: Quiz;
  onReset: () => void;
}

export function QuizDisplay({ quiz, onReset }: QuizDisplayProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null)
  );
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const question = quiz.questions[currentQuestion];
  const isAnswered = selectedAnswers[currentQuestion] !== null;
  const isCorrect = selectedAnswers[currentQuestion] === question.correctAnswer;

  const handleAnswer = (optionIndex: number) => {
    if (isAnswered) return;
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = optionIndex;
    setSelectedAnswers(newAnswers);
    setShowExplanation(true);
  };

  const goToNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowExplanation(false);
    } else {
      setShowResults(true);
    }
  };

  const goToPrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setShowExplanation(selectedAnswers[currentQuestion - 1] !== null);
    }
  };

  const calculateScore = () => {
    return selectedAnswers.filter(
      (answer, index) => answer === quiz.questions[index].correctAnswer
    ).length;
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getOptionClassName = (optionIndex: number) => {
    const baseClasses = "w-full p-4 text-left rounded-lg border-2 transition-all duration-200";
    
    if (!isAnswered) {
      return `${baseClasses} border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer`;
    }

    if (optionIndex === question.correctAnswer) {
      return `${baseClasses} border-green-500 bg-green-50 text-green-800`;
    }

    if (optionIndex === selectedAnswers[currentQuestion] && !isCorrect) {
      return `${baseClasses} border-red-500 bg-red-50 text-red-800`;
    }

    return `${baseClasses} border-slate-200 bg-slate-50 text-slate-500`;
  };

  if (showResults) {
    const score = calculateScore();
    const total = quiz.questions.length;
    const percentage = Math.round((score / total) * 100);

    return (
      <Card className="border border-slate-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200 text-center">
          <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
          <CardTitle className="text-2xl text-indigo-700">Quiz Complete!</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(score, total)}`}>
              {score}/{total}
            </div>
            <div className="text-slate-600 mt-2">
              You scored {percentage}%
            </div>
            <div className="mt-4">
              {percentage >= 80 && (
                <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                  Excellent! 🎉
                </Badge>
              )}
              {percentage >= 60 && percentage < 80 && (
                <Badge className="bg-yellow-100 text-yellow-800 text-lg px-4 py-2">
                  Good Job! 👍
                </Badge>
              )}
              {percentage < 60 && (
                <Badge className="bg-red-100 text-red-800 text-lg px-4 py-2">
                  Keep Practicing! 💪
                </Badge>
              )}
            </div>
          </div>

          {/* Question Summary */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700">Question Summary</h3>
            <div className="grid grid-cols-5 gap-2">
              {quiz.questions.map((q, index) => (
                <div
                  key={q.id}
                  className={`p-2 rounded text-center text-sm font-medium ${
                    selectedAnswers[index] === q.correctAnswer
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  Q{index + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => {
                setCurrentQuestion(0);
                setSelectedAnswers(new Array(quiz.questions.length).fill(null));
                setShowResults(false);
                setShowExplanation(false);
              }}
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry Quiz
            </Button>
            <Button
              onClick={onReset}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              Generate New Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {quiz.sourceType === "document" ? (
              <FileText className="h-5 w-5 text-blue-600" />
            ) : (
              <Youtube className="h-5 w-5 text-red-600" />
            )}
            <span className="text-sm text-slate-600 truncate max-w-[200px]">
              {quiz.sourceName}
            </span>
          </div>
          <Badge variant="outline" className="capitalize">
            {quiz.difficulty}
          </Badge>
        </div>
        <div className="flex items-center justify-between mt-2">
          <CardTitle className="text-lg text-indigo-700">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </CardTitle>
          <div className="flex gap-1">
            {quiz.questions.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index === currentQuestion
                    ? "bg-indigo-600"
                    : selectedAnswers[index] !== null
                    ? selectedAnswers[index] === quiz.questions[index].correctAnswer
                      ? "bg-green-500"
                      : "bg-red-500"
                    : "bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Question */}
        <div className="text-lg font-medium text-slate-800">
          {question.question}
        </div>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={isAnswered}
              className={getOptionClassName(index)}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-medium text-slate-600">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1">{option}</span>
                {isAnswered && index === question.correctAnswer && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                {isAnswered && index === selectedAnswers[currentQuestion] && !isCorrect && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Explanation */}
        {showExplanation && isAnswered && (
          <div className={`p-4 rounded-lg ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${isCorrect ? "text-green-800" : "text-red-800"}`}>
                {isCorrect ? "Correct!" : "Incorrect"}
              </span>
            </div>
            <p className="text-slate-700 text-sm">{question.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            onClick={goToPrevious}
            disabled={currentQuestion === 0}
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          {isAnswered && (
            <Button
              onClick={goToNext}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {currentQuestion === quiz.questions.length - 1 ? (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  See Results
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

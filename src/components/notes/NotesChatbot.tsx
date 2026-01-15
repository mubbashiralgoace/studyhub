"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Bot, FileText, Loader2, Send, Sparkles, User } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
  sources?: Array<{ documentId: string; filename: string }>;
}

interface NotesChatbotProps {
  documentId?: string;
}

export function NotesChatbot({ documentId }: NotesChatbotProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load messages from database on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const docIdParam = documentId && documentId.trim() !== '' ? documentId : '';
        const response = await fetch(
          `/api/notes/chat/messages${docIdParam ? `?documentId=${docIdParam}` : ''}`
        );

        if (!response.ok) {
          throw new Error('Failed to load messages');
        }

        const data = await response.json();
        const loadedMessages: Message[] = (data.messages || []).map((msg: {
          id: string;
          message_text: string;
          sender: string;
          sources?: Array<{ documentId: string; filename: string }>;
          created_at: string;
        }) => ({
          id: msg.id,
          text: msg.message_text,
          sender: msg.sender as "user" | "assistant",
          timestamp: new Date(msg.created_at),
          sources: msg.sources,
        }));

        // If no messages, add welcome message
        if (loadedMessages.length === 0) {
          setMessages([
            {
              id: "welcome",
              text: "Hello! I'm your study assistant. I can help you with questions, summaries, and important points from your uploaded notes. What would you like to know?",
              sender: "assistant",
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        // Show welcome message on error
        setMessages([
          {
            id: "welcome",
            text: "Hello! I'm your study assistant. I can help you with questions, summaries, and important points from your uploaded notes. What would you like to know?",
            sender: "assistant",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [documentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Save message to database (skip welcome message)
  const saveMessage = async (message: Message) => {
    // Don't save welcome message
    if (message.id === 'welcome') {
      return;
    }
    
    try {
      const response = await fetch('/api/notes/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageText: message.text,
          sender: message.sender,
          documentId: documentId && documentId.trim() !== '' ? documentId : null,
          sources: message.sources || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error saving message - Response not OK:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error || 'Failed to save message');
      }

      const data = await response.json();
      console.log('Message saved successfully:', data);
    } catch (error) {
      console.error('Error saving message:', error);
      // Don't show error to user, just log it
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    // Save user message to database
    await saveMessage(userMessage);
    
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/notes/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: currentInput,
          documentId: documentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer,
        sender: "assistant",
        timestamp: new Date(),
        sources: data.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      // Save assistant message to database
      await saveMessage(assistantMessage);

      if (data.sources && data.sources.length > 0) {
        toast({
          title: "Answer found",
          description: `Found information from ${data.sources.length} document(s)`,
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I encountered an error. Please try again.",
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      // Save error message to database
      await saveMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    "Summarize the main topics",
    "What are the key concepts?",
    "Give me important questions from the notes",
    "Explain the main ideas",
  ];

  // Function to render markdown-like text (bold, lists, etc.)
  const renderMarkdown = (text: string) => {
    // Split by lines to handle line breaks
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      const trimmedLine = line.trim();
      
      // Handle numbered lists (1. 2. etc.) - also match with leading spaces for nested
      const numberedListMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberedListMatch) {
        const indent = line.length - trimmedLine.length;
        const content = renderInlineMarkdown(numberedListMatch[2]);
        return (
          <div key={lineIndex} className={`mb-2 ${indent > 0 ? 'ml-6' : ''}`}>
            <span className="font-semibold text-slate-900">{numberedListMatch[1]}.</span> {content}
          </div>
        );
      }
      
      // Handle bullet points (- or *) - also match with leading spaces for nested
      const bulletMatch = trimmedLine.match(/^[\-\*]\s+(.+)$/);
      if (bulletMatch) {
        const indent = line.length - trimmedLine.length;
        const content = renderInlineMarkdown(bulletMatch[1]);
        return (
          <div key={lineIndex} className={`mb-1 ${indent > 0 ? 'ml-8' : 'ml-4'}`}>
            <span className="mr-2">•</span> {content}
          </div>
        );
      }
      
      // Regular line with markdown
      if (trimmedLine) {
        return (
          <div key={lineIndex} className="mb-2">
            {renderInlineMarkdown(trimmedLine)}
          </div>
        );
      }
      
      // Empty line
      return <div key={lineIndex} className="h-2" />;
    });
  };

  // Function to render inline markdown (bold, italic, etc.)
  const renderInlineMarkdown = (text: string): React.ReactElement => {
    const parts: (string | React.ReactElement)[] = [];
    let key = 0;

    // Match **bold** text
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add bold text
      parts.push(
        <strong key={key++} className="font-semibold text-slate-900">
          {match[1]}
        </strong>
      );
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // If no bold text found, return original text as JSX
    if (parts.length === 0) {
      return <>{text}</>;
    }

    return <>{parts}</>;
  };

  return (
    <Card className="flex flex-col h-full border border-slate-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-white">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          Study Assistant
        </CardTitle>
        <CardDescription className="text-indigo-100">
          Ask questions about your uploaded notes, get summaries, and find important information
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0" ref={scrollRef}>
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2",
                  message.sender === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.sender === "assistant" && (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-3 shadow-md",
                    message.sender === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                      : "bg-white border border-slate-200 text-slate-900"
                  )}
                >
                  <div className="text-sm leading-relaxed">
                    {renderMarkdown(message.text)}
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Sources:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {message.sources.map((source, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-background rounded border border-slate-200"
                          >
                            {source.filename}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {message.sender === "user" && (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start animate-in fade-in">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-md">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                </div>
              </div>
            )}
            </div>
          )}
        </div>

        {/* Quick Questions */}
        {!isLoadingMessages && (messages.length === 0 || (messages.length === 1 && messages[0]?.id === 'welcome')) && (
          <div className="px-4 py-4 border-t border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex-shrink-0">
            <p className="text-sm text-slate-700 mb-3 font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Quick Questions:
            </p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => handleSend(), 100);
                  }}
                  className="text-sm px-4 py-2 bg-white border border-slate-200 rounded-full hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-4 pb-4 pt-4 border-t border-slate-200 bg-white flex-shrink-0">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your notes..."
              className="flex-1 border border-slate-200 focus:border-indigo-500 rounded-lg"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

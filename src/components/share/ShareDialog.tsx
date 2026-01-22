"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Share2,
  Copy,
  Check,
  Loader2,
  Link as LinkIcon,
  Clock,
  Eye,
} from "lucide-react";

interface ShareDialogProps {
  type: "flashcards" | "summary" | "quiz" | "study-plan" | "concepts";
  title: string;
  content: unknown;
  trigger?: React.ReactNode;
}

export function ShareDialog({ type, title, content, trigger }: ShareDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState("7");

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          content,
          expiresIn: parseInt(expiresIn),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate share link");
      }

      setShareUrl(data.shareUrl);
      setExpiresAt(data.expiresAt);
      toast({
        title: "Link Generated!",
        description: "Your shareable link is ready to copy.",
      });
    } catch (error) {
      console.error("Error generating share link:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate link",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when dialog closes
      setShareUrl(null);
      setExpiresAt(null);
      setCopied(false);
    }
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeLabel = () => {
    const labels: Record<string, string> = {
      flashcards: "Flashcards",
      summary: "Summary",
      quiz: "Quiz",
      "study-plan": "Study Plan",
      concepts: "Concepts",
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-indigo-600" />
            Share {getTypeLabel()}
          </DialogTitle>
          <DialogDescription>
            Generate a shareable link for &quot;{title}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!shareUrl ? (
            <>
              {/* Expiration Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Link expires in
                </label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preview Info */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-medium text-slate-900 mb-2">
                  What will be shared:
                </h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-indigo-500" />
                    {getTypeLabel()}: {title}
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Expires after {expiresIn} day(s)
                  </li>
                  <li className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-emerald-500" />
                    Anyone with link can view
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Generate Share Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Generated Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Your shareable link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-slate-50"
                  />
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className={copied ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expiry Info */}
              {expiresAt && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>
                    Link expires on{" "}
                    <span className="font-medium text-amber-700">
                      {formatExpiryDate(expiresAt)}
                    </span>
                  </span>
                </div>
              )}

              {/* Success Message */}
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <Check className="h-4 w-4" />
                <span>Link is ready! Share it with your friends.</span>
              </div>

              {/* Generate New Link Button */}
              <Button
                onClick={() => {
                  setShareUrl(null);
                  setExpiresAt(null);
                }}
                variant="outline"
                className="w-full"
              >
                Generate New Link
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

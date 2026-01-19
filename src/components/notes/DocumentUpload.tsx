"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedDocument {
  documentId: string;
  filename: string;
  fileType: string;
  uploadedAt: string;
  chunks: number;
}

interface DocumentUploadProps {
  onUploadSuccess?: (document: UploadedDocument) => void;
}

export function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const allowedExtensions = ['pdf', 'docx', 'txt'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension || '')) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, DOCX, and TXT files are allowed.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/notes/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if quota exceeded
        if (errorData.quotaExceeded) {
          toast({
            title: "Quota Limit Exceeded",
            description: errorData.message || `You have reached your free limit. Please upgrade to upload more documents.`,
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      toast({
        title: "Upload successful",
        description: `${selectedFile.name} has been processed and indexed.`,
      });

      if (onUploadSuccess) {
        onUploadSuccess({
          documentId: data.documentId,
          filename: data.filename,
          fileType: data.metadata.fileType,
          uploadedAt: new Date().toISOString(),
          chunks: data.chunks,
        });
      }

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Card className="border border-slate-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-white">
          <Upload className="h-5 w-5" />
          Upload University Notes
        </CardTitle>
        <CardDescription className="text-indigo-100">
          Upload PDF, DOCX, or TXT files containing your university notes. Maximum file size: 10MB
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div
          className={cn(
            "border border-dashed rounded-xl p-12 text-center transition-all duration-300",
            selectedFile
              ? "border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg"
              : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50 hover:shadow-md"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {!selectedFile ? (
            <div className="space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">Click to select or drag and drop</p>
                <p className="text-sm text-slate-500 mt-2">
                  PDF, DOCX, or TXT files only
                </p>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-slate-900">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemove}
                  disabled={isUploading}
                  className="hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {isUploading && (
                <div className="space-y-3">
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm font-medium text-slate-700 text-center">
                    Processing document... {uploadProgress}%
                  </p>
                </div>
              )}
              {!isUploading && (
                <Button 
                  onClick={handleUpload} 
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

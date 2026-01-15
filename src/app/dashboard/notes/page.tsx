"use client";

import { useState, useEffect } from "react";
import { DocumentUpload } from "@/components/notes/DocumentUpload";
import { NotesChatbot } from "@/components/notes/NotesChatbot";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface UploadedDocument {
  documentId: string;
  filename: string;
  fileType: string;
  uploadedAt: string;
  chunks: number;
}

export default function NotesPage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/notes/documents");
      if (!response.ok) {
        throw new Error("Failed to load documents");
      }
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (document: UploadedDocument) => {
    setDocuments((prev) => [document, ...prev]);
    toast({
      title: "Success",
      description: "Document uploaded and processed successfully!",
    });
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      setIsDeleting(documentId);
      const response = await fetch(`/api/notes/documents?documentId=${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      setDocuments((prev) => prev.filter((doc) => doc.documentId !== documentId));
      if (selectedDocumentId === documentId) {
        setSelectedDocumentId(undefined);
      }

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-2 mb-6 flex-shrink-0">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        Easy Study Assistant
        </h2>
        <p className="text-slate-600 text-lg">
          Upload your notes and ask questions, get summaries, and find important information
        </p>
      </div>

      <Tabs defaultValue="upload" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger 
            value="upload"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-medium"
          >
            Upload Documents
          </TabsTrigger>
          <TabsTrigger 
            value="chat"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-medium"
          >
            Chat Assistant
          </TabsTrigger>
          <TabsTrigger 
            value="documents"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-medium"
          >
            My Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4 overflow-y-auto">
          <DocumentUpload onUploadSuccess={handleUploadSuccess} />
        </TabsContent>

        <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="grid gap-6 md:grid-cols-2 flex-1 min-h-0 overflow-hidden">
            <Card className="border border-slate-200 shadow-lg overflow-hidden flex flex-col">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <MessageSquare className="h-5 w-5" />
                  Select Document (Optional)
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Choose a specific document to chat about, or leave empty to search all documents
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 overflow-y-auto flex-1">
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500">
                      No documents uploaded yet. Upload a document first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant={selectedDocumentId === undefined ? "default" : "outline"}
                      className={cn(
                        "w-full justify-start transition-all",
                        selectedDocumentId === undefined
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg"
                          : "hover:border-indigo-300"
                      )}
                      onClick={() => setSelectedDocumentId(undefined)}
                    >
                      All Documents
                    </Button>
                    {documents.map((doc) => (
                      <Button
                        key={doc.documentId}
                        variant={selectedDocumentId === doc.documentId ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start transition-all",
                          selectedDocumentId === doc.documentId
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg"
                            : "hover:border-indigo-300"
                        )}
                        onClick={() => setSelectedDocumentId(doc.documentId)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {doc.filename}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="h-full min-h-0 overflow-hidden">
              <NotesChatbot documentId={selectedDocumentId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 overflow-y-auto">
          <Card className="border border-slate-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200">
              <CardTitle className="text-indigo-700">Uploaded Documents</CardTitle>
              <CardDescription className="text-slate-600">
                Manage your uploaded notes and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-indigo-600" />
                  </div>
                  <p className="text-slate-600 font-medium">
                    No documents uploaded yet. Upload your first document to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.documentId}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:shadow-md hover:border-indigo-300 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{doc.filename}</p>
                          <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-medium">
                              {doc.fileType.toUpperCase()}
                            </span>
                            <span>{doc.chunks} chunks</span>
                            <span>•</span>
                            <span>{formatDate(doc.uploadedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.documentId)}
                        disabled={isDeleting === doc.documentId}
                        className="hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        {isDeleting === doc.documentId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

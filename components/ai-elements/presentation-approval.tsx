"use client";

import { useState } from "react";
import { SlideOutline } from "@/types/slides";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Presentation, Image as ImageIcon, Loader2, Download, Upload, Check, X, ExternalLink } from "lucide-react";
import { SlidesResult } from "./slides-result";

interface PresentationApprovalProps {
  toolCallId: string;
  outline: SlideOutline;
  imagesFound: number;
  totalImagesRequested: number;
  addToolApprovalResponse: (args: { toolCallId: string; result: any }) => void;
}

export function PresentationApproval({
  toolCallId,
  outline,
  imagesFound,
  totalImagesRequested,
  addToolApprovalResponse,
}: PresentationApprovalProps) {
  const [status, setStatus] = useState<"idle" | "downloading" | "uploading" | "downloaded" | "uploaded">("idle");
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Safety checks
  if (!outline || !outline.slides || !Array.isArray(outline.slides)) {
    return (
      <Card className="w-full max-w-md border-destructive/20 bg-destructive/5">
        <CardContent className="p-4">
          <p className="text-sm text-destructive">Error: Invalid presentation outline data</p>
        </CardContent>
      </Card>
    );
  }

  const slideCount = outline.slides.length;
  const imageCount = outline.slides.filter(s => s.imageUrl).length;

  const handleDownload = async () => {
    setStatus("downloading");
    setError(null);
    
    try {
      const response = await fetch("/api/slides/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline }),
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Get the blob and create a download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${outline.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setStatus("downloaded");
      
      // Mark as completed
      addToolApprovalResponse({
        toolCallId,
        result: { 
          status: "downloaded", 
          message: "Presentation downloaded successfully",
          title: outline.title,
          slideCount: outline.slides.length 
        }
      });
    } catch (error) {
      console.error("Failed to download slides:", error);
      setError(error instanceof Error ? error.message : "Download failed");
      setStatus("idle");
    }
  };

  const handleUploadToDrive = async () => {
    setStatus("uploading");
    setError(null);
    
    try {
      const response = await fetch("/api/slides/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outline }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || "Upload failed");
      }

      setUploadResult(data);
      setStatus("uploaded");
      
      // Mark as completed
      addToolApprovalResponse({
        toolCallId,
        result: data
      });
    } catch (error) {
      console.error("Failed to upload slides:", error);
      setError(error instanceof Error ? error.message : "Upload failed");
      setStatus("idle");
    }
  };

  const handleCancel = () => {
    addToolApprovalResponse({
      toolCallId,
      result: { error: true, message: "User cancelled presentation creation." }
    });
  };

  // Show result after successful upload
  if (status === "uploaded" && uploadResult) {
    return <SlidesResult {...uploadResult} />;
  }

  // Show downloaded status
  if (status === "downloaded") {
    return (
      <Card className="w-full max-w-md border-green-500/20 bg-green-500/5">
        <CardHeader className="border-b border-green-500/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{outline.title}</CardTitle>
              <CardDescription className="text-xs">
                Downloaded successfully
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 p-3 rounded-lg">
            <Check className="w-4 h-4" />
            <span>PPTX file saved to your Downloads folder</span>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            {slideCount} slides • {imageCount} images
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg border-primary/20 shadow-lg">
      <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Presentation className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">Presentation Ready</CardTitle>
            <CardDescription className="text-xs">
              {imagesFound}/{totalImagesRequested} images fetched • {slideCount} slides
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Presentation Preview Info */}
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-dashed">
            <span className="text-sm text-muted-foreground">Title</span>
            <span className="font-medium text-sm truncate max-w-[250px] text-right" title={outline.title}>
              {outline.title}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-dashed">
            <span className="text-sm text-muted-foreground">Slides</span>
            <span className="font-medium text-sm">{slideCount}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-dashed">
            <span className="text-sm text-muted-foreground">Images</span>
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium text-sm">{imageCount}</span>
            </div>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Theme</span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full border-2 shadow-sm"
                style={{ backgroundColor: outline.theme.primaryColor }}
                title="Primary Color"
              />
              <div
                className="w-4 h-4 rounded-full border-2 shadow-sm"
                style={{ backgroundColor: outline.theme.secondaryColor }}
                title="Secondary Color"
              />
              <span className="font-mono text-xs text-muted-foreground ml-1">
                {outline.theme.fontFamily}
              </span>
            </div>
          </div>
        </div>

        {/* Image samples preview (optional enhancement) */}
        {imageCount > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Featured Images</h4>
            <div className="grid grid-cols-3 gap-2">
              {outline.slides
                .filter(s => s.imageUrl)
                .slice(0, 3)
                .map((slide, idx) => (
                  <div key={idx} className="relative aspect-video rounded-md overflow-hidden border bg-muted/20">
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={status !== "idle"}
              className="w-full"
            >
              {status === "downloading" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PPTX
                </>
              )}
            </Button>
            <Button
              onClick={handleUploadToDrive}
              disabled={status !== "idle"}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {status === "uploading" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload to Drive
                </>
              )}
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={status !== "idle"}
            className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          Download saves to your computer • Upload converts to Google Slides
        </p>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DownloadIcon,
  ImageIcon,
  SparklesIcon,
  CheckIcon,
  AlertCircleIcon,
  Loader2Icon,
  MaximizeIcon,
  XIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export type ImageResultProps = {
  prompt: string;
  imageUrl?: string;
  aspectRatio?: string;
  error?: boolean;
  message?: string;
  mimeType?: string;
};

export function ImageResult({
  prompt,
  imageUrl,
  aspectRatio = "1:1",
  error,
  message,
  mimeType = "image/png",
}: ImageResultProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleDownload = async () => {
    if (!imageUrl) return;

    setIsDownloading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Generate filename from prompt
      const sanitizedPrompt = prompt
        .slice(0, 50)
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .toLowerCase();
      const extension = mimeType.split("/")[1] || "png";
      link.download = `generated_${sanitizedPrompt}_${Date.now()}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setDownloadComplete(true);
      setTimeout(() => setDownloadComplete(false), 2000);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Check if this is a rate limit error
  const isRateLimited = error && (message?.includes("rate limit") || message?.includes("quota"));

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full rounded-xl border p-4",
          isRateLimited 
            ? "border-yellow-500/20 bg-yellow-500/5" 
            : "border-red-500/20 bg-red-500/5"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            isRateLimited ? "bg-yellow-500/10" : "bg-red-500/10"
          )}>
            <AlertCircleIcon className={cn(
              "size-5",
              isRateLimited ? "text-yellow-500" : "text-red-500"
            )} />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className={cn(
              "font-medium",
              isRateLimited ? "text-yellow-500" : "text-red-500"
            )}>
              {isRateLimited ? "Rate Limit Reached" : "Image Generation Failed"}
            </h4>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Prompt: "{prompt}"
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <SparklesIcon className="size-4 text-purple-500" />
          </div>
          <span className="font-medium text-sm">AI Generated Image</span>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {aspectRatio}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {imageUrl && (
            <>
              <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <MaximizeIcon className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsFullscreen(false)}
                      className="absolute top-2 right-2 z-10 text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <XIcon className="size-5" />
                    </Button>
                    <img
                      src={imageUrl}
                      alt={prompt}
                      className="w-full h-auto max-h-[85vh] object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                className={cn(
                  "h-8 gap-2 transition-all",
                  downloadComplete && "bg-green-500/10 border-green-500/30 text-green-500"
                )}
              >
                {isDownloading ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : downloadComplete ? (
                  <>
                    <CheckIcon className="size-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <DownloadIcon className="size-4" />
                    <span>Download</span>
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Image */}
      <div className="relative bg-muted/20">
        {imageUrl ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative group"
          >
            <img
              src={imageUrl}
              alt={prompt}
              className="w-full h-auto max-h-[500px] object-contain cursor-pointer"
              onClick={() => setIsFullscreen(true)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-sm">
                Click to enlarge
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex items-center justify-center h-64 bg-muted/30">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin" />
              <span className="text-sm">Generating image...</span>
            </div>
          </div>
        )}
      </div>

      {/* Prompt */}
      <div className="p-3 border-t bg-muted/20">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">Prompt:</span>{" "}
          {prompt}
        </p>
      </div>
    </motion.div>
  );
}

export function ImageLoading({ prompt }: { prompt?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 animate-pulse">
          <SparklesIcon className="size-4 text-purple-500" />
        </div>
        <span className="font-medium text-sm">Generating Image...</span>
      </div>

      {/* Loading State */}
      <div className="relative h-64 bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              rotate: { duration: 3, repeat: Infinity, ease: "linear" },
              scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
            }}
            className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20"
          >
            <ImageIcon className="size-8 text-purple-500/70" />
          </motion.div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Creating your image</p>
            <p className="text-xs text-muted-foreground/70">This may take a moment...</p>
          </div>
        </div>
      </div>

      {/* Prompt */}
      {prompt && (
        <div className="p-3 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Prompt:</span>{" "}
            {prompt}
          </p>
        </div>
      )}
    </motion.div>
  );
}

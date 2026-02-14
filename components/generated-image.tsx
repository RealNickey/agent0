"use client";

import { cn } from "@/lib/utils";
import { Download, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

const GENERATED_IMAGE_REF_PREFIX = "__generated_image_ref__:";

function resolveImageUrl(imageUrl: string): string {
  if (!imageUrl.startsWith(GENERATED_IMAGE_REF_PREFIX)) {
    return imageUrl;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const refId = imageUrl.slice(GENERATED_IMAGE_REF_PREFIX.length);
  const stored = (window as any).__generatedImages?.[refId];
  return typeof stored === "string" ? stored : "";
}

interface GeneratedImageProps {
  imageUrl: string;
  prompt: string;
  error?: boolean;
  message?: string;
}

function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function GeneratedImage({
  imageUrl,
  prompt,
  error,
  message,
}: GeneratedImageProps) {
  const resolvedImageUrl = resolveImageUrl(imageUrl);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4 my-2">
        <p className="text-red-600 dark:text-red-400 text-sm">
          {message || "Image generation failed"}
        </p>
      </div>
    );
  }

  if (!resolvedImageUrl) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 my-2">
        <p className="text-amber-700 dark:text-amber-300 text-sm">
          Generated image preview is unavailable in this session. Please regenerate the image.
        </p>
      </div>
    );
  }

  const filename = `generated-${prompt.slice(0, 40).replace(/[^a-zA-Z0-9]/g, "_")}.png`;

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br from-purple-50 to-pink-50",
        "dark:from-slate-800 dark:to-slate-900 dark:border-slate-700",
        "p-4 my-3 shadow-sm hover:shadow-md transition-shadow"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            Generated Image
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs gap-1.5"
          onClick={() => downloadImage(resolvedImageUrl, filename)}
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>

      {/* Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden rounded-lg"
      >
        <img
          src={resolvedImageUrl}
          alt={prompt}
          className="w-full max-w-[512px] h-auto rounded-lg"
        />
      </motion.div>

      {/* Prompt caption */}
      <p className="mt-3 text-xs text-muted-foreground italic line-clamp-2">
        &ldquo;{prompt}&rdquo;
      </p>
    </div>
  );
}

export function GeneratedImageLoading({ prompt }: { prompt?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br from-purple-50 to-pink-50",
        "dark:from-slate-800 dark:to-slate-900 dark:border-slate-700",
        "p-5 my-3 shadow-sm"
      )}
    >
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Generating image&hellip;
          </p>
          {prompt && (
            <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-1">
              &ldquo;{prompt}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

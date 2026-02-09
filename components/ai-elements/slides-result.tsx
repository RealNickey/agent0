"use client";

import { ExternalLink, Image as ImageIcon, Presentation, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SlideInfo {
  objectId: string;
  title: string;
  hasImage: boolean;
}

interface ImageCredit {
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
}

export interface SlidesResultProps {
  presentationId: string;
  title: string;
  slideCount: number;
  url: string;
  slides: SlideInfo[];
  imageCredits?: ImageCredit[];
  attribution?: string;
  failedImages?: string[];
  message?: string;
  error?: boolean;
  errorMessage?: string;
}

export function SlidesResult({
  title,
  slideCount,
  url,
  slides,
  imageCredits,
  attribution,
  failedImages,
  message,
  error,
  errorMessage,
}: SlidesResultProps) {
  const [showOutline, setShowOutline] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
      >
        <Presentation className="size-5 text-destructive shrink-0" />
        <div className="text-sm text-destructive">
          {errorMessage || "Failed to create presentation"}
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
      <div className="flex items-center gap-3 p-4 border-b bg-yellow-500/5">
        <div className="p-2 rounded-lg bg-yellow-500/10">
          <Presentation className="size-5 text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{title}</h4>
          <p className="text-xs text-muted-foreground">
            {slideCount} slide{slideCount !== 1 ? "s" : ""} created
            {imageCredits && imageCredits.length > 0 && (
              <span className="ml-1">
                · {imageCredits.length} image{imageCredits.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-yellow-500 text-white text-xs font-medium hover:bg-yellow-600 transition-colors shrink-0"
        >
          <ExternalLink className="size-3.5" />
          Open in Slides
        </a>
      </div>

      {/* Message */}
      {message && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b">
          {message}
        </div>
      )}

      {/* Slide Outline Toggle */}
      <button
        onClick={() => setShowOutline((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        <span>Slide Outline</span>
        {showOutline ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
      </button>

      {showOutline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t"
        >
          <ol className="divide-y">
            {slides.map((slide, i) => (
              <li
                key={slide.objectId}
                className="flex items-center gap-3 px-4 py-2 text-xs"
              >
                <span className="text-muted-foreground font-mono w-5 text-right shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 truncate">{slide.title}</span>
                {slide.hasImage && (
                  <ImageIcon className="size-3.5 text-muted-foreground shrink-0" />
                )}
              </li>
            ))}
          </ol>
        </motion.div>
      )}

      {/* Image Credits */}
      {imageCredits && imageCredits.length > 0 && (
        <>
          <button
            onClick={() => setShowCredits((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent/50 transition-colors border-t"
          >
            <span>Image Credits (Unsplash)</span>
            {showCredits ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>

          {showCredits && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="border-t px-4 py-2 space-y-1"
            >
              {imageCredits.map((credit, i) => (
                <div key={i} className="text-xs text-muted-foreground">
                  Photo by{" "}
                  <a
                    href={credit.photographerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    {credit.photographer}
                  </a>{" "}
                  on{" "}
                  <a
                    href={credit.unsplashUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Unsplash
                  </a>
                </div>
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* Failed Images Warning */}
      {failedImages && failedImages.length > 0 && (
        <div className="px-4 py-2 border-t text-xs text-amber-500">
          {failedImages.length} image{failedImages.length !== 1 ? "s" : ""} could
          not be loaded. The deck was created without them.
        </div>
      )}
    </motion.div>
  );
}

export function SlidesLoading({ topic }: { topic?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="p-2 rounded-lg bg-yellow-500/10">
          <Presentation className="size-5 text-yellow-500 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          <div className="h-3 w-32 bg-muted animate-pulse rounded mt-1.5" />
        </div>
      </div>
      <div className="px-4 pb-4 text-xs text-muted-foreground animate-pulse">
        Creating presentation{topic ? ` about "${topic}"` : ""}...
      </div>
    </motion.div>
  );
}

"use client";

import { ExternalLink, Image as ImageIcon, Presentation, ChevronDown, ChevronUp, Palette, Sparkles } from "lucide-react";
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
  themeName?: string;
  imageAttemptedCount?: number;
  imageInsertedCount?: number;
}

export function SlidesResult({
  title,
  slideCount,
  url,
  slides,
  imageCredits,
  failedImages,
  message,
  error,
  errorMessage,
  themeName,
  imageAttemptedCount,
  imageInsertedCount,
}: SlidesResultProps) {
  const [showOutline, setShowOutline] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showFailures, setShowFailures] = useState(false);

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

  const attemptedImages = imageAttemptedCount ?? imageCredits?.length ?? 0;
  const insertedImages = imageInsertedCount ?? Math.max(attemptedImages - (failedImages?.length || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border bg-card overflow-hidden"
    >
      {/* Header with gradient accent */}
      <div className="relative flex items-center gap-3 p-4 border-b bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-yellow-500/5">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500/15 to-orange-500/15 ring-1 ring-yellow-500/20">
          <Presentation className="size-5 text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3" />
              {slideCount} slide{slideCount !== 1 ? "s" : ""}
            </span>
            {themeName && (
              <span className="flex items-center gap-1">
                <Palette className="size-3" />
                {themeName}
              </span>
            )}
            {attemptedImages > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="size-3" />
                {insertedImages}/{attemptedImages} image{attemptedImages !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-sm shadow-yellow-500/20 shrink-0"
        >
          <ExternalLink className="size-3.5" />
          Open in Slides
        </a>
      </div>

      {/* Message */}
      {message && (
        <div className="px-4 py-2.5 text-xs text-muted-foreground border-b bg-muted/30">
          {message}
        </div>
      )}

      {/* Slide Outline Toggle */}
      <button
        onClick={() => setShowOutline((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        <span>Slide Outline ({slides.length})</span>
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
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-xs",
                  i === 0 && "bg-yellow-500/5",
                  i === slides.length - 1 && "bg-yellow-500/5"
                )}
              >
                <span className="text-muted-foreground font-mono w-5 text-right shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 truncate">{slide.title}</span>
                {slide.hasImage && (
                  <ImageIcon className="size-3.5 text-green-500 shrink-0" />
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
        <div className="border-t">
          <button
            onClick={() => setShowFailures((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-amber-500 hover:bg-accent/50 transition-colors"
          >
            <span>
              {failedImages.length} image{failedImages.length !== 1 ? "s" : ""} could not be loaded
            </span>
            {showFailures ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>

          {showFailures && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="px-4 pb-3 text-xs text-amber-500 space-y-1"
            >
              {failedImages.map((item, i) => (
                <div key={i}>{item}</div>
              ))}
              <div className="text-amber-500/80">The deck was created without these images.</div>
            </motion.div>
          )}
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
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500/15 to-orange-500/15 ring-1 ring-yellow-500/20">
          <Presentation className="size-5 text-yellow-500 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          <div className="h-3 w-32 bg-muted animate-pulse rounded mt-1.5" />
        </div>
      </div>
      <div className="px-4 pb-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <Sparkles className="size-3.5 text-yellow-500" />
          <span>Creating presentation{topic ? ` about "${topic}"` : ""}...</span>
        </div>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="h-1 flex-1 rounded-full bg-yellow-500/20"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/60">
          Generating slides, fetching images, applying theme & styling...
        </p>
      </div>
    </motion.div>
  );
}

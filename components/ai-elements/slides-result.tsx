"use client";

import { ExternalLinkIcon, CheckIcon, PresentationIcon, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import type { SlidesCreationResult } from "@/types/slides";

interface SlidesResultProps {
  result: SlidesCreationResult;
}

/**
 * Displays the final result after a Google Slides presentation is created.
 * Shows a success card with "Open in Google Slides" link, slide count, and title.
 */
export function SlidesResult({ result }: SlidesResultProps) {
  if (result.status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center gap-3 text-destructive">
            <PresentationIcon className="w-5 h-5" />
            <span>{result.message || result.error || "Failed to create presentation"}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 via-green-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-green-500/10 bg-gradient-to-br from-green-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="p-2 rounded-lg bg-green-500/10 text-green-600 ring-1 ring-green-500/20"
            >
              <CheckIcon className="w-5 h-5" />
            </motion.div>
            <div className="flex-1">
              <h3 className="font-semibold text-base text-green-700 dark:text-green-400">
                Presentation Created
              </h3>
              <p className="text-xs text-green-600/70 dark:text-green-500/70 mt-0.5">
                Uploaded to Google Slides
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <h4 className="font-semibold text-lg">{result.title}</h4>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <FileIcon className="w-4 h-4" />
              <span>
                {result.slideCount} slide{result.slideCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Thumbnail preview */}
          {result.thumbnailLink && (
            <div className="rounded-lg overflow-hidden border border-border/50">
              <img
                src={result.thumbnailLink}
                alt={`Preview of ${result.title}`}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Open in Slides button */}
          {result.slidesUrl && (
            <Button variant="outline" size="sm" className="w-full gap-2" asChild>
              <a
                href={result.slidesUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon className="h-4 w-4" />
                Open in Google Slides
              </a>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

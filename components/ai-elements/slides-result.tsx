"use client";

import { ExternalLinkIcon, CheckIcon, PresentationIcon, FileIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { motion } from "motion/react";
import type { SlidesCreationResult } from "@/types/slides";

interface SlidesResultProps {
  result: SlidesCreationResult;
}

/**
 * Displays the final result after a Google Slides presentation is created.
 * Shows a success card with download + "Open in Google Slides" link, slide count, and title.
 */
export function SlidesResult({ result }: SlidesResultProps) {
  const timeline = result.timeline ?? [];
  const debug = result.debug;

  if (result.status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center gap-3 text-destructive mb-2">
            <PresentationIcon className="w-5 h-5" />
            <span>{result.message || result.error || "Failed to create presentation"}</span>
          </div>
          {result.runId && (
            <div className="text-xs text-muted-foreground">Run ID: {result.runId}</div>
          )}
        </div>
      </motion.div>
    );
  }

  const handleDownload = () => {
    if (!result.downloadUrl) return;
    const a = document.createElement("a");
    a.href = result.downloadUrl;
    a.download = `${result.title || "presentation"}.pptx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="w-full max-w-lg my-4 not-prose"
    >
      <div className="rounded-xl border border-green-500/20 bg-linear-to-br from-green-500/5 via-green-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-green-500/10 bg-linear-to-br from-green-500/5 to-transparent p-4">
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
                {result.slidesUrl ? "Uploaded to Google Slides" : "Ready to download"}
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
            {result.runId && (
              <div className="text-xs">Run ID: {result.runId}</div>
            )}
          </div>

          {/* Generation timeline for transparency */}
          {timeline.length > 0 && (
            <div className="rounded-lg border border-border/50 bg-background/30 p-3">
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Generation Timeline
              </div>
              <div className="space-y-1.5">
                {timeline.map((step, index) => {
                  const isSuccess = step.status === "completed";
                  const isSkipped = step.status === "skipped";
                  return (
                    <div key={`${step.phase}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                      <span className="capitalize">{step.phase.replace(/-/g, " ")}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {isSuccess ? "Completed" : isSkipped ? "Skipped" : "Failed"} · {step.durationMs}ms
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Action buttons */}
          <div className="flex gap-2">
            {result.downloadUrl && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={handleDownload}
              >
                <DownloadIcon className="h-4 w-4" />
                Download PPTX
              </Button>
            )}

            {result.slidesUrl && (
              <Button variant="outline" size="sm" className="flex-1 gap-2" asChild>
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

          {/* Debug details for troubleshooting */}
          {debug && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="px-0 text-muted-foreground hover:text-foreground">
                  View debug logs
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-lg border border-border/50 bg-background/40 p-3 text-xs text-muted-foreground space-y-2">
                  <div>Created: {debug.createdAt}</div>
                  <div>
                    Images: {debug.imageSearches.filter((i) => i.matched).length}/{debug.imageSearches.length} matched
                  </div>
                  <div>
                    Upload: {debug.upload.attempted ? (debug.upload.success ? "success" : "failed") : "skipped"}
                    {debug.upload.error ? ` (${debug.upload.error})` : ""}
                  </div>
                  {debug.warnings.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">Warnings</div>
                      {debug.warnings.map((warning, index) => (
                        <div key={`${warning}-${index}`}>- {warning}</div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </motion.div>
  );
}

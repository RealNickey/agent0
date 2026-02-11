"use client";

import { useState } from "react";
import {
  PresentationIcon,
  CheckIcon,
  XIcon,
  ImageIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import type { SlideOutline } from "@/types/slides";

interface SlidesApprovalProps {
  approvalId: string;
  outline: SlideOutline;
  addToolApprovalResponse?: (params: {
    id: string;
    approved: boolean;
    reason?: string;
  }) => void;
}

/**
 * Upload confirmation UI for createGoogleSlidesPresentation (needsApproval).
 * Shows a summary of the presentation and lets the user confirm or cancel the upload.
 */
export function SlidesApproval({
  approvalId,
  outline,
  addToolApprovalResponse,
}: SlidesApprovalProps) {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");

  const imageCount = outline.slides.filter((s) => s.imageUrl).length;

  const handleApprove = () => {
    setStatus("approved");
    addToolApprovalResponse?.({ id: approvalId, approved: true });
  };

  const handleReject = () => {
    setStatus("rejected");
    addToolApprovalResponse?.({ id: approvalId, approved: false, reason: "User cancelled the upload." });
  };

  if (status === "approved") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent p-4">
          <div className="flex items-center gap-3 text-teal-600">
            <Loader2Icon className="w-5 h-5 animate-spin" />
            <span className="font-medium">
              Generating and uploading presentation...
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-4 not-prose"
      >
        <div className="rounded-xl border border-muted bg-muted/5 p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <XIcon className="w-5 h-5" />
            <span>Presentation upload cancelled.</span>
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
      <div className="rounded-xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 via-teal-500/3 to-transparent backdrop-blur-sm shadow-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-teal-500/10 bg-gradient-to-br from-teal-500/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/20">
              <PresentationIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Create & Upload Presentation?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                This will upload to your Google Drive
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 space-y-3">
          <h4 className="font-semibold text-lg">{outline.title}</h4>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <PresentationIcon className="w-4 h-4" />
              {outline.slides.length} slides
            </span>
            {imageCount > 0 && (
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                {imageCount} images
              </span>
            )}
          </div>

          {/* Theme preview */}
          <div className="flex gap-2 h-4 rounded overflow-hidden">
            <div
              className="flex-1"
              style={{ backgroundColor: outline.theme.primaryColor }}
            />
            <div
              className="flex-1"
              style={{ backgroundColor: outline.theme.secondaryColor }}
            />
            <div
              className="flex-1"
              style={{ backgroundColor: outline.theme.accentColor }}
            />
          </div>

          {/* Slide titles list */}
          <div className="rounded-lg border border-border/50 bg-background/30 p-3 space-y-1.5 max-h-48 overflow-y-auto">
            {outline.slides.map((slide, i) => (
              <div
                key={slide.id || i}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-muted-foreground w-5 text-right text-xs">
                  {i + 1}.
                </span>
                <span className="truncate">{slide.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-teal-500/10 p-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={handleReject}>
            <XIcon className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <CheckIcon className="w-4 h-4 mr-1" />
            Create & Upload
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

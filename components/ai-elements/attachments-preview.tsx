"use client";

import { motion } from "motion/react";
import { PaperclipIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FileAttachment = {
  name: string;
  type: string;
  size: number;
  url: string;
};

export type AttachmentsPreviewProps = {
  attachments: FileAttachment[];
  onRemove: (index: number) => void;
  className?: string;
};

export function AttachmentsPreview({ attachments, onRemove, className }: AttachmentsPreviewProps) {
  if (attachments.length === 0) return null;

  const imageAttachments = attachments.filter((att) => att.type.startsWith("image/"));
  const fileAttachments = attachments.filter((att) => !att.type.startsWith("image/"));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("flex items-end gap-3", className)}
    >
      {/* File Attachments (non-images) */}
      {fileAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fileAttachments.map((att, i) => {
            const originalIndex = attachments.indexOf(att);
            return (
              <div
                key={`file-${i}`}
                className="group relative flex size-16 shrink-0 items-center justify-center rounded-xl bg-muted/80 border border-border/50 transition-colors hover:bg-muted"
              >
                <PaperclipIcon className="size-5 text-muted-foreground" />
                <button
                  onClick={() => onRemove(originalIndex)}
                  className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-background border border-border shadow-sm opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                  aria-label={`Remove ${att.name}`}
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Attachments */}
      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageAttachments.map((att, i) => {
            const originalIndex = attachments.indexOf(att);
            return (
              <div
                key={`image-${i}`}
                className="group relative size-16 shrink-0 overflow-hidden rounded-xl border border-border/50"
              >
                <img
                  src={att.url}
                  alt={att.name}
                  className="size-full object-cover"
                />
                <button
                  onClick={() => onRemove(originalIndex)}
                  className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-background border border-border shadow-sm opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                  aria-label={`Remove ${att.name}`}
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

"use client";

import { motion } from "motion/react";
import { FileIcon, XIcon } from "lucide-react";

// Use a type that's compatible with the AI SDK's FileUIPart
// but includes additional properties needed for preview (size)
export type FileAttachment = {
  name: string;
  type: string;      // Maps to mediaType in FileUIPart
  size: number;      // Used for preview info
  url: string;       // Maps to url in FileUIPart
};

export type AttachmentsPreviewProps = {
  attachments: FileAttachment[];
  onRemove: (index: number) => void;
};

export function AttachmentsPreview({ attachments, onRemove }: AttachmentsPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="flex flex-wrap gap-2"
    >
      {attachments.map((att, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm"
        >
          <FileIcon className="size-4 text-muted-foreground" />
          <span className="truncate max-w-[150px]">{att.name}</span>
          <button
            onClick={() => onRemove(i)}
            className="hover:bg-background rounded p-0.5"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}
    </motion.div>
  );
}

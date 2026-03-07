"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileIcon, FileTextIcon, FileImageIcon, XIcon, MusicIcon } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper to get consistent icons
const OFFICE_MIME_LABELS: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/msword": "Word",
  "application/vnd.oasis.opendocument.text": "ODT",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.oasis.opendocument.spreadsheet": "ODS",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.oasis.opendocument.presentation": "ODP",
};

function getFileIcon(type: string) {
  if (type.startsWith("image/")) {
    return <FileImageIcon className="size-4 text-white" />;
  }
  if (type.startsWith("audio/")) {
    return <MusicIcon className="size-4 text-white" />;
  }
  if (type === "application/pdf" || type in OFFICE_MIME_LABELS) {
    return <FileTextIcon className="size-4 text-white" />;
  }
  if (type.startsWith("text/")) {
    return <FileTextIcon className="size-4 text-white" />;
  }
  return <FileIcon className="size-4 text-white" />;
}

function getFileTypeFriendlyName(type: string): string {
  if (type.startsWith("image/")) return "Image";
  if (type.startsWith("audio/")) return "Audio";
  if (type === "application/pdf") return "PDF";
  if (type in OFFICE_MIME_LABELS) return OFFICE_MIME_LABELS[type];
  if (type.startsWith("text/")) return "Text File";
  return "File";
}

function getFileTypeLabel(mimeType: string): string {
  if (!mimeType || typeof mimeType !== "string") return "File";
  
  const parts = mimeType.split("/");
  if (parts.length < 2) return "File";
  
  const subtype = parts[1];
  if (!subtype || subtype.trim() === "") return "File";
  
  return subtype.toUpperCase();
}

export function AttachmentsPreview({ attachments, onRemove }: AttachmentsPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence mode="popLayout">
            {attachments.map((att, i) => (
            <AttachmentItem
                key={att.url || `${att.name}-${i}`} 
                attachment={att}
                index={i}
                onRemove={onRemove}
            />
            ))}
      </AnimatePresence>
    </div>
  );
}

function AttachmentItem({ 
  attachment, 
  index, 
  onRemove 
}: { 
  attachment: FileAttachment; 
  index: number; 
  onRemove: (index: number) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const label = getFileTypeFriendlyName(attachment.type);
  const isImage = attachment.type.startsWith("image/");
  const isPdf = attachment.type === "application/pdf";
  const isText = !isPdf && (attachment.type.startsWith("text/") || 
                 attachment.type === "application/json" || 
                 attachment.type === "application/javascript" ||
                 attachment.type.includes("markdown") ||
                 attachment.type.includes("xml") ||
                 attachment.name.endsWith(".ts") ||
                 attachment.name.endsWith(".tsx") ||
                 attachment.name.endsWith(".js") ||
                 attachment.name.endsWith(".css") ||
                 attachment.name.endsWith(".html") ||
                 attachment.name.endsWith(".md"));

  // Helper to get text preview
  const getTextPreview = () => {
    try {
      if (!attachment.url.startsWith("data:")) return null;
      const base64 = attachment.url.split(",")[1];
      if (!base64) return null;
      const decoded = atob(base64);
      return decoded.slice(0, 150) + (decoded.length > 150 ? "..." : "");
    } catch (e) {
      return null;
    }
  };

  const textPreview = getTextPreview();

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            transition={{ 
                layout: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
            }}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-[0.67313rem] cursor-default group backdrop-blur-md shadow-sm hover:shadow-md h-[38px]"
            style={{
                backgroundColor: "rgba(80, 160, 221, 0.72)",
                border: "1.346px dashed #FDEFE4"
            }}
        >
          <div className="flex-shrink-0">
            {getFileIcon(attachment.type)}
          </div>
          <span className="font-semibold text-sm text-white max-w-[120px] truncate">{label}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            className="hover:bg-white/20 rounded-full p-0.5 opacity-60 group-hover:opacity-100 transition-opacity text-white"
          >
            <XIcon className="size-3" />
          </button>
        </motion.div>
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center"
        sideOffset={10}
        className="w-72 p-0 bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl overflow-hidden"
      >
          {/* Top Preview Section */}
          <div className="w-full h-40 bg-slate-50/50 flex items-center justify-center overflow-hidden relative">
             {isImage && !imageError ? (
                 <img 
                     src={attachment.url} 
                     alt={attachment.name} 
                     className="w-full h-full object-cover" 
                     onError={() => setImageError(true)}
                 />
             ) : isText && textPreview ? (
                 <div className="w-full h-full p-3 text-[10px] font-mono text-slate-600 break-all whitespace-pre-wrap leading-relaxed overflow-hidden relative bg-white/50">
                     {textPreview}
                     <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent" />
                 </div>
             ) : isPdf ? (
                <div className="flex flex-col items-center gap-2 opacity-80">
                    <FileTextIcon className="size-12 text-rose-500/80" />
                    <span className="text-xs font-medium text-rose-500/80">PDF Document</span>
                </div>
             ) : (
                <div className="flex flex-col items-center gap-2 opacity-30">
                    <div className="size-12 flex items-center justify-center">
                        {isText ? (
                             <FileTextIcon className="size-full" />
                        ) : isImage ? (
                             <FileImageIcon className="size-full" />
                        ) : (
                             <FileIcon className="size-full" />
                        )}
                    </div>
                    <span className="text-xs font-medium">Preview unavailable</span>
                </div>
             )}
          </div>

          {/* Bottom Info Section */}
          <div className="p-3 bg-white/40 border-t border-white/20">
             <div className="flex items-start gap-3">
                <div className="p-2 bg-white/60 rounded-xl shadow-sm">
                    {getFileIcon(attachment.type)}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-slate-800 truncate leading-tight block w-full">
                        {attachment.name}
                    </span>
                    <span className="text-xs text-slate-500 font-medium mt-0.5">
                        {formatFileSize(attachment.size)} • {getFileTypeLabel(attachment.type)}
                    </span>
                </div>
             </div>
          </div>
      </HoverCardContent>
    </HoverCard>
  );
}


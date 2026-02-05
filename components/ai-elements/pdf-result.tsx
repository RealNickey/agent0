"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DownloadIcon,
  FileTextIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ExternalLinkIcon,
  Loader2Icon,
} from "lucide-react";
import { motion } from "motion/react";

export type PDFResultData = {
  dataUrl: string;
  filename: string;
  mimeType: string;
  pageCount?: number;
  totalPages?: number;
  originalSize?: string;
  compressedSize?: string;
  savedBytes?: string;
  compressionRatio?: string;
  sourceFileCount?: number;
  fileSize?: string;
};

export type PDFResultProps = {
  success: boolean;
  data?: PDFResultData;
  message?: string;
  error?: string;
  requiresUpload?: boolean;
  operation?: "compress" | "merge";
  className?: string;
};

export function PDFResult({
  success,
  data,
  message,
  error,
  requiresUpload,
  operation,
  className,
}: PDFResultProps) {
  const handleDownload = () => {
    if (!data?.dataUrl || !data?.filename) return;

    // Create a temporary link and trigger download
    const link = document.createElement("a");
    link.href = data.dataUrl;
    link.download = data.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpen = () => {
    if (!data?.dataUrl) return;
    window.open(data.dataUrl, "_blank", "noopener,noreferrer");
  };

  const title = operation === "compress"
    ? "Compressed PDF"
    : operation === "merge"
    ? "Merged PDF"
    : "PDF Ready";

  if (!success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-start gap-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5",
          className
        )}
      >
        <div className="p-2 rounded-lg bg-amber-500/10">
          <AlertCircleIcon className="size-5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileTextIcon className="size-4 text-amber-500" />
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {title} failed
            </p>
          </div>
          <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mt-1">
            {message || error || "An error occurred while processing the PDF."}
          </p>
          {requiresUpload && (
            <p className="text-xs text-muted-foreground mt-1">
              Upload a PDF file using the attachment button to continue.
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  if (!data) return null;

  const isCompression = data.originalSize !== undefined;
  const isMerge = data.sourceFileCount !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-green-500/20 bg-green-500/5 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-green-500/20 bg-green-500/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-green-500/15 text-green-600">
            <FileTextIcon className="size-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              {title}
            </p>
            <p className="text-xs text-muted-foreground">
              {message || "PDF processed successfully"}
            </p>
          </div>
        </div>
        <CheckCircle2Icon className="size-5 text-green-500" />
      </div>

      {/* Preview */}
      <div className="px-4">
        <div className="rounded-lg border bg-background/40 overflow-hidden">
          <iframe
            src={data.dataUrl}
            title={data.filename}
            className="h-56 w-full"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-4">
        <div>
          <span className="font-medium">Filename:</span> {data.filename}
        </div>
        {isCompression && (
          <>
            <div>
              <span className="font-medium">Original:</span> {data.originalSize}
            </div>
            <div>
              <span className="font-medium">Compressed:</span> {data.compressedSize}
            </div>
            <div>
              <span className="font-medium">Saved:</span> {data.savedBytes} ({data.compressionRatio})
            </div>
          </>
        )}
        {isMerge && (
          <>
            <div>
              <span className="font-medium">Files merged:</span> {data.sourceFileCount}
            </div>
            <div>
              <span className="font-medium">Total pages:</span> {data.totalPages}
            </div>
            <div>
              <span className="font-medium">Size:</span> {data.fileSize}
            </div>
          </>
        )}
        {data.pageCount && !isMerge && (
          <div>
            <span className="font-medium">Pages:</span> {data.pageCount}
          </div>
        )}
      </div>

      {/* Download Button */}
      <div className="flex flex-wrap gap-2 px-4 pb-4">
        <Button
          onClick={handleDownload}
          variant="default"
          size="sm"
          className="gap-2"
        >
          <DownloadIcon className="size-4" />
          Download
        </Button>
        <Button
          onClick={handleOpen}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <ExternalLinkIcon className="size-4" />
          Open
        </Button>
      </div>
    </motion.div>
  );
}

export function PDFLoading({ operation }: { operation?: "compress" | "merge" }) {
  const title = operation === "compress"
    ? "Compressing PDF..."
    : operation === "merge"
    ? "Merging PDFs..."
    : "Processing PDF...";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border bg-card overflow-hidden"
    >
      <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <FileTextIcon className="size-4" />
        </div>
        <span className="text-sm font-medium">{title}</span>
        <Loader2Icon className="size-4 animate-spin text-muted-foreground ml-auto" />
      </div>
      <div className="px-4 py-6">
        <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
      </div>
      <div className="px-4 pb-4">
        <div className="h-3 w-48 rounded bg-muted/40 animate-pulse" />
      </div>
    </motion.div>
  );
}

/**
 * Check if a tool output is a PDF result
 */
export function isPDFToolResult(output: unknown): output is PDFResultProps {
  if (!output || typeof output !== "object") return false;
  const obj = output as Record<string, unknown>;
  return (
    typeof obj.success === "boolean" &&
    (obj.data === undefined ||
      (typeof obj.data === "object" &&
        obj.data !== null &&
        "dataUrl" in (obj.data as object)))
  );
}

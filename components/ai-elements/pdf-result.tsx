"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DownloadIcon, FileTextIcon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react";
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
  className?: string;
};

export function PDFResult({
  success,
  data,
  message,
  error,
  requiresUpload,
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
        <AlertCircleIcon className="size-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-700 dark:text-amber-400">
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
        "flex flex-col gap-3 p-4 rounded-lg border border-green-500/20 bg-green-500/5",
        className
      )}
    >
      {/* Success Header */}
      <div className="flex items-start gap-3">
        <CheckCircle2Icon className="size-5 text-green-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-green-700 dark:text-green-400">
            {message || "PDF processed successfully!"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pl-8">
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
      <div className="pl-8">
        <Button
          onClick={handleDownload}
          variant="default"
          size="sm"
          className="gap-2"
        >
          <DownloadIcon className="size-4" />
          Download {data.filename}
        </Button>
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

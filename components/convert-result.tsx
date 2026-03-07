"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  FileIcon,
  DownloadIcon,
  CheckCircle2Icon,
  ArrowRightLeft,
  Loader2Icon,
  EyeIcon,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import Image from "next/image";

export interface ConvertResultProps {
  success: boolean;
  fileName: string;
  fileUrl: string;
  fileSize?: string;
  sourceFormat: string;
  targetFormat: string;
  error?: string;
  convertedOnClient?: boolean;
  targetMime?: string;
  outputs?: Array<{ fileName: string; fileUrl: string; fileSize?: string }>;
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff", "avif", "svg", "ico"];

function isPreviewable(format: string): boolean {
  return IMAGE_EXTENSIONS.includes(format) || format === "pdf" || format === "html" || format === "txt" || format === "csv" || format === "md" || format === "svg";
}

function getFormatBadgeColor(format: string): string {
  if (IMAGE_EXTENSIONS.includes(format)) return "bg-pink-500/15 text-pink-400 border-pink-500/20";
  if (["pdf", "docx", "doc", "txt", "rtf", "odt", "html", "md"].includes(format))
    return "bg-blue-500/15 text-blue-400 border-blue-500/20";
  if (["mp3", "wav", "ogg", "flac", "m4a"].includes(format))
    return "bg-green-500/15 text-green-400 border-green-500/20";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(format))
    return "bg-purple-500/15 text-purple-400 border-purple-500/20";
  if (["xlsx", "xls", "csv", "ods", "tsv"].includes(format))
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  return "bg-slate-500/15 text-slate-400 border-slate-500/20";
}

/** Client-side canvas conversion for images */
async function convertImageViaCanvas(
  sourceDataUrl: string,
  targetMime: string,
  targetFormat: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));

      // Fill white background for formats that don't support transparency (jpg, bmp)
      if (["image/jpeg", "image/bmp"].includes(targetMime)) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const quality = ["image/jpeg", "image/webp", "image/avif"].includes(targetMime)
        ? 0.92
        : undefined;

      const result = canvas.toDataURL(targetMime, quality);
      resolve(result);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = sourceDataUrl;
  });
}

export function ConvertResult({
  success,
  fileName,
  fileUrl,
  fileSize,
  sourceFormat,
  targetFormat,
  error,
  convertedOnClient,
  targetMime,
  outputs,
}: ConvertResultProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const convertedRef = useRef(false);

  // Client-side canvas conversion for images
  useEffect(() => {
    if (!convertedOnClient || !targetMime || !fileUrl || convertedRef.current) return;
    convertedRef.current = true;
    setConverting(true);

    convertImageViaCanvas(fileUrl, targetMime, targetFormat)
      .then((result) => {
        setConvertedUrl(result);
        setConverting(false);
      })
      .catch((err) => {
        console.error("Client-side conversion failed:", err);
        setConvertedUrl(fileUrl); // Use original as fallback
        setConverting(false);
      });
  }, [convertedOnClient, targetMime, fileUrl, targetFormat]);

  const resolvedUrl = convertedOnClient ? (convertedUrl ?? fileUrl) : fileUrl;
  const isImageOutput = IMAGE_EXTENSIONS.includes(targetFormat);

  if (!success) {
    return (
      <div className="rounded-xl border border-amber-200/30 bg-amber-950/20 p-4 my-2">
        <div className="flex items-center gap-2 mb-1">
          <ArrowRightLeft className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300">Conversion Failed</span>
        </div>
        <p className="text-amber-400/80 text-sm">
          {error || "Conversion failed. Please try again with a different file or format."}
        </p>
      </div>
    );
  }

  const handleDownload = async () => {
    if (!resolvedUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(resolvedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border overflow-hidden my-3 shadow-sm",
        "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-700/50"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/40">
        <div className="p-1.5 rounded-lg bg-teal-500/15">
          <CheckCircle2Icon className="h-4 w-4 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-200">Conversion Complete</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-mono", getFormatBadgeColor(sourceFormat))}>
              .{sourceFormat}
            </span>
            <ArrowRightLeft className="h-3 w-3 text-slate-500" />
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-mono", getFormatBadgeColor(targetFormat))}>
              .{targetFormat}
            </span>
          </div>
        </div>
      </div>

      {/* File info */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <FileIcon className="h-5 w-5 text-slate-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-200 truncate">{fileName}</p>
            {fileSize && (
              <p className="text-xs text-slate-500">{fileSize}</p>
            )}
          </div>
        </div>

        {/* Image preview (inline for images) */}
        {isImageOutput && resolvedUrl && !converting && (
          <div className="rounded-lg overflow-hidden border border-slate-700/40 bg-slate-800/50">
            <Image
              src={resolvedUrl}
              alt={fileName}
              width={400}
              height={300}
              className="w-full h-auto max-h-[240px] object-contain"
              unoptimized
            />
          </div>
        )}

        {/* Converting indicator */}
        {converting && (
          <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            <span>Converting...</span>
          </div>
        )}

        {/* Preview toggle for non-image previewable formats */}
        {!isImageOutput && isPreviewable(targetFormat) && resolvedUrl && !converting && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-400 hover:text-slate-200"
              onClick={() => setShowPreview(!showPreview)}
            >
              <EyeIcon className="h-3.5 w-3.5 mr-1.5" />
              {showPreview ? "Hide Preview" : "Preview File"}
            </Button>
            {showPreview && (
              <div className="rounded-lg overflow-hidden border border-slate-700/40 bg-slate-800/50 max-h-[200px] overflow-y-auto">
                {targetFormat === "txt" || targetFormat === "csv" || targetFormat === "tsv" || targetFormat === "md" ? (
                  <pre className="p-3 text-xs text-slate-300 font-mono whitespace-pre-wrap">
                    {(() => {
                      try {
                        const base64 = resolvedUrl.split(",")[1] || "";
                        return atob(base64);
                      } catch {
                        return "Preview unavailable";
                      }
                    })()}
                  </pre>
                ) : (
                  <iframe
                    src={resolvedUrl}
                    className="w-full h-[200px] bg-white"
                    title={`Preview ${fileName}`}
                    sandbox="allow-same-origin"
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Multi-output gallery (e.g. PDF→IMG pages) */}
        {outputs && outputs.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">{outputs.length} pages converted</p>
            {isImageOutput ? (
              <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto rounded-lg">
                {outputs.map((out, i) => (
                  <div
                    key={i}
                    className="relative rounded-md overflow-hidden border border-slate-700/40 bg-slate-800/50 group"
                  >
                    <Image
                      src={out.fileUrl}
                      alt={out.fileName}
                      width={160}
                      height={120}
                      className="w-full h-auto object-contain"
                      unoptimized
                    />
                    <button
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = out.fileUrl;
                        link.download = out.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <DownloadIcon className="h-4 w-4 text-white" />
                    </button>
                    <span className="absolute bottom-0.5 right-1 text-[9px] text-slate-400 bg-black/60 px-1 rounded">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {outputs.map((out, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/30"
                  >
                    <FileIcon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="text-xs text-slate-300 truncate flex-1">{out.fileName}</span>
                    {out.fileSize && <span className="text-[10px] text-slate-500 shrink-0">{out.fileSize}</span>}
                    <button
                      className="text-slate-400 hover:text-slate-200 shrink-0"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = out.fileUrl;
                        link.download = out.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <DownloadIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-slate-700/40 flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-teal-600 hover:bg-teal-500 text-white"
          onClick={handleDownload}
          disabled={isDownloading || converting || !resolvedUrl}
        >
          {isDownloading ? (
            <Loader2Icon className="h-4 w-4 animate-spin mr-1.5" />
          ) : downloaded ? (
            <CheckCircle2Icon className="h-4 w-4 mr-1.5" />
          ) : (
            <DownloadIcon className="h-4 w-4 mr-1.5" />
          )}
          {downloaded ? "Downloaded!" : outputs && outputs.length > 1 ? "Download First" : "Download"}
        </Button>
        {outputs && outputs.length > 1 && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={async () => {
              for (const out of outputs) {
                const link = document.createElement("a");
                link.href = out.fileUrl;
                link.download = out.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                await new Promise((r) => setTimeout(r, 200));
              }
            }}
          >
            <DownloadIcon className="h-4 w-4 mr-1.5" />
            Download All ({outputs.length})
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export function ConvertLoading({ fileName }: { fileName?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden my-3 animate-pulse",
        "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-700/50"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <ArrowRightLeft className="h-4 w-4 text-slate-500" />
        <span className="text-sm text-slate-400">
          {fileName ? `Converting ${fileName}...` : "Converting file..."}
        </span>
      </div>
      <div className="px-4 pb-3 space-y-2">
        <div className="h-4 w-3/4 bg-slate-700/50 rounded" />
        <div className="h-3 w-1/2 bg-slate-700/50 rounded" />
      </div>
    </div>
  );
}

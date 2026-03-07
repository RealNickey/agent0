/**
 * Conversion routing matrix — decides how each source→target pair is handled.
 */

export type ConvertMethod = "local-canvas" | "local-text" | "local-pdf-lib" | "provider";

export interface ConversionPath {
  method: ConvertMethod;
  /** Format name to pass to the provider API as source (e.g. "docx") */
  providerSource?: string;
  /** Format name to pass to the provider API as target (e.g. "pdf") */
  providerTarget?: string;
  /** Whether this conversion can produce multiple output files (e.g. PDF → IMG pages) */
  multiOutput?: boolean;
}

// ── helpers ────────────────────────────────────────────────────────────────

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff", "svg", "ico", "avif"];
const TEXT_EXTS = ["txt", "csv", "tsv", "html", "md"];

function simpleGroup(ext: string): string {
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (TEXT_EXTS.includes(ext)) return "text";
  return ext;
}

// ── exact source:target paths ──────────────────────────────────────────────

const EXACT: Record<string, ConversionPath> = {
  // Local: IMG → PDF (pdf-lib — PNG and JPG only)
  "png:pdf":  { method: "local-pdf-lib" },
  "jpg:pdf":  { method: "local-pdf-lib" },
  "jpeg:pdf": { method: "local-pdf-lib" },

  // Provider: DOC / DOCX → PDF
  "doc:pdf":   { method: "provider", providerSource: "doc",  providerTarget: "pdf" },
  "docx:pdf":  { method: "provider", providerSource: "docx", providerTarget: "pdf" },

  // Provider: DOC / DOCX → IMG
  "doc:png":   { method: "provider", providerSource: "doc",  providerTarget: "png",  multiOutput: true },
  "doc:jpg":   { method: "provider", providerSource: "doc",  providerTarget: "jpg",  multiOutput: true },
  "docx:png":  { method: "provider", providerSource: "docx", providerTarget: "png",  multiOutput: true },
  "docx:jpg":  { method: "provider", providerSource: "docx", providerTarget: "jpg",  multiOutput: true },
  "docx:jpeg": { method: "provider", providerSource: "docx", providerTarget: "jpg",  multiOutput: true },

  // Provider: DOC / DOCX → PPT
  "doc:pptx":  { method: "provider", providerSource: "doc",  providerTarget: "pptx" },
  "docx:pptx": { method: "provider", providerSource: "docx", providerTarget: "pptx" },

  // Provider: IMG → DOC
  "png:docx":  { method: "provider", providerSource: "png",  providerTarget: "docx" },
  "jpg:docx":  { method: "provider", providerSource: "jpg",  providerTarget: "docx" },
  "jpeg:docx": { method: "provider", providerSource: "jpg",  providerTarget: "docx" },
  "webp:docx": { method: "provider", providerSource: "webp", providerTarget: "docx" },
  "bmp:docx":  { method: "provider", providerSource: "bmp",  providerTarget: "docx" },
  "gif:docx":  { method: "provider", providerSource: "gif",  providerTarget: "docx" },
  "tiff:docx": { method: "provider", providerSource: "tiff", providerTarget: "docx" },

  // Provider: IMG → PDF (formats not handled by pdf-lib)
  "webp:pdf":  { method: "provider", providerSource: "webp", providerTarget: "pdf" },
  "bmp:pdf":   { method: "provider", providerSource: "bmp",  providerTarget: "pdf" },
  "gif:pdf":   { method: "provider", providerSource: "gif",  providerTarget: "pdf" },
  "tiff:pdf":  { method: "provider", providerSource: "tiff", providerTarget: "pdf" },
  "avif:pdf":  { method: "provider", providerSource: "avif", providerTarget: "pdf" },

  // Provider: IMG → PPT
  "png:pptx":  { method: "provider", providerSource: "png",  providerTarget: "pptx" },
  "jpg:pptx":  { method: "provider", providerSource: "jpg",  providerTarget: "pptx" },
  "jpeg:pptx": { method: "provider", providerSource: "jpg",  providerTarget: "pptx" },
  "webp:pptx": { method: "provider", providerSource: "webp", providerTarget: "pptx" },

  // Provider: PDF → DOC
  "pdf:docx": { method: "provider", providerSource: "pdf", providerTarget: "docx" },
  "pdf:doc":  { method: "provider", providerSource: "pdf", providerTarget: "doc" },

  // Provider: PDF → IMG
  "pdf:png":  { method: "provider", providerSource: "pdf", providerTarget: "png",  multiOutput: true },
  "pdf:jpg":  { method: "provider", providerSource: "pdf", providerTarget: "jpg",  multiOutput: true },
  "pdf:jpeg": { method: "provider", providerSource: "pdf", providerTarget: "jpg",  multiOutput: true },

  // Provider: PDF → PPT
  "pdf:pptx": { method: "provider", providerSource: "pdf", providerTarget: "pptx" },

  // Provider: Excel → PDF
  "xlsx:pdf": { method: "provider", providerSource: "xlsx", providerTarget: "pdf" },
  "xls:pdf":  { method: "provider", providerSource: "xls",  providerTarget: "pdf" },

  // Provider: PPT → PDF
  "pptx:pdf": { method: "provider", providerSource: "pptx", providerTarget: "pdf" },
  "ppt:pdf":  { method: "provider", providerSource: "ppt",  providerTarget: "pdf" },
};

// ── group-level fallback paths ─────────────────────────────────────────────

const GROUP: Record<string, ConversionPath> = {
  "image:image": { method: "local-canvas" },
  "text:text":   { method: "local-text" },
};

// ── public API ─────────────────────────────────────────────────────────────

/**
 * Look up how to convert `sourceExt` → `targetExt`.
 * Returns null if the pair is not supported.
 */
export function getConversionPath(sourceExt: string, targetExt: string): ConversionPath | null {
  const exact = EXACT[`${sourceExt}:${targetExt}`];
  if (exact) return exact;

  const group = GROUP[`${simpleGroup(sourceExt)}:${simpleGroup(targetExt)}`];
  if (group) return group;

  return null;
}

/** Resolve common user-friendly aliases ("word", "excel") to real extensions. */
export function resolveFormatAlias(format: string): string {
  const ALIASES: Record<string, string> = {
    // User-friendly names
    image: "png",
    img: "png",
    picture: "png",
    photo: "jpg",
    excel: "xlsx",
    spreadsheet: "xlsx",
    presentation: "pptx",
    powerpoint: "pptx",
    slides: "pptx",
    word: "docx",
    document: "docx",
    // Legacy format → modern equivalent (target only)
    doc: "docx",
    ppt: "pptx",
    xls: "xlsx",
  };
  return ALIASES[format] || format;
}

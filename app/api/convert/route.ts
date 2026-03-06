import { NextResponse } from "next/server";

// Supported format groups for validation
const IMAGE_FORMATS = ["png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff", "svg", "ico", "avif"];
const DOCUMENT_FORMATS = ["pdf", "docx", "doc", "txt", "rtf", "odt", "html", "md"];
const AUDIO_FORMATS = ["mp3", "wav", "ogg", "flac", "m4a", "aac", "wma"];
const VIDEO_FORMATS = ["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv"];
const ARCHIVE_FORMATS = ["zip", "rar", "7z", "tar", "gz"];
const SPREADSHEET_FORMATS = ["xlsx", "xls", "csv", "ods", "tsv"];
const PRESENTATION_FORMATS = ["pptx", "ppt", "odp"];

const ALL_FORMATS = [
  ...IMAGE_FORMATS,
  ...DOCUMENT_FORMATS,
  ...AUDIO_FORMATS,
  ...VIDEO_FORMATS,
  ...ARCHIVE_FORMATS,
  ...SPREADSHEET_FORMATS,
  ...PRESENTATION_FORMATS,
];

function getFormatGroup(ext: string): string {
  if (IMAGE_FORMATS.includes(ext)) return "image";
  if (DOCUMENT_FORMATS.includes(ext)) return "document";
  if (AUDIO_FORMATS.includes(ext)) return "audio";
  if (VIDEO_FORMATS.includes(ext)) return "video";
  if (ARCHIVE_FORMATS.includes(ext)) return "archive";
  if (SPREADSHEET_FORMATS.includes(ext)) return "spreadsheet";
  if (PRESENTATION_FORMATS.includes(ext)) return "presentation";
  return "unknown";
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    // Images
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    webp: "image/webp", bmp: "image/bmp", gif: "image/gif",
    tiff: "image/tiff", svg: "image/svg+xml", ico: "image/x-icon",
    avif: "image/avif",
    // Documents
    pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword", txt: "text/plain", rtf: "application/rtf",
    odt: "application/vnd.oasis.opendocument.text", html: "text/html", md: "text/markdown",
    // Audio
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
    flac: "audio/flac", m4a: "audio/mp4", aac: "audio/aac", wma: "audio/x-ms-wma",
    // Video
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
    mkv: "video/x-matroska", webm: "video/webm", wmv: "video/x-ms-wmv", flv: "video/x-flv",
    // Archives
    zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed",
    tar: "application/x-tar", gz: "application/gzip",
    // Spreadsheets
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel", csv: "text/csv", ods: "application/vnd.oasis.opendocument.spreadsheet",
    tsv: "text/tab-separated-values",
    // Presentations
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint", odp: "application/vnd.oasis.opendocument.presentation",
  };
  return map[ext] || "application/octet-stream";
}

function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
    "image/bmp": "bmp", "image/gif": "gif", "image/tiff": "tiff",
    "image/svg+xml": "svg", "image/avif": "avif",
    "application/pdf": "pdf", "text/plain": "txt",
    "text/html": "html", "text/csv": "csv", "text/markdown": "md",
    "audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg",
    "video/mp4": "mp4", "video/webm": "webm",
  };
  return map[mime] || "";
}

/** Convert image via canvas on the server by re-encoding the data URL */
async function convertImageDataUrl(
  dataUrl: string,
  targetFormat: string,
  sourceFileName: string
): Promise<{ fileUrl: string; fileName: string; fileSize: string }> {
  // For server-side, we handle the raw data — the actual canvas conversion
  // happens client-side. Here we just validate and return the wrapped data.

  // If the source is already a data URL, replace the mime type header for simple
  // re-wrapping of lossless conversion (e.g. renaming). The real pixel conversion
  // is handled by the client-side canvas in the convert-result component.
  const targetMime = getMimeType(targetFormat);
  const baseName = sourceFileName.replace(/\.[^.]+$/, "") || "converted";
  const outputFileName = `${baseName}.${targetFormat}`;

  return {
    fileUrl: dataUrl, // Pass through — client converts
    fileName: outputFileName,
    fileSize: `${Math.round(dataUrl.length * 0.75 / 1024)} KB (approx)`,
  };
}

/** Convert text-based file (txt ↔ csv ↔ md ↔ html ↔ tsv) */
function convertTextDataUrl(
  dataUrl: string,
  targetFormat: string,
  sourceFileName: string
): { fileUrl: string; fileName: string; fileSize: string } {
  // Extract the base64 content
  const base64Match = dataUrl.match(/base64,(.+)/);
  if (!base64Match) throw new Error("Invalid data URL");

  const rawContent = Buffer.from(base64Match[1], "base64").toString("utf-8");
  let converted = rawContent;

  // CSV → TSV or TSV → CSV
  if (targetFormat === "tsv" && (sourceFileName.endsWith(".csv"))) {
    converted = rawContent.split("\n").map(line => line.replace(/,/g, "\t")).join("\n");
  } else if (targetFormat === "csv" && (sourceFileName.endsWith(".tsv"))) {
    converted = rawContent.split("\n").map(line => line.replace(/\t/g, ",")).join("\n");
  }
  // TXT → HTML
  else if (targetFormat === "html") {
    const escaped = rawContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    converted = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>${sourceFileName}</title></head><body><pre>${escaped}</pre></body></html>`;
  }
  // HTML → TXT
  else if (targetFormat === "txt" && sourceFileName.endsWith(".html")) {
    converted = rawContent.replace(/<[^>]+>/g, "");
  }
  // MD → HTML
  else if (targetFormat === "html" && sourceFileName.endsWith(".md")) {
    // Very basic markdown to HTML
    converted = rawContent
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>\n");
    converted = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"></head><body>${converted}</body></html>`;
  }

  const outputBuffer = Buffer.from(converted, "utf-8");
  const targetMime = getMimeType(targetFormat);
  const outputDataUrl = `data:${targetMime};base64,${outputBuffer.toString("base64")}`;
  const baseName = sourceFileName.replace(/\.[^.]+$/, "") || "converted";

  return {
    fileUrl: outputDataUrl,
    fileName: `${baseName}.${targetFormat}`,
    fileSize: `${Math.round(outputBuffer.length / 1024)} KB`,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileUrl, fileName, targetFormat } = body as {
      fileUrl: string;
      fileName: string;
      targetFormat: string;
    };

    if (!fileUrl || !targetFormat) {
      return NextResponse.json(
        { error: "Missing fileUrl or targetFormat" },
        { status: 400 }
      );
    }

    const cleanTarget = targetFormat.toLowerCase().replace(/^\./, "");

    if (!ALL_FORMATS.includes(cleanTarget)) {
      return NextResponse.json(
        { error: `Unsupported target format: ${cleanTarget}. Supported: ${ALL_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }

    // Determine source format from file name or data URL mime
    const sourceExt = fileName
      ? fileName.split(".").pop()?.toLowerCase() || ""
      : getExtensionFromMime(fileUrl.split(";")[0]?.replace("data:", "") || "");

    const sourceGroup = getFormatGroup(sourceExt);
    const targetGroup = getFormatGroup(cleanTarget);

    // ─── Image-to-Image (handled client-side via canvas, we just validate) ────
    if (sourceGroup === "image" && targetGroup === "image") {
      const result = await convertImageDataUrl(fileUrl, cleanTarget, fileName);
      return NextResponse.json({
        success: true,
        fileName: result.fileName,
        fileUrl: result.fileUrl,
        fileSize: result.fileSize,
        sourceFormat: sourceExt,
        targetFormat: cleanTarget,
        convertedOnClient: true, // Signal client to do canvas conversion
        targetMime: getMimeType(cleanTarget),
      });
    }

    // ─── Text-based conversions ────────────────────────────────────────────────
    const textFormats = ["txt", "csv", "tsv", "html", "md"];
    if (textFormats.includes(sourceExt) && textFormats.includes(cleanTarget)) {
      const result = convertTextDataUrl(fileUrl, cleanTarget, fileName);
      return NextResponse.json({
        success: true,
        fileName: result.fileName,
        fileUrl: result.fileUrl,
        fileSize: result.fileSize,
        sourceFormat: sourceExt,
        targetFormat: cleanTarget,
      });
    }

    // ─── Unsupported conversion path (for now) ────────────────────────────────
    // Document/audio/video conversions need external tools (FFmpeg, LibreOffice, etc.)
    // Return a message indicating the conversion isn't available yet
    return NextResponse.json({
      success: false,
      error: `Conversion from .${sourceExt} to .${cleanTarget} is not yet supported. Currently supported: image-to-image conversions (png, jpg, webp, gif, bmp, tiff, avif) and text format conversions (txt, csv, tsv, html, md).`,
      sourceFormat: sourceExt,
      targetFormat: cleanTarget,
    });
  } catch (error) {
    console.error("Convert API error:", error);
    return NextResponse.json(
      { error: "Conversion failed. Please try again with a different file or format." },
      { status: 500 }
    );
  }
}

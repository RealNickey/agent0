import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getConversionPath, resolveFormatAlias } from "@/lib/convert/matrix";
import { convertViaProvider } from "@/lib/convert/provider";

// Allow up to 60 s for provider-based conversions
export const maxDuration = 60;

// ── helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    webp: "image/webp", bmp: "image/bmp", gif: "image/gif",
    tiff: "image/tiff", svg: "image/svg+xml", ico: "image/x-icon",
    avif: "image/avif",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword", txt: "text/plain", rtf: "application/rtf",
    odt: "application/vnd.oasis.opendocument.text", html: "text/html", md: "text/markdown",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
    flac: "audio/flac", m4a: "audio/mp4", aac: "audio/aac", wma: "audio/x-ms-wma",
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
    mkv: "video/x-matroska", webm: "video/webm", wmv: "video/x-ms-wmv", flv: "video/x-flv",
    zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed",
    tar: "application/x-tar", gz: "application/gzip",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel", csv: "text/csv",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    tsv: "text/tab-separated-values",
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
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.ms-powerpoint": "ppt",
  };
  return map[mime] || "";
}

function extractBase64(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : null;
}

// ── local converters (no external API) ─────────────────────────────────────

/** Image-to-image: pass through to client-side canvas */
async function convertImageDataUrl(
  dataUrl: string,
  targetFormat: string,
  sourceFileName: string
): Promise<{ fileUrl: string; fileName: string; fileSize: string }> {
  const baseName = sourceFileName.replace(/\.[^.]+$/, "") || "converted";
  return {
    fileUrl: dataUrl,
    fileName: `${baseName}.${targetFormat}`,
    fileSize: `${Math.round(dataUrl.length * 0.75 / 1024)} KB (approx)`,
  };
}

/** Text-to-text: csv↔tsv, txt↔html, md→html */
function convertTextDataUrl(
  dataUrl: string,
  targetFormat: string,
  sourceFileName: string
): { fileUrl: string; fileName: string; fileSize: string } {
  const base64Match = dataUrl.match(/base64,(.+)/);
  if (!base64Match) throw new Error("Invalid data URL");

  const rawContent = Buffer.from(base64Match[1], "base64").toString("utf-8");
  let converted = rawContent;

  if (targetFormat === "tsv" && sourceFileName.endsWith(".csv")) {
    converted = rawContent.split("\n").map(line => line.replace(/,/g, "\t")).join("\n");
  } else if (targetFormat === "csv" && sourceFileName.endsWith(".tsv")) {
    converted = rawContent.split("\n").map(line => line.replace(/\t/g, ",")).join("\n");
  } else if (targetFormat === "html") {
    if (sourceFileName.endsWith(".md")) {
      converted = rawContent
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>\n");
      converted = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"></head><body>${converted}</body></html>`;
    } else {
      const escaped = rawContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      converted = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>${sourceFileName}</title></head><body><pre>${escaped}</pre></body></html>`;
    }
  } else if (targetFormat === "txt" && sourceFileName.endsWith(".html")) {
    converted = rawContent.replace(/<[^>]+>/g, "");
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

/** PNG / JPG → PDF via pdf-lib (no external API needed) */
async function convertImageToPdf(
  dataUrl: string,
  sourceFileName: string
): Promise<{ fileUrl: string; fileName: string; fileSize: string }> {
  const mimeMatch = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!mimeMatch) throw new Error("Invalid image data URL");

  const mimeType = mimeMatch[1];
  const imageBytes = Buffer.from(mimeMatch[2], "base64");

  const pdfDoc = await PDFDocument.create();

  let image;
  if (mimeType === "image/png") {
    image = await pdfDoc.embedPng(imageBytes);
  } else {
    image = await pdfDoc.embedJpg(imageBytes);
  }

  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString("base64");
  const baseName = sourceFileName.replace(/\.[^.]+$/, "") || "converted";

  return {
    fileUrl: `data:application/pdf;base64,${base64}`,
    fileName: `${baseName}.pdf`,
    fileSize: formatFileSize(pdfBytes.length),
  };
}

// ── route handler ──────────────────────────────────────────────────────────

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

    // Normalise & resolve aliases ("word" → "docx", "excel" → "xlsx", etc.)
    const cleanTarget = resolveFormatAlias(
      targetFormat.toLowerCase().replace(/^\./, "")
    );

    // Determine source extension from file name or data-URL mime
    const sourceExt = fileName
      ? fileName.split(".").pop()?.toLowerCase() || ""
      : getExtensionFromMime(fileUrl.split(";")[0]?.replace("data:", "") || "");

    // Look up the conversion path in the matrix
    const path = getConversionPath(sourceExt, cleanTarget);

    if (!path) {
      return NextResponse.json({
        success: false,
        error: `Conversion from .${sourceExt} to .${cleanTarget} is not supported. Supported targets include: pdf, docx, pptx, xlsx, png, jpg, and text formats.`,
        sourceFormat: sourceExt,
        targetFormat: cleanTarget,
      });
    }

    const baseName = fileName.replace(/\.[^.]+$/, "") || "converted";

    // ─── local-canvas (image ↔ image, client does the real re-encoding) ────
    if (path.method === "local-canvas") {
      const result = await convertImageDataUrl(fileUrl, cleanTarget, fileName);
      return NextResponse.json({
        success: true,
        fileName: result.fileName,
        fileUrl: result.fileUrl,
        fileSize: result.fileSize,
        sourceFormat: sourceExt,
        targetFormat: cleanTarget,
        convertedOnClient: true,
        targetMime: getMimeType(cleanTarget),
      });
    }

    // ─── local-text (txt / csv / tsv / html / md) ──────────────────────────
    if (path.method === "local-text") {
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

    // ─── local-pdf-lib (PNG / JPG → PDF) ───────────────────────────────────
    if (path.method === "local-pdf-lib") {
      const result = await convertImageToPdf(fileUrl, fileName);
      return NextResponse.json({
        success: true,
        fileName: result.fileName,
        fileUrl: result.fileUrl,
        fileSize: result.fileSize,
        sourceFormat: sourceExt,
        targetFormat: cleanTarget,
      });
    }

    // ─── provider (ConvertAPI) ─────────────────────────────────────────────
    const rawBase64 = extractBase64(fileUrl);
    if (!rawBase64) {
      return NextResponse.json(
        { success: false, error: "Invalid file data — expected a base64 data URL." },
        { status: 400 }
      );
    }

    const providerResult = await convertViaProvider(
      rawBase64,
      fileName,
      path.providerSource || sourceExt,
      path.providerTarget || cleanTarget
    );

    // Single-file output (most conversions)
    if (providerResult.files.length === 1) {
      const f = providerResult.files[0];
      return NextResponse.json({
        success: true,
        fileName: f.fileName || `${baseName}.${cleanTarget}`,
        fileUrl: `data:${f.mimeType};base64,${f.fileData}`,
        fileSize: formatFileSize(f.fileSize),
        sourceFormat: sourceExt,
        targetFormat: cleanTarget,
      });
    }

    // Multi-file output (e.g. PDF pages → images, DOC pages → images)
    const MAX_PAGES = 20;
    const capped = providerResult.files.slice(0, MAX_PAGES);
    const outputs = capped.map((f, i) => ({
      fileName: f.fileName || `${baseName}_${i + 1}.${cleanTarget}`,
      fileUrl: `data:${f.mimeType};base64,${f.fileData}`,
      fileSize: formatFileSize(f.fileSize),
    }));

    const totalSize = capped.reduce((sum, f) => sum + f.fileSize, 0);

    return NextResponse.json({
      success: true,
      fileName: `${baseName}_pages.${cleanTarget}`,
      fileUrl: outputs[0].fileUrl,
      fileSize: formatFileSize(totalSize),
      sourceFormat: sourceExt,
      targetFormat: cleanTarget,
      outputs,
    });
  } catch (error) {
    console.error("Convert API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Conversion failed. Please try again." },
      { status: 500 }
    );
  }
}

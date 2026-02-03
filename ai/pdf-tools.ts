import { tool } from "ai";
import { z } from "zod";
import { PDFDocument } from "pdf-lib";

/**
 * PDF Tools for Agent0
 *
 * These tools allow the AI agent to perform PDF operations.
 * Users invoke these tools using @pdf mentions in their prompts.
 *
 * The tools work with PDFs extracted from the conversation context,
 * so users just need to upload PDFs and ask for operations.
 *
 * Available operations:
 * - compressPDF: Compress/optimize a PDF file
 * - mergePDFs: Merge multiple PDFs into a single document
 */

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data URL prefix if present (e.g., "data:application/pdf;base64,")
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64 data URL
 */
function uint8ArrayToBase64DataUrl(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:application/pdf;base64,${btoa(binary)}`;
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * PDF file info type
 */
export type PDFFileInfo = {
  url: string; // base64 data URL
  name?: string;
};

/**
 * Create PDF tools with access to PDFs from conversation context
 * 
 * @param pdfFiles - Array of PDF files extracted from the conversation
 */
export function createPDFTools(pdfFiles: PDFFileInfo[]) {
  const hasPDFs = pdfFiles.length > 0;
  
  /**
   * Compress PDF Tool
   * Uses the first PDF from context or a specified index
   */
  const compressPDF = tool({
    description: hasPDFs
      ? `Compress and optimize a PDF file to reduce its size. There ${pdfFiles.length === 1 ? "is 1 PDF" : `are ${pdfFiles.length} PDFs`} available from the conversation. Use fileIndex to specify which PDF to compress (0-based, default is 0 for the first/only PDF).`
      : "Compress and optimize a PDF file. NOTE: No PDF files have been uploaded yet. Ask the user to upload a PDF first.",
    inputSchema: z.object({
      fileIndex: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Index of the PDF file to compress (0-based). Default is 0 for the first PDF."),
      outputFilename: z
        .string()
        .optional()
        .describe("Optional custom filename for the compressed PDF (without extension)"),
      removeMetadata: z
        .boolean()
        .optional()
        .describe("Remove document metadata to reduce size (default: true)"),
    }),
    execute: async ({ fileIndex, outputFilename, removeMetadata }) => {
      const idx = fileIndex ?? 0;
      const shouldRemoveMetadata = removeMetadata ?? true;
      // Check if PDFs are available
      if (!hasPDFs) {
        return {
          success: false,
          requiresUpload: true,
          error: "No PDF files found in the conversation. Please upload a PDF file to compress.",
          message: "📄 Please upload a PDF file to continue with compression.",
        };
      }

      // Validate file index
      if (idx >= pdfFiles.length) {
        return {
          success: false,
          error: `Invalid file index. Only ${pdfFiles.length} PDF(s) available. Use index 0 to ${pdfFiles.length - 1}.`,
        };
      }

      try {
        const pdfFile = pdfFiles[idx];
        const originalBytes = base64ToUint8Array(pdfFile.url);
        const originalSize = originalBytes.length;

        // Load the PDF document
        const pdfDoc = await PDFDocument.load(originalBytes, {
          ignoreEncryption: true,
        });

        const pageCount = pdfDoc.getPageCount();

        // Remove metadata if requested
        if (shouldRemoveMetadata) {
          pdfDoc.setTitle("");
          pdfDoc.setAuthor("");
          pdfDoc.setSubject("");
          pdfDoc.setKeywords([]);
          pdfDoc.setProducer("Agent0 PDF Tools");
          pdfDoc.setCreator("");
        }

        // Save with optimization options
        const compressedBytes = await pdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
        });

        const compressedDataUrl = uint8ArrayToBase64DataUrl(compressedBytes);
        const compressedSize = compressedBytes.length;
        const savedBytes = originalSize - compressedSize;
        const compressionRatio = originalSize > 0
          ? ((savedBytes / originalSize) * 100).toFixed(1)
          : "0";

        const filename = outputFilename
          ? `${outputFilename}.pdf`
          : pdfFile.name
            ? `compressed-${pdfFile.name}`
            : "compressed-document.pdf";

        return {
          success: true,
          data: {
            dataUrl: compressedDataUrl,
            filename,
            mimeType: "application/pdf",
            pageCount,
            originalSize: formatFileSize(originalSize),
            compressedSize: formatFileSize(compressedSize),
            savedBytes: formatFileSize(Math.max(0, savedBytes)),
            compressionRatio: `${compressionRatio}%`,
          },
          message: savedBytes > 0
            ? `✅ Successfully compressed PDF from ${formatFileSize(originalSize)} to ${formatFileSize(compressedSize)} (${compressionRatio}% reduction). The file has ${pageCount} pages.`
            : `✅ PDF is already optimized. Size: ${formatFileSize(compressedSize)} with ${pageCount} pages.`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to compress PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });

  /**
   * Merge PDFs Tool
   * Merges all PDFs from context or specified indices
   */
  const mergePDFs = tool({
    description: hasPDFs
      ? `Merge multiple PDF files into a single document. There ${pdfFiles.length === 1 ? "is 1 PDF" : `are ${pdfFiles.length} PDFs`} available. ${pdfFiles.length >= 2 ? "By default, all PDFs will be merged in order." : "NOTE: At least 2 PDFs are needed to merge. Ask the user to upload more PDFs."}`
      : "Merge multiple PDF files into one. NOTE: No PDF files have been uploaded yet. Ask the user to upload at least 2 PDF files to merge.",
    inputSchema: z.object({
      fileIndices: z
        .array(z.number().int().min(0))
        .optional()
        .describe("Array of PDF file indices to merge in order (0-based). If not specified, all PDFs will be merged in upload order."),
      outputFilename: z
        .string()
        .optional()
        .describe("Optional custom filename for the merged PDF (without extension)"),
    }),
    execute: async ({ fileIndices, outputFilename }) => {
      // Check if PDFs are available
      if (!hasPDFs) {
        return {
          success: false,
          requiresUpload: true,
          error: "No PDF files found in the conversation. Please upload at least 2 PDF files to merge.",
          message: "📄 Please upload at least 2 PDF files to merge them together.",
        };
      }

      // Check minimum file count
      if (pdfFiles.length < 2) {
        return {
          success: false,
          requiresUpload: true,
          error: "At least 2 PDF files are required to merge. Currently only 1 PDF is uploaded.",
          message: "📄 Please upload at least one more PDF file. You need 2 or more PDFs to merge.",
        };
      }

      // Determine which files to merge
      const indicesToMerge = fileIndices && fileIndices.length >= 2
        ? fileIndices
        : pdfFiles.map((_, i) => i); // Default: all files in order

      // Validate indices
      for (const idx of indicesToMerge) {
        if (idx >= pdfFiles.length) {
          return {
            success: false,
            error: `Invalid file index ${idx}. Only ${pdfFiles.length} PDF(s) available. Use indices 0 to ${pdfFiles.length - 1}.`,
          };
        }
      }

      if (indicesToMerge.length < 2) {
        return {
          success: false,
          error: "At least 2 files must be specified to merge.",
        };
      }

      try {
        const mergedPdf = await PDFDocument.create();
        let totalSourcePages = 0;

        // Process each PDF in order
        for (const idx of indicesToMerge) {
          const pdfFile = pdfFiles[idx];
          const pdfBytes = base64ToUint8Array(pdfFile.url);
          const pdfDoc = await PDFDocument.load(pdfBytes, {
            ignoreEncryption: true,
          });

          const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
          totalSourcePages += pdfDoc.getPageCount();
        }

        const totalPages = mergedPdf.getPageCount();
        const mergedPdfBytes = await mergedPdf.save({
          useObjectStreams: true,
        });

        const mergedDataUrl = uint8ArrayToBase64DataUrl(mergedPdfBytes);
        const filename = outputFilename
          ? `${outputFilename}.pdf`
          : "merged-document.pdf";

        return {
          success: true,
          data: {
            dataUrl: mergedDataUrl,
            filename,
            mimeType: "application/pdf",
            totalPages,
            sourceFileCount: indicesToMerge.length,
            fileSize: formatFileSize(mergedPdfBytes.length),
          },
          message: `✅ Successfully merged ${indicesToMerge.length} PDF files into a single document with ${totalPages} pages. File size: ${formatFileSize(mergedPdfBytes.length)}.`,
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to merge PDFs: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });

  return {
    compressPDF,
    mergePDFs,
  };
}

/**
 * Extract PDF files from UI messages
 * 
 * Only extracts PDFs from the most recent user message to ensure
 * each PDF operation only uses files from the current request,
 * not files from previous operations in the conversation.
 */
export function extractPDFsFromMessages(messages: any[]): PDFFileInfo[] {
  const pdfs: PDFFileInfo[] = [];

  // Find the last user message (most recent request)
  let lastUserMessage = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserMessage = messages[i];
      break;
    }
  }

  // Only extract PDFs from the last user message
  if (lastUserMessage && lastUserMessage.parts && Array.isArray(lastUserMessage.parts)) {
    for (const part of lastUserMessage.parts) {
      if (
        part.type === "file" &&
        part.mediaType === "application/pdf" &&
        part.url
      ) {
        pdfs.push({
          url: part.url,
          name: part.name || undefined,
        });
      }
    }
  }

  return pdfs;
}

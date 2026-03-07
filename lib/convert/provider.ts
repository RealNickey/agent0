/**
 * ConvertAPI adapter – sends files to https://www.convertapi.com for
 * document / spreadsheet / presentation conversions.
 *
 * Requires the CONVERT_API_SECRET env var (free tier: 250 conversions).
 */

const CONVERT_API_BASE = "https://v2.convertapi.com/convert";

// ── types ──────────────────────────────────────────────────────────────────

interface ConvertApiFile {
  FileName: string;
  FileExt: string;
  FileSize: number;
  FileData: string; // raw base64
}

interface ConvertApiResponse {
  ConversionCost: number;
  Files: ConvertApiFile[];
}

export interface ProviderConvertOutput {
  fileName: string;
  fileData: string; // raw base64
  fileSize: number;
  mimeType: string;
}

export interface ProviderConvertResult {
  files: ProviderConvertOutput[];
}

// ── helpers ────────────────────────────────────────────────────────────────

function getApiSecret(): string {
  const secret = process.env.CONVERT_API_SECRET;
  if (!secret) {
    throw new Error(
      "CONVERT_API_SECRET is not configured. " +
        "Get a free API key at https://www.convertapi.com/ and add it to your .env file."
    );
  }
  return secret;
}

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  tiff: "image/tiff",
  bmp: "image/bmp",
};

function mimeForExt(ext: string): string {
  return EXT_MIME[ext] || "application/octet-stream";
}

function friendlyError(status: number, raw: string): string {
  if (status === 401 || status === 403)
    return "Invalid or expired CONVERT_API_SECRET. Please check your API key.";
  if (status === 429)
    return "Conversion rate limit reached. Please wait a moment and try again.";
  if (status >= 500)
    return "The conversion service encountered an error. The file may be corrupted or in an unsupported variant.";
  try {
    const j = JSON.parse(raw);
    return j.Message || j.message || `Conversion failed (HTTP ${status})`;
  } catch {
    return `Conversion failed (HTTP ${status})`;
  }
}

// ── public API ─────────────────────────────────────────────────────────────

/**
 * Convert a file via ConvertAPI.
 *
 * @param base64Data  Raw base64 (no data-URL prefix)
 * @param sourceFileName  Original file name (e.g. "report.docx")
 * @param sourceFormat  Extension used in the API URL (e.g. "docx")
 * @param targetFormat  Extension used in the API URL (e.g. "pdf")
 */
export async function convertViaProvider(
  base64Data: string,
  sourceFileName: string,
  sourceFormat: string,
  targetFormat: string
): Promise<ProviderConvertResult> {
  const secret = getApiSecret();

  const url = `${CONVERT_API_BASE}/${encodeURIComponent(sourceFormat)}/to/${encodeURIComponent(targetFormat)}?Secret=${encodeURIComponent(secret)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Parameters: [
        {
          Name: "File",
          FileValue: {
            Name: sourceFileName,
            Data: base64Data,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error("ConvertAPI error:", response.status, errBody);
    throw new Error(friendlyError(response.status, errBody));
  }

  const data: ConvertApiResponse = await response.json();

  if (!data.Files || data.Files.length === 0) {
    throw new Error("Conversion produced no output files.");
  }

  return {
    files: data.Files.map((f) => ({
      fileName: f.FileName,
      fileData: f.FileData,
      fileSize: f.FileSize,
      mimeType: mimeForExt(f.FileExt || targetFormat),
    })),
  };
}

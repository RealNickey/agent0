/**
 * Google Slides (Drive upload) helpers.
 * Reuses OAuth token storage from google-calendar.ts.
 */

export {
  getTokens,
  storeTokens,
  removeTokens,
  getValidAccessToken,
  isTokenExpired,
  GOOGLE_SLIDES_SCOPES,
  type GoogleTokens,
} from "./google-calendar";

import { getValidAccessToken } from "./google-calendar";

const DEFAULT_USER_ID = "default-user";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const SLIDES_MIME = "application/vnd.google-apps.presentation";

export function hasSlidesScopes(scopes?: string): boolean {
  if (!scopes) return false;
  return scopes.includes("drive.file");
}

export async function uploadPresentationToDrive(name: string, pptxBuffer: Buffer) {
  const accessToken = await getValidAccessToken(DEFAULT_USER_ID);

  if (!accessToken) {
    return {
      error: true,
      message: "Google Slides is not connected. Please connect your Google account first.",
    } as const;
  }

  const boundary = `agent0-${crypto.randomUUID()}`;
  const delimiter = `--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart =
    `${delimiter}` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify({ name, mimeType: SLIDES_MIME }) +
    "\r\n";

  const filePart =
    `${delimiter}` +
    `Content-Type: ${PPTX_MIME}\r\n\r\n`;

  const multipartBody = Buffer.concat([
    Buffer.from(metadataPart, "utf-8"),
    Buffer.from(filePart, "utf-8"),
    pptxBuffer,
    Buffer.from(closeDelimiter, "utf-8"),
  ]);

  const response = await fetch(
    `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,webViewLink,thumbnailLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return {
      error: true,
      message: errorText || "Failed to upload presentation",
    } as const;
  }

  const data = await response.json();
  return {
    error: false,
    fileId: data.id as string,
    webViewLink: data.webViewLink as string,
    thumbnailLink: data.thumbnailLink as string | undefined,
  } as const;
}

export async function setFilePermission(
  fileId: string,
  role: "reader" | "writer" | "commenter",
  type: "user" | "group" | "domain" | "anyone"
) {
  const accessToken = await getValidAccessToken(DEFAULT_USER_ID);

  if (!accessToken) {
    return {
      error: true,
      message: "Google Slides is not connected. Please connect your Google account first.",
    } as const;
  }

  const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role,
      type,
      allowFileDiscovery: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      error: true,
      message: errorText || "Failed to set file permissions",
    } as const;
  }

  return { error: false } as const;
}

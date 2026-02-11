/**
 * Google Drive Upload with Slides Conversion
 *
 * Uploads PPTX files to Google Drive with auto-conversion to native Google Slides.
 * Follows the same auth pattern as google-forms.ts (shared OAuth from google-calendar.ts).
 */

// Re-export token management from google-calendar (shared OAuth)
export {
  getTokens,
  storeTokens,
  removeTokens,
  getValidAccessToken,
  isTokenExpired,
  GOOGLE_FORMS_SCOPES, // drive.file scope is in here
  type GoogleTokens,
} from "./google-calendar";

const DEFAULT_USER_ID = "default-user";

/**
 * Upload a PPTX buffer to Google Drive with auto-conversion to Google Slides
 *
 * Uses multipart upload with `mimeType: "application/vnd.google-apps.presentation"`
 * in metadata so Drive auto-converts the PPTX to native Google Slides format.
 *
 * @param name - Presentation file name (without extension)
 * @param pptxBuffer - The PPTX file buffer
 * @param accessToken - Google OAuth access token
 * @returns File metadata including webViewLink
 */
export async function uploadPresentationToDrive(
  name: string,
  pptxBuffer: Buffer,
  accessToken: string
): Promise<{ fileId: string; webViewLink: string; thumbnailLink?: string }> {
  // Build multipart request body
  const metadata = JSON.stringify({
    name: `${name}.pptx`,
    mimeType: "application/vnd.google-apps.presentation", // Triggers auto-conversion
  });

  const boundary = "agent0_slides_boundary_" + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  // Construct the multipart body manually
  const metadataPart =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    metadata;

  const filePart =
    delimiter +
    "Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n" +
    "Content-Transfer-Encoding: base64\r\n\r\n" +
    pptxBuffer.toString("base64");

  const body = metadataPart + filePart + closeDelimiter;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Drive upload failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  return {
    fileId: data.id,
    webViewLink: data.webViewLink,
    thumbnailLink: data.thumbnailLink,
  };
}

/**
 * Set file permission (e.g., make viewable by anyone with link)
 *
 * @param fileId - Google Drive file ID
 * @param role - Permission role: "reader", "writer", "commenter"
 * @param type - Permission type: "anyone", "user", "group", "domain"
 * @param accessToken - Google OAuth access token
 */
export async function setFilePermission(
  fileId: string,
  role: "reader" | "writer" | "commenter",
  type: "anyone" | "user" | "group" | "domain",
  accessToken: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role, type }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.warn(
      "Failed to set file permission:",
      errorData.error?.message || response.statusText
    );
    // Non-fatal — the file is still created, just not publicly shared
  }
}

/**
 * Get a valid access token for slides operations
 * Convenience wrapper using the default user ID.
 */
export async function getSlidesAccessToken(): Promise<string | null> {
  const { getValidAccessToken } = await import("./google-calendar");
  return getValidAccessToken(DEFAULT_USER_ID);
}

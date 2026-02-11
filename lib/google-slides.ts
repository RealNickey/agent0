
import { getValidAccessToken } from "./google-calendar";

// Re-export token management
export { getValidAccessToken } from "./google-calendar";

const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
const DRIVE_API_URL = "https://www.googleapis.com/drive/v3/files";

/**
 * Upload a PPTX buffer to Google Drive and convert to Google Slides
 */
export async function uploadPresentationToDrive(
  name: string,
  pptxBuffer: Buffer,
  accessToken: string
): Promise<{ success: boolean; fileId?: string; webViewLink?: string; thumbnailLink?: string; error?: string }> {
  try {
    const metadata = {
      name,
      mimeType: "application/vnd.google-apps.presentation", // Convert to Google Slides
    };

    const boundary = "-------314159265358979323846";
    const delimiter = "--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    // Construct the body manually for multipart/related
    const body = delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      "\r\n" +
      delimiter +
      'Content-Type: ' + contentType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n' +
      '\r\n' +
      pptxBuffer.toString('base64') +
      close_delim;

    const response = await fetch(DRIVE_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": Buffer.byteLength(body).toString(),
      },
      body: body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Drive upload failed:", errorData);
      return {
        success: false,
        error: errorData.error?.message || `Upload failed: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const fileId = data.id;

    // Get the webViewLink and thumbnail
    try {
        const getFileResponse = await fetch(`${DRIVE_API_URL}/${fileId}?fields=webViewLink,thumbnailLink`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const fileData = await getFileResponse.json();

        return {
          success: true,
          fileId,
          webViewLink: fileData.webViewLink,
          thumbnailLink: fileData.thumbnailLink,
        };
    } catch (err) {
        console.warn("Failed to fetch file metadata after upload", err);
        return {
             success: true,
             fileId,
             // Fallback if metadata fetch fails but upload succeeded
             webViewLink: `https://docs.google.com/presentation/d/${fileId}/edit`,
        }
    }

  } catch (error) {
    console.error("Error in uploadPresentationToDrive:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown upload error",
    };
  }
}

/**
 * Make file viewable by anyone with the link (optional, or as requested)
 */
export async function setFilePermission(
  fileId: string,
  accessToken: string,
  role: "reader" | "writer" = "reader",
  type: "anyone" | "user" = "anyone"
): Promise<boolean> {
  try {
    const response = await fetch(`${DRIVE_API_URL}/${fileId}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role,
        type,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to set permission:", error);
    return false;
  }
}

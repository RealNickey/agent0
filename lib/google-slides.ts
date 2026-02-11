import { getValidAccessToken } from "@/lib/google-calendar";

const DEFAULT_USER_ID = "default-user";

export async function uploadPresentationToDrive(name: string, pptxBuffer: Buffer) {
  const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
  if (!accessToken) {
    throw new Error("Google authentication required for Slides upload");
  }

  const boundary = `agent0-${Date.now()}`;
  const metadata = {
    name,
    mimeType: "application/vnd.google-apps.presentation",
  };

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n`),
    pptxBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drive upload failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    fileId: data.id as string,
    webViewLink: data.webViewLink as string,
    thumbnailLink: data.thumbnailLink as string | undefined,
  };
}

export async function setFilePermission(fileId: string, role: "reader" | "writer" = "reader", type: "anyone" | "user" = "anyone") {
  const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
  if (!accessToken) {
    throw new Error("Google authentication required for setting permissions");
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role, type }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to set permission (${response.status}): ${errorText}`);
  }

  return { success: true };
}

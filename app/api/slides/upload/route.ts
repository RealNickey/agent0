/**
 * POST /api/slides/upload
 *
 * Direct upload endpoint for PPTX → Google Slides conversion.
 * Accepts a base64-encoded PPTX buffer + metadata, uploads to Google Drive.
 * Used as a fallback if the tool execute path is unavailable.
 */

import { NextResponse } from "next/server";
import { generatePptx } from "@/lib/pptx-generator";
import {
  uploadPresentationToDrive,
  setFilePermission,
} from "@/lib/google-slides";
import { getValidAccessToken } from "@/lib/google-calendar";
import type { SlideOutline } from "@/types/slides";

const DEFAULT_USER_ID = "default-user";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outline } = body as { outline: SlideOutline };

    if (!outline || !outline.title || !outline.slides) {
      return NextResponse.json(
        { error: "Invalid outline: must include title and slides" },
        { status: 400 }
      );
    }

    // Get access token
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Google account not connected. Please install the Slides integration." },
        { status: 401 }
      );
    }

    // Generate PPTX
    const pptxBuffer = await generatePptx(outline);

    // Upload to Google Drive with auto-conversion
    const { fileId, webViewLink, thumbnailLink } =
      await uploadPresentationToDrive(outline.title, pptxBuffer, accessToken);

    // Make viewable by anyone with link
    await setFilePermission(fileId, "reader", "anyone", accessToken);

    return NextResponse.json({
      status: "created",
      fileId,
      slidesUrl: webViewLink,
      thumbnailLink,
      slideCount: outline.slides.length,
      title: outline.title,
    });
  } catch (error) {
    console.error("Slides upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create presentation" },
      { status: 500 }
    );
  }
}

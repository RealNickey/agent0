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
import { PREMADE_THEMES, type ThemeName } from "@/types/slides";

const DEFAULT_USER_ID = "default-user";

const UPLOAD_TIMEOUTS_MS = {
  pptxGeneration: 45_000,
  driveUpload: 30_000,
  setPermission: 10_000,
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function POST(req: Request) {
  const requestId = `slides-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const body = await req.json();
    const { outline, themeName } = body as { outline: SlideOutline; themeName?: string };

    console.log(`[${requestId}] Upload request received`, {
      title: outline?.title,
      slideCount: outline?.slides?.length,
      themeName,
      timeoutsMs: UPLOAD_TIMEOUTS_MS,
    });

    if (!outline || !outline.title || !outline.slides) {
      return NextResponse.json(
        { error: "Invalid outline: must include title and slides" },
        { status: 400 }
      );
    }

    // Resolve premade theme if provided
    if (themeName && PREMADE_THEMES[themeName as ThemeName]) {
      const premade = PREMADE_THEMES[themeName as ThemeName];
      outline.theme = {
        primaryColor: premade.primaryColor,
        secondaryColor: premade.secondaryColor,
        accentColor: premade.accentColor,
        fontFamily: premade.fontFamily,
      };
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
    const pptxBuffer = await withTimeout(
      generatePptx(outline),
      UPLOAD_TIMEOUTS_MS.pptxGeneration,
      "PPTX generation"
    );

    // Upload to Google Drive with auto-conversion
    const { fileId, webViewLink, thumbnailLink } = await withTimeout(
      uploadPresentationToDrive(outline.title, pptxBuffer, accessToken),
      UPLOAD_TIMEOUTS_MS.driveUpload,
      "Google Drive upload"
    );

    // Make viewable by anyone with link
    await withTimeout(
      setFilePermission(fileId, "reader", "anyone", accessToken),
      UPLOAD_TIMEOUTS_MS.setPermission,
      "Google Drive set permission"
    );

    console.log(`[${requestId}] Upload completed`, {
      fileId,
      hasSlidesUrl: Boolean(webViewLink),
    });

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

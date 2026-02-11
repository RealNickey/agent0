
import { NextRequest, NextResponse } from "next/server";
import { generatePresentation } from "@/lib/pptx-generator";
import { uploadPresentationToDrive, getValidAccessToken, setFilePermission } from "@/lib/google-slides";
import { SlideOutline } from "@/types/slides";

const DEFAULT_USER_ID = "default-user";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outline } = body;

    if (!outline) {
      return NextResponse.json({ error: true, message: "Missing outline" }, { status: 400 });
    }

    // 1. Generate PPTX
    const pptxBuffer = await generatePresentation(outline as SlideOutline);

    // 2. Get Access Token
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Account not connected. Please connect your Google account.",
      }, { status: 401 });
    }

    // 3. Upload to Drive
    const uploadResult = await uploadPresentationToDrive(outline.title, pptxBuffer, accessToken);

    if (!uploadResult.success || !uploadResult.fileId) {
      return NextResponse.json({
        error: true,
        message: uploadResult.error || "Failed to upload presentation.",
      }, { status: 500 });
    }

    // 4. Set permissions
    await setFilePermission(uploadResult.fileId, accessToken, "reader", "anyone");

    return NextResponse.json({
      status: "created",
      fileId: uploadResult.fileId,
      slidesUrl: uploadResult.webViewLink,
      thumbnailLink: uploadResult.thumbnailLink,
      slideCount: outline.slides.length,
      title: outline.title,
    });
  } catch (error) {
    console.error("Error in slides upload:", error);
    return NextResponse.json({
      error: true,
      message: error instanceof Error ? error.message : "An unknown error occurred",
    }, { status: 500 });
  }
}

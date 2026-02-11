import { NextResponse } from "next/server";
import { uploadPresentationToDrive, setFilePermission } from "@/lib/google-slides";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, pptxBase64, makePublic = true } = body;

    if (!name || !pptxBase64) {
      return NextResponse.json({ error: "name and pptxBase64 are required" }, { status: 400 });
    }

    const buffer = Buffer.from(pptxBase64, "base64");
    const result = await uploadPresentationToDrive(name, buffer);

    if (makePublic) {
      await setFilePermission(result.fileId, "reader", "anyone");
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Slides upload failed",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setFilePermission, uploadPresentationToDrive } from "@/lib/google-slides";

const uploadSchema = z.object({
  name: z.string(),
  pptxBase64: z.string(),
  permissionRole: z.enum(["reader", "writer", "commenter"]).optional(),
  permissionType: z.enum(["user", "group", "domain", "anyone"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = uploadSchema.parse(await request.json());

    const base64Payload = body.pptxBase64.includes(",")
      ? body.pptxBase64.split(",")[1]
      : body.pptxBase64;

    const buffer = Buffer.from(base64Payload, "base64");
    const uploadResult = await uploadPresentationToDrive(body.name, buffer);

    if (uploadResult.error) {
      return NextResponse.json({ error: true, message: uploadResult.message }, { status: 400 });
    }

    if (body.permissionRole && body.permissionType) {
      const permissionResult = await setFilePermission(
        uploadResult.fileId,
        body.permissionRole,
        body.permissionType
      );

      if (permissionResult.error) {
        return NextResponse.json(
          { error: true, message: permissionResult.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      error: false,
      fileId: uploadResult.fileId,
      webViewLink: uploadResult.webViewLink,
      thumbnailLink: uploadResult.thumbnailLink,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: true, message: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

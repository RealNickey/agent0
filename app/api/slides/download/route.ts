import { NextRequest, NextResponse } from "next/server";
import { generatePresentation } from "@/lib/pptx-generator";
import { SlideOutline } from "@/types/slides";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outline } = body;

    if (!outline) {
      return NextResponse.json({ error: true, message: "Missing outline" }, { status: 400 });
    }

    // Generate PPTX
    const pptxBuffer = await generatePresentation(outline as SlideOutline);

    // Create a safe filename
    const filename = `${outline.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`;

    // Return as downloadable file
    return new NextResponse(pptxBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pptxBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error in slides download:", error);
    return NextResponse.json({
      error: true,
      message: error instanceof Error ? error.message : "An unknown error occurred",
    }, { status: 500 });
  }
}

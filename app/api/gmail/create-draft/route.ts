import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

const DEFAULT_USER_ID = "default-user";
const GMAIL_API_BASE = "https://www.googleapis.com/gmail/v1";

const createDraftSchema = z.object({
  to: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
});

/**
 * Encode string to base64url
 */
function encodeBase64Url(str: string): string {
  const base64 = Buffer.from(str, "utf-8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createDraftSchema.parse(body);

    // Get access token
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    if (!accessToken) {
      return NextResponse.json(
        { error: true, message: "Gmail is not connected. Please authenticate first." },
        { status: 401 }
      );
    }

    // Build the raw email message in RFC 2822 format
    const emailLines = [
      ...(validated.to ? [`To: ${validated.to}`] : []),
      ...(validated.cc ? [`Cc: ${validated.cc}`] : []),
      ...(validated.bcc ? [`Bcc: ${validated.bcc}`] : []),
      ...(validated.subject ? [`Subject: ${validated.subject}`] : ["Subject: "]),
      "Content-Type: text/plain; charset=utf-8",
      "",
      validated.body || "",
    ];
    
    const rawMessage = encodeBase64Url(emailLines.join("\r\n"));

    const draftBody = {
      message: {
        raw: rawMessage,
      },
    };

    // Create the draft
    const response = await fetch(`${GMAIL_API_BASE}/users/me/drafts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draftBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: true,
          message: errorData.error?.message || `Failed to create draft: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      error: false,
      draftId: result.id,
      messageId: result.message?.id,
      to: validated.to,
      subject: validated.subject,
      message: "Draft saved successfully",
    });
  } catch (error) {
    console.error("Error creating draft:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: true, message: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : "Failed to create draft",
      },
      { status: 500 }
    );
  }
}

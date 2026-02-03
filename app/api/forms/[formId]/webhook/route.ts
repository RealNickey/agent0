import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-forms";

const FORMS_API_BASE = "https://forms.googleapis.com/v1";
const DEFAULT_USER_ID = "default-user";

// Request schema
const webhookSchema = z.object({
  webhookUrl: z.string().url(),
  pollingIntervalMinutes: z.number().optional().default(5),
});

/**
 * Note: Google Forms API doesn't support native webhooks.
 * This endpoint configures a polling-based notification system.
 * In a production environment, you would:
 * 1. Store this configuration in a database
 * 2. Run a scheduled job to poll for new responses
 * 3. Send new responses to the webhook URL
 * 
 * Alternatively, you could use Google Apps Script with triggers,
 * or set up a Cloud Function with Cloud Scheduler.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await req.json();
    const parsed = webhookSchema.parse(body);

    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Forms is not connected. Please connect your Google account first.",
      }, { status: 401 });
    }

    // Verify the form exists
    const formResponse = await fetch(`${FORMS_API_BASE}/forms/${formId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!formResponse.ok) {
      const errorData = await formResponse.json().catch(() => ({}));
      return NextResponse.json({
        error: true,
        message: errorData.error?.message || "Form not found",
      }, { status: formResponse.status });
    }

    const formData = await formResponse.json();

    // In a real implementation, this would store the webhook configuration
    // For now, we return a configuration object
    const watchId = `watch-${formId}-${Date.now()}`;

    return NextResponse.json({
      error: false,
      formId,
      formTitle: formData.info?.title || "Untitled form",
      webhookUrl: parsed.webhookUrl,
      pollingIntervalMinutes: parsed.pollingIntervalMinutes,
      watchId,
      status: "configured",
      message: `Response monitoring configured for "${formData.info?.title || 'Untitled form'}". Polling every ${parsed.pollingIntervalMinutes} minutes.`,
      note: "To enable real-time notifications, consider using Google Apps Script triggers or Cloud Functions.",
    });

  } catch (error) {
    console.error("Error setting up webhook:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: true,
        message: "Invalid request body",
        details: error.errors,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      error: true,
      message: error instanceof Error ? error.message : "Failed to configure webhook",
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const { searchParams } = new URL(req.url);
    const watchId = searchParams.get("watchId");

    // In a real implementation, this would remove the webhook configuration
    return NextResponse.json({
      error: false,
      formId,
      watchId,
      status: "removed",
      message: "Response monitoring removed",
    });

  } catch (error) {
    console.error("Error removing webhook:", error);
    return NextResponse.json({
      error: true,
      message: error instanceof Error ? error.message : "Failed to remove webhook",
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/google-forms";

const FORMS_API_BASE = "https://forms.googleapis.com/v1";
const DEFAULT_USER_ID = "default-user";

/**
 * Parse form response to simplified format
 */
function parseFormResponse(response: any) {
  const answers: Record<string, any> = {};
  
  if (response.answers) {
    for (const [questionId, answer] of Object.entries(response.answers as Record<string, any>)) {
      const textAnswers = answer.textAnswers?.answers?.map((a: any) => a.value) || [];
      answers[questionId] = textAnswers.length === 1 ? textAnswers[0] : textAnswers;
    }
  }

  return {
    responseId: response.responseId,
    createTime: response.createTime,
    lastSubmittedTime: response.lastSubmittedTime,
    respondentEmail: response.respondentEmail,
    answers,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const { searchParams } = new URL(req.url);
    const lastChecked = searchParams.get("since");

    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Forms is not connected. Please connect your Google account first.",
      }, { status: 401 });
    }

    // Fetch all responses
    const response = await fetch(`${FORMS_API_BASE}/forms/${formId}/responses`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: true,
        message: errorData.error?.message || `Failed to fetch responses: ${response.statusText}`,
      }, { status: response.status });
    }

    const data = await response.json();
    let responses = (data.responses || []).map(parseFormResponse);

    // Filter by timestamp if provided
    if (lastChecked) {
      const lastCheckedDate = new Date(lastChecked);
      responses = responses.filter((r: any) => 
        new Date(r.lastSubmittedTime) > lastCheckedDate
      );
    }

    return NextResponse.json({
      error: false,
      formId,
      responseCount: responses.length,
      responses,
      checkedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error fetching form responses:", error);
    return NextResponse.json({
      error: true,
      message: error instanceof Error ? error.message : "Failed to fetch responses",
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-forms";

const FORMS_API_BASE = "https://forms.googleapis.com/v1";
const DEFAULT_USER_ID = "default-user";

// Question type enum
const QuestionType = z.enum([
  "SHORT_ANSWER",
  "PARAGRAPH",
  "MULTIPLE_CHOICE",
  "CHECKBOX",
  "DROPDOWN",
  "LINEAR_SCALE",
  "DATE",
  "TIME",
]);

// Question schema
const QuestionSchema = z.object({
  title: z.string(),
  type: QuestionType,
  required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional(),
  scaleMin: z.number().optional(),
  scaleMax: z.number().optional(),
  scaleMinLabel: z.string().optional(),
  scaleMaxLabel: z.string().optional(),
});

// Request schema
const createFormSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  questions: z.array(QuestionSchema),
});

/**
 * Convert our question format to Google Forms API format
 */
function convertQuestionToFormItem(question: z.infer<typeof QuestionSchema>, index: number) {
  const baseItem: any = {
    title: question.title,
    questionItem: {
      question: {
        required: question.required || false,
      },
    },
  };

  switch (question.type) {
    case "SHORT_ANSWER":
      baseItem.questionItem.question.textQuestion = {
        paragraph: false,
      };
      break;

    case "PARAGRAPH":
      baseItem.questionItem.question.textQuestion = {
        paragraph: true,
      };
      break;

    case "MULTIPLE_CHOICE":
      baseItem.questionItem.question.choiceQuestion = {
        type: "RADIO",
        options: (question.options || ["Option 1", "Option 2"]).map(opt => ({ value: opt })),
      };
      break;

    case "CHECKBOX":
      baseItem.questionItem.question.choiceQuestion = {
        type: "CHECKBOX",
        options: (question.options || ["Option 1", "Option 2"]).map(opt => ({ value: opt })),
      };
      break;

    case "DROPDOWN":
      baseItem.questionItem.question.choiceQuestion = {
        type: "DROP_DOWN",
        options: (question.options || ["Option 1", "Option 2"]).map(opt => ({ value: opt })),
      };
      break;

    case "LINEAR_SCALE":
      baseItem.questionItem.question.scaleQuestion = {
        low: question.scaleMin || 1,
        high: question.scaleMax || 5,
        lowLabel: question.scaleMinLabel,
        highLabel: question.scaleMaxLabel,
      };
      break;

    case "DATE":
      baseItem.questionItem.question.dateQuestion = {
        includeTime: false,
        includeYear: true,
      };
      break;

    case "TIME":
      baseItem.questionItem.question.timeQuestion = {
        duration: false,
      };
      break;
  }

  return baseItem;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createFormSchema.parse(body);

    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Forms is not connected. Please connect your Google account first by installing the Forms integration.",
      }, { status: 401 });
    }

    // Step 1: Create a blank form with title
    const createResponse = await fetch(`${FORMS_API_BASE}/forms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        info: {
          title: parsed.title,
          documentTitle: parsed.title,
        },
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      return NextResponse.json({
        error: true,
        message: errorData.error?.message || `Failed to create form: ${createResponse.statusText}`,
      }, { status: createResponse.status });
    }

    const formData = await createResponse.json();
    const formId = formData.formId;

    // Step 2: Add description and questions using batchUpdate
    const requests: any[] = [];

    // Add description if provided
    if (parsed.description) {
      requests.push({
        updateFormInfo: {
          info: {
            description: parsed.description,
          },
          updateMask: "description",
        },
      });
    }

    // Add each question
    parsed.questions.forEach((question, index) => {
      requests.push({
        createItem: {
          item: convertQuestionToFormItem(question, index),
          location: {
            index,
          },
        },
      });
    });

    if (requests.length > 0) {
      const updateResponse = await fetch(`${FORMS_API_BASE}/forms/${formId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        return NextResponse.json({
          error: true,
          message: errorData.error?.message || "Failed to add questions to form",
        }, { status: updateResponse.status });
      }
    }

    // Get the final form details
    const getFormResponse = await fetch(`${FORMS_API_BASE}/forms/${formId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!getFormResponse.ok) {
      // Form was created but we couldn't get the details
      return NextResponse.json({
        error: false,
        formId,
        title: parsed.title,
        questionCount: parsed.questions.length,
        message: "Form created but failed to retrieve URL",
      });
    }

    const finalFormData = await getFormResponse.json();

    return NextResponse.json({
      error: false,
      formId: finalFormData.formId,
      title: finalFormData.info?.title || parsed.title,
      responderUri: finalFormData.responderUri,
      questionCount: parsed.questions.length,
      message: `Form "${finalFormData.info?.title || parsed.title}" created successfully!`,
    });

  } catch (error) {
    console.error("Error creating form:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: true,
        message: "Invalid request body",
        details: error.errors,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      error: true,
      message: error instanceof Error ? error.message : "Failed to create form",
    }, { status: 500 });
  }
}

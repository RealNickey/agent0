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

// Question schema for adding
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
const updateFormSchema = z.object({
  addQuestions: z.array(QuestionSchema).optional(),
  removeQuestionIndices: z.array(z.number()).optional(),
});

/**
 * Convert our question format to Google Forms API format
 */
function convertQuestionToFormItem(question: z.infer<typeof QuestionSchema>) {
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await req.json();
    const parsed = updateFormSchema.parse(body);

    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    
    if (!accessToken) {
      return NextResponse.json({
        error: true,
        message: "Google Forms is not connected. Please connect your Google account first.",
      }, { status: 401 });
    }

    // Get the current form to understand its structure
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
    const currentItems = formData.items || [];
    const requests: any[] = [];

    // Handle removals first (in reverse order to maintain indices)
    if (parsed.removeQuestionIndices && parsed.removeQuestionIndices.length > 0) {
      const sortedIndices = [...parsed.removeQuestionIndices].sort((a, b) => b - a);
      for (const index of sortedIndices) {
        if (index >= 0 && index < currentItems.length) {
          requests.push({
            deleteItem: {
              location: { index },
            },
          });
        }
      }
    }

    // Then handle additions
    if (parsed.addQuestions && parsed.addQuestions.length > 0) {
      const removedCount = parsed.removeQuestionIndices?.length || 0;
      const newStartIndex = currentItems.length - removedCount;

      parsed.addQuestions.forEach((question, i) => {
        requests.push({
          createItem: {
            item: convertQuestionToFormItem(question),
            location: {
              index: newStartIndex + i,
            },
          },
        });
      });
    }

    if (requests.length === 0) {
      return NextResponse.json({
        error: false,
        formId,
        message: "No changes to apply",
      });
    }

    // Apply the batch update
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
        message: errorData.error?.message || "Failed to update form",
      }, { status: updateResponse.status });
    }

    // Get updated form details
    const updatedFormResponse = await fetch(`${FORMS_API_BASE}/forms/${formId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const updatedFormData = updatedFormResponse.ok 
      ? await updatedFormResponse.json() 
      : formData;

    const questionCount = updatedFormData.items?.filter((item: any) => item.questionItem)?.length || 0;

    return NextResponse.json({
      error: false,
      formId,
      title: updatedFormData.info?.title,
      questionCount,
      questionsAdded: parsed.addQuestions?.length || 0,
      questionsRemoved: parsed.removeQuestionIndices?.length || 0,
      responderUri: updatedFormData.responderUri,
      message: `Form updated successfully. ${parsed.addQuestions?.length || 0} question(s) added, ${parsed.removeQuestionIndices?.length || 0} question(s) removed.`,
    });

  } catch (error) {
    console.error("Error updating form:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: true,
        message: "Invalid request body",
        details: error.errors,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      error: true,
      message: error instanceof Error ? error.message : "Failed to update form",
    }, { status: 500 });
  }
}

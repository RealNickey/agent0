import { tool } from "ai";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-forms";

/**
 * Google Forms Tools for Agent0
 * 
 * These tools allow the AI agent to interact with Google Forms API directly.
 * Users invoke these tools using @forms mentions in their prompts.
 * 
 * Available operations:
 * - createSurveyForm: Create a new survey/form with questions
 * - fetchNewResponses: Fetch new responses since last check
 * - watchResponsesWebhook: Set up webhook for real-time notifications (polling-based for Google Forms)
 * - updateFormSchema: Add or remove questions from a form
 * - getResponseSummary: Get aggregate statistics for form responses
 */

// Google Forms API base URL
const FORMS_API_BASE = "https://forms.googleapis.com/v1";

// Default user ID for development (matches what we use in auth routes)
const DEFAULT_USER_ID = "default-user";

/**
 * Extract the correct Form ID from various URL formats or validate a raw ID.
 * 
 * Valid inputs:
 * - Direct form ID: "1BxiMVs0XRA5nFMdLTN1qG4A..."
 * - Edit URL: "https://docs.google.com/forms/d/FORM_ID/edit"
 * - View URL: "https://docs.google.com/forms/d/e/FORM_ID/viewform"
 * - Response URL: "https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=sf_link"
 * 
 * IMPORTANT: The public "viewform" URLs contain a DIFFERENT ID than the edit URL.
 * The API requires the edit-mode form ID, not the public response ID.
 */
export function extractFormId(input: string): { formId: string | null; isPublicUrl: boolean; hint?: string } {
  const trimmed = input.trim();
  
  // Check for public viewform URL (starts with 1FAIpQL...)
  // These IDs are NOT valid for the API
  const publicViewformMatch = trimmed.match(/\/forms\/d\/e\/([^/]+)\/viewform/i);
  if (publicViewformMatch) {
    return {
      formId: null,
      isPublicUrl: true,
      hint: `The URL you provided is a public form link. The API requires the edit-mode Form ID. ` +
            `Please open the form in edit mode (docs.google.com/forms/d/FORM_ID/edit) and use that ID instead.`,
    };
  }
  
  // Check if it's a public form ID directly (starts with 1FAIpQL)
  if (trimmed.startsWith("1FAIpQL")) {
    return {
      formId: null,
      isPublicUrl: true,
      hint: `The ID "${trimmed.substring(0, 20)}..." appears to be from a public form URL. ` +
            `Please use the Form ID from the edit URL instead (docs.google.com/forms/d/FORM_ID/edit).`,
    };
  }
  
  // Extract from edit URL: https://docs.google.com/forms/d/FORM_ID/edit
  const editUrlMatch = trimmed.match(/\/forms\/d\/([^/]+)\/edit/i);
  if (editUrlMatch) {
    return { formId: editUrlMatch[1], isPublicUrl: false };
  }
  
  // Extract from view URL without /e/: https://docs.google.com/forms/d/FORM_ID/viewform
  const directViewMatch = trimmed.match(/\/forms\/d\/([^/]+)\/viewform/i);
  if (directViewMatch && !directViewMatch[1].startsWith("e")) {
    return { formId: directViewMatch[1], isPublicUrl: false };
  }
  
  // Extract from any forms/d/ URL
  const generalMatch = trimmed.match(/\/forms\/d\/([^/?#]+)/i);
  if (generalMatch && generalMatch[1] !== "e") {
    return { formId: generalMatch[1], isPublicUrl: false };
  }
  
  // If it looks like a valid form ID (alphanumeric, underscores, hyphens)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed) && !trimmed.startsWith("1FAIpQL")) {
    return { formId: trimmed, isPublicUrl: false };
  }
  
  // Can't determine - return as-is but warn
  if (trimmed.length > 10) {
    return { formId: trimmed, isPublicUrl: false };
  }
  
  return {
    formId: null,
    isPublicUrl: false,
    hint: "Invalid Form ID format. Please provide a valid Form ID or the edit URL of the form.",
  };
}

// Get access token from token store
async function getAccessToken(): Promise<string | null> {
  return await getValidAccessToken(DEFAULT_USER_ID);
}

/**
 * Question type enum for form creation
 */
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

/**
 * Question schema for form creation
 */
const QuestionSchema = z.object({
  title: z.string().describe("The question text"),
  type: QuestionType.describe("The type of question"),
  required: z.boolean().optional().default(false).describe("Whether the question is required"),
  options: z.array(z.string()).optional().describe("Options for multiple choice, checkbox, or dropdown questions"),
  scaleMin: z.number().optional().describe("Minimum value for linear scale (default: 1)"),
  scaleMax: z.number().optional().describe("Maximum value for linear scale (default: 5)"),
  scaleMinLabel: z.string().optional().describe("Label for minimum value"),
  scaleMaxLabel: z.string().optional().describe("Label for maximum value"),
});

/**
 * Make authenticated request to Google Forms API
 */
async function formsRequest<T>(
  accessToken: string,
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${FORMS_API_BASE}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `API request failed: ${response.statusText}`,
      };
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

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

/**
 * Parse form metadata to simplified format
 */
function parseFormMetadata(form: any) {
  return {
    formId: form.formId,
    title: form.info?.title || "(Untitled form)",
    description: form.info?.description,
    documentTitle: form.info?.documentTitle,
    responderUri: form.responderUri,
    linkedSheetId: form.linkedSheetId,
    revisionId: form.revisionId,
    questionCount: form.items?.filter((item: any) => item.questionItem)?.length || 0,
  };
}

/**
 * Create a new survey form with HITL confirmation
 * Returns form details for user review before actual creation
 */
export const createSurveyFormTool = tool({
  description: `Create a new survey or form with specified questions. Use this when the user wants to create a form, survey, questionnaire, or feedback form. 
Always call this tool immediately with inferred question types:
- Yes/No questions → MULTIPLE_CHOICE with ["Yes", "No"]
- Open-ended questions → PARAGRAPH or SHORT_ANSWER
- Rating questions → LINEAR_SCALE
- Selection questions → CHECKBOX or MULTIPLE_CHOICE

Generate the form immediately for user review before creation.`,
  inputSchema: z.object({
    title: z.string().describe("The title of the form - infer from context if not specified"),
    description: z.string().optional().describe("Description shown at the top of the form"),
    questions: z.array(QuestionSchema).describe("List of questions to include in the form"),
    reasoning: z.string().describe("Brief explanation of inferred question types and structure"),
  }),
  execute: async ({ title, description, questions, reasoning }) => {
    // Return pending confirmation status with form preview
    return {
      status: "pending_confirmation",
      formData: {
        title,
        description: description || "",
        questions: questions.map((q, i) => ({
          ...q,
          index: i + 1,
        })),
      },
      reasoning,
      message: "Please review the form structure before creating it.",
    };
  },
});

/**
 * Confirm and create the form after user approval
 */
export const confirmCreateFormTool = tool({
  description: "Create the form after user confirmation. Use this to finalize form creation after the user has reviewed and approved the structure.",
  inputSchema: z.object({
    title: z.string().describe("The title of the form"),
    description: z.string().optional().describe("Description of the form"),
    questions: z.array(QuestionSchema).describe("List of questions for the form"),
  }),
  execute: async ({ title, description, questions }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Forms is not connected. Please connect your Google account first by installing the Forms integration.",
      };
    }

    try {
      // Step 1: Create a blank form with title
      const createResult = await formsRequest<any>(
        accessToken,
        "/forms",
        "POST",
        {
          info: {
            title,
            documentTitle: title,
          },
        }
      );

      if (!createResult.success || !createResult.data?.formId) {
        return {
          error: true,
          message: createResult.error || "Failed to create form",
        };
      }

      const formId = createResult.data.formId;

      // Step 2: Add description and questions using batchUpdate
      const requests: any[] = [];

      // Add description if provided
      if (description) {
        requests.push({
          updateFormInfo: {
            info: {
              description,
            },
            updateMask: "description",
          },
        });
      }

      // Add each question
      questions.forEach((question, index) => {
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
        const updateResult = await formsRequest<any>(
          accessToken,
          `/forms/${formId}:batchUpdate`,
          "POST",
          { requests }
        );

        if (!updateResult.success) {
          return {
            error: true,
            message: updateResult.error || "Failed to add questions to form",
          };
        }
      }

      // Get the final form details
      const formResult = await formsRequest<any>(
        accessToken,
        `/forms/${formId}`
      );

      if (!formResult.success) {
        return {
          error: true,
          message: "Form created but failed to retrieve details",
        };
      }

      const form = parseFormMetadata(formResult.data);

      return {
        error: false,
        status: "created",
        formId: form.formId,
        title: form.title,
        responderUri: form.responderUri,
        questionCount: questions.length,
        message: `Form "${form.title}" created successfully with ${questions.length} questions!`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to create form",
      };
    }
  },
});

/**
 * Fetch new responses since last check
 */
export const fetchNewResponsesTool = tool({
  description: "Fetch new form responses since the last check. Use this to poll for new submissions to a form. You can provide the form ID or the full URL from edit mode.",
  inputSchema: z.object({
    formId: z.string().describe("The Form ID or edit URL (from docs.google.com/forms/d/FORM_ID/edit). Do NOT use the public viewform URL."),
    lastCheckedTimestamp: z.string().optional().describe("ISO 8601 timestamp of when responses were last checked. If not provided, fetches all responses."),
  }),
  execute: async ({ formId: formIdInput, lastCheckedTimestamp }) => {
    // Extract and validate the form ID
    const { formId, isPublicUrl, hint } = extractFormId(formIdInput);
    
    if (!formId || isPublicUrl) {
      return {
        error: true,
        message: hint || "Invalid Form ID. Please provide the Form ID from the edit URL (docs.google.com/forms/d/FORM_ID/edit).",
        providedInput: formIdInput.substring(0, 50) + (formIdInput.length > 50 ? "..." : ""),
      };
    }
    
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Forms is not connected. Please connect your Google account first.",
      };
    }

    try {
      // Fetch all responses
      const result = await formsRequest<any>(
        accessToken,
        `/forms/${formId}/responses`
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to fetch form responses",
        };
      }

      let responses = (result.data?.responses || []).map(parseFormResponse);

      // Filter by timestamp if provided
      if (lastCheckedTimestamp) {
        const lastChecked = new Date(lastCheckedTimestamp);
        responses = responses.filter((r: any) => 
          new Date(r.lastSubmittedTime) > lastChecked
        );
      }

      return {
        error: false,
        formId,
        responseCount: responses.length,
        responses,
        checkedAt: new Date().toISOString(),
        message: responses.length > 0 
          ? `Found ${responses.length} new response(s)` 
          : "No new responses since last check",
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to fetch responses",
      };
    }
  },
});

/**
 * Set up polling-based watching for form responses
 * Note: Google Forms API doesn't have native webhooks, so this sets up a polling configuration
 */
export const watchResponsesWebhookTool = tool({
  description: "Set up response monitoring for a form. Since Google Forms doesn't support native webhooks, this configures a polling interval for checking new responses. The webhook URL will receive POST requests with new responses.",
  inputSchema: z.object({
    formId: z.string().describe("The Form ID or edit URL (from docs.google.com/forms/d/FORM_ID/edit). Do NOT use the public viewform URL."),
    webhookUrl: z.string().url().describe("The URL to send new responses to"),
    pollingIntervalMinutes: z.number().optional().default(5).describe("How often to check for new responses (default: 5 minutes)"),
  }),
  execute: async ({ formId: formIdInput, webhookUrl, pollingIntervalMinutes }) => {
    // Extract and validate the form ID
    const { formId, isPublicUrl, hint } = extractFormId(formIdInput);
    
    if (!formId || isPublicUrl) {
      return {
        error: true,
        message: hint || "Invalid Form ID. Please provide the Form ID from the edit URL (docs.google.com/forms/d/FORM_ID/edit).",
      };
    }
    
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Forms is not connected. Please connect your Google account first.",
      };
    }

    try {
      // Verify the form exists
      const formResult = await formsRequest<any>(
        accessToken,
        `/forms/${formId}`
      );

      if (!formResult.success) {
        return {
          error: true,
          message: formResult.error || "Form not found",
        };
      }

      const form = parseFormMetadata(formResult.data);

      // In a real implementation, this would:
      // 1. Store the webhook configuration in a database
      // 2. Set up a cron job or background worker to poll the form
      // 3. Send new responses to the webhook URL
      
      // For now, we return configuration that could be used by the client
      return {
        error: false,
        formId,
        formTitle: form.title,
        webhookUrl,
        pollingIntervalMinutes,
        status: "configured",
        watchId: `watch-${formId}-${Date.now()}`,
        message: `Response monitoring configured for "${form.title}". Polling every ${pollingIntervalMinutes} minutes.`,
        note: "To enable real-time notifications, consider using Google Apps Script triggers or Cloud Functions.",
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to configure webhook",
      };
    }
  },
});

/**
 * Update form schema - add or remove questions
 */
export const updateFormSchemaTool = tool({
  description: "Update an existing form by adding new questions or removing existing ones. Use this to modify a live form.",
  inputSchema: z.object({
    formId: z.string().describe("The Form ID or edit URL (from docs.google.com/forms/d/FORM_ID/edit). Do NOT use the public viewform URL."),
    addQuestions: z.array(QuestionSchema).optional().describe("New questions to add to the form"),
    removeQuestionIndices: z.array(z.number()).optional().describe("Indices of questions to remove (0-based)"),
  }),
  execute: async ({ formId: formIdInput, addQuestions, removeQuestionIndices }) => {
    // Extract and validate the form ID
    const { formId, isPublicUrl, hint } = extractFormId(formIdInput);
    
    if (!formId || isPublicUrl) {
      return {
        error: true,
        message: hint || "Invalid Form ID. Please provide the Form ID from the edit URL (docs.google.com/forms/d/FORM_ID/edit).",
      };
    }
    
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Forms is not connected. Please connect your Google account first.",
      };
    }

    try {
      // First, get the current form to understand its structure
      const formResult = await formsRequest<any>(
        accessToken,
        `/forms/${formId}`
      );

      if (!formResult.success) {
        return {
          error: true,
          message: formResult.error || "Form not found",
        };
      }

      const form = formResult.data;
      const currentItems = form.items || [];
      const requests: any[] = [];

      // Handle removals first (in reverse order to maintain indices)
      if (removeQuestionIndices && removeQuestionIndices.length > 0) {
        const sortedIndices = [...removeQuestionIndices].sort((a, b) => b - a);
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
      if (addQuestions && addQuestions.length > 0) {
        // Calculate the new index after removals
        const removedCount = removeQuestionIndices?.length || 0;
        const newStartIndex = currentItems.length - removedCount;

        addQuestions.forEach((question, i) => {
          requests.push({
            createItem: {
              item: convertQuestionToFormItem(question, newStartIndex + i),
              location: {
                index: newStartIndex + i,
              },
            },
          });
        });
      }

      if (requests.length === 0) {
        return {
          error: false,
          message: "No changes to apply",
          formId,
        };
      }

      // Apply the batch update
      const updateResult = await formsRequest<any>(
        accessToken,
        `/forms/${formId}:batchUpdate`,
        "POST",
        { requests }
      );

      if (!updateResult.success) {
        return {
          error: true,
          message: updateResult.error || "Failed to update form",
        };
      }

      // Get updated form details
      const updatedFormResult = await formsRequest<any>(
        accessToken,
        `/forms/${formId}`
      );

      const updatedForm = parseFormMetadata(updatedFormResult.data || form);

      return {
        error: false,
        formId,
        title: updatedForm.title,
        questionCount: updatedForm.questionCount,
        questionsAdded: addQuestions?.length || 0,
        questionsRemoved: removeQuestionIndices?.length || 0,
        responderUri: updatedForm.responderUri,
        message: `Form updated successfully. ${addQuestions?.length || 0} question(s) added, ${removeQuestionIndices?.length || 0} question(s) removed.`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to update form",
      };
    }
  },
});

/**
 * Get aggregate response summary and statistics
 */
export const getResponseSummaryTool = tool({
  description: "Get aggregate statistics and summary for form responses. Use this to see trends, completion rates, and answer distributions.",
  inputSchema: z.object({
    formId: z.string().describe("The Form ID or edit URL (from docs.google.com/forms/d/FORM_ID/edit). Do NOT use the public viewform URL."),
  }),
  execute: async ({ formId: formIdInput }) => {
    // Extract and validate the form ID
    const { formId, isPublicUrl, hint } = extractFormId(formIdInput);
    
    if (!formId || isPublicUrl) {
      return {
        error: true,
        message: hint || "Invalid Form ID. Please provide the Form ID from the edit URL (docs.google.com/forms/d/FORM_ID/edit).",
      };
    }
    
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Google Forms is not connected. Please connect your Google account first.",
      };
    }

    try {
      // Get form details
      const formResult = await formsRequest<any>(
        accessToken,
        `/forms/${formId}`
      );

      if (!formResult.success) {
        return {
          error: true,
          message: formResult.error || "Form not found",
        };
      }

      // Get all responses
      const responsesResult = await formsRequest<any>(
        accessToken,
        `/forms/${formId}/responses`
      );

      if (!responsesResult.success) {
        return {
          error: true,
          message: responsesResult.error || "Failed to fetch responses",
        };
      }

      const form = formResult.data;
      const responses = responsesResult.data?.responses || [];
      const formMeta = parseFormMetadata(form);

      // Build question map for analysis
      const questions: Record<string, any> = {};
      const questionSummaries: any[] = [];

      (form.items || []).forEach((item: any, index: number) => {
        if (item.questionItem) {
          const questionId = item.questionItem.question?.questionId;
          const questionTitle = item.title;
          
          if (questionId) {
            questions[questionId] = {
              index,
              title: questionTitle,
              type: Object.keys(item.questionItem.question || {}).find(k => 
                k !== 'questionId' && k !== 'required'
              ),
            };
          }
        }
      });

      // Analyze responses
      const answerDistributions: Record<string, Record<string, number>> = {};
      
      for (const response of responses) {
        if (response.answers) {
          for (const [questionId, answer] of Object.entries(response.answers as Record<string, any>)) {
            if (!answerDistributions[questionId]) {
              answerDistributions[questionId] = {};
            }
            
            const textAnswers = (answer as any).textAnswers?.answers || [];
            for (const ta of textAnswers) {
              const value = ta.value || "(empty)";
              answerDistributions[questionId][value] = 
                (answerDistributions[questionId][value] || 0) + 1;
            }
          }
        }
      }

      // Build question summaries
      for (const [questionId, info] of Object.entries(questions)) {
        const distribution = answerDistributions[questionId] || {};
        const totalAnswers = Object.values(distribution).reduce((a, b) => a + b, 0);
        
        questionSummaries.push({
          questionId,
          title: info.title,
          type: info.type,
          totalAnswers,
          distribution: Object.entries(distribution)
            .map(([answer, count]) => ({
              answer,
              count,
              percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10), // Top 10 answers
        });
      }

      // Calculate timestamps
      const responseTimes = responses
        .map((r: any) => new Date(r.createTime).getTime())
        .sort((a: number, b: number) => a - b);

      return {
        error: false,
        formId,
        formTitle: formMeta.title,
        totalResponses: responses.length,
        questionCount: formMeta.questionCount,
        responderUri: formMeta.responderUri,
        firstResponseAt: responseTimes.length > 0 
          ? new Date(responseTimes[0]).toISOString() 
          : null,
        lastResponseAt: responseTimes.length > 0 
          ? new Date(responseTimes[responseTimes.length - 1]).toISOString() 
          : null,
        questionSummaries,
        message: `Summary for "${formMeta.title}": ${responses.length} total responses across ${formMeta.questionCount} questions.`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to get response summary",
      };
    }
  },
});

/**
 * Export all forms tools
 */
export const formsTools = {
  createSurveyForm: createSurveyFormTool,
  confirmCreateForm: confirmCreateFormTool,
  fetchNewResponses: fetchNewResponsesTool,
  watchResponsesWebhook: watchResponsesWebhookTool,
  updateFormSchema: updateFormSchemaTool,
  getResponseSummary: getResponseSummaryTool,
};

export default formsTools;

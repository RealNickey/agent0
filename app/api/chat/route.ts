import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { z } from "zod";
import type { MyUIMessage } from "@/types/chat";
import { tools as weatherTools } from "@/ai/tools";
import { calendarTools } from "@/ai/calendar-tools";
import { formsTools } from "@/ai/forms-tools";
import { gmailTools } from "@/ai/gmail-tools";
import { GMAIL_AGENT_PROMPT } from "@/ai/prompts/gmail";
import { isToolInstalled } from "@/lib/installed-tools";

export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.any()), // Will be validated as UIMessage[] at runtime
  model: z.string(),
  enableSearch: z.boolean().optional(),
  enableThinking: z.boolean().optional(),
  enableUrlContext: z.boolean().optional(),
  enableCodeExecution: z.boolean().optional(),
  mentionedTools: z.array(z.string()).optional(),
});

// Custom error handler for user-friendly error messages
function getErrorMessage(error: unknown): string {
  if (error == null) {
    return "An unknown error occurred";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("rate limit")) {
      return "Rate limit exceeded. Please try again in a moment.";
    }
    if (error.message.includes("context length")) {
      return "The conversation is too long. Please start a new chat.";
    }
    if (error.message.includes("API key")) {
      return "API configuration error. Please contact support.";
    }
    return error.message;
  }

  return JSON.stringify(error);
}

function getModelCapabilities(model: string) {
  const isGemini = model.startsWith("gemini-");
  const isGemini3 = model.startsWith("gemini-3");
  const isGemini25 = model.startsWith("gemini-2.5");
  const isGemini20 = model.startsWith("gemini-2.0");

  return {
    supportsTools: isGemini,
    supportsGoogleSearch: isGemini,
    supportsUrlContext: isGemini3 || isGemini25 || isGemini20,
    supportsCodeExecution: isGemini3 || isGemini25 || isGemini20,
  };
}

const FALLBACK_MODEL_ORDER = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

function getModelAttempts(requestedModel: string) {
  const seen = new Set<string>();
  const attempts: string[] = [];
  for (const model of [requestedModel, ...FALLBACK_MODEL_ORDER]) {
    if (!seen.has(model)) {
      attempts.push(model);
      seen.add(model);
    }
  }
  return attempts;
}

function isQuotaError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  return (
    message.toLowerCase().includes("quota exceeded") ||
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("429")
  );
}

function buildProviderOptions(modelId: string, enableThinking: boolean) {
  const providerOptions: { google: GoogleGenerativeAIProviderOptions } = {
    google: {
      ...(enableThinking &&
        modelId.includes("2.5") && {
          thinkingConfig: {
            thinkingBudget: 4096,
            includeThoughts: true,
          },
        }),
      ...(enableThinking &&
        modelId.includes("gemini-3") && {
          thinkingConfig: {
            thinkingLevel: "high",
            includeThoughts: true,
          },
        }),
    },
  };

  return providerOptions;
}

function buildSystemPrompt(effectiveMentionedTools: string[]) {
  const calendarGuidance = effectiveMentionedTools.some(
    (t) => t.toLowerCase() === "calendar",
  )
    ? " When the user asks about calendar events or scheduling, use the calendar tools to fetch, create, update, or delete events. For scheduling, use scheduleCalendarEvent to present options to the user first."
    : "";

  const formsGuidance = effectiveMentionedTools.some(
    (t) => t.toLowerCase() === "forms" || t.toLowerCase() === "survey",
  )
    ? " When the user wants to create a form/survey, ALWAYS call createSurveyForm immediately with inferred questions. Infer question types: yes/no questions → MULTIPLE_CHOICE with ['Yes', 'No'], open-ended → PARAGRAPH or SHORT_ANSWER, rating → LINEAR_SCALE, selection → CHECKBOX or MULTIPLE_CHOICE. Let the user review in the UI before creating. For polling responses, use fetchNewResponses. For statistics, use getResponseSummary."
    : "";

  const gmailGuidance = effectiveMentionedTools.some(
    (tool) => tool.toLowerCase() === "gmail",
  )
    ? "\n\n" + GMAIL_AGENT_PROMPT
    : "";

  return `The current date and time is ${new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}. Use this to resolve relative date mentions like "today", "tomorrow", "next Monday", etc. If the user asks for "events today" or "schedule", assume the default time range starts now and ends at the end of the day or covers a reasonable period, do not ask for clarification unless necessary.${calendarGuidance}${formsGuidance}${gmailGuidance}`;
}

export async function POST(req: Request) {
  let parsedBody;

  try {
    parsedBody = bodySchema.parse(await req.json());
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details: error instanceof Error ? error.message : error,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const {
    messages,
    model,
    enableSearch = false,
    enableThinking = true,
    enableUrlContext = true,
    enableCodeExecution = true,
    mentionedTools = [],
  } = parsedBody;

  // Type-cast messages to MyUIMessage[] for type safety
  const uiMessages = messages as MyUIMessage[];

  // Convert UI messages to model messages using the AI SDK helper
  let modelMessages;
  try {
    modelMessages = convertToModelMessages(uiMessages);
  } catch (error) {
    console.error("convertToModelMessages failed", error);
    return new Response(
      JSON.stringify({
        error: "Invalid messages",
        details:
          error instanceof Error ? error.message : "Unable to convert messages",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const buildToolsForModel = (modelId: string) => {
    const modelCapabilities = getModelCapabilities(modelId);
    const tools: Record<string, any> = {};
    const effectiveMentionedTools = modelCapabilities.supportsTools
      ? mentionedTools
      : [];
    const hasCustomTools = effectiveMentionedTools.length > 0;
    const effectiveEnableSearch =
      enableSearch && modelCapabilities.supportsGoogleSearch;
    const effectiveEnableUrlContext =
      enableUrlContext && modelCapabilities.supportsUrlContext;
    const effectiveEnableCodeExecution =
      enableCodeExecution && modelCapabilities.supportsCodeExecution;

    if (hasCustomTools) {
      for (const toolName of effectiveMentionedTools) {
        const lowerToolName = toolName.toLowerCase();

        if (lowerToolName === "weather") {
          tools.displayWeather = weatherTools.displayWeather;
        }
        if (lowerToolName === "calendar") {
          if (isToolInstalled("calendar")) {
            tools.scheduleCalendarEvent = calendarTools.scheduleCalendarEvent;
            tools.confirmScheduledEvent = calendarTools.confirmScheduledEvent;
            tools.listCalendarEvents = calendarTools.listCalendarEvents;
            tools.updateCalendarEvent = calendarTools.updateCalendarEvent;
            tools.deleteCalendarEvent = calendarTools.deleteCalendarEvent;
            tools.findCalendarAvailability =
              calendarTools.findCalendarAvailability;
            tools.getCalendarEvent = calendarTools.getCalendarEvent;
          } else {
            console.warn("Calendar tool mentioned but not installed");
          }
        }
        if (lowerToolName === "forms" || lowerToolName === "survey") {
          if (isToolInstalled("forms")) {
            tools.createSurveyForm = formsTools.createSurveyForm;
            tools.confirmCreateForm = formsTools.confirmCreateForm;
            tools.fetchNewResponses = formsTools.fetchNewResponses;
            tools.watchResponsesWebhook = formsTools.watchResponsesWebhook;
            tools.updateFormSchema = formsTools.updateFormSchema;
            tools.getResponseSummary = formsTools.getResponseSummary;
          } else {
            console.warn("Forms tool mentioned but not installed");
          }
        }
        if (lowerToolName === "gmail") {
          if (isToolInstalled("gmail")) {
            tools.searchEmails = gmailTools.searchEmails;
            tools.getThread = gmailTools.getThread;
            tools.createDraft = gmailTools.createDraft;
            tools.sendMessage = gmailTools.sendMessage;
            tools.getMessageContent = gmailTools.getMessageContent;
          } else {
            console.warn("Gmail tool mentioned but not installed");
          }
        }
      }
    } else {
      if (effectiveEnableSearch) {
        tools.google_search = google.tools.googleSearch({});
      }

      if (effectiveEnableUrlContext) {
        tools.url_context = google.tools.urlContext({});
      }

      if (effectiveEnableCodeExecution) {
        tools.code_execution = google.tools.codeExecution({});
      }
    }

    return {
      tools,
      hasTools: Object.keys(tools).length > 0,
      effectiveMentionedTools,
    };
  };

  const modelAttempts = getModelAttempts(model);
  let selectedModel = model;

  let result;
  let lastError: unknown;

  for (const candidateModel of modelAttempts) {
    const { tools, hasTools, effectiveMentionedTools } =
      buildToolsForModel(candidateModel);
    const system = buildSystemPrompt(effectiveMentionedTools);
    const providerOptions = buildProviderOptions(
      candidateModel,
      enableThinking,
    );

    try {
      result = streamText({
        model: google(candidateModel),
        system,
        messages: modelMessages,
        tools: hasTools ? tools : undefined,
        toolChoice: hasTools ? "auto" : "none",
        providerOptions,
        ...(effectiveMentionedTools.length > 0 && { stopWhen: stepCountIs(5) }),
        onError: (error) => {
          console.error("Stream error:", error);
        },
      });

      selectedModel = candidateModel;
      break;
    } catch (error) {
      lastError = error;
      if (!isQuotaError(error)) {
        break;
      }
      console.warn("Model quota exceeded, falling back", {
        candidateModel,
        error,
      });
    }
  }

  if (!result) {
    return new Response(
      JSON.stringify({
        error: getErrorMessage(lastError),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return result.toUIMessageStreamResponse({
    sendReasoning: enableThinking,
    sendSources: true,
    originalMessages: uiMessages,
    onError: getErrorMessage,
    messageMetadata: ({ part }) => {
      // Send metadata when streaming starts
      if (part.type === "start") {
        return {
          createdAt: Date.now(),
          model: selectedModel,
        };
      }

      // Send additional metadata when streaming completes
      if (part.type === "finish" && part.totalUsage) {
        return {
          totalTokens: part.totalUsage.totalTokens,
          totalUsage: {
            inputTokens: part.totalUsage.inputTokens,
            outputTokens: part.totalUsage.outputTokens,
            totalTokens: part.totalUsage.totalTokens,
            reasoningTokens: part.totalUsage.reasoningTokens,
            cachedInputTokens: part.totalUsage.cachedInputTokens,
          },
        };
      }

      return undefined;
    },
  });
}

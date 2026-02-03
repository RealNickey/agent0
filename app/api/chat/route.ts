import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { z } from "zod";
import type { MyUIMessage } from "@/types/chat";
import { tools as weatherTools } from "@/ai/tools";
import { calendarTools } from "@/ai/calendar-tools";
import { createPDFTools, extractPDFsFromMessages } from "@/ai/pdf-tools";
import { imageTools } from "@/ai/image-tools";
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
      { status: 400, headers: { "Content-Type": "application/json" } }
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
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build tools object based on mentioned tools and enabled features
  let tools: Record<string, any> = {};
  let useProviderTools = false;
  const hasCustomTools = mentionedTools.length > 0;

  // Add @mentioned custom tools (like weather)
  // When custom tools are mentioned, ONLY use those tools (disable provider tools)
  if (hasCustomTools) {
    for (const toolName of mentionedTools) {
      const lowerToolName = toolName.toLowerCase();
      
      // Map mentioned tool names to actual tool implementations
      if (lowerToolName === "weather") {
        tools.displayWeather = weatherTools.displayWeather;
      }
      // Calendar tools
      if (lowerToolName === "calendar") {
        if (isToolInstalled("calendar")) {
          tools.scheduleCalendarEvent = calendarTools.scheduleCalendarEvent;
          tools.listCalendarEvents = calendarTools.listCalendarEvents;
          tools.updateCalendarEvent = calendarTools.updateCalendarEvent;
          tools.deleteCalendarEvent = calendarTools.deleteCalendarEvent;
          tools.findCalendarAvailability = calendarTools.findCalendarAvailability;
          tools.getCalendarEvent = calendarTools.getCalendarEvent;
        } else {
             // Optionally add a system message or error logic here if the tool is not installed
             // For now, we just don't add the tools
             console.warn("Calendar tool mentioned but not installed");
        }
      }
      // PDF tools - extract PDFs from conversation and create context-aware tools
      if (lowerToolName === "pdf") {
        const pdfFiles = extractPDFsFromMessages(uiMessages);
        const pdfTools = createPDFTools(pdfFiles);
        tools.compressPDF = pdfTools.compressPDF;
        tools.mergePDFs = pdfTools.mergePDFs;
      }
      // Image generation tool
      if (lowerToolName === "image" || lowerToolName === "image generator") {
        tools.generateImage = imageTools.generateImage;
      }
      // Forms/Survey tools
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
      // Gmail tools
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
      // Add more tool mappings here as needed
    }
  } else {
    // Only add Google provider tools when NO custom tools are mentioned
    // This prevents mixing function tools with provider-defined tools
    if (enableSearch) {
      tools.google_search = google.tools.googleSearch({});
      useProviderTools = true;
    }

    if (enableUrlContext) {
      tools.url_context = google.tools.urlContext({});
      useProviderTools = true;
    }

    if (enableCodeExecution) {
      tools.code_execution = google.tools.codeExecution({});
      useProviderTools = true;
    }
  }

  const hasTools = Object.keys(tools).length > 0;

  const providerOptions: { google: GoogleGenerativeAIProviderOptions } = {
    google: {
      ...(enableThinking &&
        model.includes("2.5") && {
          thinkingConfig: {
            thinkingBudget: 4096,
            includeThoughts: true,
          },
        }),
      ...(enableThinking &&
        model.includes("gemini-3") && {
          thinkingConfig: {
            thinkingLevel: "high",
            includeThoughts: true,
          },
        }),
    },
  };

  // Build system prompt with agent-specific persona if needed
  let systemPrompt = `The current date and time is ${new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}. Use this to resolve relative date mentions like "today", "tomorrow", "next Monday", etc. If the user asks for "events today" or "schedule", assume the default time range starts now and ends at the end of the day or covers a reasonable period, do not ask for clarification unless necessary.`;
  
  // Add Gmail agent persona when Gmail tools are active
  if (mentionedTools.some(tool => tool.toLowerCase() === "gmail")) {
    systemPrompt += "\n\n" + GMAIL_AGENT_PROMPT;
  }

  const calendarGuidance = mentionedTools.some(t => t.toLowerCase() === "calendar")
    ? " When the user asks about calendar events or scheduling, use the calendar tools to fetch, create, update, or delete events. For scheduling, use scheduleCalendarEvent to present options to the user first."
    : "";

  const formsGuidance = mentionedTools.some(t => t.toLowerCase() === "forms" || t.toLowerCase() === "survey")
    ? " When the user wants to create a form/survey, ALWAYS call createSurveyForm immediately with inferred questions. Infer question types: yes/no questions → MULTIPLE_CHOICE with ['Yes', 'No'], open-ended → PARAGRAPH or SHORT_ANSWER, rating → LINEAR_SCALE, selection → CHECKBOX or MULTIPLE_CHOICE. Let the user review in the UI before creating. For polling responses, use fetchNewResponses. For statistics, use getResponseSummary."
    : "";

  const pdfGuidance = mentionedTools.includes("pdf")
    ? " When the user asks to compress a PDF, call compressPDF immediately. When the user asks to merge PDFs, call mergePDFs immediately. If the tool returns requiresUpload=true, politely ask the user to upload the PDF file(s) needed. After successful processing, present the download link clearly to the user."
    : "";

  const imageGuidance = mentionedTools.some(t => t === "image" || t === "image generator")
    ? " When the user asks to generate, create, or draw an image, call generateImage immediately with a detailed prompt. Enhance the user's prompt with artistic details, style, lighting, and composition to get the best results. After generation, let the user know they can download the image."
    : "";

  const result = streamText({
    model: google(model),
    system: `The current date and time is ${new Date().toLocaleString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short"
})}. Use this to resolve relative date mentions like "today", "tomorrow", "next Monday", etc. If the user asks for "events today" or "schedule", assume the default time range starts now and ends at the end of the day or covers a reasonable period, do not ask for clarification unless necessary.${calendarGuidance}${pdfGuidance}${formsGuidance}`

    messages: modelMessages,
    tools: hasTools ? tools : undefined,
    toolChoice: hasTools ? "auto" : "none",
    providerOptions,
    // Use stopWhen for multi-step tool calls when custom tools are mentioned
    ...(mentionedTools.length > 0 && { stopWhen: stepCountIs(5) }),
    onError: (error) => {
      console.error("Stream error:", error);
    },
  });

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
          model: model,
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

import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { z } from "zod";
import type { MyUIMessage } from "@/types/chat";
import { tools as weatherTools } from "@/ai/tools";

export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.any()), // Will be validated as UIMessage[] at runtime
  model: z.string(),
  enableSearch: z.boolean().optional(),
  enableThinking: z.boolean().optional(),
  enableUrlContext: z.boolean().optional(),
  enableCodeExecution: z.boolean().optional(),
  enableWeather: z.boolean().optional(),
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
    enableWeather = false,
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

  // When weather is enabled, use ONLY function tools (weather)
  // to avoid mixing with provider-defined tools
  let tools: Record<string, any> = {};
  let useProviderTools = false;

  if (enableWeather) {
    // Use only the weather function tool
    tools = { ...weatherTools };
  } else {
    // Use Google provider tools
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

  const result = streamText({
    model: google(model),
    messages: modelMessages,
    tools: hasTools ? tools : undefined,
    toolChoice: hasTools ? "auto" : "none",
    providerOptions,
    // Use stopWhen for multi-step tool calls (e.g., weather lookup + response)
    ...(enableWeather && { stopWhen: stepCountIs(5) }),
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

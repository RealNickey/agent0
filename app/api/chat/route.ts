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

  // Sanitize messages - remove incomplete tool calls that could cause Gemini API errors
  // Gemini requires tool calls to be immediately followed by tool responses
  const sanitizedMessages = uiMessages.filter((msg, index) => {
    // Keep all user messages
    if (msg.role === "user") return true;
    
    // For assistant messages, check if they have incomplete tool calls
    if (msg.role === "assistant" && msg.parts) {
      const hasToolCall = msg.parts.some((p: any) => 
        p.type?.startsWith("tool-") || p.type === "tool-invocation"
      );
      
      if (hasToolCall) {
        // Check if all tool calls have results
        const toolParts = msg.parts.filter((p: any) => 
          p.type?.startsWith("tool-") || p.type === "tool-invocation"
        );
        const allHaveResults = toolParts.every((p: any) => 
          p.state === "result" || p.state === "output-available" || p.result !== undefined
        );
        
        if (!allHaveResults) {
          console.log("[route] Filtering out message with incomplete tool calls:", msg.id);
          return false; // Filter out messages with incomplete tool calls
        }
      }
    }
    
    return true;
  });

  // Convert UI messages to model messages using the AI SDK helper
  let modelMessages;
  try {
    modelMessages = convertToModelMessages(sanitizedMessages);
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

  console.log('[route] mentionedTools:', mentionedTools);
  console.log('[route] hasCustomTools:', hasCustomTools);
  console.log('[route] Tools object after building:', Object.keys(tools));

  // Add @mentioned custom tools (like weather, focus)
  // When custom tools are mentioned, ONLY use those tools (disable provider tools)
  if (hasCustomTools) {
    for (const toolName of mentionedTools) {
      const lowerToolName = toolName.toLowerCase();
      console.log('[route] Processing tool:', lowerToolName);
      
      // Map mentioned tool names to actual tool implementations
      // Check for both ID format ("weather") and display name format ("Weather")
      if (lowerToolName === "weather") {
        tools.displayWeather = weatherTools.displayWeather;
      }
      // Handle focus mode - matches: "focus", "focus mode", "pomodoro", "timer"
      if (lowerToolName === "focus" || lowerToolName === "focus mode" || lowerToolName === "pomodoro" || lowerToolName === "timer") {
        tools.focusMode = weatherTools.focusMode;
        console.log('[route] Added focusMode tool');
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
  console.log('[route] Final tools:', Object.keys(tools), 'hasTools:', hasTools);

  // Only use stopWhen if we actually have custom function tools registered
  const useMultiStep = hasTools && hasCustomTools;

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
    // Use stopWhen for multi-step tool calls only when we have custom function tools
    ...(useMultiStep && { stopWhen: stepCountIs(5) }),
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

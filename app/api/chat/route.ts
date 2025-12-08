import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.any()),
  model: z.string(),
  enableSearch: z.boolean().optional(),
  enableUrlContext: z.boolean().optional(),
  enableCodeExecution: z.boolean().optional(),
});

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
    enableUrlContext = true,
    enableCodeExecution = true,
  } = parsedBody;

  // Convert UIMessages to CoreMessages using the built-in converter
  const coreMessages = convertToModelMessages(messages as UIMessage[]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};

  if (enableSearch) {
    tools.google_search = google.tools.googleSearch({});
  }

  if (enableUrlContext) {
    tools.url_context = google.tools.urlContext({});
  }

  if (enableCodeExecution) {
    tools.code_execution = google.tools.codeExecution({});
  }

  const hasTools = Object.keys(tools).length > 0;

  const providerOptions: { google: GoogleGenerativeAIProviderOptions } = {
    google: {
      ...(model.includes("2.5") && {
        thinkingConfig: {
          thinkingBudget: 4096,
          includeThoughts: true,
        },
      }),
      ...(model.includes("gemini-3") && {
        thinkingConfig: {
          thinkingLevel: "high",
          includeThoughts: true,
        },
      }),
    },
  };

  const result = streamText({
    model: google(model),
    messages: coreMessages,
    tools: hasTools ? tools : undefined,
    toolChoice: hasTools ? "auto" : "none",
    providerOptions,
    onError: (error) => {
      console.error("Stream error:", error);
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
  });
}

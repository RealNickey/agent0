import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { streamText, type CoreMessage, type FilePart, type TextPart } from "ai";
import { z } from "zod";

export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.any()),
  model: z.string(),
  enableSearch: z.boolean().optional(),
  enableUrlContext: z.boolean().optional(),
  enableCodeExecution: z.boolean().optional(),
});

// Convert UIMessage parts to ModelMessage content
function convertUIMessagesToModelMessages(messages: any[]): CoreMessage[] {
  return messages.map((msg) => {
    if (msg.role === "user") {
      const content: (TextPart | FilePart)[] = [];
      
      if (msg.parts) {
        for (const part of msg.parts) {
          if (part.type === "text" && part.text) {
            content.push({ type: "text", text: part.text });
          } else if (part.type === "file") {
            // Handle file parts - convert base64 data to proper format
            content.push({
              type: "file",
              data: part.data, // base64 string
              mediaType: part.mediaType || part.mimeType || "application/octet-stream",
            } as FilePart);
          }
        }
      } else if (msg.content) {
        // Fallback for simple string content
        content.push({ type: "text", text: msg.content });
      }
      
      return { role: "user" as const, content };
    } else if (msg.role === "assistant") {
      // Extract text content from assistant messages
      let textContent = "";
      if (msg.parts) {
        textContent = msg.parts
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join("");
      } else if (msg.content) {
        textContent = msg.content;
      }
      return { role: "assistant" as const, content: textContent };
    }
    
    return { role: msg.role, content: msg.content || "" };
  });
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
    enableUrlContext = true,
    enableCodeExecution = true,
  } = parsedBody;

  const modelMessages = convertUIMessagesToModelMessages(messages);

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

  const providerOptions: { google: GoogleGenerativeAIProviderOptions } = {
    google: {
      ...(model.includes("2.5") && {
        thinkingConfig: {
          thinkingBudget: 4096,
          includeThoughts: true,
        },
      }),
    },
  };

  const result = streamText({
    model: google(model),
    messages: modelMessages,
    tools: Object.keys(tools).length > 0 ? tools : undefined,
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

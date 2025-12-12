import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { streamText, tool, type CoreMessage, type ImagePart, type FilePart, type TextPart } from "ai";
import { z } from "zod";
import { toolRegistry } from "@/lib/tool-registry";

// Import tools to ensure they are registered
import "@/lib/tools";

export const maxDuration = 60;

// Schema for custom tool definitions passed from frontend
const customToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  parameters: z.record(z.any()).optional(),
});

const bodySchema = z.object({
  messages: z.array(z.any()),
  model: z.string(),
  enableSearch: z.boolean().optional(),
  enableUrlContext: z.boolean().optional(),
  enableCodeExecution: z.boolean().optional(),
  customTools: z.array(customToolSchema).optional(),
});

type RawMessagePart = {
  type?: string;
  text?: string;
  data?: string;
  url?: string;
  mediaType?: string;
  mimeType?: string;
  fileName?: string;
  filename?: string;
};

type RawMessage = {
  role?: string;
  parts?: RawMessagePart[];
  content?: RawMessagePart[] | string;
};

const inferMimeType = (part: RawMessagePart): string => {
  if (part.mimeType) return part.mimeType;
  if (part.mediaType) return part.mediaType;
  const data = part.data ?? part.url;
  if (typeof data === "string" && data.startsWith("data:")) {
    const match = data.match(/^data:([^;]+);/);
    if (match?.[1]) return match[1];
  }
  return "application/octet-stream";
};

const convertPartToCoreFormat = (part: RawMessagePart): TextPart | ImagePart | FilePart | null => {
  if (!part || !part.type) return null;

  if (part.type === "text") {
    return { type: "text", text: part.text || "" };
  }

  if (part.type === "file") {
    const data = part.data ?? part.url;
    if (!data) return null;

    const mimeType = inferMimeType(part);

    // For images, use type: "image"
    if (mimeType.startsWith("image/")) {
      return {
        type: "image",
        image: data,
        mimeType,
      } as ImagePart;
    }

    // For PDFs and other files, use type: "file"
    return {
      type: "file",
      data,
      mimeType,
      mediaType: mimeType,
    } as FilePart;
  }

  return null;
};

const convertToCoreMessages = (messages: RawMessage[]): CoreMessage[] => {
  return messages.map((message): CoreMessage => {
    const role = message.role as "user" | "assistant" | "system";
    const rawContent = Array.isArray(message.parts)
      ? message.parts
      : message.content;

    // Handle string content
    if (typeof rawContent === "string") {
      return { role, content: rawContent };
    }

    // Handle array content
    if (Array.isArray(rawContent)) {
      const parts = rawContent
        .map(convertPartToCoreFormat)
        .filter((p): p is NonNullable<typeof p> => p !== null);

      // If only text parts, simplify to string for system messages
      if (role === "system") {
        const textContent = parts
          .filter((p): p is TextPart => p.type === "text")
          .map((p) => p.text)
          .join("\n");
        return { role: "system", content: textContent };
      }

      // For user/assistant with single text, can use string
      if (parts.length === 1 && parts[0].type === "text") {
        return { role, content: parts[0].text };
      }

      return { role, content: parts } as CoreMessage;
    }

    return { role, content: "" };
  });
};

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
    customTools = [],
  } = parsedBody;

  let coreMessages: CoreMessage[];
  try {
    coreMessages = convertToCoreMessages(messages);
  } catch (error) {
    console.error("convertToCoreMessages failed", error);
    return new Response(
      JSON.stringify({
        error: "Invalid messages",
        details:
          error instanceof Error ? error.message : "Unable to convert messages",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const tools: Record<string, any> = {};
  const hasCustomTools = customTools.length > 0;

  // Google Gemini doesn't support mixing provider-defined tools with custom function tools
  // If custom tools are selected, use only custom tools
  // Otherwise, use Google's provider-defined tools
  
  console.log('[Chat API] Custom tools received:', customTools.length, customTools.map(t => t.id));
  
  if (hasCustomTools) {
    // Add custom tools from the registry using AI SDK tool() helper
    for (const customTool of customTools) {
      const registeredTool = toolRegistry.get(customTool.id);
      console.log(`[Chat API] Looking up tool "${customTool.id}":`, registeredTool ? 'found' : 'not found');
      if (registeredTool) {
        tools[customTool.id] = tool({
          description: registeredTool.description,
          // AI SDK expects 'inputSchema', not 'parameters'
          inputSchema: registeredTool.parameters,
          execute: async (args: any) => {
            try {
              console.log(`[Chat API] Executing tool "${customTool.id}" with args:`, args);
              const result = await registeredTool.execute(args);
              console.log(`[Chat API] Tool "${customTool.id}" result:`, result);
              return result;
            } catch (error) {
              console.error(`Custom tool ${customTool.id} execution error:`, error);
              return { error: error instanceof Error ? error.message : 'Tool execution failed' };
            }
          },
        });
      }
    }
    console.log('[Chat API] Registered custom tools:', Object.keys(tools));
  } else {
    // Use Google's provider-defined tools when no custom tools are selected
    if (enableSearch) {
      tools.google_search = google.tools.googleSearch({});
    }

    if (enableUrlContext) {
      tools.url_context = google.tools.urlContext({});
    }

    if (enableCodeExecution) {
      tools.code_execution = google.tools.codeExecution({});
    }
  }

  const hasTools = Object.keys(tools).length > 0;

  console.log('[Chat API] Final tools config:', {
    hasTools,
    toolNames: Object.keys(tools),
    toolChoice: hasTools ? "auto" : "none"
  });

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

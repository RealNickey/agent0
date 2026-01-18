import { streamText, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";

export interface GenerateResponseOptions {
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
}

export async function generateResponse({
  message,
  conversationHistory = [],
  model = "gemini-2.0-flash",
}: GenerateResponseOptions): Promise<string> {
  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: message },
  ];

  const result = await streamText({
    model: google(model),
    messages,
    system: `You are Agent0, a helpful AI assistant integrated with Slack. 
Keep responses concise and formatted for Slack (use *bold*, _italic_, \`code\`, and \`\`\`code blocks\`\`\`).
Be helpful, friendly, and to the point.`,
  });

  // Collect the full text response
  let fullResponse = "";
  for await (const textPart of result.textStream) {
    fullResponse += textPart;
  }

  return fullResponse;
}

export async function generateStreamingResponse({
  message,
  conversationHistory = [],
  model = "gemini-2.0-flash",
}: GenerateResponseOptions) {
  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user" as const, content: message },
  ];

  const result = streamText({
    model: google(model),
    messages,
    system: `You are Agent0, a helpful AI assistant integrated with Slack. 
Keep responses concise and formatted for Slack (use *bold*, _italic_, \`code\`, and \`\`\`code blocks\`\`\`).
Be helpful, friendly, and to the point.`,
  });

  return result;
}

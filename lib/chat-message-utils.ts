import type { MyUIMessage, UIMessagePart } from "@/types/chat";

// Helper function to get human-readable tool names
export function getToolTitle(toolName: string): string {
  const titles: Record<string, string> = {
    google_search: "Google Search",
    url_context: "URL Context",
    code_execution: "Code Execution",
    displayWeather: "Weather",
  };
  return titles[toolName] || toolName;
}

// Type guard for text parts
function isTextPart(part: UIMessagePart): part is Extract<UIMessagePart, { type: "text" }> {
  return part.type === "text";
}

// Type guard for reasoning parts
function isReasoningPart(part: UIMessagePart): part is Extract<UIMessagePart, { type: "reasoning" }> {
  return part.type === "reasoning";
}

// Type guard for tool invocation parts - handles both old and new AI SDK formats
// Old format: part.type === "tool-invocation"
// New AI SDK 5.0 format: part.type === "tool-{toolName}" (e.g., "tool-displayWeather")
function isToolInvocationPart(part: UIMessagePart): boolean {
  return part.type === "tool-invocation" || part.type.startsWith("tool-");
}

// Type guard for source parts
function isSourcePart(part: UIMessagePart): boolean {
  return part.type === "source-url" || part.type === "source-document";
}

// Helper to extract text content from message parts
export function getMessageTextContent(message: MyUIMessage): string {
  if (!message.parts) return "";
  return message.parts
    .filter(isTextPart)
    .map((part) => part.text)
    .join("");
}

// Helper to extract reasoning from message parts
export function getMessageReasoning(message: MyUIMessage): string | null {
  if (!message.parts) return null;
  const reasoningParts = message.parts.filter(isReasoningPart);
  if (reasoningParts.length === 0) return null;
  return reasoningParts.map((part) => part.text).join("");
}

// Helper to extract tool invocations from message parts
export function getToolInvocations(message: MyUIMessage): UIMessagePart[] {
  if (!message.parts) return [];
  return message.parts.filter(isToolInvocationPart);
}

// Helper to extract sources from message parts
export function getMessageSources(message: MyUIMessage): UIMessagePart[] {
  if (!message.parts) return [];
  return message.parts.filter(isSourcePart);
}

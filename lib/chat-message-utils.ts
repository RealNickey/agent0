// Helper function to get human-readable tool names
export function getToolTitle(toolName: string): string {
  const titles: Record<string, string> = {
    google_search: "Google Search",
    url_context: "URL Context",
    code_execution: "Code Execution",
  };
  return titles[toolName] || toolName;
}

// Helper to extract text content from message parts
export function getMessageTextContent(message: any): string {
  if (!message.parts) return "";
  return message.parts
    .filter((part: any) => part.type === "text")
    .map((part: any) => part.text)
    .join("");
}

// Helper to extract reasoning from message parts
export function getMessageReasoning(message: any): string | null {
  if (!message.parts) return null;
  const reasoningParts = message.parts.filter((part: any) => part.type === "reasoning");
  if (reasoningParts.length === 0) return null;
  return reasoningParts.map((part: any) => part.text).join("");
}

// Helper to extract tool invocations from message parts
export function getToolInvocations(message: any): any[] {
  if (!message.parts) return [];
  return message.parts.filter((part: any) => part.type === "tool-invocation");
}

// Helper to extract sources from message parts
export function getMessageSources(message: any): any[] {
  if (!message.parts) return [];
  const sourceParts = message.parts.filter((part: any) => part.type === "source");
  return sourceParts;
}

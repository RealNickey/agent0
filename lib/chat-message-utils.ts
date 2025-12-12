// Helper function to get human-readable tool names
export function getToolTitle(toolName: string): string {
  const titles: Record<string, string> = {
    // Built-in Google tools
    google_search: "Google Search",
    url_context: "URL Context",
    code_execution: "Code Execution",
    // Custom tools - these will be looked up by their ID
    weather: "🌤️ Weather",
    calculator: "🧮 Calculator",
    random: "🎲 Random Generator",
  };
  
  // Return the mapped title or format the tool name nicely
  if (titles[toolName]) {
    return titles[toolName];
  }
  
  // Format unknown tool names: snake_case or kebab-case to Title Case
  return toolName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
  const parts: any[] = Array.isArray(message?.parts) ? message.parts : [];
  if (parts.length === 0) return [];

  // AI SDK UI typically emits tool calls/results as `tool-invocation` parts.
  const toolInvocations = parts.filter((part) => part?.type === "tool-invocation");
  if (toolInvocations.length > 0) return toolInvocations;

  // Some transports/models can emit separate `tool-call` + `tool-result` parts.
  // Merge them by `toolCallId` into a single tool-invocation-like object.
  const toolCallParts = parts.filter((part) => part?.type === "tool-call");
  const toolResultParts = parts.filter((part) => part?.type === "tool-result" || part?.type === "tool-error");
  if (toolCallParts.length === 0 && toolResultParts.length === 0) return [];

  const merged = new Map<
    string,
    {
      type: "tool-invocation";
      toolCallId: string;
      toolName?: string;
      state?: string;
      input?: any;
      output?: any;
      errorText?: string;
    }
  >();

  const upsert = (toolCallId: string) => {
    const existing = merged.get(toolCallId);
    if (existing) return existing;
    const created = {
      type: "tool-invocation" as const,
      toolCallId,
      toolName: undefined as string | undefined,
      state: undefined as string | undefined,
      input: undefined as any,
      output: undefined as any,
      errorText: undefined as string | undefined,
    };
    merged.set(toolCallId, created);
    return created;
  };

  for (const part of toolCallParts) {
    const toolCallId = part?.toolCallId;
    if (!toolCallId) continue;
    const item = upsert(toolCallId);
    item.toolName = part.toolName ?? item.toolName;
    item.input = part.input ?? item.input;
    item.state = item.state ?? "input-available";
  }

  for (const part of toolResultParts) {
    const toolCallId = part?.toolCallId;
    if (!toolCallId) continue;
    const item = upsert(toolCallId);
    item.toolName = part.toolName ?? item.toolName;
    if (part.type === "tool-error") {
      item.errorText = part?.error ?? part?.message ?? item.errorText;
      item.state = "output-error";
    } else {
      item.output = part.output ?? part.result ?? item.output;
      item.state = "output-available";
    }
  }

  // Preserve original order based on first appearance in `parts`.
  const order: string[] = [];
  for (const part of parts) {
    const toolCallId = part?.toolCallId;
    if (toolCallId && merged.has(toolCallId) && !order.includes(toolCallId)) {
      order.push(toolCallId);
    }
  }
  return order.map((id) => merged.get(id)!).filter(Boolean);
}

// Helper to extract sources from message parts
export function getMessageSources(message: any): any[] {
  if (!message.parts) return [];
  const sourceParts = message.parts.filter((part: any) => part.type === "source");
  return sourceParts;
}

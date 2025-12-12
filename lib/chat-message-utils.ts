// Helper function to get human-readable tool names
export function getToolTitle(toolName: string): string {
  const titles: Record<string, string> = {
    // Built-in Google tools
    google_search: "Google Search",
    url_context: "URL Context",
    code_execution: "Code Execution",
    // Custom tools - these will be looked up by their ID
    displayWeather: "🌤️ Weather",
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

  // AI SDK can emit tools in multiple formats:
  // 1. `tool-invocation` parts (sometimes with nested toolInvocation property)
  // 2. Separate `tool-call` + `tool-result` parts
  // 3. Typed tool parts like `tool-displayWeather`
  // We need to merge all by toolCallId to ensure results are always displayed

  const toolInvocationParts = parts.filter((part) => part?.type === "tool-invocation");
  const toolCallParts = parts.filter((part) => part?.type === "tool-call");
  const toolResultParts = parts.filter((part) => part?.type === "tool-result" || part?.type === "tool-error");
  
  // Also check for typed tool parts (tool-${toolName})
  const typedToolParts = parts.filter((part) => 
    part?.type && typeof part.type === 'string' && part.type.startsWith('tool-')
  );

  if (toolInvocationParts.length === 0 && toolCallParts.length === 0 && 
      toolResultParts.length === 0 && typedToolParts.length === 0) {
    return [];
  }

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

  // Process typed tool parts (tool-${toolName})
  for (const part of typedToolParts) {
    if (part.type === 'tool-invocation') continue; // Skip, handled separately
    
    const toolCallId = part?.toolCallId ?? `typed-${part.type}`;
    const toolName = part.type.replace('tool-', ''); // Extract tool name from type
    
    const item = upsert(toolCallId);
    item.toolName = toolName;
    item.input = part?.input ?? item.input;
    item.output = part?.output ?? item.output;
    item.errorText = part?.errorText ?? item.errorText;
    item.state = part?.state ?? (item.output != null ? "output-available" : "input-available");
  }

  // Process tool-invocation parts
  for (const part of toolInvocationParts) {
    const ti = part?.toolInvocation ?? part;
    const toolCallId = ti?.toolCallId ?? part?.toolCallId;
    if (!toolCallId) continue;

    const item = upsert(toolCallId);
    item.toolName = ti?.toolName ?? item.toolName;
    item.input = ti?.input ?? ti?.args ?? item.input;
    item.output = ti?.output ?? ti?.result ?? item.output;
    item.errorText = ti?.errorText ?? item.errorText;

    const rawState: string | undefined = ti?.state ?? part?.state;
    item.state =
      rawState === "result"
        ? "output-available"
        : rawState === "call"
          ? "input-available"
          : rawState ?? (item.output != null ? "output-available" : "input-available");
  }

  // Process tool-call parts
  for (const part of toolCallParts) {
    const toolCallId = part?.toolCallId;
    if (!toolCallId) continue;
    const item = upsert(toolCallId);
    item.toolName = part.toolName ?? item.toolName;
    item.input = part.input ?? item.input;
    item.state = item.state ?? "input-available";
  }

  // Process tool-result parts (this updates the state to output-available)
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
    const toolCallId = part?.toolCallId ?? (part?.type?.startsWith('tool-') ? `typed-${part.type}` : null);
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

/**
 * Tool management utilities
 */

export type Tool = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  enabled: boolean;
};

export type InstalledTool = Tool & {
  installedAt: string;
};

/**
 * Parse @tool mentions from a message
 * Returns array of tool names mentioned
 */
export function parseToolMentions(message: string): string[] {
  const toolMentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = toolMentionRegex.exec(message)) !== null) {
    mentions.push(match[1].toLowerCase());
  }

  // Remove duplicates
  return [...new Set(mentions)];
}

/**
 * Check if a message contains any @tool mentions
 */
export function hasToolMentions(message: string): boolean {
  return /@\w+/.test(message);
}

/**
 * Fetch tools from marketplace
 */
export async function fetchMarketplaceTools(
  category?: string,
  search?: string
): Promise<Tool[]> {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (search) params.append("search", search);

  const response = await fetch(`/api/tools/marketplace?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch marketplace tools");
  }

  const data = await response.json();
  return data.tools;
}

/**
 * Fetch installed tools for current user
 */
export async function fetchInstalledTools(
  userId?: string
): Promise<InstalledTool[]> {
  const headers: HeadersInit = {};
  if (userId) {
    headers["user-id"] = userId;
  }

  const response = await fetch("/api/tools/installed", { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch installed tools");
  }

  const data = await response.json();
  return data.tools;
}

/**
 * Install a tool for the current user
 */
export async function installTool(
  toolId: string,
  userId?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch("/api/tools/install", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ toolId, userId }),
  });

  if (!response.ok) {
    throw new Error("Failed to install tool");
  }

  return response.json();
}

/**
 * Filter tools by mentioned names
 */
export function filterToolsByMentions(
  tools: InstalledTool[],
  mentions: string[]
): InstalledTool[] {
  if (mentions.length === 0) return [];

  return tools.filter((tool) =>
    mentions.includes(tool.name.toLowerCase()) ||
    mentions.includes(tool.id.toLowerCase())
  );
}

/**
 * Remove @mentions from message text
 */
export function removeToolMentions(message: string): string {
  return message.replace(/@\w+\s*/g, "").trim();
}

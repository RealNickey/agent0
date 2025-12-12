/**
 * Tool Executor Service
 * Handles execution of custom tools via API
 */

export async function executeCustomTool(toolId: string, params: any): Promise<any> {
  const response = await fetch('/api/tools/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolId, params }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Tool execution failed' }));
    throw new Error(error.error || 'Tool execution failed');
  }

  return response.json();
}

/**
 * Fetches available tools from the API
 */
export async function fetchAvailableTools(): Promise<any[]> {
  const response = await fetch('/api/tools/available');
  
  if (!response.ok) {
    console.error('Failed to fetch available tools');
    return [];
  }
  
  return response.json();
}

/**
 * Creates a Vercel AI SDK compatible tool definition from a custom tool
 */
export function createToolDefinition(tool: {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
}) {
  return {
    description: tool.description,
    parameters: tool.parameters,
  };
}

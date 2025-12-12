import { toolRegistry } from '@/lib/tool-registry';

// Import tools to ensure they are registered
import "@/lib/tools";

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { toolId, params } = await req.json();

    if (!toolId) {
      return Response.json({ error: 'Tool ID is required' }, { status: 400 });
    }

    const tool = toolRegistry.get(toolId);
    if (!tool) {
      return Response.json({ error: `Tool '${toolId}' not found` }, { status: 404 });
    }

    try {
      const result = await tool.execute(params || {});
      return Response.json({ result, success: true });
    } catch (error) {
      console.error(`Tool execution error for ${toolId}:`, error);
      return Response.json(
        { 
          error: 'Tool execution failed', 
          details: error instanceof Error ? error.message : String(error) 
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Invalid request body:', error);
    return Response.json(
      { error: 'Invalid request body' }, 
      { status: 400 }
    );
  }
}

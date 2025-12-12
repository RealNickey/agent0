import { toolRegistry } from '@/lib/tool-registry';

// Import tools to ensure they are registered
import "@/lib/tools";

export const runtime = 'nodejs';

export async function GET() {
  try {
    const tools = toolRegistry.getAllSerializable();
    return Response.json(tools);
  } catch (error) {
    console.error('Failed to get available tools:', error);
    return Response.json(
      { error: 'Failed to retrieve tools' }, 
      { status: 500 }
    );
  }
}

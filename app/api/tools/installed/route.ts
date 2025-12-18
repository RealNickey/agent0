import { z } from "zod";

const querySchema = z.object({
  userId: z.string().optional(),
});

// For now, return a default set of installed tools
// In production, this would query a database based on userId
const defaultInstalledTools = [
  {
    id: "weather",
    name: "Weather",
    description: "Get current weather information for any location",
    category: "utility",
    icon: "cloud-sun",
    enabled: true,
    installedAt: new Date().toISOString(),
  },
  {
    id: "knowledge",
    name: "Knowledge Base",
    description: "Search your personal knowledge base and documents using semantic search",
    category: "knowledge",
    icon: "book-open",
    enabled: true,
    installedAt: new Date().toISOString(),
  },
  {
    id: "remember",
    name: "Remember",
    description: "Save important information, notes, or facts to your knowledge base",
    category: "knowledge",
    icon: "brain",
    enabled: true,
    installedAt: new Date().toISOString(),
  },
];

export async function GET(request: Request) {
  try {
    const userId = request.headers.get("user-id");
    
    // Validate query parameters
    const parsed = querySchema.safeParse({ userId: userId || undefined });
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid parameters",
          details: parsed.error.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // TODO: In production, fetch user-specific tools from database
    // For now, return default tools
    const installedTools = defaultInstalledTools;

    return Response.json({ tools: installedTools });
  } catch (error) {
    console.error("Installed tools API error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

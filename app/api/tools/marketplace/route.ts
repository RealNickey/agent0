import { z } from "zod";

const querySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
});

// Marketplace tools registry
const marketplaceTools = [
  {
    id: "weather",
    name: "Weather",
    description: "Get current weather information for any location",
    category: "utility",
    icon: "cloud-sun",
    enabled: true,
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Manage Google Calendar events - create, list, update, delete events and find availability",
    category: "productivity",
    icon: "calendar",
    enabled: true,
  },
  {
    id: "tasks",
    name: "Tasks",
    description: "Manage Google Tasks - create, list, update, complete, and delete tasks with priority tracking",
    category: "productivity",
    icon: "list-todo",
    enabled: true,
  },
  {
    id: "forms",
    name: "Forms",
    description: "Create surveys and forms, collect and analyze responses with Google Forms",
    category: "productivity",
    icon: "file-text",
    enabled: true,
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Search, read, draft, and send emails through Gmail",
    category: "communication",
    icon: "mail",
    enabled: true,
  },
  {
    id: "image",
    name: "Image",
    description: "Generate images from text prompts using Cloudflare Workers AI (Flux-1-Schnell)",
    category: "creative",
    icon: "image",
    enabled: true,
  },
  {
    id: "research",
    name: "Research",
    description: "Deep research across Wikipedia, PubMed, academic papers, and news. Generates downloadable reports with citations.",
    category: "utility",
    icon: "search",
    enabled: true,
  },
  // Add more tools here as needed
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      category: searchParams.get("category") || undefined,
      search: searchParams.get("search") || undefined,
    };

    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          details: parsed.error.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let filteredTools = [...marketplaceTools];

    // Filter by category if provided
    if (parsed.data.category) {
      filteredTools = filteredTools.filter(
        (tool) => tool.category === parsed.data.category
      );
    }

    // Filter by search term if provided
    if (parsed.data.search) {
      const searchLower = parsed.data.search.toLowerCase();
      filteredTools = filteredTools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchLower) ||
          tool.description.toLowerCase().includes(searchLower)
      );
    }

    return Response.json({ tools: filteredTools });
  } catch (error) {
    console.error("Marketplace API error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

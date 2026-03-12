import { z } from "zod";
import { getInstalledTools } from "@/lib/installed-tools";
import { calendarTools } from "@/ai/calendar-tools";
import { tools as weatherTools } from "@/ai/tools";

const querySchema = z.object({
  userId: z.string().optional(),
});

// Helper to get tool metadata
function getToolMetadata(id: string) {
  if (id === "weather") {
    return {
      name: "Weather",
      description: "Get current weather information for any location",
      category: "utility",
      icon: "cloud-sun",
    };
  }
  if (id === "calendar") {
    return {
      name: "Calendar",
      description: "Manage Google Calendar events - create, list, update, delete events and find availability",
      category: "productivity",
      icon: "calendar",
    };
  }
  if (id === "gmail") {
    return {
      name: "Gmail",
      description: "Search, read, draft, and send emails through Gmail",
      category: "communication",
      icon: "mail",
    };
  }
  if (id === "tasks") {
    return {
      name: "Tasks",
      description: "Create, track, and manage to-do lists with Google Tasks",
      category: "productivity",
      icon: "list-todo",
    };
  }
  if (id === "forms") {
    return {
      name: "Forms",
      description: "Create surveys and forms, collect responses with Google Forms",
      category: "productivity",
      icon: "file-text",
    };
  }
  if (id === "mermaid") {
    return {
      name: "Mermaid",
      description: "Generate mermaid diagram code for flowcharts, sequences, and more",
      category: "utility",
      icon: "network",
    };
  }
  if (id === "pdf") {
    return {
      name: "PDF",
      description: "Merge multiple PDFs or compress PDF files for smaller size",
      category: "utility",
      icon: "file-stack",
    };
  }
  if (id === "slides") {
    return {
      name: "Slides",
      description: "Create beautiful reveal.js presentations with images, animations, and professional styling",
      category: "productivity",
      icon: "presentation",
    };
  }
  if (id === "movie") {
    return {
      name: "Movie",
      description: "Search for movies and get posters, ratings, runtime, genres, and descriptions from TMDB",
      category: "entertainment",
      icon: "film",
    };
  }
  if (id === "github") {
    return {
      name: "GitHub",
      description: "Create issues, branches, pull requests, and manage repos on GitHub",
      category: "developer",
      icon: "github",
    };
  }
  if (id === "image") {
    return {
      name: "Image",
      description: "Generate images from text prompts using Cloudflare Workers AI (Flux-1-Schnell)",
      category: "creative",
      icon: "image",
    };
  }
  if (id === "research") {
    return {
      name: "Research",
      description: "Deep research across Wikipedia, PubMed, academic papers, and news creates reports",
      category: "utility",
      icon: "search",
    };
  }
  return {
    name: id,
    description: "Custom tool",
    category: "other",
    icon: "box",
  };
}

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

    const installed = getInstalledTools();
    
    // Merge with metadata
    const tools = installed.map(tool => ({
      ...tool,
      ...getToolMetadata(tool.id),
      enabled: true,
    }));

    return Response.json({ tools });
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

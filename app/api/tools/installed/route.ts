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
  if (id === "pdf") {
    return {
      name: "PDF",
      description: "Compress PDF files to reduce size or merge multiple PDFs into one document",
      category: "utility",
      icon: "file-text",
    };
  }
  if (id === "image") {
    return {
      name: "Image Generator",
      description: "Generate images from text descriptions using AI. Create artwork, illustrations, and more.",
      category: "creative",
      icon: "image",
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

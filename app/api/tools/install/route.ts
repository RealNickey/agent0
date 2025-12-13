import { z } from "zod";

const bodySchema = z.object({
  toolId: z.string(),
  userId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: parsed.error.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { toolId, userId } = parsed.data;

    // TODO: In production, save tool installation to database
    // For now, just return success
    console.log(`Installing tool ${toolId} for user ${userId || "anonymous"}`);

    return Response.json({
      success: true,
      toolId,
      message: `Tool ${toolId} installed successfully`,
    });
  } catch (error) {
    console.error("Install tool API error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

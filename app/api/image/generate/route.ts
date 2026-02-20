import { z } from "zod";
import { randomUUID } from "crypto";
import { storeGeneratedImage } from "@/lib/image-store";

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
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

    const { prompt } = parsed.data;

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return new Response(
        JSON.stringify({
          error: "Cloudflare credentials not configured",
          message:
            "Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your .env file.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use Cloudflare Workers AI - Stable Diffusion XL Base 1.0
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;

    const cfResponse = await fetch(cfUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!cfResponse.ok) {
      const errText = await cfResponse.text();
      console.error("Cloudflare AI error:", cfResponse.status, errText);
      return new Response(
        JSON.stringify({
          error: "Image generation failed",
          message: `Cloudflare returned ${cfResponse.status}: ${errText}`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Cloudflare returns the raw image bytes (PNG)
    const imageBuffer = await cfResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    // Store the image server-side and return a short reference ID.
    // This prevents the large base64 payload from ever being sent to the LLM
    // as a tool result (which would cost ~330k+ tokens per image).
    const imageId = randomUUID();
    storeGeneratedImage(imageId, dataUrl);

    return Response.json({
      success: true,
      imageId,
      prompt,
    });
  } catch (error) {
    console.error("Image generation API error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

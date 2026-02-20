import { tool } from "ai";
import { z } from "zod";

export const generateImageTool = tool({
  description:
    "Generate an image from a text prompt using Stable Diffusion XL via Cloudflare Workers AI. The user describes what they want and the tool returns a generated image.",
  inputSchema: z.object({
    prompt: z
      .string()
      .describe(
        "A descriptive text prompt for the image to generate. Be detailed about style, scene, lighting, and composition for best results."
      ),
  }),
  execute: async ({ prompt }) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/image/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        error: true,
        message:
          errData.message || `Image generation failed (${response.status})`,
        prompt,
      };
    }

    const data = await response.json();

    // Return a lightweight reference – NOT the raw base64 data URL.
    // Sending the full image back to the LLM causes token-limit errors
    // (a typical 512×512 PNG is ~330k tokens as base64).
    // The UI fetches the actual image from /api/image/:id.
    return {
      error: false,
      imageUrl: `__generated_image_ref__:${data.imageId}`,
      prompt,
    };
  },
});

export const imageTools = {
  generateImage: generateImageTool,
};

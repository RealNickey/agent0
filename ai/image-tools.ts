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

    return {
      error: false,
      imageUrl: data.imageUrl,
      prompt,
    };
  },
});

export const imageTools = {
  generateImage: generateImageTool,
};

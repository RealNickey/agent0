/**
 * Image generation tool using AI SDK's `generateImage()` with a custom FLUX.2-dev model.
 *
 * Uses the `@gradio/client` to connect to the black-forest-labs/FLUX.2-dev
 * HuggingFace Space, wrapped in a custom `ImageModelV3` for full AI SDK compatibility.
 */
import { tool, generateImage } from "ai";
import { z } from "zod";
import { createFluxImageModel } from "@/lib/flux-image-model";

// Create the FLUX image model instance (reused across calls)
const fluxModel = createFluxImageModel({
  hfToken: process.env.HF_TOKEN,
});

export const imageTools = {
  generateImage: tool({
    description:
      "Generate an image from a text description using the FLUX.2-dev AI model. " +
      "Provide a detailed, descriptive prompt for best results. " +
      "Supports custom dimensions (multiples of 8) up to 1024px.",
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          "A detailed text description of the image to generate. Be specific about style, colors, composition, lighting, etc."
        ),
      width: z
        .number()
        .min(256)
        .max(1440)
        .optional()
        .default(1024)
        .describe("Image width in pixels (multiple of 8, default: 1024)"),
      height: z
        .number()
        .min(256)
        .max(1440)
        .optional()
        .default(1024)
        .describe("Image height in pixels (multiple of 8, default: 1024)"),
      seed: z
        .number()
        .optional()
        .describe(
          "Optional seed for reproducible results. Omit for random generation."
        ),
    }),
    execute: async ({ prompt, width, height, seed }) => {
      try {
        const { image } = await generateImage({
          model: fluxModel,
          prompt,
          size: `${width}x${height}`,
          seed,
          providerOptions: {
            "huggingface-flux": {
              num_inference_steps: 30,
              guidance_scale: 4,
              prompt_upsampling: true,
            },
          },
        });

        return {
          base64: image.base64,
          mediaType: image.mediaType ?? "image/png",
          prompt,
          seed: seed ?? null,
          width,
          height,
        };
      } catch (error) {
        console.error("Image generation failed:", error);
        return {
          error: true,
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate image. The model may be busy or unavailable.",
          prompt,
        };
      }
    },
  }),
};

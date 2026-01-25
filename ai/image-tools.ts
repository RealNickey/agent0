import { tool } from "ai";
import { z } from "zod";

export const generateImageTool = tool({
  description: "Generate an image based on a text prompt using AI image generation. Returns a downloadable image.",
  inputSchema: z.object({
    prompt: z.string().describe("The detailed text description of the image to generate. Be specific about style, colors, composition, and subjects."),
    aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional().default("1:1").describe("The aspect ratio for the generated image"),
  }),
  execute: async ({ prompt, aspectRatio = "1:1" }) => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    if (!apiKey) {
      return {
        error: true,
        message: "Google AI API key not configured",
        prompt,
      };
    }

    try {
      // Use Gemini's imagen model for image generation
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instances: [
              {
                prompt: prompt,
              },
            ],
            parameters: {
              sampleCount: 1,
              aspectRatio: aspectRatio,
              safetyFilterLevel: "block_medium_and_above",
              personGeneration: "allow_adult",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Image generation API error:", errorData);
        
        // Check for quota/rate limit errors
        const errorMessage = JSON.stringify(errorData);
        if (response.status === 429 || errorMessage.includes("quota") || errorMessage.includes("rate") || errorMessage.includes("exceeded")) {
          return {
            error: true,
            message: "API rate limit reached. The free tier allows limited requests per minute. Please wait 30-60 seconds and try again, or upgrade to a paid plan at https://ai.google.dev/pricing",
            prompt,
            retryAfter: 60,
          };
        }
        
        // Check for specific error types
        if (response.status === 400) {
          return {
            error: true,
            message: "Unable to generate this image. The prompt may contain content that cannot be processed.",
            prompt,
          };
        }

        if (response.status === 403) {
          return {
            error: true,
            message: "Access denied. The Imagen API may not be enabled for your API key. Visit https://console.cloud.google.com to enable it.",
            prompt,
          };
        }
        
        return {
          error: true,
          message: `Image generation failed: ${response.statusText}`,
          prompt,
        };
      }

      const data = await response.json();
      
      if (!data.predictions || data.predictions.length === 0) {
        return {
          error: true,
          message: "No image was generated. Try rephrasing your prompt.",
          prompt,
        };
      }

      const prediction = data.predictions[0];
      const imageBase64 = prediction.bytesBase64Encoded;
      const mimeType = prediction.mimeType || "image/png";

      return {
        error: false,
        prompt,
        aspectRatio,
        imageUrl: `data:${mimeType};base64,${imageBase64}`,
        mimeType,
        message: "Image generated successfully! Click the download button to save it.",
      };
    } catch (error) {
      console.error("Image generation error:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to generate image";
      
      // Check for quota errors in catch block too
      if (errorMsg.includes("quota") || errorMsg.includes("rate") || errorMsg.includes("exceeded")) {
        return {
          error: true,
          message: "API rate limit reached. Please wait 30-60 seconds and try again.",
          prompt,
          retryAfter: 60,
        };
      }
      
      return {
        error: true,
        message: errorMsg,
        prompt,
      };
    }
  },
});

export const imageTools = {
  generateImage: generateImageTool,
};

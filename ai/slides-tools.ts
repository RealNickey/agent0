/**
 * Slides Agent Tools
 *
 * Three tools for the @slides multi-step agent:
 * 1. reviewSlideOutline — Client-side tool (no execute). Renders SlideOutlineEditor for HITL editing.
 * 2. searchUnsplashImages — Server-side auto-execute. Fetches images from Unsplash for each slide.
 * 3. createGoogleSlidesPresentation — Server-side with needsApproval. Generates PPTX + uploads to Drive.
 */

import { tool } from "ai";
import { z } from "zod";
import {
  SlideOutlineSchema,
  SlideDefinitionSchema,
  ThemeSchema,
} from "@/types/slides";
import { searchImages } from "@/lib/unsplash";
import { generatePptx } from "@/lib/pptx-generator";
import {
  uploadPresentationToDrive,
  setFilePermission,
  getSlidesAccessToken,
} from "@/lib/google-slides";

/**
 * Tool 1: reviewSlideOutline (Client-Side — NO execute function)
 *
 * The model generates a structured outline as the tool input.
 * This renders as <SlideOutlineEditor> in the client.
 * User edits and confirms → addToolOutput(editedOutline) → auto-resubmits.
 */
export const reviewSlideOutlineTool = tool({
  description: `Generate a structured presentation outline for user review. 
Call this tool FIRST when asked to create a presentation. 
Generate 8-15 slides with varied types (title, content, section-divider, two-column, image-focus, quote).
Include descriptive imageQuery strings for each slide that would benefit from an image (e.g., "melting glacier aerial view").
The user will be able to edit all fields before confirming.
If the user previously rejected an outline, incorporate their feedback into the new version.`,
  inputSchema: SlideOutlineSchema,
  // NO execute function — this is a client-side tool
  // The model's input IS the outline. It renders client-side for editing.
});

/**
 * Tool 2: searchUnsplashImages (Server-Side auto-execute)
 *
 * After the user confirms the outline, the model calls this tool
 * with image search queries for each slide that needs an image.
 */
export const searchUnsplashImagesTool = tool({
  description: `Search Unsplash for high-quality images for presentation slides. 
Call this AFTER the user has confirmed their outline via reviewSlideOutline.
Send one query per slide that needs an image. Use descriptive, specific queries 
(e.g., "melting glacier aerial view" instead of just "climate change").`,
  inputSchema: z.object({
    queries: z.array(
      z.object({
        slideId: z.string().describe("The slide ID to assign the image to"),
        query: z.string().describe("Descriptive Unsplash search query"),
      })
    ).describe("Array of slide ID + image search query pairs"),
  }),
  execute: async ({ queries }) => {
    const results: Array<{
      slideId: string;
      images: Array<{
        id: string;
        url: string;
        thumbUrl: string;
        altDescription: string;
        photographer: string;
      }>;
    }> = [];

    for (const { slideId, query } of queries) {
      const images = await searchImages(query, 2); // 2 options per slide
      results.push({
        slideId,
        images: images.map((img) => ({
          id: img.id,
          url: img.url,
          thumbUrl: img.thumbUrl,
          altDescription: img.altDescription || query,
          photographer: img.photographer,
        })),
      });
    }

    return { results };
  },
});

/**
 * Tool 3: createGoogleSlidesPresentation (Server-Side, needsApproval: true)
 *
 * Generates PPTX from the final outline + images, uploads to Google Drive
 * with auto-conversion to native Google Slides format.
 * The needsApproval gate lets the user confirm before uploading.
 */
export const createGoogleSlidesPresentationTool = tool({
  description: `Create the final presentation and upload to Google Slides.
Call this AFTER images have been fetched via searchUnsplashImages.
Include the complete outline with image URLs assigned to each slide.
This requires user approval before executing (upload to Google Drive).`,
  inputSchema: z.object({
    outline: SlideOutlineSchema.describe("The complete presentation outline with image URLs assigned"),
  }),
  needsApproval: true,
  execute: async ({ outline }) => {
    // Get OAuth access token
    const accessToken = await getSlidesAccessToken();

    if (!accessToken) {
      return {
        status: "error" as const,
        error: "Google account not connected. Please install the Slides integration first.",
        message:
          "Google account not connected. Please connect your Google account through the Slides integration.",
      };
    }

    try {
      // Step 1: Generate PPTX buffer
      const pptxBuffer = await generatePptx(outline);

      // Step 2: Upload to Google Drive (auto-converts to Slides)
      const { fileId, webViewLink, thumbnailLink } =
        await uploadPresentationToDrive(
          outline.title,
          pptxBuffer,
          accessToken
        );

      // Step 3: Make the presentation viewable by anyone with the link
      await setFilePermission(fileId, "reader", "anyone", accessToken);

      return {
        status: "created" as const,
        slidesUrl: webViewLink,
        fileId,
        slideCount: outline.slides.length,
        title: outline.title,
        thumbnailLink: thumbnailLink || undefined,
        message: `Presentation "${outline.title}" created with ${outline.slides.length} slides!`,
      };
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Unknown error creating presentation";
      console.error("Slides creation error:", error);
      return {
        status: "error" as const,
        error: errMsg,
        message: `Failed to create presentation: ${errMsg}`,
      };
    }
  },
});

/**
 * Export all slides tools
 */
export const slidesTools = {
  reviewSlideOutline: reviewSlideOutlineTool,
  searchUnsplashImages: searchUnsplashImagesTool,
  createGoogleSlidesPresentation: createGoogleSlidesPresentationTool,
};

export default slidesTools;


import { z } from "zod";
import { tool } from "ai";
import { searchImages } from "@/lib/unsplash";
import { SlideOutline } from "@/types/slides";

// Slide types schema
const slideTypeSchema = z.enum(["title", "content", "section-divider", "two-column", "image-focus", "quote"]);

// Outline schema
const slideDefinitionSchema = z.object({
  id: z.string(),
  type: slideTypeSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  content: z.array(z.string()),
  speakerNotes: z.string().optional(),
  imageQuery: z.string().optional(),
  imageUrl: z.string().optional(),
  quoteText: z.string().optional(),
  quoteAttribution: z.string().optional(),
});

const slideOutlineSchema = z.object({
  title: z.string(),
  theme: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    accentColor: z.string(),
    fontFamily: z.string(),
  }),
  slides: z.array(slideDefinitionSchema),
});

export const slidesTools = {
  // Step 1: Client-side tool for outline review (HITL)
  reviewSlideOutline: tool({
    description: "Generate a structured outline for a presentation. The user will review and edit this outline before it is used to create slides. Call this FIRST when asked to create a presentation.",
    inputSchema: slideOutlineSchema,
    execute: async (outline) => {
      // Return the outline for client-side handling
      // This is a HITL (Human-in-the-Loop) tool - the user reviews in the UI
      return outline;
    },
  }),

  // Step 2: Create presentation with images (combines image search + PPTX generation)
  // This tool is called AFTER the outline is approved by the user
  // It fetches images, generates the PPTX, and returns data for download/upload UI
  createPresentationWithImages: tool({
    description: "After the outline is approved, create the final presentation. This will automatically fetch images from Unsplash for slides that need them, generate the PowerPoint file, and present options to download or upload to Google Drive.",
    inputSchema: z.object({
      outline: slideOutlineSchema,
    }),
    execute: async ({ outline }) => {
      // Step 1: Fetch images for slides that have imageQuery
      const slidesNeedingImages = outline.slides.filter(s => s.imageQuery && !s.imageUrl);
      
      if (slidesNeedingImages.length > 0) {
        console.log(`Fetching ${slidesNeedingImages.length} images from Unsplash...`);
        
        for (const slide of slidesNeedingImages) {
          try {
            const images = await searchImages(slide.imageQuery!, 1);
            if (images.length > 0) {
              slide.imageUrl = images[0].downloadUrl || images[0].url;
              console.log(`✓ Image found for "${slide.imageQuery}"`);
            }
          } catch (e) {
            console.error(`Failed to fetch image for "${slide.imageQuery}":`, e);
          }
        }
      }

      // Return the outline with images for client-side handling
      // The PresentationApproval component will handle PPTX generation and upload/download
      return {
        outline,
        imagesFound: slidesNeedingImages.filter(s => s.imageUrl).length,
        totalImagesRequested: slidesNeedingImages.length,
        awaitingApproval: true,
      };
    },
  }),
};

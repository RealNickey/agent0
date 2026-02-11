
import { z } from "zod";
import { tool } from "ai";
import { searchImages } from "@/lib/unsplash";
import { generatePresentation } from "@/lib/pptx-generator";
import { uploadPresentationToDrive, getValidAccessToken, setFilePermission } from "@/lib/google-slides";
import { SlideOutline } from "@/types/slides";

const DEFAULT_USER_ID = "default-user"; // Simplified for this implementation

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
  // Client-side tool for outline review (no execute function)
  reviewSlideOutline: tool({
    description: "Generate a structured outline for a presentation. The user will review and edit this outline before it is used to create slides. Call this FIRST when asked to create a presentation.",
    parameters: slideOutlineSchema,
  }),

  // Server-side tool to search for images
  searchUnsplashImages: tool({
    description: "Search for images on Unsplash based on queries. Call this AFTER the outline is approved to find images for slides.",
    parameters: z.object({
      queries: z.array(z.object({
        slideId: z.string(),
        query: z.string(),
      })),
    }),
    execute: async ({ queries }) => {
      const results = [];
      for (const q of queries) {
        try {
          const images = await searchImages(q.query, 1);
          if (images.length > 0) {
            results.push({
              slideId: q.slideId,
              imageUrl: images[0].downloadUrl || images[0].url, // Use download URL if available, else regular
              thumbUrl: images[0].thumbUrl,
              alt: images[0].altDescription,
              photographer: images[0].photographer,
            });
          }
        } catch (e) {
          console.error(`Failed to search image for query ${q.query}`, e);
        }
      }
      return { results };
    },
  }),

  // Server-side tool to create and upload the presentation
  // Note: execution handled client-side via SlidesApproval component calling API
  createGoogleSlidesPresentation: tool({
    description: "Create the final PowerPoint presentation and upload it to Google Drive (converted to Google Slides). Call this AFTER images have been selected and the user has confirmed the final details.",
    parameters: z.object({
      outline: slideOutlineSchema,
    }),
  }),
};

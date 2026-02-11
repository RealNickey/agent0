import { tool } from "ai";
import { z } from "zod";
import { searchImages } from "@/lib/unsplash";
import { generatePresentationPptx } from "@/lib/pptx-generator";
import { setFilePermission, uploadPresentationToDrive } from "@/lib/google-slides";
import type { SlideOutline } from "@/types/slides";

const slideTypeSchema = z.enum([
  "title",
  "content",
  "section-divider",
  "two-column",
  "image-focus",
  "quote",
]);

const slideThemeSchema = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  fontFamily: z.string(),
});

const slideDefinitionSchema = z.object({
  id: z.string(),
  type: slideTypeSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  content: z.array(z.string()).default([]),
  speakerNotes: z.string().optional(),
  imageQuery: z.string().optional(),
  imageUrl: z.string().optional(),
  quoteText: z.string().optional(),
  quoteAttribution: z.string().optional(),
});

const slideOutlineSchema = z.object({
  title: z.string(),
  theme: slideThemeSchema,
  slides: z.array(slideDefinitionSchema),
});

const slideOutlineOutputSchema = z.union([
  slideOutlineSchema,
  z.object({
    rejected: z.literal(true),
    reason: z.string().optional(),
  }),
]);

const searchImagesInputSchema = z.object({
  queries: z.array(
    z.object({
      slideId: z.string(),
      query: z.string(),
    })
  ),
});

const unsplashImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  thumbUrl: z.string(),
  altDescription: z.string().optional(),
  photographer: z.string().optional(),
  downloadUrl: z.string().optional(),
});

const searchImagesOutputSchema = z.object({
  results: z.array(
    z.object({
      slideId: z.string(),
      images: z.array(unsplashImageSchema),
    })
  ),
});

const imageAssignmentSchema = z.object({
  slideId: z.string(),
  imageUrl: z.string(),
  altDescription: z.string().optional(),
  photographer: z.string().optional(),
});

const createPresentationInputSchema = z.object({
  outline: slideOutlineSchema,
  imageAssignments: z.array(imageAssignmentSchema).optional(),
});

const createPresentationOutputSchema = z.union([
  z.object({
    status: z.literal("created"),
    slidesUrl: z.string(),
    fileId: z.string(),
    slideCount: z.number(),
    title: z.string(),
    thumbnailLink: z.string().optional(),
  }),
  z.object({
    error: z.literal(true),
    message: z.string(),
  }),
]);

export const slidesTools = {
  reviewSlideOutline: tool({
    description: "Draft a slide outline for the user to review and edit before generating a presentation.",
    inputSchema: slideOutlineSchema,
    outputSchema: slideOutlineOutputSchema,
  }),

  searchUnsplashImages: tool({
    description: "Search Unsplash images for each slide query and return image candidates.",
    inputSchema: searchImagesInputSchema,
    outputSchema: searchImagesOutputSchema,
    execute: async ({ queries }) => {
      const results = await Promise.all(
        queries.map(async ({ slideId, query }) => {
          const images = await searchImages(query, 3);
          return { slideId, images };
        })
      );

      return { results };
    },
  }),

  createGoogleSlidesPresentation: tool({
    description: "Generate a PPTX from the approved outline and upload it to Google Drive as a Google Slides presentation.",
    inputSchema: createPresentationInputSchema,
    outputSchema: createPresentationOutputSchema,
    needsApproval: true,
    execute: async ({ outline, imageAssignments }) => {
      try {
        const assignmentMap = new Map(
          (imageAssignments || []).map((assignment) => [assignment.slideId, assignment])
        );

        const resolvedOutline: SlideOutline = {
          ...outline,
          slides: outline.slides.map((slide) => {
            if (slide.imageUrl) return slide;
            const assigned = assignmentMap.get(slide.id);
            if (!assigned) return slide;
            return {
              ...slide,
              imageUrl: assigned.imageUrl,
            };
          }),
        };

        const pptxBuffer = await generatePresentationPptx(resolvedOutline);
        const uploadResult = await uploadPresentationToDrive(
          outline.title || "Untitled Presentation",
          pptxBuffer
        );

        if (uploadResult.error) {
          return { error: true, message: uploadResult.message };
        }

        const permissionResult = await setFilePermission(uploadResult.fileId, "reader", "anyone");
        if (permissionResult.error) {
          return { error: true, message: permissionResult.message };
        }

        return {
          status: "created",
          slidesUrl: uploadResult.webViewLink,
          fileId: uploadResult.fileId,
          slideCount: outline.slides.length,
          title: outline.title,
          thumbnailLink: uploadResult.thumbnailLink,
        };
      } catch (error) {
        return {
          error: true,
          message: error instanceof Error ? error.message : "Failed to create presentation",
        };
      }
    },
  }),
};

import { tool } from "ai";
import { z } from "zod";
import { searchImages } from "@/lib/unsplash";
import { generatePptxBuffer } from "@/lib/pptx-generator";
import { uploadPresentationToDrive, setFilePermission } from "@/lib/google-slides";

const slideTypeSchema = z.enum(["title", "content", "section-divider", "two-column", "image-focus", "quote"]);

export const slideDefinitionSchema = z.object({
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

export const slideOutlineSchema = z.object({
  title: z.string(),
  theme: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    accentColor: z.string(),
    fontFamily: z.string(),
  }),
  slides: z.array(slideDefinitionSchema).min(1),
});

const imageAssignmentsSchema = z.array(z.object({
  slideId: z.string(),
  imageUrl: z.string().url(),
  photographer: z.string().optional(),
  altDescription: z.string().optional(),
}));

export const slidesTools = {
  reviewSlideOutline: tool({
    description: "Client-side review/edit step for a generated slide outline.",
    inputSchema: slideOutlineSchema,
  }),

  searchUnsplashImages: tool({
    description: "Search Unsplash images for presentation slides.",
    inputSchema: z.object({
      queries: z.array(
        z.object({
          slideId: z.string(),
          query: z.string(),
          count: z.number().int().min(1).max(5).optional(),
        })
      ),
    }),
    execute: async ({ queries }) => {
      const results = await Promise.all(
        queries.map(async (queryItem) => {
          try {
            const images = await searchImages(queryItem.query, queryItem.count || 2);
            return { slideId: queryItem.slideId, images };
          } catch (error) {
            return {
              slideId: queryItem.slideId,
              images: [],
              error: error instanceof Error ? error.message : "Failed to fetch images",
            };
          }
        })
      );

      return { results };
    },
  }),

  createGoogleSlidesPresentation: tool({
    description: "Create and upload a presentation to Google Slides via Drive conversion.",
    inputSchema: z.object({
      outline: slideOutlineSchema,
      imageAssignments: imageAssignmentsSchema.optional().default([]),
      makePublic: z.boolean().optional().default(true),
    }),
    // @ts-expect-error AI SDK v6 runtime supports needsApproval for server-side tool gating.
    needsApproval: true,
    execute: async ({ outline, imageAssignments, makePublic }) => {
      const assignmentMap = new Map(imageAssignments.map((item) => [item.slideId, item.imageUrl]));
      const finalOutline = {
        ...outline,
        slides: outline.slides.map((slide) => ({
          ...slide,
          imageUrl: assignmentMap.get(slide.id) || slide.imageUrl,
        })),
      };

      const pptxBuffer = await generatePptxBuffer(finalOutline);
      const uploadResult = await uploadPresentationToDrive(`${outline.title}.pptx`, pptxBuffer);

      if (makePublic) {
        await setFilePermission(uploadResult.fileId, "reader", "anyone");
      }

      return {
        status: "created" as const,
        slidesUrl: uploadResult.webViewLink,
        webViewLink: uploadResult.webViewLink,
        thumbnailLink: uploadResult.thumbnailLink,
        fileId: uploadResult.fileId,
        slideCount: outline.slides.length,
        title: outline.title,
      };
    },
  }),
};

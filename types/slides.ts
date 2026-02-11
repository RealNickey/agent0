import { z } from "zod";

/**
 * Slide type definitions for the @slides agent tool
 */

export const SlideTypeEnum = z.enum([
  "title",
  "content",
  "section-divider",
  "two-column",
  "image-focus",
  "quote",
]);
export type SlideType = z.infer<typeof SlideTypeEnum>;

export const ThemeSchema = z.object({
  primaryColor: z.string().describe("Primary color hex code (e.g., '#1a73e8')"),
  secondaryColor: z.string().describe("Secondary color hex code"),
  accentColor: z.string().describe("Accent color hex code"),
  fontFamily: z.string().describe("Font family name (e.g., 'Arial', 'Helvetica', 'Georgia')"),
});
export type Theme = z.infer<typeof ThemeSchema>;

export const SlideDefinitionSchema = z.object({
  id: z.string().describe("Unique slide identifier"),
  type: SlideTypeEnum.describe("The type/layout of the slide"),
  title: z.string().describe("Slide title"),
  subtitle: z.string().optional().describe("Slide subtitle"),
  content: z.array(z.string()).describe("Bullet points or content items"),
  speakerNotes: z.string().optional().describe("Speaker notes for this slide"),
  imageQuery: z.string().optional().describe("Unsplash search query for slide image"),
  imageUrl: z.string().optional().describe("Assigned image URL after Unsplash search"),
  quoteText: z.string().optional().describe("Quote text for quote-type slides"),
  quoteAttribution: z.string().optional().describe("Attribution for the quote"),
});
export type SlideDefinition = z.infer<typeof SlideDefinitionSchema>;

export const SlideOutlineSchema = z.object({
  title: z.string().describe("Presentation title"),
  theme: ThemeSchema.describe("Color theme and typography settings"),
  slides: z.array(SlideDefinitionSchema).describe("Array of slide definitions"),
});
export type SlideOutline = z.infer<typeof SlideOutlineSchema>;

export const UnsplashImageSchema = z.object({
  id: z.string(),
  url: z.string().describe("Regular-sized image URL"),
  thumbUrl: z.string().describe("Thumbnail URL"),
  altDescription: z.string().optional(),
  photographer: z.string(),
  downloadUrl: z.string().describe("Unsplash download tracking URL"),
});
export type UnsplashImage = z.infer<typeof UnsplashImageSchema>;

export interface SlidesCreationResult {
  status: "created" | "error";
  slidesUrl?: string;
  fileId?: string;
  slideCount?: number;
  title?: string;
  thumbnailLink?: string;
  error?: string;
  message?: string;
}

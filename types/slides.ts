import { z } from "zod";

/**
 * Slide type definitions for the @slides agent tool
 * Simplified: User only controls titles/headings + theme selection.
 * AI generates all content, types, and details after approval.
 */

// ── Premade Themes ──────────────────────────────────────────────

export type ThemeName = "modern-blue" | "dark-elegant" | "nature-green";

export interface PremadeTheme {
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
}

export const PREMADE_THEMES: Record<ThemeName, PremadeTheme> = {
  "modern-blue": {
    name: "Modern Blue",
    description: "Clean corporate look",
    primaryColor: "#1A73E8",
    secondaryColor: "#34A853",
    accentColor: "#FBBC04",
    fontFamily: "Arial",
  },
  "dark-elegant": {
    name: "Dark Elegant",
    description: "Sleek dark presentation",
    primaryColor: "#1E1E2E",
    secondaryColor: "#89B4FA",
    accentColor: "#F38BA8",
    fontFamily: "Helvetica",
  },
  "nature-green": {
    name: "Nature Green",
    description: "Warm organic palette",
    primaryColor: "#2D6A4F",
    secondaryColor: "#40916C",
    accentColor: "#D4A373",
    fontFamily: "Georgia",
  },
};

// ── Simplified Outline Schema (User-facing) ─────────────────────

export const SimpleSlideSchema = z.object({
  id: z.string().describe("Unique slide identifier"),
  title: z.string().describe("Slide heading / title"),
});
export type SimpleSlide = z.infer<typeof SimpleSlideSchema>;

export const SimpleOutlineSchema = z.object({
  title: z.string().describe("Presentation title"),
  themeName: z
    .enum(["modern-blue", "dark-elegant", "nature-green"])
    .describe("Premade theme name"),
  slides: z
    .array(SimpleSlideSchema)
    .describe("Array of slide headings — user can edit titles"),
});
export type SimpleOutline = z.infer<typeof SimpleOutlineSchema>;

// ── Full Slide Types (AI-generated, for PPTX generation) ────────

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

// ── Result Types ────────────────────────────────────────────────

export interface SlidesCreationResult {
  status: "created" | "error";
  slidesUrl?: string;
  downloadUrl?: string;
  fileId?: string;
  slideCount?: number;
  title?: string;
  thumbnailLink?: string;
  error?: string;
  message?: string;
  runId?: string;
  timeline?: SlidesGenerationTimelineEntry[];
  debug?: SlidesGenerationDebug;
}

export type SlidesGenerationPhase =
  | "theme-resolution"
  | "image-search"
  | "pptx-generation"
  | "drive-upload"
  | "finalization";

export interface SlidesGenerationTimelineEntry {
  phase: SlidesGenerationPhase;
  status: "completed" | "skipped" | "failed";
  startedAt: string;
  endedAt: string;
  durationMs: number;
  details?: string;
}

export interface SlidesGenerationDebug {
  createdAt: string;
  imageSearches: Array<{
    slideId: string;
    query: string;
    matched: boolean;
    imageUrl?: string;
    error?: string;
  }>;
  upload: {
    attempted: boolean;
    success: boolean;
    error?: string;
  };
  warnings: string[];
}

export const UnsplashImageSchema = z.object({
  id: z.string(),
  url: z.string().describe("Regular-sized image URL"),
  thumbUrl: z.string().describe("Thumbnail URL"),
  altDescription: z.string().optional(),
  photographer: z.string(),
  downloadUrl: z.string().describe("Unsplash download tracking URL"),
});
export type UnsplashImage = z.infer<typeof UnsplashImageSchema>;

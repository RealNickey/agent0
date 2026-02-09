import { tool } from "ai";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-slides";
import { buildPresentation, insertImageWithFallback } from "@/lib/google-slides";
import type { PresentationOutline, SlideContent } from "@/lib/google-slides";
import { searchImages, buildAttributionText } from "@/lib/unsplash";
import type { UnsplashImage } from "@/lib/unsplash";

/**
 * Google Slides Tools for Agent0
 *
 * Allows the AI agent to create Google Slides presentations programmatically.
 * Users invoke via @slides mention. Images are fetched from Unsplash automatically
 * based on slide content keywords and optional user-provided prompts.
 *
 * Available operations:
 * - createSlidesPresentation: Generate a full slide deck from a topic/content
 */

const DEFAULT_USER_ID = "default-user";

// Maximum slides to generate
const MAX_SLIDES = 20;

/**
 * Create a Google Slides presentation from a topic or content outline.
 * Automatically fetches relevant images from Unsplash for each slide.
 */
export const createSlidesPresentation = tool({
  description:
    "Create a Google Slides presentation on a given topic. Generates an outline with title, section headers, and bullet points, then creates the deck in Google Slides with images sourced from Unsplash. Use this whenever the user wants a slide deck, presentation, or pitch deck created.",
  inputSchema: z.object({
    topic: z
      .string()
      .describe("The main topic or title for the presentation"),
    content: z
      .string()
      .optional()
      .describe(
        "Optional detailed content, outline, or raw text to structure into slides. If not provided, the AI will generate a sensible outline from the topic."
      ),
    slideCount: z
      .number()
      .min(2)
      .max(MAX_SLIDES)
      .optional()
      .describe("Number of slides to generate (2-20). Defaults to 6."),
    imagePrompts: z
      .array(z.string())
      .optional()
      .describe(
        "Optional per-slide image search prompts for Unsplash. If fewer prompts than slides, remaining slides use auto-generated keywords."
      ),
    subtitle: z
      .string()
      .optional()
      .describe("Subtitle for the title slide"),
    includeImages: z
      .boolean()
      .optional()
      .describe(
        "Whether to include images from Unsplash (default true). Set false for text-only decks."
      ),
  }),
  execute: async ({
    topic,
    content,
    slideCount = 6,
    imagePrompts,
    subtitle,
    includeImages = true,
  }) => {
    // 1. Authenticate
    const accessToken = await getValidAccessToken(DEFAULT_USER_ID);
    if (!accessToken) {
      return {
        error: true,
        message:
          "Google Slides is not connected. Please install the Slides integration and authorize with Google first.",
      };
    }

    // 2. Build the slide outline
    const slides: SlideContent[] = buildSlideOutline(
      topic,
      content,
      slideCount,
      subtitle
    );

    // 3. Fetch images from Unsplash (if enabled)
    const imageCredits: UnsplashImage[] = [];
    const failedImages: string[] = [];

    if (includeImages) {
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        // Determine search query: user prompt > auto from title
        const query =
          imagePrompts && imagePrompts[i]
            ? imagePrompts[i]
            : slide.layout === "TITLE"
              ? topic
              : slide.title;

        try {
          const result = await searchImages(query, 1, "landscape");
          if (result.images.length > 0) {
            const img = result.images[0];
            slide.imageUrl = img.url;
            slide.imageAlt = img.altDescription;
            imageCredits.push(img);
          } else if (result.error) {
            failedImages.push(`Slide ${i + 1}: ${result.error}`);
          }
        } catch {
          failedImages.push(`Slide ${i + 1}: image fetch failed`);
        }
      }
    }

    // 4. Build the presentation via Slides API
    const outline: PresentationOutline = {
      title: topic,
      subtitle: subtitle || `Generated presentation`,
      slides,
    };

    const result = await buildPresentation(accessToken, outline);

    if (!result.success || !result.data) {
      return {
        error: true,
        message: result.error || "Failed to create presentation",
      };
    }

    // 5. If any direct image insertions failed, retry with Drive fallback
    // (buildPresentation tries direct URL first; if it fails, we fall back here)
    // This is handled inside buildPresentation already, so we just report.

    // 6. Build attribution text
    const attributionText = buildAttributionText(imageCredits);

    return {
      error: false,
      presentationId: result.data.presentationId,
      title: result.data.title,
      slideCount: result.data.slideCount,
      url: result.data.url,
      slides: result.data.slides.map((s, i) => ({
        objectId: s.objectId,
        title: s.title,
        hasImage: !!slides[i]?.imageUrl,
      })),
      imageCredits: imageCredits.map((img) => ({
        photographer: img.photographer,
        photographerUrl: img.photographerUrl,
        unsplashUrl: img.unsplashUrl,
      })),
      attribution: attributionText,
      failedImages: failedImages.length > 0 ? failedImages : undefined,
      message: `Created "${result.data.title}" with ${result.data.slideCount} slides.${
        failedImages.length > 0
          ? ` ${failedImages.length} image(s) could not be loaded.`
          : ""
      }`,
    };
  },
});

/**
 * Build a structured slide outline from a topic and optional raw content.
 */
function buildSlideOutline(
  topic: string,
  content: string | undefined,
  slideCount: number,
  subtitle?: string
): SlideContent[] {
  const slides: SlideContent[] = [];
  const count = Math.min(Math.max(slideCount, 2), MAX_SLIDES);

  // Title slide (always first)
  slides.push({
    title: topic,
    bullets: subtitle ? [subtitle] : undefined,
    layout: "TITLE",
    speakerNotes: `Title slide for: ${topic}`,
  });

  // If user provided structured content, try to split it into slides
  if (content && content.trim().length > 0) {
    const sections = splitContentIntoSections(content, count - 2); // -2 for title + closing
    for (const section of sections) {
      slides.push({
        title: section.heading,
        bullets: section.points,
        layout: "TITLE_AND_BODY",
        speakerNotes: `Key points: ${section.points.join("; ")}`,
      });
    }
  } else {
    // Generate generic outline sections
    const sectionTemplates = [
      { title: "Overview", bullets: [`What is ${topic}?`, "Key concepts and background", "Why it matters"] },
      { title: "Key Points", bullets: ["Main idea 1", "Main idea 2", "Main idea 3"] },
      { title: "Details", bullets: ["Supporting details", "Examples and evidence", "Data and research"] },
      { title: "Benefits", bullets: ["Advantage 1", "Advantage 2", "Impact and outcomes"] },
      { title: "Challenges", bullets: ["Challenge 1", "Challenge 2", "Potential solutions"] },
      { title: "Case Study", bullets: ["Real-world example", "Results achieved", "Lessons learned"] },
      { title: "Implementation", bullets: ["Step 1: Planning", "Step 2: Execution", "Step 3: Review"] },
      { title: "Future Outlook", bullets: ["Trends to watch", "Upcoming developments", "Long-term vision"] },
    ];

    const bodyCount = count - 2; // exclude title + closing
    for (let i = 0; i < Math.min(bodyCount, sectionTemplates.length); i++) {
      const t = sectionTemplates[i];
      slides.push({
        title: t.title,
        bullets: t.bullets,
        layout: i === 0 ? "SECTION_HEADER" : "TITLE_AND_BODY",
        speakerNotes: `Section: ${t.title}`,
      });
    }
  }

  // Closing slide
  slides.push({
    title: "Thank You",
    bullets: ["Questions?", `Learn more about ${topic}`],
    layout: "SECTION_HEADER",
    speakerNotes: "Closing slide – open for questions",
  });

  // Trim if we exceeded count
  return slides.slice(0, count);
}

/**
 * Split raw text content into logical sections with headings + bullet points.
 */
function splitContentIntoSections(
  content: string,
  maxSections: number
): { heading: string; points: string[] }[] {
  // Try to split by double newlines or numbered headings
  const rawBlocks = content
    .split(/\n{2,}|\r\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const sections: { heading: string; points: string[] }[] = [];

  for (const block of rawBlocks) {
    if (sections.length >= maxSections) break;

    const lines = block
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    // First line is the heading, rest are bullet points
    const heading = lines[0].replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "");
    const points =
      lines.length > 1
        ? lines.slice(1).map((l) => l.replace(/^[-*•]\s*/, ""))
        : [heading]; // If single line, use it as both heading and bullet

    sections.push({ heading, points });
  }

  return sections;
}

// Export all tools as a single object for route wiring
export const slidesTools = {
  createSlidesPresentation,
};

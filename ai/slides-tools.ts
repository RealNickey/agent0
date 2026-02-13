/**
 * Slides Agent Tools (Simplified)
 *
 * Two tools for the @slides multi-step agent:
 * 1. reviewSlideOutline — Client-side tool (no execute). Renders simplified outline editor (titles only).
 * 2. createPresentation — Server-side auto-execute. Generates full PPTX from AI-generated content + uploads.
 */

import { tool } from "ai";
import { z } from "zod";
import {
  SimpleOutlineSchema,
  SlideOutlineSchema,
  PREMADE_THEMES,
  type ThemeName,
  type SlidesGenerationTimelineEntry,
  type SlidesGenerationDebug,
  type SlidesGenerationPhase,
} from "@/types/slides";
import { searchImages } from "@/lib/unsplash";
import { generatePptx } from "@/lib/pptx-generator";
import {
  uploadPresentationToDrive,
  setFilePermission,
  getSlidesAccessToken,
} from "@/lib/google-slides";

function createSlidesLogger(runId: string) {
  return {
    info: (message: string, details?: Record<string, unknown>) => {
      console.log(`[slides:${runId}] ${message}`, details ?? "");
    },
    warn: (message: string, details?: Record<string, unknown>) => {
      console.warn(`[slides:${runId}] ${message}`, details ?? "");
    },
    error: (message: string, details?: Record<string, unknown>) => {
      console.error(`[slides:${runId}] ${message}`, details ?? "");
    },
  };
}

const SLIDES_TIMEOUTS_MS = {
  imageSearch: 12_000,
  pptxGeneration: 45_000,
  driveUpload: 30_000,
  setPermission: 10_000,
};

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function createPhaseTimer(phase: SlidesGenerationPhase) {
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  return {
    complete(status: SlidesGenerationTimelineEntry["status"], details?: string): SlidesGenerationTimelineEntry {
      const endedAtMs = Date.now();
      return {
        phase,
        status,
        startedAt,
        endedAt: new Date(endedAtMs).toISOString(),
        durationMs: endedAtMs - startedAtMs,
        details,
      };
    },
  };
}

/**
 * Tool 1: reviewSlideOutline (Client-Side — NO execute function)
 *
 * The model generates a simplified outline (title + slide headings + theme).
 * This renders as <SlideOutlineEditor> in the client with only editable titles.
 * User edits headings and confirms → addToolOutput(editedOutline) → auto-resubmits.
 */
export const reviewSlideOutlineTool = tool({
  description: `Generate a simplified presentation outline for user review.
Call this tool FIRST when asked to create a presentation.
Generate slide headings based on the topic — the user can edit titles to steer the generation.
Pick an appropriate premade theme: "modern-blue", "dark-elegant", or "nature-green".
Infer title and slide count from the user's request automatically.
Do not emit placeholders like "Presentation title" or "Slide 1 title".
The user should mainly approve or regenerate, not fill the outline from scratch.
The user will see the generated slide titles and chosen theme.
After confirmation, you must call createPresentation with the full content in the next step.
Do not output normal assistant prose between these tool steps.`,
  inputSchema: SimpleOutlineSchema,
  // NO execute function — this is a client-side tool
});

/**
 * Tool 2: createPresentation (Server-Side auto-execute)
 *
 * After the user confirms the outline, the AI generates full slide content
 * and calls this tool. It handles: image search → PPTX generation → Google Drive upload.
 */
export const createPresentationTool = tool({
  description: `Create the final presentation with full content.
Call this AFTER the user has confirmed their outline via reviewSlideOutline.
You MUST generate full slide content for each heading — the user only provided titles.
Use the approved outline title and slide headings as the source of truth.
For each slide, generate:
- An appropriate type (title, content, section-divider, two-column, image-focus, quote)
- Subtitle where appropriate
- Bullet point content (3-5 per content slide)
- Speaker notes with key talking points
- A descriptive imageQuery for Unsplash (e.g., "red ferrari f40 side profile" not just "car")
Ensure each slide clearly explains the approved topic and the deck reads as a coherent narrative.
Use the same theme name from the confirmed outline to resolve colors.
This tool generates the PPTX and uploads to Google Drive automatically.`,
  inputSchema: z.object({
    outline: SlideOutlineSchema.describe(
      "Complete presentation outline with full content, types, bullet points, and image queries for every slide"
    ),
    themeName: z
      .enum(["modern-blue", "dark-elegant", "nature-green"])
      .describe("The premade theme name chosen by the user"),
  }),
  execute: async ({ outline, themeName }) => {
    const runId = `slides-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const logger = createSlidesLogger(runId);
    const timeline: SlidesGenerationTimelineEntry[] = [];
    const debug: SlidesGenerationDebug = {
      createdAt: new Date().toISOString(),
      imageSearches: [],
      upload: {
        attempted: false,
        success: false,
      },
      warnings: [],
    };

    logger.info("Starting createPresentation execution", {
      title: outline.title,
      slideCount: outline.slides.length,
      themeName,
      timeoutsMs: SLIDES_TIMEOUTS_MS,
    });

    try {
      // Resolve premade theme into outline.theme
      const themePhase = createPhaseTimer("theme-resolution");
      const premadeTheme = PREMADE_THEMES[themeName as ThemeName];
      if (premadeTheme) {
        outline.theme = {
          primaryColor: premadeTheme.primaryColor,
          secondaryColor: premadeTheme.secondaryColor,
          accentColor: premadeTheme.accentColor,
          fontFamily: premadeTheme.fontFamily,
        };
        logger.info("Resolved premade theme", { themeName: premadeTheme.name });
        timeline.push(themePhase.complete("completed", `Theme resolved: ${premadeTheme.name}`));
      } else {
        debug.warnings.push(`Theme '${themeName}' was not found; using provided outline.theme`);
        logger.warn("Theme not found, continuing with outline theme", { themeName });
        timeline.push(themePhase.complete("skipped", "Theme key not found; kept input theme"));
      }

      // Step 1: Search for images for slides that have imageQuery
      const imagePhase = createPhaseTimer("image-search");
      const slidesNeedingImages = outline.slides.filter(
        (s) => s.imageQuery && s.imageQuery.trim().length > 0
      );

      logger.info("Image search phase started", {
        requestedImageSlides: slidesNeedingImages.length,
      });

      for (const slide of slidesNeedingImages) {
        try {
          const searchStartedAt = Date.now();
          logger.info("Searching image", {
            slideId: slide.id,
            query: slide.imageQuery,
          });

          const images = await withTimeout(
            searchImages(slide.imageQuery!, 1),
            SLIDES_TIMEOUTS_MS.imageSearch,
            `Image search for slide '${slide.id}'`
          );

          if (images.length > 0) {
            slide.imageUrl = images[0].url;
            debug.imageSearches.push({
              slideId: slide.id,
              query: slide.imageQuery!,
              matched: true,
              imageUrl: images[0].url,
            });
            logger.info("Image matched for slide", {
              slideId: slide.id,
              query: slide.imageQuery,
              durationMs: Date.now() - searchStartedAt,
            });
          } else {
            debug.imageSearches.push({
              slideId: slide.id,
              query: slide.imageQuery!,
              matched: false,
            });
            debug.warnings.push(`No image found for slide '${slide.title}'`);
            logger.warn("No image results", {
              slideId: slide.id,
              query: slide.imageQuery,
              durationMs: Date.now() - searchStartedAt,
            });
          }
        } catch (imageError) {
          // Image search failure is non-fatal
          const errorMessage =
            imageError instanceof Error ? imageError.message : "Unknown image search error";
          debug.imageSearches.push({
            slideId: slide.id,
            query: slide.imageQuery!,
            matched: false,
            error: errorMessage,
          });
          debug.warnings.push(`Image search failed for '${slide.title}': ${errorMessage}`);
          logger.warn("Image search failed", {
            slideId: slide.id,
            query: slide.imageQuery,
            error: errorMessage,
          });
        }
      }
      timeline.push(
        imagePhase.complete(
          "completed",
          `Processed ${slidesNeedingImages.length} image queries`
        )
      );

      // Step 2: Generate PPTX buffer
      const pptxPhase = createPhaseTimer("pptx-generation");
      logger.info("PPTX generation started");
      const pptxBuffer = await withTimeout(
        generatePptx(outline),
        SLIDES_TIMEOUTS_MS.pptxGeneration,
        "PPTX generation"
      );
      timeline.push(
        pptxPhase.complete(
          "completed",
          `Generated PPTX buffer (${Math.round(pptxBuffer.length / 1024)} KB)`
        )
      );
      logger.info("PPTX generation completed", {
        bufferBytes: pptxBuffer.length,
      });

      // Create base64 download URL
      const base64 = pptxBuffer.toString("base64");
      const downloadUrl = `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${base64}`;

      // Step 3: Try to upload to Google Drive (optional — works without it)
      const uploadPhase = createPhaseTimer("drive-upload");
      let slidesUrl: string | undefined;
      let fileId: string | undefined;
      let thumbnailLink: string | undefined;

      try {
        debug.upload.attempted = true;
        const accessToken = await getSlidesAccessToken();
        if (accessToken) {
          logger.info("Drive upload started");
          const driveResult = await withTimeout(
            uploadPresentationToDrive(
              outline.title,
              pptxBuffer,
              accessToken
            ),
            SLIDES_TIMEOUTS_MS.driveUpload,
            "Google Drive upload"
          );
          fileId = driveResult.fileId;
          slidesUrl = driveResult.webViewLink;
          thumbnailLink = driveResult.thumbnailLink || undefined;

          // Make viewable by anyone with link
          await withTimeout(
            setFilePermission(fileId, "reader", "anyone", accessToken),
            SLIDES_TIMEOUTS_MS.setPermission,
            "Google Drive set permission"
          );
          debug.upload.success = true;
          timeline.push(uploadPhase.complete("completed", "Uploaded and shared via Google Drive"));
          logger.info("Drive upload completed", {
            fileId,
            hasSlidesUrl: Boolean(slidesUrl),
          });
        } else {
          debug.upload.success = false;
          debug.warnings.push("Google access token unavailable; skipped Drive upload");
          timeline.push(uploadPhase.complete("skipped", "No Google access token; download still available"));
          logger.warn("Drive upload skipped due to missing token");
        }
      } catch (uploadError) {
        const uploadErrorMessage =
          uploadError instanceof Error
            ? uploadError.message
            : "Unknown Google Drive upload error";
        debug.upload.success = false;
        debug.upload.error = uploadErrorMessage;
        debug.warnings.push(`Drive upload failed: ${uploadErrorMessage}`);
        timeline.push(uploadPhase.complete("failed", uploadErrorMessage));
        logger.warn("Google Drive upload failed (non-fatal)", {
          error: uploadErrorMessage,
        });
      }

      const finalizationPhase = createPhaseTimer("finalization");
      timeline.push(
        finalizationPhase.complete(
          "completed",
          slidesUrl ? "Slides link + download link ready" : "Download link ready"
        )
      );

      return {
        status: "created" as const,
        title: outline.title,
        slideCount: outline.slides.length,
        downloadUrl,
        slidesUrl,
        fileId,
        thumbnailLink,
        runId,
        timeline,
        debug,
        message: `Presentation "${outline.title}" created with ${outline.slides.length} slides!`,
      };
    } catch (error) {
      const failurePhase = createPhaseTimer("finalization");
      const errMsg =
        error instanceof Error ? error.message : "Unknown error creating presentation";
      debug.warnings.push(`Fatal error: ${errMsg}`);
      timeline.push(failurePhase.complete("failed", errMsg));
      logger.error("Slides creation error", { error: errMsg });
      return {
        status: "error" as const,
        error: errMsg,
        runId,
        timeline,
        debug,
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
  createPresentation: createPresentationTool,
};

export default slidesTools;

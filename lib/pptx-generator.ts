/**
 * PPTX Generator
 *
 * Generates PowerPoint presentations from structured SlideOutline data
 * using pptxgenjs. Supports multiple slide types, themes, and Unsplash images.
 */

import PptxGenJS from "pptxgenjs";
import type { SlideOutline, SlideDefinition, Theme } from "@/types/slides";

// Constants for slide layout
const SLIDE_WIDTH = 10; // inches (standard 16:9)
const SLIDE_HEIGHT = 5.625;
const MARGIN = 0.6;
const CONTENT_WIDTH = SLIDE_WIDTH - MARGIN * 2;

/**
 * Convert hex color to pptxgenjs-compatible format (no #)
 */
function cleanColor(hex: string): string {
  return hex.replace("#", "");
}

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  const c = cleanColor(hex);
  const num = parseInt(c, 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * percent));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * percent));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * percent));
  return ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

/**
 * Generate a PPTX Buffer from a SlideOutline
 */
export async function generatePptx(outline: SlideOutline): Promise<Buffer> {
  const pptx = new PptxGenJS();

  // Configure presentation metadata
  pptx.title = outline.title;
  pptx.author = "Agent0";
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches (16:9)

  const theme = outline.theme;

  // Generate each slide
  for (const slideDef of outline.slides) {
    const slide = pptx.addSlide();

    // Add speaker notes if present
    if (slideDef.speakerNotes) {
      slide.addNotes(slideDef.speakerNotes);
    }

    switch (slideDef.type) {
      case "title":
        renderTitleSlide(slide, slideDef, theme);
        break;
      case "content":
        renderContentSlide(slide, slideDef, theme);
        break;
      case "section-divider":
        renderSectionDividerSlide(slide, slideDef, theme);
        break;
      case "two-column":
        renderTwoColumnSlide(slide, slideDef, theme);
        break;
      case "image-focus":
        renderImageFocusSlide(slide, slideDef, theme);
        break;
      case "quote":
        renderQuoteSlide(slide, slideDef, theme);
        break;
      default:
        renderContentSlide(slide, slideDef, theme);
    }
  }

  // Generate PPTX as a Node.js Buffer
  const output = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return output;
}

// ── Slide Renderers ──────────────────────────────────────────────

function renderTitleSlide(
  slide: PptxGenJS.Slide,
  def: SlideDefinition,
  theme: Theme
) {
  // Full-slide background
  slide.background = {
    fill: cleanColor(theme.primaryColor),
  };

  // Title
  slide.addText(def.title, {
    x: 1,
    y: 2.0,
    w: 11.33,
    h: 1.5,
    fontSize: 40,
    fontFace: theme.fontFamily,
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle",
  });

  // Subtitle
  if (def.subtitle) {
    slide.addText(def.subtitle, {
      x: 1.5,
      y: 3.6,
      w: 10.33,
      h: 1.0,
      fontSize: 20,
      fontFace: theme.fontFamily,
      color: "FFFFFF",
      align: "center",
      valign: "top",
      italic: true,
    });
  }

  // Accent bar
  slide.addShape("rect" as any, {
    x: 4.5,
    y: 3.4,
    w: 4.33,
    h: 0.06,
    fill: { color: cleanColor(theme.accentColor) },
  });
}

function renderContentSlide(
  slide: PptxGenJS.Slide,
  def: SlideDefinition,
  theme: Theme
) {
  slide.background = { fill: "FFFFFF" };

  // Colored top bar
  slide.addShape("rect" as any, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.08,
    fill: { color: cleanColor(theme.primaryColor) },
  });

  // Title
  slide.addText(def.title, {
    x: MARGIN,
    y: 0.3,
    w: def.imageUrl ? 7.5 : CONTENT_WIDTH,
    h: 0.9,
    fontSize: 28,
    fontFace: theme.fontFamily,
    color: cleanColor(theme.primaryColor),
    bold: true,
    valign: "middle",
  });

  // Bullet content
  if (def.content && def.content.length > 0) {
    const bullets = def.content.map((text) => ({
      text,
      options: {
        fontSize: 16,
        fontFace: theme.fontFamily,
        color: "333333",
        bullet: { code: "2022" as any }, // bullet character •
        paraSpaceAfter: 8,
      },
    }));

    slide.addText(bullets as any, {
      x: MARGIN,
      y: 1.4,
      w: def.imageUrl ? 7.0 : CONTENT_WIDTH,
      h: 5.5,
      valign: "top",
    });
  }

  // Image (right side)
  if (def.imageUrl) {
    try {
      slide.addImage({
        path: def.imageUrl,
        x: 8.0,
        y: 0.6,
        w: 4.8,
        h: 6.3,
        rounding: true,
      });
    } catch {
      // Image fetch may fail — slide still usable without it
    }
  }
}

function renderSectionDividerSlide(
  slide: PptxGenJS.Slide,
  def: SlideDefinition,
  theme: Theme
) {
  slide.background = {
    fill: cleanColor(theme.secondaryColor),
  };

  slide.addText(def.title, {
    x: 1,
    y: 2.5,
    w: 11.33,
    h: 1.5,
    fontSize: 36,
    fontFace: theme.fontFamily,
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle",
  });

  if (def.subtitle) {
    slide.addText(def.subtitle, {
      x: 2,
      y: 4.2,
      w: 9.33,
      h: 0.8,
      fontSize: 18,
      fontFace: theme.fontFamily,
      color: "FFFFFF",
      align: "center",
      italic: true,
    });
  }

  // Decorative accent line
  slide.addShape("rect" as any, {
    x: 5,
    y: 4.0,
    w: 3.33,
    h: 0.06,
    fill: { color: cleanColor(theme.accentColor) },
  });
}

function renderTwoColumnSlide(
  slide: PptxGenJS.Slide,
  def: SlideDefinition,
  theme: Theme
) {
  slide.background = { fill: "FFFFFF" };

  // Top bar
  slide.addShape("rect" as any, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.08,
    fill: { color: cleanColor(theme.primaryColor) },
  });

  // Title
  slide.addText(def.title, {
    x: MARGIN,
    y: 0.3,
    w: CONTENT_WIDTH,
    h: 0.9,
    fontSize: 28,
    fontFace: theme.fontFamily,
    color: cleanColor(theme.primaryColor),
    bold: true,
    valign: "middle",
  });

  // Split content into two columns
  const midpoint = Math.ceil(def.content.length / 2);
  const leftContent = def.content.slice(0, midpoint);
  const rightContent = def.content.slice(midpoint);

  // Left column
  if (leftContent.length > 0) {
    const leftBullets = leftContent.map((text) => ({
      text,
      options: {
        fontSize: 15,
        fontFace: theme.fontFamily,
        color: "333333",
        bullet: { code: "2022" as any },
        paraSpaceAfter: 6,
      },
    }));

    slide.addText(leftBullets as any, {
      x: MARGIN,
      y: 1.5,
      w: 5.8,
      h: 5.5,
      valign: "top",
    });
  }

  // Vertical divider
  slide.addShape("rect" as any, {
    x: 6.6,
    y: 1.6,
    w: 0.03,
    h: 5.0,
    fill: { color: "CCCCCC" },
  });

  // Right column
  if (rightContent.length > 0) {
    const rightBullets = rightContent.map((text) => ({
      text,
      options: {
        fontSize: 15,
        fontFace: theme.fontFamily,
        color: "333333",
        bullet: { code: "2022" as any },
        paraSpaceAfter: 6,
      },
    }));

    slide.addText(rightBullets as any, {
      x: 6.9,
      y: 1.5,
      w: 5.8,
      h: 5.5,
      valign: "top",
    });
  }
}

function renderImageFocusSlide(
  slide: PptxGenJS.Slide,
  def: SlideDefinition,
  theme: Theme
) {
  slide.background = { fill: "111111" };

  // Background image (full bleed)
  if (def.imageUrl) {
    try {
      slide.addImage({
        path: def.imageUrl,
        x: 0,
        y: 0,
        w: 13.33,
        h: 7.5,
      });
      // Dark overlay for text readability
      slide.addShape("rect" as any, {
        x: 0,
        y: 0,
        w: 13.33,
        h: 7.5,
        fill: { color: "000000", transparency: 50 },
      });
    } catch {
      // Fallback to solid dark bg
    }
  }

  // Title at bottom
  slide.addText(def.title, {
    x: 1,
    y: 5.0,
    w: 11.33,
    h: 1.0,
    fontSize: 30,
    fontFace: theme.fontFamily,
    color: "FFFFFF",
    bold: true,
    align: "left",
    valign: "bottom",
  });

  if (def.subtitle) {
    slide.addText(def.subtitle, {
      x: 1,
      y: 6.0,
      w: 11.33,
      h: 0.7,
      fontSize: 16,
      fontFace: theme.fontFamily,
      color: "CCCCCC",
      align: "left",
    });
  }
}

function renderQuoteSlide(
  slide: PptxGenJS.Slide,
  def: SlideDefinition,
  theme: Theme
) {
  slide.background = {
    fill: darkenColor(theme.primaryColor, 0.15),
  };

  const quoteText = def.quoteText || def.content?.[0] || def.title;
  const attribution = def.quoteAttribution || def.subtitle || "";

  // Large open-quote mark
  slide.addText("\u201C", {
    x: 1,
    y: 0.8,
    w: 2,
    h: 2,
    fontSize: 120,
    fontFace: "Georgia",
    color: cleanColor(theme.accentColor),
    bold: true,
  });

  // Quote text
  slide.addText(quoteText, {
    x: 1.5,
    y: 2.2,
    w: 10.33,
    h: 3.0,
    fontSize: 24,
    fontFace: theme.fontFamily,
    color: "FFFFFF",
    italic: true,
    align: "center",
    valign: "middle",
  });

  // Attribution
  if (attribution) {
    slide.addText(`\u2014 ${attribution}`, {
      x: 2,
      y: 5.5,
      w: 9.33,
      h: 0.8,
      fontSize: 16,
      fontFace: theme.fontFamily,
      color: "CCCCCC",
      align: "center",
    });
  }
}

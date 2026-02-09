/**
 * Google Slides API Configuration and Helpers
 *
 * Wraps the Google Slides and Drive APIs for creating presentations,
 * inserting slides, adding text/images, and sharing.
 * Reuses shared OAuth token storage from google-calendar.ts.
 *
 * Key design decisions:
 * - Images are inserted SEPARATELY from text to prevent batch failures
 * - Each image insertion retries with Drive upload fallback
 * - Rich styling (backgrounds, text colors, accent shapes) is applied per-slide
 * - Color themes provide coordinated professional palettes
 */

export {
  getTokens,
  storeTokens,
  removeTokens,
  getValidAccessToken,
  isTokenExpired,
  type GoogleTokens,
} from "./google-calendar";

import { getTokens, isTokenExpired } from "./google-calendar";

// Google Slides API base URL
const SLIDES_API_BASE = "https://slides.googleapis.com/v1";
// Google Drive API (for sharing / image upload fallback)
const DRIVE_API_BASE = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_API_BASE_META = "https://www.googleapis.com/drive/v3";

// Slide dimensions in PT (10" × 7.5" at 72 DPI)
const SLIDE_WIDTH = 720;
const SLIDE_HEIGHT = 405;

// ── Types ─────────────────────────────────────────────────────────

export interface RGBColor {
  red: number;
  green: number;
  blue: number;
}

export interface SlideTheme {
  name: string;
  titleBg: RGBColor;
  sectionBg: RGBColor;
  contentBg: RGBColor;
  closingBg: RGBColor;
  accentColor: RGBColor;
  accentColor2: RGBColor;
  titleTextColor: RGBColor;
  sectionTextColor: RGBColor;
  contentTitleColor: RGBColor;
  contentBodyColor: RGBColor;
  closingTextColor: RGBColor;
}

export interface SlideContent {
  title: string;
  bullets?: string[];
  speakerNotes?: string;
  imageUrl?: string;
  imageAlt?: string;
  layout: "TITLE" | "SECTION_HEADER" | "TITLE_AND_BODY" | "TITLE_AND_TWO_COLUMNS" | "BLANK";
}

export interface PresentationOutline {
  title: string;
  subtitle?: string;
  slides: SlideContent[];
  theme?: string; // Theme name key
}

export interface CreatedPresentation {
  presentationId: string;
  title: string;
  slideCount: number;
  url: string;
  slides: { objectId: string; title: string }[];
  themeName: string;
  imageAttemptedCount: number;
  imageInsertedCount: number;
  imageFailures: { slideIndex: number; error: string }[];
}

// ── Color Themes ──────────────────────────────────────────────────

function hexToRgb(hex: string): RGBColor {
  const h = hex.replace("#", "");
  return {
    red: parseInt(h.substring(0, 2), 16) / 255,
    green: parseInt(h.substring(2, 4), 16) / 255,
    blue: parseInt(h.substring(4, 6), 16) / 255,
  };
}

export const SLIDE_THEMES: Record<string, SlideTheme> = {
  OCEAN: {
    name: "Ocean",
    titleBg: hexToRgb("#0D1B2A"),
    sectionBg: hexToRgb("#1B3A5C"),
    contentBg: hexToRgb("#F0F4F8"),
    closingBg: hexToRgb("#0D1B2A"),
    accentColor: hexToRgb("#00B4D8"),
    accentColor2: hexToRgb("#48CAE4"),
    titleTextColor: hexToRgb("#FFFFFF"),
    sectionTextColor: hexToRgb("#FFFFFF"),
    contentTitleColor: hexToRgb("#0D1B2A"),
    contentBodyColor: hexToRgb("#415A77"),
    closingTextColor: hexToRgb("#48CAE4"),
  },
  SUNSET: {
    name: "Sunset",
    titleBg: hexToRgb("#1A1A2E"),
    sectionBg: hexToRgb("#16213E"),
    contentBg: hexToRgb("#FFF8F0"),
    closingBg: hexToRgb("#1A1A2E"),
    accentColor: hexToRgb("#E94560"),
    accentColor2: hexToRgb("#FF6B35"),
    titleTextColor: hexToRgb("#FFFFFF"),
    sectionTextColor: hexToRgb("#FFFFFF"),
    contentTitleColor: hexToRgb("#1A1A2E"),
    contentBodyColor: hexToRgb("#533747"),
    closingTextColor: hexToRgb("#E94560"),
  },
  FOREST: {
    name: "Forest",
    titleBg: hexToRgb("#1B4332"),
    sectionBg: hexToRgb("#2D6A4F"),
    contentBg: hexToRgb("#F1FAEE"),
    closingBg: hexToRgb("#1B4332"),
    accentColor: hexToRgb("#52B788"),
    accentColor2: hexToRgb("#95D5B2"),
    titleTextColor: hexToRgb("#FFFFFF"),
    sectionTextColor: hexToRgb("#D8F3DC"),
    contentTitleColor: hexToRgb("#1B4332"),
    contentBodyColor: hexToRgb("#40916C"),
    closingTextColor: hexToRgb("#95D5B2"),
  },
  ROYAL: {
    name: "Royal",
    titleBg: hexToRgb("#2D1B69"),
    sectionBg: hexToRgb("#44318D"),
    contentBg: hexToRgb("#F8F0FF"),
    closingBg: hexToRgb("#2D1B69"),
    accentColor: hexToRgb("#E0AAFF"),
    accentColor2: hexToRgb("#C77DFF"),
    titleTextColor: hexToRgb("#FFFFFF"),
    sectionTextColor: hexToRgb("#E0AAFF"),
    contentTitleColor: hexToRgb("#2D1B69"),
    contentBodyColor: hexToRgb("#5A189A"),
    closingTextColor: hexToRgb("#C77DFF"),
  },
  MODERN: {
    name: "Modern Dark",
    titleBg: hexToRgb("#0F0F0F"),
    sectionBg: hexToRgb("#1A1A1A"),
    contentBg: hexToRgb("#FAFAFA"),
    closingBg: hexToRgb("#0F0F0F"),
    accentColor: hexToRgb("#6C63FF"),
    accentColor2: hexToRgb("#FF6584"),
    titleTextColor: hexToRgb("#FFFFFF"),
    sectionTextColor: hexToRgb("#E0E0E0"),
    contentTitleColor: hexToRgb("#1A1A1A"),
    contentBodyColor: hexToRgb("#4A4A4A"),
    closingTextColor: hexToRgb("#6C63FF"),
  },
  CORAL: {
    name: "Coral",
    titleBg: hexToRgb("#2B2D42"),
    sectionBg: hexToRgb("#3D405B"),
    contentBg: hexToRgb("#FFF1E6"),
    closingBg: hexToRgb("#2B2D42"),
    accentColor: hexToRgb("#EF233C"),
    accentColor2: hexToRgb("#F77F00"),
    titleTextColor: hexToRgb("#FFFFFF"),
    sectionTextColor: hexToRgb("#EDF2F4"),
    contentTitleColor: hexToRgb("#2B2D42"),
    contentBodyColor: hexToRgb("#8D99AE"),
    closingTextColor: hexToRgb("#EF233C"),
  },
  GOLDEN: {
    name: "Golden",
    titleBg: hexToRgb("#14213D"),
    sectionBg: hexToRgb("#1D3557"),
    contentBg: hexToRgb("#FFFCF2"),
    closingBg: hexToRgb("#14213D"),
    accentColor: hexToRgb("#FCA311"),
    accentColor2: hexToRgb("#E5E5E5"),
    titleTextColor: hexToRgb("#FFFFFF"),
    sectionTextColor: hexToRgb("#FCA311"),
    contentTitleColor: hexToRgb("#14213D"),
    contentBodyColor: hexToRgb("#403D39"),
    closingTextColor: hexToRgb("#FCA311"),
  },
  EMERALD: {
    name: "Emerald",
    titleBg: hexToRgb("#064E3B"),
    sectionBg: hexToRgb("#065F46"),
    contentBg: hexToRgb("#ECFDF5"),
    closingBg: hexToRgb("#064E3B"),
    accentColor: hexToRgb("#10B981"),
    accentColor2: hexToRgb("#34D399"),
    titleTextColor: hexToRgb("#FFFFFF"),
    sectionTextColor: hexToRgb("#A7F3D0"),
    contentTitleColor: hexToRgb("#064E3B"),
    contentBodyColor: hexToRgb("#047857"),
    closingTextColor: hexToRgb("#34D399"),
  },
};

export function getTheme(name?: string): SlideTheme {
  if (name && SLIDE_THEMES[name.toUpperCase()]) {
    return SLIDE_THEMES[name.toUpperCase()];
  }
  // Random theme if not specified
  const keys = Object.keys(SLIDE_THEMES);
  return SLIDE_THEMES[keys[Math.floor(Math.random() * keys.length)]];
}

// ── Token helpers ─────────────────────────────────────────────────

export function hasSlidesScopes(scopes?: string): boolean {
  if (!scopes) return false;
  return scopes.includes("presentations");
}

export function hasValidTokens(userId: string): boolean {
  const tokens = getTokens(userId);
  if (!tokens) return false;
  if (!tokens.access_token) return false;
  if (isTokenExpired(tokens)) {
    return !!tokens.refresh_token;
  }
  return true;
}

// ── Low-level API helpers ─────────────────────────────────────────

async function slidesRequest<T>(
  accessToken: string,
  endpoint: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: unknown
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const opts: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };
    if (body && method !== "GET") {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${SLIDES_API_BASE}${endpoint}`, opts);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.error?.message || `Slides API ${res.status}: ${res.statusText}`,
      };
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Upload an image from a URL to Google Drive (fallback when direct URL insertion fails).
 */
export async function uploadImageToDrive(
  accessToken: string,
  imageUrl: string,
  fileName: string
): Promise<{ success: boolean; fileId?: string; webContentLink?: string; error?: string }> {
  try {
    // Download the image
    const imgRes = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Agent0-SlideBuilder/1.0",
        Accept: "image/*",
      },
    });
    if (!imgRes.ok) return { success: false, error: `Failed to download image: ${imgRes.statusText}` };
    const imgBlob = await imgRes.blob();

    // Multipart upload to Drive
    const metadata = JSON.stringify({
      name: fileName,
      mimeType: imgBlob.type || "image/jpeg",
    });

    const form = new FormData();
    form.append("metadata", new Blob([metadata], { type: "application/json" }));
    form.append("file", imgBlob);

    const uploadRes = await fetch(`${DRIVE_API_BASE}/files?uploadType=multipart&fields=id,webContentLink`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => "");
      return { success: false, error: `Drive upload failed (${uploadRes.status}): ${errText}` };
    }

    const file = await uploadRes.json();

    // Make the file publicly readable so Slides can access it
    const permRes = await fetch(`${DRIVE_API_BASE_META}/files/${file.id}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });

    if (!permRes.ok) {
      const errText = await permRes.text().catch(() => "");
      return {
        success: false,
        error: `Drive permission failed (${permRes.status}): ${errText || permRes.statusText}`,
      };
    }

    return {
      success: true,
      fileId: file.id,
      webContentLink: `https://drive.google.com/uc?id=${file.id}`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Drive upload error" };
  }
}

// ── Styling Helpers ───────────────────────────────────────────────

function makeRgbColor(c: RGBColor) {
  return { rgbColor: { red: c.red, green: c.green, blue: c.blue } };
}

function makeOpaqueColor(c: RGBColor) {
  return { opaqueColor: makeRgbColor(c) };
}

/** Set a slide's background to a solid color */
function bgRequest(slideId: string, color: RGBColor): any {
  return {
    updatePageProperties: {
      objectId: slideId,
      pageProperties: {
        pageBackgroundFill: {
          solidFill: { color: makeRgbColor(color) },
        },
      },
      fields: "pageBackgroundFill.solidFill.color",
    },
  };
}

/** Style text in a placeholder */
function textStyleRequest(
  objectId: string,
  opts: {
    color?: RGBColor;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    fontFamily?: string;
  }
): any {
  const style: any = {};
  const fields: string[] = [];

  if (opts.color) {
    style.foregroundColor = makeOpaqueColor(opts.color);
    fields.push("foregroundColor");
  }
  if (opts.fontSize) {
    style.fontSize = { magnitude: opts.fontSize, unit: "PT" };
    fields.push("fontSize");
  }
  if (opts.bold !== undefined) {
    style.bold = opts.bold;
    fields.push("bold");
  }
  if (opts.italic !== undefined) {
    style.italic = opts.italic;
    fields.push("italic");
  }
  if (opts.fontFamily) {
    style.fontFamily = opts.fontFamily;
    fields.push("fontFamily");
  }

  return {
    updateTextStyle: {
      objectId,
      style,
      textRange: { type: "ALL" },
      fields: fields.join(","),
    },
  };
}

/** Create a decorative accent bar (rectangle shape) */
function accentBarRequest(
  slideId: string,
  barId: string,
  color: RGBColor,
  x: number,
  y: number,
  w: number,
  h: number
): any[] {
  return [
    {
      createShape: {
        objectId: barId,
        shapeType: "RECTANGLE",
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: w, unit: "PT" },
            height: { magnitude: h, unit: "PT" },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: x,
            translateY: y,
            unit: "PT",
          },
        },
      },
    },
    {
      updateShapeProperties: {
        objectId: barId,
        shapeProperties: {
          shapeBackgroundFill: {
            solidFill: { color: makeRgbColor(color) },
          },
          outline: {
            outlineFill: { solidFill: { color: makeRgbColor(color) } },
            weight: { magnitude: 0, unit: "PT" },
          },
        },
        fields: "shapeBackgroundFill,outline",
      },
    },
  ];
}

/** Create a decorative circle shape */
function decorCircleRequest(
  slideId: string,
  circleId: string,
  color: RGBColor,
  x: number,
  y: number,
  size: number,
  alpha: number = 0.3
): any[] {
  return [
    {
      createShape: {
        objectId: circleId,
        shapeType: "ELLIPSE",
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: size, unit: "PT" },
            height: { magnitude: size, unit: "PT" },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: x,
            translateY: y,
            unit: "PT",
          },
        },
      },
    },
    {
      updateShapeProperties: {
        objectId: circleId,
        shapeProperties: {
          shapeBackgroundFill: {
            solidFill: {
              color: makeRgbColor(color),
              alpha,
            },
          },
          outline: {
            outlineFill: { solidFill: { color: makeRgbColor(color) } },
            weight: { magnitude: 0, unit: "PT" },
          },
        },
        fields: "shapeBackgroundFill,outline",
      },
    },
  ];
}

/** Create a text box for custom content layout */
function contentTextBoxRequest(
  slideId: string,
  objectId: string,
  x: number,
  y: number,
  w: number,
  h: number
): any {
  return {
    createShape: {
      objectId,
      shapeType: "TEXT_BOX",
      elementProperties: {
        pageObjectId: slideId,
        size: {
          width: { magnitude: w, unit: "PT" },
          height: { magnitude: h, unit: "PT" },
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: x,
          translateY: y,
          unit: "PT",
        },
      },
    },
  };
}

// ── High-level operations ─────────────────────────────────────────

/**
 * Create a new empty presentation and return its ID.
 */
export async function createPresentation(
  accessToken: string,
  title: string
): Promise<{ success: boolean; presentationId?: string; error?: string }> {
  const result = await slidesRequest<any>(accessToken, "/presentations", "POST", { title });
  if (!result.success) return { success: false, error: result.error };
  return { success: true, presentationId: result.data.presentationId };
}

/**
 * Build a full presentation from an outline with rich styling and reliable image insertion.
 *
 * LAYOUT RULES (enforced for visual clarity):
 * - Text and images are NEVER placed in overlapping zones
 * - When image present: text constrained to left ~48%, image on right ~42%, min 20pt gap
 * - When no image: text uses full-width default layout placeholders
 * - Max 6 bullet points per slide for readability
 * - Consistent margins: 40pt left/right, 20pt top/bottom minimum
 * - Images never exceed ~42% of slide width on content slides
 * - Section/closing slides use right-side images (NOT full-bleed backgrounds)
 *
 * Architecture:
 * 1. Create presentation
 * 2. Create all slides (batch)
 * 3. Fetch presentation → get actual slide/placeholder IDs
 * 4. Insert text content (batch) — this MUST succeed independently of images
 * 5. Apply styling: backgrounds, text colors, accent shapes (batch)
 * 6. Insert images ONE BY ONE with Drive upload fallback
 */
export async function buildPresentation(
  accessToken: string,
  outline: PresentationOutline
): Promise<{ success: boolean; data?: CreatedPresentation; error?: string }> {
  const theme = getTheme(outline.theme);
  const ts = Date.now();

  // 1. Create the presentation
  const created = await createPresentation(accessToken, outline.title);
  if (!created.success || !created.presentationId) {
    return { success: false, error: created.error || "Failed to create presentation" };
  }

  const presentationId = created.presentationId;

  // 2. Build slide creation requests
  const createRequests: any[] = [];
  const slideObjectIds: string[] = [];

  for (let i = 0; i < outline.slides.length; i++) {
    const slide = outline.slides[i];
    const objectId = `slide_${i}_${ts}`;
    slideObjectIds.push(objectId);

    if (i === 0) {
      // The presentation already has one blank slide. We'll update it later.
      continue;
    }

    const layoutMapping: Record<string, string> = {
      TITLE: "TITLE",
      SECTION_HEADER: "SECTION_HEADER",
      TITLE_AND_BODY: "TITLE_AND_BODY",
      TITLE_AND_TWO_COLUMNS: "TITLE_AND_TWO_COLUMNS",
      BLANK: "BLANK",
    };

    createRequests.push({
      createSlide: {
        objectId,
        insertionIndex: i,
        slideLayoutReference: {
          predefinedLayout: layoutMapping[slide.layout] || "BLANK",
        },
      },
    });
  }

  // Execute slide creation
  if (createRequests.length > 0) {
    const batchRes = await slidesRequest<any>(
      accessToken,
      `/presentations/${presentationId}:batchUpdate`,
      "POST",
      { requests: createRequests }
    );
    if (!batchRes.success) {
      return { success: false, error: `Failed to add slides: ${batchRes.error}` };
    }
  }

  // 3. Fetch the presentation to get actual slide/placeholder IDs
  const presentationRes = await slidesRequest<any>(
    accessToken,
    `/presentations/${presentationId}`
  );
  if (!presentationRes.success || !presentationRes.data) {
    return { success: false, error: "Failed to fetch created presentation" };
  }

  const actualSlides = presentationRes.data.slides || [];

  // 4. Build and execute TEXT content requests (separate from images!)
  const textRequests: any[] = [];
  const slideInfo: { objectId: string; title: string }[] = [];

  // Track placeholder IDs for styling later
  const placeholderMap: {
    slideId: string;
    titleId?: string;
    bodyId?: string;
    subtitleId?: string;
    slideIndex: number;
    layout: string;
  }[] = [];

  for (let i = 0; i < Math.min(outline.slides.length, actualSlides.length); i++) {
    const slideData = outline.slides[i];
    const actualSlide = actualSlides[i];
    const slideId = actualSlide.objectId;
    slideInfo.push({ objectId: slideId, title: slideData.title });

    const isTitle = i === 0;
    const isClosing = i === outline.slides.length - 1;
    const isSection = slideData.layout === "SECTION_HEADER";
    const hasImage = !!slideData.imageUrl;

    // Find placeholder elements on the slide
    const elements = actualSlide.pageElements || [];
    let titlePlaceholder: any = null;
    let bodyPlaceholder: any = null;
    let subtitlePlaceholder: any = null;

    for (const el of elements) {
      const ph = el.shape?.placeholder;
      if (!ph) continue;
      if (ph.type === "TITLE" || ph.type === "CENTERED_TITLE") {
        titlePlaceholder = el;
      } else if (ph.type === "BODY" || ph.type === "SUBTITLE") {
        if (ph.type === "SUBTITLE") subtitlePlaceholder = el;
        else bodyPlaceholder = el;
      }
    }

    if (!bodyPlaceholder && subtitlePlaceholder) {
      bodyPlaceholder = subtitlePlaceholder;
    }

    // ── Safe layout zones ────────────────────────────────────
    // When an image is present: text on LEFT (max ~48%), image on RIGHT (max ~42%)
    // This guarantees text NEVER overlaps images on any slide type.
    // When no image: text uses full-width default placeholders.
    let customTitleId: string | undefined;
    let customBodyId: string | undefined;
    let customSubtitleId: string | undefined;

    if (hasImage) {
      // === IMAGE PRESENT: Create left-aligned custom text boxes ===
      // All text containers are constrained to the left half of the slide
      // to maintain a clear separation from the right-side image.
      const titleBoxId = `title_box_${i}_${ts}`;
      let titleX: number, titleY: number, titleW: number, titleH: number;

      if (isTitle) {
        // Title slide: vertically centered title on left
        titleX = 50; titleY = Math.round(SLIDE_HEIGHT * 0.28);
        titleW = 340; titleH = 80;
      } else if (isSection || isClosing) {
        // Section/Closing: prominent heading on left
        titleX = 50; titleY = Math.round(SLIDE_HEIGHT * 0.20);
        titleW = 340; titleH = 80;
      } else {
        // Content slide: heading at top-left
        titleX = 40; titleY = 20;
        titleW = 320; titleH = 65;
      }

      textRequests.push(
        contentTextBoxRequest(slideId, titleBoxId, titleX, titleY, titleW, titleH)
      );
      customTitleId = titleBoxId;

      // Create left-aligned body text box for bullet content
      if (slideData.bullets && slideData.bullets.length > 0) {
        const bodyBoxId = `content_box_${i}_${ts}`;
        let bodyX: number, bodyY: number, bodyW: number, bodyH: number;

        if (isTitle) {
          // Subtitle area below title
          bodyX = 50; bodyY = Math.round(SLIDE_HEIGHT * 0.28) + 90;
          bodyW = 330; bodyH = 50;
        } else if (isSection || isClosing) {
          // Body area below section heading
          bodyX = 50; bodyY = Math.round(SLIDE_HEIGHT * 0.20) + 90;
          bodyW = 320; bodyH = SLIDE_HEIGHT - 220;
        } else {
          // Content body below heading, with consistent margins
          bodyX = 40; bodyY = 100;
          bodyW = 320; bodyH = SLIDE_HEIGHT - 150;
        }

        textRequests.push(
          contentTextBoxRequest(slideId, bodyBoxId, bodyX, bodyY, bodyW, bodyH)
        );
        customBodyId = bodyBoxId;
      }

      // Custom subtitle box for title slide (when no bullets)
      if (isTitle && outline.subtitle && !slideData.bullets) {
        const subtitleBoxId = `subtitle_box_${i}_${ts}`;
        textRequests.push(
          contentTextBoxRequest(
            slideId, subtitleBoxId,
            50, Math.round(SLIDE_HEIGHT * 0.28) + 90,
            330, 50
          )
        );
        customSubtitleId = subtitleBoxId;
      }
    } else {
      // === NO IMAGE: use default placeholders, full-width text ===
      // Only create custom body if no placeholder exists on this layout
      if (slideData.bullets && slideData.bullets.length > 0 && !bodyPlaceholder) {
        const bodyBoxId = `content_box_${i}_${ts}`;
        textRequests.push(
          contentTextBoxRequest(slideId, bodyBoxId, 40, 105, SLIDE_WIDTH - 80, SLIDE_HEIGHT - 155)
        );
        customBodyId = bodyBoxId;
      }
    }

    placeholderMap.push({
      slideId,
      titleId: customTitleId || titlePlaceholder?.objectId,
      bodyId: customBodyId || bodyPlaceholder?.objectId,
      subtitleId: customSubtitleId || subtitlePlaceholder?.objectId,
      slideIndex: i,
      layout: slideData.layout,
    });

    // Insert title text into effective target (custom box or layout placeholder)
    const titleTargetId = customTitleId || titlePlaceholder?.objectId;
    if (titleTargetId) {
      textRequests.push({
        insertText: {
          objectId: titleTargetId,
          text: slideData.title,
          insertionIndex: 0,
        },
      });
    }

    // Insert bullet text into body
    const bodyTargetId = customBodyId || bodyPlaceholder?.objectId;
    if (bodyTargetId && slideData.bullets && slideData.bullets.length > 0) {
      // Limit to 6 bullets max per slide for readability
      const clampedBullets = slideData.bullets.slice(0, 6);
      const bulletText = clampedBullets.join("\n");
      textRequests.push({
        insertText: {
          objectId: bodyTargetId,
          text: bulletText,
          insertionIndex: 0,
        },
      });
    }

    // Insert subtitle on title slide
    if (isTitle && outline.subtitle && !slideData.bullets) {
      const subtitleTargetId = customSubtitleId || bodyPlaceholder?.objectId;
      if (subtitleTargetId) {
        textRequests.push({
          insertText: {
            objectId: subtitleTargetId,
            text: outline.subtitle,
            insertionIndex: 0,
          },
        });
      }
    }

    // Speaker notes
    if (slideData.speakerNotes) {
      const notesPage = actualSlide.slideProperties?.notesPage;
      if (notesPage?.pageElements) {
        const notesBody = notesPage.pageElements.find(
          (el: any) => el.shape?.placeholder?.type === "BODY"
        );
        if (notesBody) {
          textRequests.push({
            insertText: {
              objectId: notesBody.objectId,
              text: slideData.speakerNotes,
              insertionIndex: 0,
            },
          });
        }
      }
    }
  }

  // Execute text inserts
  if (textRequests.length > 0) {
    const textRes = await slidesRequest<any>(
      accessToken,
      `/presentations/${presentationId}:batchUpdate`,
      "POST",
      { requests: textRequests }
    );
    if (!textRes.success) {
      console.error("Warning: text inserts failed:", textRes.error);
    }
  }

  // 5. Apply STYLING: backgrounds, text formatting, accent shapes
  const styleRequests: any[] = [];

  for (const ph of placeholderMap) {
    const isTitle = ph.slideIndex === 0;
    const isClosing = ph.slideIndex === outline.slides.length - 1;
    const isSection = outline.slides[ph.slideIndex]?.layout === "SECTION_HEADER";

    // Background color
    let bgColor: RGBColor;
    if (isTitle) bgColor = theme.titleBg;
    else if (isClosing) bgColor = theme.closingBg;
    else if (isSection) bgColor = theme.sectionBg;
    else bgColor = theme.contentBg;

    styleRequests.push(bgRequest(ph.slideId, bgColor));

    // Title text styling
    if (ph.titleId) {
      let titleColor: RGBColor;
      let titleSize: number;
      let titleBold = true;

      if (isTitle) {
        titleColor = theme.titleTextColor;
        titleSize = 40;
      } else if (isClosing) {
        titleColor = theme.closingTextColor;
        titleSize = 44;
      } else if (isSection) {
        titleColor = theme.sectionTextColor;
        titleSize = 36;
      } else {
        titleColor = theme.contentTitleColor;
        titleSize = 28;
      }

      styleRequests.push(
        textStyleRequest(ph.titleId, {
          color: titleColor,
          fontSize: titleSize,
          bold: titleBold,
          fontFamily: "Montserrat",
        })
      );
    }

    // Body text styling
    if (ph.bodyId) {
      let bodyColor: RGBColor;
      let bodySize: number;

      if (isTitle) {
        bodyColor = theme.accentColor;
        bodySize = 18;
      } else if (isClosing) {
        bodyColor = theme.closingTextColor;
        bodySize = 18;
      } else if (isSection) {
        bodyColor = theme.sectionTextColor;
        bodySize = 16;
      } else {
        bodyColor = theme.contentBodyColor;
        bodySize = 14;
      }

      styleRequests.push(
        textStyleRequest(ph.bodyId, {
          color: bodyColor,
          fontSize: bodySize,
          fontFamily: "Open Sans",
        })
      );
    }

    // Accent decorative elements
    const slideData = outline.slides[ph.slideIndex];

    if (isTitle) {
      // Title slide: horizontal accent bar at bottom
      const barId = `accent_bar_${ph.slideIndex}_${ts}`;
      styleRequests.push(
        ...accentBarRequest(ph.slideId, barId, theme.accentColor, 60, SLIDE_HEIGHT - 50, SLIDE_WIDTH - 120, 5)
      );
      // Decorative circle top-right
      const circId = `decor_circ_${ph.slideIndex}_${ts}`;
      styleRequests.push(
        ...decorCircleRequest(ph.slideId, circId, theme.accentColor, SLIDE_WIDTH - 120, -30, 100, 0.15)
      );
    } else if (isClosing) {
      // Closing slide: accent bar top
      const barId = `accent_bar_${ph.slideIndex}_${ts}`;
      styleRequests.push(
        ...accentBarRequest(ph.slideId, barId, theme.accentColor, 60, 40, SLIDE_WIDTH - 120, 5)
      );
    } else if (isSection) {
      // Section slides: vertical accent bar on left + small circle
      const barId = `accent_bar_${ph.slideIndex}_${ts}`;
      styleRequests.push(
        ...accentBarRequest(ph.slideId, barId, theme.accentColor, 30, 80, 6, SLIDE_HEIGHT - 160)
      );
    } else {
      // Content slides: thin accent bar on left side
      const barId = `accent_bar_${ph.slideIndex}_${ts}`;
      styleRequests.push(
        ...accentBarRequest(ph.slideId, barId, theme.accentColor, 0, 0, 8, SLIDE_HEIGHT)
      );

      // Small accent dot top-right corner
      if (ph.slideIndex % 2 === 0) {
        const dotId = `decor_dot_${ph.slideIndex}_${ts}`;
        styleRequests.push(
          ...decorCircleRequest(ph.slideId, dotId, theme.accentColor2, SLIDE_WIDTH - 50, 15, 20, 0.25)
        );
      }
    }

    // Add slide number text box for content slides (not title/closing)
    if (!isTitle && !isClosing) {
      const numId = `slide_num_${ph.slideIndex}_${ts}`;
      styleRequests.push({
        createShape: {
          objectId: numId,
          shapeType: "TEXT_BOX",
          elementProperties: {
            pageObjectId: ph.slideId,
            size: {
              width: { magnitude: 50, unit: "PT" },
              height: { magnitude: 20, unit: "PT" },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: SLIDE_WIDTH - 60,
              translateY: SLIDE_HEIGHT - 25,
              unit: "PT",
            },
          },
        },
      });
      styleRequests.push({
        insertText: {
          objectId: numId,
          text: String(ph.slideIndex + 1),
          insertionIndex: 0,
        },
      });
      styleRequests.push(
        textStyleRequest(numId, {
          color: isSection ? theme.sectionTextColor : theme.contentBodyColor,
          fontSize: 10,
          fontFamily: "Montserrat",
        })
      );
    }
  }

  // Execute styling
  if (styleRequests.length > 0) {
    const styleRes = await slidesRequest<any>(
      accessToken,
      `/presentations/${presentationId}:batchUpdate`,
      "POST",
      { requests: styleRequests }
    );
    if (!styleRes.success) {
      console.error("Warning: styling failed:", styleRes.error);
      // Non-fatal: presentation still has content
    }
  }

  // 6. Insert images ONE BY ONE with retry + Drive fallback
  // This is deliberately NOT batched — if one image fails, others still succeed
  const imageResults: { slideIndex: number; success: boolean; error?: string }[] = [];

  for (let i = 0; i < Math.min(outline.slides.length, actualSlides.length); i++) {
    const slideData = outline.slides[i];
    if (!slideData.imageUrl) continue;

    if (!/^https?:\/\//.test(slideData.imageUrl)) {
      imageResults.push({
        slideIndex: i,
        success: false,
        error: "Invalid image URL (must start with http or https)",
      });
      console.warn("Image insert skipped: invalid URL", { slideIndex: i });
      continue;
    }

    if (slideData.imageUrl.length > 2000) {
      imageResults.push({
        slideIndex: i,
        success: false,
        error: `Image URL too long (${slideData.imageUrl.length} chars)`,
      });
      console.warn("Image insert skipped: URL too long", {
        slideIndex: i,
        length: slideData.imageUrl.length,
      });
      continue;
    }

    const slideId = actualSlides[i].objectId;
    const isTitle = i === 0;
    const isClosing = i === outline.slides.length - 1;
    const isSection = slideData.layout === "SECTION_HEADER";

    // ── Image position: ALWAYS on right side ──────────────────
    // Text is on the left (max ~48% width), image on the right (max ~42% width)
    // with a minimum 20pt gap between text and image zones.
    // Images NEVER span full slide width to prevent text-over-image overlap.
    let imgX: number, imgY: number, imgW: number, imgH: number;

    if (isTitle) {
      // Title slide: image on right ~39%, text safe on left ~47%
      imgX = 410;
      imgY = 20;
      imgW = 280;
      imgH = SLIDE_HEIGHT - 40;
    } else if (isSection) {
      // Section: image on right, text on left
      imgX = 410;
      imgY = 40;
      imgW = 280;
      imgH = SLIDE_HEIGHT - 80;
    } else if (isClosing) {
      // Closing: decorative image on right
      imgX = 410;
      imgY = 50;
      imgW = 280;
      imgH = SLIDE_HEIGHT - 100;
    } else {
      // Content slides: image on right ~42%, 30pt gap from text
      imgX = 390;
      imgY = 50;
      imgW = 300;
      imgH = SLIDE_HEIGHT - 100;
    }

    const result = await insertImageWithFallback(
      accessToken,
      presentationId,
      slideId,
      slideData.imageUrl,
      `slide_${i}_image`,
      imgX,
      imgY,
      imgW,
      imgH,
      true,
      true
    );

    imageResults.push({ slideIndex: i, success: result.success, error: result.error });
    if (!result.success) {
      console.warn("Image insertion failed", {
        slideIndex: i,
        error: result.error,
        length: slideData.imageUrl.length,
      });
    }
  }

  const imageAttemptedCount = imageResults.length;
  const imageInsertedCount = imageResults.filter((r) => r.success).length;
  const imageFailures = imageResults
    .filter((r) => !r.success)
    .map((r) => ({
      slideIndex: r.slideIndex,
      error: r.error || "Image insertion failed",
    }));

  if (imageFailures.length > 0) {
    console.warn(`${imageFailures.length} image(s) failed to insert`);
  }

  return {
    success: true,
    data: {
      presentationId,
      title: outline.title,
      slideCount: actualSlides.length,
      url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
      slides: slideInfo,
      themeName: theme.name,
      imageAttemptedCount,
      imageInsertedCount,
      imageFailures,
    },
  };
}

/**
 * Insert an image into a slide with Drive upload fallback.
 * Tries direct URL first, then uploads to Drive and inserts from there.
 */
async function sendImageToBack(
  accessToken: string,
  presentationId: string,
  imageObjectId: string
): Promise<void> {
  await slidesRequest<any>(
    accessToken,
    `/presentations/${presentationId}:batchUpdate`,
    "POST",
    {
      requests: [
        {
          updatePageElementsZOrder: {
            pageElementObjectIds: [imageObjectId],
            operation: "SEND_TO_BACK",
          },
        },
      ],
    }
  );
}

export async function insertImageWithFallback(
  accessToken: string,
  presentationId: string,
  slideObjectId: string,
  imageUrl: string,
  fileName: string,
  x: number = 350,
  y: number = 120,
  w: number = 300,
  h: number = 200,
  preferDrive: boolean = true,
  sendToBack: boolean = true
): Promise<{ success: boolean; error?: string; objectId?: string }> {
  const makeRequest = (url: string, objectId: string) => ({
    createImage: {
      objectId,
      url,
      elementProperties: {
        pageObjectId: slideObjectId,
        size: {
          width: { magnitude: w, unit: "PT" },
          height: { magnitude: h, unit: "PT" },
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: x,
          translateY: y,
          unit: "PT",
        },
      },
    },
  });

  let lastError: string | undefined;
  const errorParts: string[] = [];

  // Prefer Drive upload for maximum reliability
  if (preferDrive) {
    const upload = await uploadImageToDrive(accessToken, imageUrl, `${fileName}.jpg`);
    if (upload.success && upload.webContentLink) {
      const driveImageObjectId = `img_drive_${fileName}_${Date.now()}`;
      const driveReq = await slidesRequest<any>(
        accessToken,
        `/presentations/${presentationId}:batchUpdate`,
        "POST",
        { requests: [makeRequest(upload.webContentLink, driveImageObjectId)] }
      );
      if (driveReq.success) {
        if (sendToBack) await sendImageToBack(accessToken, presentationId, driveImageObjectId);
        return { success: true, objectId: driveImageObjectId };
      }
      lastError = driveReq.error || "Drive image insertion failed";
      errorParts.push(`Drive insert failed: ${lastError}`);
    } else {
      lastError = upload.error || "Drive upload failed";
      errorParts.push(`Drive upload failed: ${lastError}`);
    }
  }

  // Attempt direct URL insertion as fallback (or primary when preferDrive=false)
  const directImageObjectId = `img_${fileName}_${Date.now()}`;
  const directReq = await slidesRequest<any>(
    accessToken,
    `/presentations/${presentationId}:batchUpdate`,
    "POST",
    { requests: [makeRequest(imageUrl, directImageObjectId)] }
  );

  if (directReq.success) {
    if (sendToBack) await sendImageToBack(accessToken, presentationId, directImageObjectId);
    return { success: true, objectId: directImageObjectId };
  }
  if (directReq.error) {
    errorParts.push(`Direct insert failed: ${directReq.error}`);
  }

  // If we didn't prefer Drive, try Drive as fallback now
  if (!preferDrive) {
    const upload = await uploadImageToDrive(accessToken, imageUrl, `${fileName}.jpg`);
    if (upload.success && upload.webContentLink) {
      const driveImageObjectId = `img_drive_${fileName}_${Date.now()}`;
      const driveReq = await slidesRequest<any>(
        accessToken,
        `/presentations/${presentationId}:batchUpdate`,
        "POST",
        { requests: [makeRequest(upload.webContentLink, driveImageObjectId)] }
      );
      if (driveReq.success) {
        if (sendToBack) await sendImageToBack(accessToken, presentationId, driveImageObjectId);
        return { success: true, objectId: driveImageObjectId };
      }
      lastError = driveReq.error || "Drive image insertion failed";
      errorParts.push(`Drive insert failed: ${lastError}`);
    } else {
      lastError = upload.error || "Drive upload failed";
      errorParts.push(`Drive upload failed: ${lastError}`);
    }
  }

  const errorMessage = errorParts.length > 0
    ? errorParts.join(" | ")
    : directReq.error || lastError || "Image insertion failed";
  return { success: false, error: errorMessage };
}

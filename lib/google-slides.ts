/**
 * Google Slides API Configuration and Helpers
 *
 * Wraps the Google Slides and Drive APIs for creating presentations,
 * inserting slides, adding text/images, and sharing.
 * Reuses shared OAuth token storage from google-calendar.ts.
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

// ── Types ─────────────────────────────────────────────────────────

export interface SlideContent {
  title: string;
  bullets?: string[];
  speakerNotes?: string;
  imageUrl?: string; // Direct URL for image insertion
  imageAlt?: string;
  layout: "TITLE" | "SECTION_HEADER" | "TITLE_AND_BODY" | "TITLE_AND_TWO_COLUMNS" | "BLANK";
}

export interface PresentationOutline {
  title: string;
  subtitle?: string;
  slides: SlideContent[];
  theme?: "LIGHT" | "DARK";
}

export interface CreatedPresentation {
  presentationId: string;
  title: string;
  slideCount: number;
  url: string;
  slides: { objectId: string; title: string }[];
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
    const imgRes = await fetch(imageUrl);
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
    await fetch(`${DRIVE_API_BASE_META}/files/${file.id}/permissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });

    return {
      success: true,
      fileId: file.id,
      webContentLink: `https://drive.google.com/uc?id=${file.id}`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Drive upload error" };
  }
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
 * Build a full presentation from an outline: create file, add slides with text & images.
 */
export async function buildPresentation(
  accessToken: string,
  outline: PresentationOutline
): Promise<{ success: boolean; data?: CreatedPresentation; error?: string }> {
  // 1. Create the presentation
  const created = await createPresentation(accessToken, outline.title);
  if (!created.success || !created.presentationId) {
    return { success: false, error: created.error || "Failed to create presentation" };
  }

  const presentationId = created.presentationId;

  // 2. Build batchUpdate requests
  const requests: any[] = [];
  const slideObjectIds: string[] = [];

  // The first slide (default blank) already exists – we'll update it as the title slide
  // For each additional slide, create a new one
  for (let i = 0; i < outline.slides.length; i++) {
    const slide = outline.slides[i];
    const objectId = `slide_${i}_${Date.now()}`;
    slideObjectIds.push(objectId);

    if (i === 0) {
      // The presentation already has one blank slide. We'll just note the ID later.
      continue;
    }

    // Choose a predefined layout
    const layoutMapping: Record<string, string> = {
      TITLE: "TITLE",
      SECTION_HEADER: "SECTION_HEADER",
      TITLE_AND_BODY: "TITLE_AND_BODY",
      TITLE_AND_TWO_COLUMNS: "TITLE_AND_TWO_COLUMNS",
      BLANK: "BLANK",
    };

    requests.push({
      createSlide: {
        objectId,
        insertionIndex: i,
        slideLayoutReference: {
          predefinedLayout: layoutMapping[slide.layout] || "BLANK",
        },
      },
    });
  }

  // 3. Execute slide creation
  if (requests.length > 0) {
    const batchRes = await slidesRequest<any>(
      accessToken,
      `/presentations/${presentationId}:batchUpdate`,
      "POST",
      { requests }
    );
    if (!batchRes.success) {
      return { success: false, error: `Failed to add slides: ${batchRes.error}` };
    }
  }

  // 4. Fetch the presentation to get actual slide/placeholder IDs
  const presentationRes = await slidesRequest<any>(
    accessToken,
    `/presentations/${presentationId}`
  );
  if (!presentationRes.success || !presentationRes.data) {
    return { success: false, error: "Failed to fetch created presentation" };
  }

  const actualSlides = presentationRes.data.slides || [];

  // 5. Build text insertion + image requests per slide
  const textRequests: any[] = [];
  const slideInfo: { objectId: string; title: string }[] = [];

  for (let i = 0; i < Math.min(outline.slides.length, actualSlides.length); i++) {
    const slideData = outline.slides[i];
    const actualSlide = actualSlides[i];
    const slideId = actualSlide.objectId;
    slideInfo.push({ objectId: slideId, title: slideData.title });

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

    // If no body placeholder found, use subtitle
    if (!bodyPlaceholder && subtitlePlaceholder) {
      bodyPlaceholder = subtitlePlaceholder;
    }

    // Insert title text
    if (titlePlaceholder) {
      textRequests.push({
        insertText: {
          objectId: titlePlaceholder.objectId,
          text: slideData.title,
          insertionIndex: 0,
        },
      });
    }

    // Insert bullet text into body
    if (bodyPlaceholder && slideData.bullets && slideData.bullets.length > 0) {
      const bulletText = slideData.bullets.join("\n");
      textRequests.push({
        insertText: {
          objectId: bodyPlaceholder.objectId,
          text: bulletText,
          insertionIndex: 0,
        },
      });
    }

    // Insert subtitle on title slide
    if (i === 0 && outline.subtitle && bodyPlaceholder) {
      textRequests.push({
        insertText: {
          objectId: bodyPlaceholder.objectId,
          text: outline.subtitle,
          insertionIndex: 0,
        },
      });
    }

    // Insert image if URL is provided
    if (slideData.imageUrl) {
      // First try direct URL insertion
      const imageObjectId = `img_${i}_${Date.now()}`;
      textRequests.push({
        createImage: {
          objectId: imageObjectId,
          url: slideData.imageUrl,
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 300, unit: "PT" },
              height: { magnitude: 200, unit: "PT" },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 350,
              translateY: 120,
              unit: "PT",
            },
          },
        },
      });
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

  // 6. Execute text/image inserts
  if (textRequests.length > 0) {
    const textRes = await slidesRequest<any>(
      accessToken,
      `/presentations/${presentationId}:batchUpdate`,
      "POST",
      { requests: textRequests }
    );
    if (!textRes.success) {
      // Non-fatal: presentation was created, just some content may be missing
      console.error("Warning: some content inserts failed:", textRes.error);
    }
  }

  return {
    success: true,
    data: {
      presentationId,
      title: outline.title,
      slideCount: actualSlides.length,
      url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
      slides: slideInfo,
    },
  };
}

/**
 * Retry image insertion with Drive upload fallback.
 * If direct URL insertion fails in Slides, uploads to Drive first.
 */
export async function insertImageWithFallback(
  accessToken: string,
  presentationId: string,
  slideObjectId: string,
  imageUrl: string,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  // Try direct URL
  const directReq = await slidesRequest<any>(
    accessToken,
    `/presentations/${presentationId}:batchUpdate`,
    "POST",
    {
      requests: [
        {
          createImage: {
            url: imageUrl,
            elementProperties: {
              pageObjectId: slideObjectId,
              size: {
                width: { magnitude: 300, unit: "PT" },
                height: { magnitude: 200, unit: "PT" },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: 350,
                translateY: 120,
                unit: "PT",
              },
            },
          },
        },
      ],
    }
  );

  if (directReq.success) return { success: true };

  // Fallback: upload to Drive then insert the Drive-hosted URL
  const upload = await uploadImageToDrive(accessToken, imageUrl, fileName);
  if (!upload.success || !upload.webContentLink) {
    return { success: false, error: upload.error || "Drive upload failed" };
  }

  const driveReq = await slidesRequest<any>(
    accessToken,
    `/presentations/${presentationId}:batchUpdate`,
    "POST",
    {
      requests: [
        {
          createImage: {
            url: upload.webContentLink,
            elementProperties: {
              pageObjectId: slideObjectId,
              size: {
                width: { magnitude: 300, unit: "PT" },
                height: { magnitude: 200, unit: "PT" },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: 350,
                translateY: 120,
                unit: "PT",
              },
            },
          },
        },
      ],
    }
  );

  return driveReq.success ? { success: true } : { success: false, error: driveReq.error };
}

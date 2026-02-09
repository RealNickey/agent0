/**
 * Unsplash Image API Helper
 *
 * Provides image search via the Unsplash API for use in Google Slides.
 * Requires UNSPLASH_ACCESS_KEY environment variable.
 */

const UNSPLASH_API_BASE = "https://api.unsplash.com";
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || "";

export interface UnsplashImage {
  id: string;
  url: string; // Regular-sized image URL (good for slides)
  thumbUrl: string;
  width: number;
  height: number;
  altDescription: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string; // Link back to Unsplash (for attribution)
}

export interface UnsplashSearchResult {
  images: UnsplashImage[];
  totalResults: number;
  error?: string;
}

/**
 * Search Unsplash for images matching a query.
 * Returns up to `perPage` results (default 3).
 */
export async function searchImages(
  query: string,
  perPage: number = 3,
  orientation: "landscape" | "portrait" | "squarish" = "landscape"
): Promise<UnsplashSearchResult> {
  if (!UNSPLASH_ACCESS_KEY) {
    return {
      images: [],
      totalResults: 0,
      error: "UNSPLASH_ACCESS_KEY is not configured. Add it to your .env file.",
    };
  }

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      orientation,
    });

    const response = await fetch(`${UNSPLASH_API_BASE}/search/photos?${params}`, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        "Accept-Version": "v1",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return {
        images: [],
        totalResults: 0,
        error: `Unsplash API error (${response.status}): ${errorBody || response.statusText}`,
      };
    }

    const data = await response.json();

    const images: UnsplashImage[] = (data.results || []).map((photo: any) => ({
      id: photo.id,
      url: photo.urls?.regular || photo.urls?.full,
      thumbUrl: photo.urls?.thumb || photo.urls?.small,
      width: photo.width,
      height: photo.height,
      altDescription: photo.alt_description || query,
      photographer: photo.user?.name || "Unknown",
      photographerUrl: photo.user?.links?.html || "",
      unsplashUrl: photo.links?.html || "",
    }));

    return {
      images,
      totalResults: data.total || images.length,
    };
  } catch (error) {
    return {
      images: [],
      totalResults: 0,
      error: error instanceof Error ? error.message : "Unknown error fetching images",
    };
  }
}

/**
 * Trigger an Unsplash download event (required by API guidelines).
 * Call this when an image is actually used in a slide.
 */
export async function trackDownload(downloadLocationUrl: string): Promise<void> {
  if (!UNSPLASH_ACCESS_KEY) return;
  try {
    await fetch(downloadLocationUrl, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    });
  } catch {
    // Best-effort tracking, don't fail if it doesn't work
  }
}

/**
 * Build an Unsplash attribution string for a set of images.
 */
export function buildAttributionText(images: UnsplashImage[]): string {
  if (images.length === 0) return "";
  const credits = images
    .map((img) => `Photo by ${img.photographer} on Unsplash`)
    .join(" | ");
  return credits;
}

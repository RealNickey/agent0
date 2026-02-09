/**
 * Unsplash Image API Helper
 *
 * Provides image search via the Unsplash API for use in Google Slides.
 * Requires UNSPLASH_ACCESS_KEY environment variable.
 *
 * Uses the raw URL format with explicit dimensions for maximum
 * compatibility with Google Slides image insertion.
 */

const UNSPLASH_API_BASE = "https://api.unsplash.com";
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || "";

export interface UnsplashImage {
  id: string;
  url: string; // Optimized image URL for slides (raw + dimensions)
  thumbUrl: string;
  fullUrl: string; // Full resolution URL (fallback)
  width: number;
  height: number;
  altDescription: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string; // Link back to Unsplash (for attribution)
  downloadLocation: string; // For triggering download event (Unsplash API requirement)
}

export interface UnsplashSearchResult {
  images: UnsplashImage[];
  totalResults: number;
  error?: string;
}

function buildOptimizedImageUrl(photo: any): string {
  const rawUrl: string = photo.urls?.raw || "";
  const regularUrl: string = photo.urls?.regular || "";
  const fullUrl: string = photo.urls?.full || "";

  if (rawUrl) {
    const separator = rawUrl.includes("?") ? "&" : "?";
    const optimized = `${rawUrl}${separator}w=1200&h=800&fit=crop&q=80&fm=jpg`;
    if (optimized.length <= 2000) return optimized;
  }

  if (regularUrl) {
    if (regularUrl.includes("fm=") || regularUrl.includes("format=")) return regularUrl;
    const separator = regularUrl.includes("?") ? "&" : "?";
    const withFormat = `${regularUrl}${separator}fm=jpg`;
    if (withFormat.length <= 2000) return withFormat;
    return regularUrl;
  }

  return fullUrl || rawUrl;
}

/**
 * Search Unsplash for images matching a query.
 * Returns up to `perPage` results (default 3).
 *
 * Uses the raw URL format with explicit w/h/fit/q parameters
 * for maximum compatibility with Google Slides API image insertion.
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
    // Clean up query - remove special chars that may confuse search
    const cleanQuery = query
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);

    if (!cleanQuery) {
      return { images: [], totalResults: 0, error: "Empty search query" };
    }

    const params = new URLSearchParams({
      query: cleanQuery,
      per_page: String(perPage),
      orientation,
      content_filter: "high",
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

    const images: UnsplashImage[] = (data.results || []).map((photo: any) => {
      const optimizedUrl = buildOptimizedImageUrl(photo);

      return {
        id: photo.id,
        url: optimizedUrl,
        thumbUrl: photo.urls?.thumb || photo.urls?.small,
        fullUrl: photo.urls?.full || photo.urls?.regular,
        width: photo.width,
        height: photo.height,
        altDescription: photo.alt_description || cleanQuery,
        photographer: photo.user?.name || "Unknown",
        photographerUrl: `${photo.user?.links?.html || ""}?utm_source=agent0&utm_medium=referral`,
        unsplashUrl: `${photo.links?.html || ""}?utm_source=agent0&utm_medium=referral`,
        downloadLocation: photo.links?.download_location || "",
      };
    });

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
  if (!UNSPLASH_ACCESS_KEY || !downloadLocationUrl) return;
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

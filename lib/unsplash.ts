/**
 * Unsplash API Client
 *
 * Provides image search functionality using the Unsplash API.
 * Follows Unsplash API guidelines including download tracking.
 */

const UNSPLASH_API_BASE = "https://api.unsplash.com";
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || "";

export interface UnsplashImage {
  id: string;
  url: string;
  thumbUrl: string;
  altDescription: string | null;
  photographer: string;
  downloadUrl: string;
}

/**
 * Search for images on Unsplash
 * @param query - Search query string
 * @param count - Number of images to return (default: 3, max: 30)
 * @returns Array of image results
 */
export async function searchImages(
  query: string,
  count: number = 3
): Promise<UnsplashImage[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn("UNSPLASH_ACCESS_KEY not set — skipping image search");
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(Math.min(count, 30)),
      orientation: "landscape", // Best for presentations
    });

    const response = await fetch(
      `${UNSPLASH_API_BASE}/search/photos?${params}`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        "Unsplash API error:",
        response.status,
        await response.text()
      );
      return [];
    }

    const data = await response.json();

    const images: UnsplashImage[] = (data.results || []).map((photo: any) => ({
      id: photo.id,
      url: photo.urls?.regular || photo.urls?.small,
      thumbUrl: photo.urls?.thumb || photo.urls?.small,
      altDescription: photo.alt_description,
      photographer: photo.user?.name || "Unknown",
      downloadUrl: photo.links?.download_location || "",
    }));

    // Trigger download tracking for each image per Unsplash API guidelines
    for (const img of images) {
      if (img.downloadUrl) {
        triggerDownload(img.downloadUrl).catch(() => {
          // Silently ignore tracking failures
        });
      }
    }

    return images;
  } catch (error) {
    console.error("Unsplash search failed:", error);
    return [];
  }
}

/**
 * Trigger the Unsplash download endpoint for API compliance.
 * This must be called when an image is used (not just previewed).
 */
async function triggerDownload(downloadLocation: string): Promise<void> {
  if (!UNSPLASH_ACCESS_KEY || !downloadLocation) return;

  try {
    await fetch(downloadLocation, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });
  } catch {
    // Silently ignore — tracking is best-effort
  }
}

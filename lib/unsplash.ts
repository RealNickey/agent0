const UNSPLASH_API_BASE = "https://api.unsplash.com";

export interface UnsplashImageResult {
  id: string;
  url: string;
  thumbUrl: string;
  altDescription: string;
  photographer: string;
  downloadUrl: string;
}

export async function searchImages(query: string, count = 1): Promise<UnsplashImageResult[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    throw new Error("UNSPLASH_ACCESS_KEY is not configured");
  }

  const response = await fetch(
    `${UNSPLASH_API_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=${Math.max(1, Math.min(count, 10))}&orientation=landscape`,
    {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unsplash search failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const images = (payload.results || []).map((item: any) => ({
    id: item.id,
    url: item.urls?.regular || item.urls?.full,
    thumbUrl: item.urls?.small || item.urls?.thumb,
    altDescription: item.alt_description || item.description || "Unsplash image",
    photographer: item.user?.name || "Unknown photographer",
    downloadUrl: item.links?.download_location || "",
  })) as UnsplashImageResult[];

  // Required by Unsplash API guidelines to trigger download endpoint.
  await Promise.all(
    images
      .filter((image) => image.downloadUrl)
      .map((image) =>
        fetch(`${image.downloadUrl}${image.downloadUrl.includes("?") ? "&" : "?"}client_id=${accessKey}`).catch(() => null)
      )
  );

  return images;
}

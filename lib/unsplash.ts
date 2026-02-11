const UNSPLASH_API_BASE = "https://api.unsplash.com";

export interface UnsplashImage {
  id: string;
  url: string;
  thumbUrl: string;
  altDescription?: string;
  photographer?: string;
  downloadUrl?: string;
}

interface UnsplashSearchResponse {
  results?: Array<{
    id?: string;
    urls?: {
      regular?: string;
      full?: string;
      thumb?: string;
      small?: string;
    };
    alt_description?: string | null;
    description?: string | null;
    user?: {
      name?: string | null;
    };
    links?: {
      download_location?: string | null;
    };
  }>;
}

async function triggerDownload(downloadUrl: string, accessKey: string) {
  try {
    await fetch(downloadUrl, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });
  } catch (error) {
    console.warn("Unsplash download tracking failed", error);
  }
}

export async function searchImages(query: string, count = 1): Promise<UnsplashImage[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    console.warn("UNSPLASH_ACCESS_KEY is not set; skipping image search");
    return [];
  }

  const params = new URLSearchParams({
    query,
    per_page: String(Math.max(1, Math.min(count, 10))),
    orientation: "landscape",
  });

  const response = await fetch(`${UNSPLASH_API_BASE}/search/photos?${params.toString()}`, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
  });

  if (!response.ok) {
    console.warn("Unsplash API error", await response.text());
    return [];
  }

  const data = (await response.json()) as UnsplashSearchResponse;
  const results = Array.isArray(data.results) ? data.results : [];

  const images: UnsplashImage[] = results.slice(0, count).map((result) => ({
    id: result.id || "",
    url: result.urls?.regular || result.urls?.full || "",
    thumbUrl: result.urls?.thumb || result.urls?.small || "",
    altDescription: result.alt_description || result.description || "",
    photographer: result.user?.name || undefined,
    downloadUrl: result.links?.download_location || undefined,
  }));

  await Promise.all(
    images
      .map((image) => image.downloadUrl)
      .filter(Boolean)
      .map((downloadUrl) => triggerDownload(downloadUrl as string, accessKey))
  );

  return images;
}


export interface UnsplashImage {
  id: string;
  url: string;
  thumbUrl: string;
  altDescription: string;
  photographer: string;
  downloadUrl: string;
}

const UNSPLASH_API_URL = "https://api.unsplash.com";

export async function searchImages(query: string, count: number = 1): Promise<UnsplashImage[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn("UNSPLASH_ACCESS_KEY is not set. Returning empty list.");
    return [];
  }

  try {
    const response = await fetch(
      `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Unsplash API error: ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    // Trigger download event for each image as per API guidelines
    // We do this asynchronously without waiting
    data.results.forEach((img: any) => {
      if (img.links?.download_location) {
        fetch(img.links.download_location, {
          headers: { Authorization: `Client-ID ${accessKey}` }
        }).catch(err => console.error("Failed to trigger download event:", err));
      }
    });

    return data.results.map((img: any) => ({
      id: img.id,
      url: img.urls?.regular || img.urls?.full, // Prefer regular for size balance
      thumbUrl: img.urls?.thumb,
      altDescription: img.alt_description || "Unsplash image",
      photographer: img.user?.name || "Unknown photographer",
      downloadUrl: img.links?.download,
    }));
  } catch (error) {
    console.error("Error searching Unsplash images:", error);
    return [];
  }
}

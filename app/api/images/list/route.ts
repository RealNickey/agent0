import { list } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";

/**
 * Lists images stored in Vercel Blob for the authenticated user only
 * (prefix: generated-images/{userId}/).
 * Returns proxy URLs so the private blob token never reaches the browser.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return Response.json({ images: [] });
  }

  try {
    const { blobs } = await list({
      prefix: `generated-images/${userId}/`,
      token,
    });

    const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

    const images = blobs
      .filter((b) => {
        const ext = b.pathname.split(".").pop()?.toLowerCase();
        return ext !== undefined && IMAGE_EXTS.has(ext);
      })
      .map((b) => ({
        url: `/api/images/blob?url=${encodeURIComponent(b.url)}`,
        title: b.pathname.split("/").pop() ?? b.pathname,
      }));

    return Response.json({ images });
  } catch (err) {
    console.error("[images/list] Failed to list blobs:", err);
    return Response.json({ images: [] });
  }
}

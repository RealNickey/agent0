import { type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Allowed hostname patterns for Vercel Blob storage (prevents SSRF)
const VERCEL_BLOB_HOST_RE =
  /^[a-z0-9.-]+\.blob\.vercel-storage\.com$/i;

/**
 * Server-side proxy for private Vercel Blob images.
 * Requires Clerk authentication and verifies the requested image belongs to the
 * authenticated user (path must start with /generated-images/{userId}/).
 * Validates the URL is a legitimate Vercel Blob host (SSRF protection),
 * then fetches the private blob with Bearer auth and streams it to the browser.
 * This keeps the blob token out of the client entirely.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const blobUrl = request.nextUrl.searchParams.get("url");

  if (!blobUrl) {
    return new Response("Missing url param", { status: 400 });
  }

  // Validate it's a legitimate Vercel Blob URL to prevent SSRF
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(blobUrl);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (
    parsedUrl.protocol !== "https:" ||
    !VERCEL_BLOB_HOST_RE.test(parsedUrl.hostname)
  ) {
    return new Response("URL not allowed", { status: 403 });
  }

  // Enforce ownership: the blob path must belong to the authenticated user
  if (!parsedUrl.pathname.startsWith(`/generated-images/${userId}/`)) {
    return new Response("Access denied", { status: 403 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return new Response("Blob storage not configured", { status: 500 });
  }

  // Fetch the private blob server-side using the token as a Bearer credential
  let upstream: Response;
  try {
    upstream = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error("[images/blob] Network error fetching blob:", err);
    return new Response("Failed to fetch image", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response(`Blob storage returned ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/png";

  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600, immutable",
    },
  });
}

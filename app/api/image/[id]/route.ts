import { getGeneratedImage } from "@/lib/image-store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return new Response("Bad request", { status: 400 });
  }

  const dataUrl = getGeneratedImage(id);

  if (!dataUrl) {
    return new Response("Image not found or expired", { status: 404 });
  }

  // Parse the data URL to serve the raw bytes with the proper Content-Type.
  // Format: data:<mediaType>;base64,<base64data>
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    return new Response("Corrupted image data", { status: 500 });
  }

  const header = dataUrl.slice(5, commaIndex); // strip leading "data:"
  const mediaType = header.split(";")[0] || "image/png";
  const base64 = dataUrl.slice(commaIndex + 1);
  const buffer = Buffer.from(base64, "base64");

  return new Response(buffer, {
    headers: {
      "Content-Type": mediaType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

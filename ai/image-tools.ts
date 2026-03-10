import { tool } from "ai";
import { put } from "@vercel/blob";
import { z } from "zod";

function getImageExtension(mediaType: string): string {
  if (mediaType === "image/png") return "png";
  if (mediaType === "image/jpeg") return "jpg";
  if (mediaType === "image/webp") return "webp";
  return "bin";
}

function extractBase64FromJsonPayload(payload: any): string | null {
  const candidates = [
    payload?.result?.image,
    payload?.result?.b64_json,
    payload?.image,
    payload?.b64_json,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      if (candidate.startsWith("data:")) {
        const parts = candidate.split(",", 2);
        return parts.length === 2 ? parts[1] : null;
      }
      return candidate;
    }
  }

  return null;
}

function inferImageMediaTypeFromPayload(payload: any): string {
  const candidates = [
    payload?.result?.mime_type,
    payload?.result?.mimeType,
    payload?.mime_type,
    payload?.mimeType,
    payload?.result?.content_type,
    payload?.content_type,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("image/")) {
      return candidate;
    }
  }

  if (typeof payload?.result?.image === "string" && payload.result.image.startsWith("data:")) {
    const dataUriType = payload.result.image.split(";", 1)[0].replace("data:", "");
    if (dataUriType.startsWith("image/")) {
      return dataUriType;
    }
  }

  return "image/png";
}

export function createImageTools(userId: string) {
  const imageGenerationTool = tool({
  description:
    "Generate an image from a text prompt using Cloudflare Workers AI (Flux-1-Schnell model). " +
    "Use this when the user asks to generate, create, draw, or visualize an image. " +
    "Be descriptive in the prompt — include style, lighting, composition, and mood for best results.",
  inputSchema: z.object({
    prompt: z
      .string()
      .describe(
        "A detailed text description of the image to generate. Include style, lighting, subject, and mood."
      ),
    steps: z
      .number()
      .optional()
      .describe(
        "Number of inference steps (1–8, default 4). Higher values improve quality but take longer."
      ),
  }),
  execute: async ({ prompt, steps = 4 }) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();

    if (!accountId || !apiToken) {
      return {
        error: true,
        message: "Cloudflare API credentials are not configured on the server.",
      };
    }

    if (!blobToken) {
      return {
        error: true,
        message:
          "Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN to store generated images.",
      };
    }

    const clampedSteps = Math.min(Math.max(Math.round(steps), 1), 8);

    let response: Response;
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            num_steps: clampedSteps,
          }),
        }
      );
    } catch (err) {
      return {
        error: true,
        message: `Network error while calling Cloudflare AI: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      return {
        error: true,
        message: `Cloudflare AI returned an error (${response.status}): ${errorText}`,
      };
    }

    let imageBytes: Uint8Array;
    let mediaType = response.headers.get("content-type") || "image/png";

    if (mediaType.includes("application/json")) {
      const payload = await response.json();
      const base64 = extractBase64FromJsonPayload(payload);

      if (!base64) {
        return {
          error: true,
          message: "Cloudflare AI returned JSON but no image payload was found.",
        };
      }

      mediaType = inferImageMediaTypeFromPayload(payload);
      imageBytes = new Uint8Array(Buffer.from(base64, "base64"));
    } else {
      const arrayBuffer = await response.arrayBuffer();
      imageBytes = new Uint8Array(arrayBuffer);

      if (!mediaType.startsWith("image/")) {
        mediaType = "image/png";
      }
    }

    const extension = getImageExtension(mediaType);
    const datePrefix = new Date().toISOString().slice(0, 10);
    const filePath = `generated-images/${userId}/${datePrefix}/${crypto.randomUUID()}.${extension}`;

    let blobUrl: string;
    try {
      const uploadedBlob = await put(filePath, Buffer.from(imageBytes), {
        access: "private",
        contentType: mediaType,
        addRandomSuffix: false,
        token: blobToken,
      });
      blobUrl = uploadedBlob.url;
    } catch (blobErr) {
      const blobMsg = blobErr instanceof Error ? blobErr.message : String(blobErr);
      console.error("[image-tools] Blob upload failed", blobMsg);
      return {
        error: true,
        message: `Failed to store generated image in Vercel Blob: ${blobMsg}`,
      };
    }

    // Serve via proxy so the private blob token is never exposed to the browser
    const imageUrl = `/api/images/blob?url=${encodeURIComponent(blobUrl)}`;

    return {
      error: false,
      imageUrl,
      blobUrl,
      mediaType,
      prompt,
      model: "flux-1-schnell",
      steps: clampedSteps,
    };
  },
});

  return { generateImage: imageGenerationTool };
}

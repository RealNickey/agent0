/**
 * In-memory store for generated images.
 *
 * Generated images are large base64 data URLs (1-4 MB each). Sending them
 * back to the LLM as part of a tool result wastes hundreds of thousands of
 * tokens and can exceed model context limits.
 *
 * Instead, the image tool stores the data URL here, returns only a short
 * reference ID to the model, and the UI component fetches the real image
 * via /api/image/:id when it needs to display it.
 */

interface ImageEntry {
  dataUrl: string;
  createdAt: number;
}

// Module-level singleton – shared across all requests in the same process.
const store = new Map<string, ImageEntry>();

// Auto-prune images older than 1 hour.
const EXPIRY_MS = 60 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now - entry.createdAt > EXPIRY_MS) {
      store.delete(id);
    }
  }
}

export function storeGeneratedImage(id: string, dataUrl: string): void {
  prune();
  store.set(id, { dataUrl, createdAt: Date.now() });
}

export function getGeneratedImage(id: string): string | undefined {
  const entry = store.get(id);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > EXPIRY_MS) {
    store.delete(id);
    return undefined;
  }
  return entry.dataUrl;
}

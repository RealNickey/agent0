import { google } from "@ai-sdk/google";
import { embed } from "ai";
import { supabase } from "./supabase";

// Use Gemini's text-embedding-004 model (768 dimensions)
const embeddingModel = google.textEmbeddingModel("text-embedding-004");

/**
 * Simple text chunking with overlap
 * @param text - The text to chunk
 * @param chunkSize - Maximum characters per chunk (default: 1000)
 * @param overlap - Character overlap between chunks (default: 200)
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;

    // Prevent infinite loop if overlap >= chunkSize
    if (start <= chunks.length * (chunkSize - overlap) - chunkSize) {
      break;
    }
  }

  return chunks;
}

/**
 * Generate embedding for a single text using Gemini text-embedding-004
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}

/**
 * Ingest a document into the knowledge base
 * Automatically chunks the text and generates embeddings for each chunk
 */
export async function ingestDocument(
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<{ chunksCreated: number }> {
  const chunks = chunkText(content);
  let chunksCreated = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await generateEmbedding(chunk);

    const { error } = await supabase.from("documents").insert({
      content: chunk,
      metadata: {
        ...metadata,
        chunk_index: i,
        total_chunks: chunks.length,
      },
      embedding,
    });

    if (error) {
      console.error(`Error inserting chunk ${i}:`, error);
      throw error;
    }

    chunksCreated++;
  }

  return { chunksCreated };
}

/**
 * Search the knowledge base for relevant documents using semantic similarity
 */
export async function searchKnowledgeBase(
  query: string,
  threshold: number = 0.7,
  limit: number = 5
): Promise<
  Array<{
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }>
> {
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("search_documents", {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    console.error("Knowledge base search error:", error);
    throw error;
  }

  return data || [];
}

/**
 * Delete a document from the knowledge base by ID
 */
export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from("documents").delete().eq("id", id);

  if (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}

/**
 * List all documents in the knowledge base (without embeddings)
 */
export async function listDocuments(
  limit: number = 50
): Promise<
  Array<{
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>
> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, content, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error listing documents:", error);
    throw error;
  }

  return data || [];
}

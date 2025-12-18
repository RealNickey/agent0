import { tool } from "ai";
import { z } from "zod";
import { searchKnowledgeBase } from "../embeddings";

/**
 * Knowledge Base Search Tool
 * Allows the AI to search for relevant information in the user's knowledge base
 * using semantic similarity search powered by pgvector embeddings.
 */
export const knowledgeBaseTool = tool({
  description:
    "Search the knowledge base for relevant information using semantic search. Use this when the user asks about their saved documents, notes, or any information they may have stored previously.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query to find relevant documents in the knowledge base"),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        "Similarity threshold between 0-1. Lower values return more results but may be less relevant. Default is 0.6"
      ),
    limit: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .describe("Maximum number of results to return. Default is 5"),
  }),
  execute: async ({ query, threshold, limit }) => {
    const effectiveThreshold = threshold ?? 0.6;
    const effectiveLimit = limit ?? 5;
    try {
      const results = await searchKnowledgeBase(query, effectiveThreshold, effectiveLimit);

      if (results.length === 0) {
        return {
          found: false,
          message: "No relevant documents found in the knowledge base.",
          results: [],
          count: 0,
        };
      }

      return {
        found: true,
        message: `Found ${results.length} relevant document(s).`,
        results: results.map((r) => ({
          content: r.content,
          metadata: r.metadata,
          relevance: Math.round(r.similarity * 100) / 100, // Round to 2 decimal places
        })),
        count: results.length,
      };
    } catch (error) {
      console.error("Knowledge base search error:", error);
      return {
        found: false,
        error: "Failed to search knowledge base. Please try again.",
        results: [],
        count: 0,
      };
    }
  },
});

/**
 * Remember Tool
 * Allows the AI to save information to the knowledge base
 */
export const rememberTool = tool({
  description:
    "Save important information, notes, or facts to the knowledge base for later retrieval. Use this when the user wants to remember something or save information.",
  inputSchema: z.object({
    content: z
      .string()
      .describe("The information or note to save to the knowledge base"),
    category: z
      .string()
      .optional()
      .describe("Optional category or tag for organizing the information"),
    title: z
      .string()
      .optional()
      .describe("Optional title or label for the saved information"),
  }),
  execute: async ({ content, category, title }) => {
    try {
      // Import dynamically to avoid circular dependencies
      const { ingestDocument } = await import("../embeddings");

      await ingestDocument(content, {
        category: category ?? "general",
        title: title ?? "Untitled",
        source: "chat",
        savedAt: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Successfully saved to knowledge base${title ? `: "${title}"` : ""}.`,
      };
    } catch (error) {
      console.error("Remember tool error:", error);
      return {
        success: false,
        error: "Failed to save to knowledge base. Please try again.",
      };
    }
  },
});

export const knowledgeTools = {
  searchKnowledgeBase: knowledgeBaseTool,
  remember: rememberTool,
};

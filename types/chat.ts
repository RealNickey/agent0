import { UIMessage, type LanguageModelUsage } from "ai";
import { z } from "zod";

// Define message metadata schema for validation
export const messageMetadataSchema = z.object({
  createdAt: z.number().optional(),
  model: z.string().optional(),
  totalTokens: z.number().optional(),
  totalUsage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      totalTokens: z.number().optional(),
      reasoningTokens: z.number().optional(),
      cachedInputTokens: z.number().optional(),
    })
    .optional(),
});

// Infer the type from the schema
export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Create a typed UIMessage with our custom metadata
export type MyUIMessage = UIMessage<MessageMetadata>;

// Export helper type for message parts
export type UIMessagePart = MyUIMessage["parts"][number];

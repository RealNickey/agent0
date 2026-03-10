import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { cohere } from "@ai-sdk/cohere";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

function resolveModel(modelId: string) {
  if (modelId.startsWith("groq:")) {
    return groq(modelId.replace("groq:", ""));
  }
  if (modelId.startsWith("cohere:")) {
    return cohere(modelId.replace("cohere:", ""));
  }
  return google(modelId);
}

const categorySchema = z.object({
  categories: z.array(
    z.object({
      index: z.number().describe("Index of the email in the input array"),
      category: z
        .enum(["work", "personal", "marketing", "finance", "social", "newsletter", "updates"])
        .describe("The category that best fits this email"),
    })
  ),
});

/**
 * Color map for email categories
 * Used by the frontend to render colored badges
 */
export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  work: {
    bg: "rgba(80,160,221,0.55)",
    border: "rgba(80,160,221,0.3)",
    text: "rgba(0,0,0,0.8)",
  },
  personal: {
    bg: "rgba(100,200,130,0.55)",
    border: "rgba(100,200,130,0.3)",
    text: "rgba(0,0,0,0.8)",
  },
  marketing: {
    bg: "rgba(228,167,157,0.55)",
    border: "rgba(228,167,157,0.3)",
    text: "rgba(0,0,0,0.8)",
  },
  finance: {
    bg: "rgba(220,190,80,0.55)",
    border: "rgba(220,190,80,0.3)",
    text: "rgba(0,0,0,0.8)",
  },
  social: {
    bg: "rgba(180,130,220,0.55)",
    border: "rgba(180,130,220,0.3)",
    text: "rgba(0,0,0,0.8)",
  },
  newsletter: {
    bg: "rgba(160,170,180,0.55)",
    border: "rgba(160,170,180,0.3)",
    text: "rgba(0,0,0,0.8)",
  },
  updates: {
    bg: "rgba(100,200,200,0.55)",
    border: "rgba(100,200,200,0.3)",
    text: "rgba(0,0,0,0.8)",
  },
};

/**
 * POST /api/gmail/categorize — AI-categorize emails using the selected model
 * Body: { messages: Array<{ subject: string, snippet: string, from: string }>, model?: string }
 * Returns: { categories: Array<{ index: number, category: string }>, colors: Record }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: { subject: string; snippet: string; from: string }[] = body.messages;
    // Use the model the user has selected, fall back to Kimi K2
    const modelId: string = body.model || "groq:moonshotai/kimi-k2-instruct-0905";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: true, message: "No messages provided for categorization" },
        { status: 400 }
      );
    }

    // Build prompt with email summaries
    const emailSummaries = messages
      .map(
        (msg, i) =>
          `[${i}] From: ${msg.from} | Subject: ${msg.subject} | Preview: ${msg.snippet.slice(0, 120)}`
      )
      .join("\n");

    const model = resolveModel(modelId);

    const result = await generateObject({
      model,
      schema: categorySchema,
      prompt: `Categorize each email into exactly ONE category from: work, personal, marketing, finance, social, newsletter, updates.

Rules:
- "work" = professional emails, project updates, team collaboration, work meetings
- "personal" = friends, family, personal conversations
- "marketing" = promotions, ads, sales offers, brand newsletters
- "finance" = banking, payments, invoices, receipts, financial notifications
- "social" = social media notifications (LinkedIn, Twitter, etc.)
- "newsletter" = informational newsletters, digests, subscriptions
- "updates" = service notifications, app updates, security alerts, automated messages

Emails to categorize:
${emailSummaries}

Return the category for each email by its index.`,
    });

    return NextResponse.json({
      error: false,
      categories: result.object.categories,
      colors: CATEGORY_COLORS,
    });
  } catch (error) {
    console.error("Error categorizing emails:", error);

    // Return a fallback — don't block the UI if categorization fails
    return NextResponse.json({
      error: false,
      categories: [],
      colors: CATEGORY_COLORS,
      fallback: true,
    });
  }
}

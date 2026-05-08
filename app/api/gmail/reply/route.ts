import { NextRequest, NextResponse } from "next/server";
import { cohere } from "@ai-sdk/cohere";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, snippet, from, to } = body;

    if (!subject && !snippet) {
      return NextResponse.json({ error: true, message: "Missing email content" }, { status: 400 });
    }

    const prompt = `You are a helpful AI assistant that writes professional email replies.

Write a concise, professional reply to the following email.

From: ${from || "Unknown"}
To: ${to || "me"}
Subject: ${subject}
Email Snippet: ${snippet}

The reply should be 2-4 sentences, directly addressing the sender's context and any requests. Just return the text of the reply, nothing else.`;

    const result = await generateText({
      model: cohere("command-r-08-2024"),
      prompt,
    });

    return NextResponse.json({
      error: false,
      reply: result.text.trim(),
    });
  } catch (error) {
    console.error("Error generating reply:", error);
    return NextResponse.json(
      { error: true, message: error instanceof Error ? error.message : "Failed to generate reply" },
      { status: 500 }
    );
  }
}

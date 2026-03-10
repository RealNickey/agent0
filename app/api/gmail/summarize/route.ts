import { NextRequest, NextResponse } from "next/server";
import { createEmailSummaryAgent } from "@/ai/email-summary-agent";

type EmailInput = {
  subject: string;
  snippet: string;
  from: string;
  to?: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractSenderName(from: string) {
  const withoutEmail = from.replace(/<[^>]+>/g, "").trim();
  if (!withoutEmail) return "there";
  return withoutEmail.split(/\s+/)[0] || "there";
}

function looksAutomatedOrPromotional(message: EmailInput) {
  const haystack = `${message.subject} ${message.snippet} ${message.from}`.toLowerCase();
  const automationPatterns = [
    /newsletter/,
    /unsubscribe/,
    /no-reply/,
    /noreply/,
    /receipt/,
    /invoice/,
    /statement/,
    /order\s+(confirmed|shipped|delivered)/,
    /digest/,
    /promotion/,
    /sale/,
    /marketing/,
    /security alert/,
    /verification code/,
    /otp/,
  ];

  return automationPatterns.some((pattern) => pattern.test(haystack));
}

function buildFallbackReply(message: EmailInput) {
  if (looksAutomatedOrPromotional(message)) {
    return "No reply needed.";
  }

  const senderName = extractSenderName(message.from);
  const subject = normalizeWhitespace(message.subject || "your email");
  const snippet = normalizeWhitespace(message.snippet || "");
  const lowerSnippet = snippet.toLowerCase();

  if (/\?$/.test(snippet) || /can you|could you|would you|let me know|please|are you able|what do you think/.test(lowerSnippet)) {
    return `Hi ${senderName},\n\nThanks for the note about ${subject}. I took a look and will follow up with the details you asked for shortly.\n\nBest,`;
  }

  if (/meet|schedule|calendar|time|tomorrow|next week|availability/.test(lowerSnippet + " " + subject.toLowerCase())) {
    return `Hi ${senderName},\n\nThanks for reaching out about ${subject}. That works on my side, and I can coordinate the timing from here.\n\nBest,`;
  }

  return `Hi ${senderName},\n\nThanks for your email about ${subject}. I received it and will take the next step on my side.\n\nBest,`;
}

function buildFallbackSummary(message: EmailInput, index: number) {
  return {
    index,
    importance: "medium" as const,
    shortTitle: (message.subject || "Untitled email").slice(0, 45),
    summary: message.snippet || "No preview available.",
    suggestedReply: buildFallbackReply(message),
    actionItems: [],
    todoItems: [],
    calendarEvent: null,
  };
}

function normalizeSuggestedReply(message: EmailInput, suggestedReply?: string | null) {
  const normalized = normalizeWhitespace(suggestedReply || "");
  if (!normalized) {
    return buildFallbackReply(message);
  }

  if (normalized === "No reply needed." && !looksAutomatedOrPromotional(message)) {
    return buildFallbackReply(message);
  }

  return suggestedReply ?? buildFallbackReply(message);
}

/**
 * POST /api/gmail/summarize
 * Body: { messages: Array<{ subject, snippet, from, to }>, model?: string }
 * Returns: { emails: Array<{ index, importance, shortTitle, summary, suggestedReply, actionItems, todoItems, calendarEvent }> }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: EmailInput[] = body.messages;
    // Use the model the user has selected, fall back to Kimi K2
    const modelId: string = body.model || "groq:moonshotai/kimi-k2-instruct-0905";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: true, message: "No messages provided for summarization" },
        { status: 400 }
      );
    }

    const emailSummaries = messages
      .map(
        (msg, i) =>
          `[${i}] From: ${msg.from} | To: ${msg.to || "me"} | Subject: ${msg.subject} | Preview: ${msg.snippet.slice(0, 300)}`
      )
      .join("\n\n");

    const agent = createEmailSummaryAgent(modelId);
    const result = await agent.generate({
      prompt: `Today's date is March 8, 2026.

Analyze the following inbox emails and return structured output for every item.

Emails:
${emailSummaries}

Return results for ALL ${messages.length} emails using the provided schema.`,
    });

    const normalizedEmails = messages.map((message, index) => {
      const email = result.output.emails.find((item: (typeof result.output.emails)[number]) => item.index === index);
      if (!email) {
        return buildFallbackSummary(message, index);
      }

      return {
        ...email,
        suggestedReply: normalizeSuggestedReply(message, email.suggestedReply),
      };
    });

    return NextResponse.json({
      error: false,
      emails: normalizedEmails,
    });
  } catch (error) {
    console.error("Error summarizing emails:", error);
    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : "Failed to summarize emails",
      },
      { status: 500 }
    );
  }
}

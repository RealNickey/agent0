import { generateResponse } from "./generate-response";
import { sendSlackMessage, addReaction, getThreadMessages } from "./slack-utils";

interface SlackMentionEvent {
  type: string;
  user: string;
  text: string;
  ts: string;
  channel: string;
  event_ts: string;
  thread_ts?: string;
}

// Track processed events to prevent duplicates
const processedEvents = new Set<string>();

export async function handleNewAppMention(event: SlackMentionEvent) {
  const eventId = `${event.channel}-${event.ts}`;
  
  // Prevent duplicate processing
  if (processedEvents.has(eventId)) {
    console.log(`Event ${eventId} already processed, skipping`);
    return;
  }
  processedEvents.add(eventId);

  // Clean up old events (keep last 1000)
  if (processedEvents.size > 1000) {
    const entries = Array.from(processedEvents);
    entries.slice(0, 500).forEach((e) => processedEvents.delete(e));
  }

  try {
    // Add a reaction to show we're processing
    await addReaction(event.channel, event.ts, "eyes");

    // Extract the message text (remove the bot mention)
    const messageText = event.text
      .replace(/<@[A-Z0-9]+>/g, "")
      .trim();

    if (!messageText) {
      await sendSlackMessage(
        event.channel,
        "Hi! How can I help you? Just mention me with your question.",
        event.thread_ts || event.ts
      );
      return;
    }

    // Build conversation history from thread if this is a threaded reply
    let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    
    if (event.thread_ts) {
      try {
        const threadMessages = await getThreadMessages(event.channel, event.thread_ts);
        const botUserId = process.env.SLACK_BOT_USER_ID;
        
        conversationHistory = threadMessages
          .filter((msg: any) => msg.ts !== event.ts) // Exclude current message
          .map((msg: any) => ({
            role: msg.user === botUserId ? "assistant" as const : "user" as const,
            content: msg.text.replace(/<@[A-Z0-9]+>/g, "").trim(),
          }))
          .filter((msg: { content: string }) => msg.content); // Remove empty messages
      } catch (err) {
        console.error("Failed to fetch thread history:", err);
      }
    }

    // Generate AI response
    const response = await generateResponse({
      message: messageText,
      conversationHistory,
    });

    // Reply in thread
    await sendSlackMessage(
      event.channel,
      response,
      event.thread_ts || event.ts
    );

    // Add checkmark reaction to show completion
    await addReaction(event.channel, event.ts, "white_check_mark");
  } catch (error) {
    console.error("Error handling app mention:", error);
    
    // Send error message
    await sendSlackMessage(
      event.channel,
      "Sorry, I encountered an error processing your request. Please try again.",
      event.thread_ts || event.ts
    );

    // Add error reaction
    await addReaction(event.channel, event.ts, "x");
  }
}

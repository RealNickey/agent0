import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/slack/slack-utils";
import { handleNewAppMention } from "@/lib/slack/handle-app-mention";

export async function POST(request: Request) {
  const rawBody = await request.text();

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle Slack URL verification challenge FIRST (no signature check)
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Verify signature for all other requests
  const isValid = await verifyRequest({
    requestType: "event",
    request,
    rawBody,
  });

  if (!isValid) {
    console.error("Invalid Slack signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Handle events
  if (payload.type === "event_callback") {
    const event = payload.event;

    // Ignore bot messages to prevent loops
    if (event.bot_id || event.subtype === "bot_message") {
      return NextResponse.json({ ok: true });
    }

    // Handle app_mention events
    if (event.type === "app_mention") {
      handleNewAppMention(event).catch((err) => {
        console.error("Error in handleNewAppMention:", err);
      });

      return NextResponse.json({ ok: true });
    }

    // Handle direct messages
    if (event.type === "message" && event.channel_type === "im") {
      handleNewAppMention(event).catch((err) => {
        console.error("Error in handleNewAppMention:", err);
      });

      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: true });
}

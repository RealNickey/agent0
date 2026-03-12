import { AgentDispatchClient, SipClient, RoomServiceClient } from "livekit-server-sdk";
import { z } from "zod";

const LIVEKIT_URL = process.env.LIVEKIT_URL!;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const SIP_OUTBOUND_TRUNK_ID = process.env.SIP_OUTBOUND_TRUNK_ID || "";

const callRequestSchema = z.object({
  phoneNumber: z
    .string()
    .min(1)
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format (E.164)"),
  task: z.string().min(1).max(2000),
  callerName: z.string().optional().default("Agent0 User"),
});

const callStatusSchema = z.object({
  roomName: z.string().min(1),
});

export async function POST(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "status") {
    return handleStatus(req);
  }

  return handleCall(req);
}

async function handleCall(req: Request) {
  let parsed;
  try {
    parsed = callRequestSchema.parse(await req.json());
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: error instanceof Error ? error.message : error,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { phoneNumber, task, callerName } = parsed;

  if (!SIP_OUTBOUND_TRUNK_ID) {
    return new Response(
      JSON.stringify({
        error: "SIP outbound trunk not configured",
        details:
          "Set SIP_OUTBOUND_TRUNK_ID in environment variables. " +
          "You need a SIP trunk provider (Twilio/Telnyx) configured in LiveKit Cloud.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const roomName = `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    // 1. Dispatch the agent to a new room
    const dispatchClient = new AgentDispatchClient(
      LIVEKIT_URL,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET
    );

    await dispatchClient.createDispatch(roomName, "agent0-caller", {
      metadata: JSON.stringify({
        phone_number: phoneNumber,
        task,
        caller_name: callerName,
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        roomName,
        phoneNumber,
        task,
        message: "Call initiated. The agent will dial the number and complete the task.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to initiate call:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to initiate call",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleStatus(req: Request) {
  let parsed;
  try {
    parsed = callStatusSchema.parse(await req.json());
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Invalid request",
        details: error instanceof Error ? error.message : error,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { roomName } = parsed;

  try {
    const roomService = new RoomServiceClient(
      LIVEKIT_URL,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET
    );

    const rooms = await roomService.listRooms([roomName]);
    if (rooms.length === 0) {
      // Room was deleted — call ended
      return new Response(
        JSON.stringify({
          status: "ended",
          message: "Call has ended (room no longer exists)",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const room = rooms[0];
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(room.metadata || "{}");
    } catch {
      // ignore
    }

    return new Response(
      JSON.stringify({
        status: metadata.status || "in_progress",
        roomName,
        participants: room.numParticipants,
        metadata,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to get call status:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to get call status",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

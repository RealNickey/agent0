import { tool } from "ai";
import { z } from "zod";

const LIVEKIT_URL = process.env.LIVEKIT_URL || "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const SIP_OUTBOUND_TRUNK_ID = process.env.SIP_OUTBOUND_TRUNK_ID || "";

export const callTools = {
  makePhoneCall: tool({
    description:
      "Make an outbound phone call to a specified number using an AI voice agent. " +
      "The agent will call the number and complete the assigned task autonomously " +
      "(e.g., book an appointment, gather information, make a reservation). " +
      "Returns a room name to track call status.",
    inputSchema: z.object({
      phoneNumber: z
        .string()
        .describe(
          "The phone number to call in E.164 format (e.g., +14155550123). Must include country code."
        ),
      task: z
        .string()
        .describe(
          "Detailed description of what the AI agent should accomplish on the call. " +
          "Be specific about the goal, any preferences, and what information to gather/confirm."
        ),
      callerName: z
        .string()
        .optional()
        .describe("Name of the person on whose behalf the call is being made"),
    }),
    execute: async ({ phoneNumber, task, callerName }) => {
      if (!SIP_OUTBOUND_TRUNK_ID) {
        return {
          status: "error",
          error: "SIP trunk not configured",
          message:
            "Outbound calling requires a SIP trunk provider (Twilio/Telnyx). " +
            "Set SIP_OUTBOUND_TRUNK_ID in environment variables.",
        };
      }

      if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        return {
          status: "error",
          error: "LiveKit not configured",
          message: "LiveKit credentials (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) are required.",
        };
      }

      // Dynamically import to avoid bundling issues
      const { AgentDispatchClient } = await import("livekit-server-sdk");

      const roomName = `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      try {
        const dispatchClient = new AgentDispatchClient(
          LIVEKIT_URL,
          LIVEKIT_API_KEY,
          LIVEKIT_API_SECRET
        );

        await dispatchClient.createDispatch(roomName, "agent0-caller", {
          metadata: JSON.stringify({
            phone_number: phoneNumber,
            task,
            caller_name: callerName || "the user",
          }),
        });

        return {
          status: "calling",
          roomName,
          phoneNumber,
          task,
          message: `Calling ${phoneNumber}... The AI agent will ${task}. You can ask me about the call status.`,
        };
      } catch (error) {
        return {
          status: "error",
          error: "Failed to initiate call",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  }),

  getCallStatus: tool({
    description:
      "Check the status of an ongoing or completed phone call. " +
      "Use the room name returned from makePhoneCall.",
    inputSchema: z.object({
      roomName: z.string().describe("The room name of the call to check"),
    }),
    execute: async ({ roomName }) => {
      if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        return {
          status: "error",
          error: "LiveKit not configured",
        };
      }

      const { RoomServiceClient } = await import("livekit-server-sdk");

      try {
        const roomService = new RoomServiceClient(
          LIVEKIT_URL,
          LIVEKIT_API_KEY,
          LIVEKIT_API_SECRET
        );

        const rooms = await roomService.listRooms([roomName]);
        if (rooms.length === 0) {
          return {
            status: "ended",
            message: "The call has ended.",
          };
        }

        const room = rooms[0];
        let metadata: Record<string, unknown> = {};
        try {
          metadata = JSON.parse(room.metadata || "{}");
        } catch {
          // ignore
        }

        const callStatus = (metadata.status as string) || "in_progress";

        if (callStatus === "completed") {
          return {
            status: "completed",
            summary: metadata.summary,
            details: metadata.details,
            message: `Call completed: ${metadata.summary}`,
          };
        }

        if (callStatus === "failed" || callStatus === "call_failed") {
          return {
            status: "failed",
            summary: metadata.summary,
            message: `Call failed: ${metadata.summary}`,
          };
        }

        if (callStatus === "voicemail") {
          return {
            status: "voicemail",
            summary: metadata.summary,
            message: "Reached voicemail. The task could not be completed.",
          };
        }

        return {
          status: "in_progress",
          participants: room.numParticipants,
          message: "Call is still in progress...",
        };
      } catch (error) {
        return {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  }),
};

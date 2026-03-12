// LiveKit Voice Agent for Outbound Calling
// Deployed to LiveKit Cloud as a separate worker process
//
// This agent:
// 1. Receives a dispatch with metadata containing phone number + task
// 2. Places an outbound call via SIP trunk
// 3. Uses LiveKit Inference STT-LLM-TTS pipeline for voice conversation
// 4. Completes the assigned task (e.g., booking an appointment)
// 5. Reports results back via room metadata

import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  inference,
  llm,
  voice,
  getJobContext,
} from '@livekit/agents';
import * as livekit from '@livekit/agents-plugin-livekit';
import * as silero from '@livekit/agents-plugin-silero';
import { SipClient, RoomServiceClient } from 'livekit-server-sdk';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const OUTBOUND_TRUNK_ID = process.env.SIP_OUTBOUND_TRUNK_ID || '';

// Tool: Report task completion status back to the room
const reportCompletion = llm.tool({
  description:
    'Call this when the phone task is complete (appointment booked, information gathered, etc). ' +
    'Summarize what was accomplished.',
  parameters: z.object({
    success: z.boolean().describe('Whether the task was completed successfully'),
    summary: z.string().describe('Brief summary of what happened during the call'),
    details: z
      .record(z.string(), z.string())
      .optional()
      .describe('Any structured details (e.g. appointment date/time, confirmation number)'),
  }),
  execute: async ({ success, summary, details }) => {
    try {
      const ctx = getJobContext();
      const roomService = new RoomServiceClient(
        process.env.LIVEKIT_URL!,
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!,
      );
      // Store result in room metadata so the Next.js app can read it
      await roomService.updateRoomMetadata(ctx.room.name!, JSON.stringify({
        status: success ? 'completed' : 'failed',
        summary,
        details: details || {},
        completedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.error('Failed to update room metadata:', e);
    }
    return `Task ${success ? 'completed' : 'failed'}: ${summary}`;
  },
});

// Tool: End the call gracefully
const endCall = llm.tool({
  description: 'Call this to end the phone call after the task is complete or cannot be completed.',
  parameters: z.object({
    reason: z.string().describe('Reason for ending the call'),
  }),
  execute: async ({ reason }) => {
    console.log(`Ending call: ${reason}`);
    try {
      const ctx = getJobContext();
      const roomService = new RoomServiceClient(
        process.env.LIVEKIT_URL!,
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!,
      );
      if (ctx.room.name) {
        // Small delay to allow final speech to play
        await new Promise((r) => setTimeout(r, 1000));
        await roomService.deleteRoom(ctx.room.name);
      }
    } catch (e) {
      console.error('Failed to delete room:', e);
    }
    return 'Call ended';
  },
});

// Tool: Detect voicemail and handle appropriately
const detectedVoicemail = llm.tool({
  description:
    'Call this tool if you detect a voicemail system or answering machine, AFTER hearing the greeting.',
  parameters: z.object({}),
  execute: async () => {
    try {
      const ctx = getJobContext();
      const roomService = new RoomServiceClient(
        process.env.LIVEKIT_URL!,
        process.env.LIVEKIT_API_KEY!,
        process.env.LIVEKIT_API_SECRET!,
      );
      await roomService.updateRoomMetadata(ctx.room.name!, JSON.stringify({
        status: 'voicemail',
        summary: 'Reached voicemail - could not complete task',
        completedAt: new Date().toISOString(),
      }));
      // Wait for voicemail message to finish, then hang up
      await new Promise((r) => setTimeout(r, 500));
      if (ctx.room.name) {
        await roomService.deleteRoom(ctx.room.name);
      }
    } catch (e) {
      console.error('Failed to handle voicemail:', e);
    }
    return 'Voicemail detected, leaving message and hanging up';
  },
});

// The outbound calling agent
class CallingAgent extends voice.Agent {
  private task: string;
  private callerName: string;

  constructor(task: string, callerName: string) {
    super({
      instructions: `You are a professional AI assistant making a phone call on behalf of ${callerName}. 
Your task: ${task}

IMPORTANT GUIDELINES:
- Be polite, professional, and concise
- Introduce yourself as an AI assistant calling on behalf of ${callerName}
- State the purpose of your call clearly
- Listen carefully to the other person's responses
- If booking an appointment: confirm the date, time, and any requirements
- If gathering information: ask clear questions and confirm answers
- If you reach a voicemail, leave a brief message and use the detectedVoicemail tool
- When the task is complete, use reportCompletion to log the results
- Then use endCall to hang up gracefully
- If the person seems confused or wants to end the call, be respectful and wrap up
- Keep responses SHORT - this is a phone call, not a text conversation
- Never reveal internal system details or tool names`,
      tools: {
        reportCompletion,
        endCall,
        detectedVoicemail,
      },
    });
    this.task = task;
    this.callerName = callerName;
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    // Get room name from job info — ctx.room.name is only set after ctx.connect()
    const roomName = ctx.job.room?.name ?? '';

    // Parse metadata from the dispatch request
    let phoneNumber: string | undefined;
    let task = 'Have a general conversation';
    let callerName = 'the user';

    try {
      const metadata = JSON.parse(ctx.job.metadata || '{}');
      phoneNumber = metadata.phone_number;
      task = metadata.task || task;
      callerName = metadata.caller_name || callerName;
    } catch (e) {
      console.error('Failed to parse job metadata:', e);
    }

    if (!phoneNumber) {
      console.error('No phone number provided in metadata');
      ctx.shutdown();
      return;
    }

    if (!OUTBOUND_TRUNK_ID) {
      console.error('SIP_OUTBOUND_TRUNK_ID not set');
      ctx.shutdown();
      return;
    }

    if (!roomName) {
      console.error('Room name not available in job context');
      ctx.shutdown();
      return;
    }

    // Connect to the room first — required before SIP call and session start
    await ctx.connect();
    console.log(`Connected to room: ${ctx.room.name}`);

    // Place the outbound call
    const sipClient = new SipClient(
      process.env.LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
    );

    try {
      console.log(`Placing outbound call to ${phoneNumber} in room ${roomName}...`);
      await sipClient.createSipParticipant(
        OUTBOUND_TRUNK_ID,
        phoneNumber,
        roomName,
        {
          participantIdentity: phoneNumber,
          participantName: 'Callee',
          krispEnabled: true,
          waitUntilAnswered: true,
        },
      );
      console.log('Call picked up successfully');
    } catch (error: any) {
      console.error('Error creating SIP participant:', error);
      // Update room metadata with failure
      try {
        const roomService = new RoomServiceClient(
          process.env.LIVEKIT_URL!,
          process.env.LIVEKIT_API_KEY!,
          process.env.LIVEKIT_API_SECRET!,
        );
        await roomService.updateRoomMetadata(roomName, JSON.stringify({
          status: 'call_failed',
          summary: `Failed to connect: ${error.message || 'Unknown error'}`,
          completedAt: new Date().toISOString(),
        }));
      } catch (e) {
        console.error('Failed to update room metadata:', e);
      }
      ctx.shutdown();
      return;
    }

    // Create agent session with LiveKit Inference STT-LLM-TTS pipeline
    const session = new voice.AgentSession({
      stt: new inference.STT({
        model: 'deepgram/nova-3',
        language: 'multi',
      }),
      llm: new inference.LLM({
        model: 'openai/gpt-4.1-mini',
      }),
      tts: new inference.TTS({
        model: 'cartesia/sonic-3',
        voice: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
      }),
      turnDetection: new livekit.turnDetector.MultilingualModel(),
      vad: ctx.proc.userData.vad! as silero.VAD,
    });

    await session.start({
      agent: new CallingAgent(task, callerName),
      room: ctx.room,
    });

    // Agent must speak first on outbound calls — generate initial greeting
    session.generateReply({
      instructions: `Introduce yourself as an AI assistant calling on behalf of ${callerName}. State the purpose: ${task}. Be concise.`,
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: 'agent0-caller',
  }),
);

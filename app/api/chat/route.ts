import { google } from "@ai-sdk/google";
import { streamText, createUIMessageStreamResponse } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-2.0-flash-001"),
    system: `You are Agent0, an advanced AI assistant with access to powerful tools including:
- 📅 Calendar management and scheduling
- 📧 Email composition and organization  
- 🌤️ Weather forecasts and updates
- 📝 Task management and reminders
- 🔍 Web search and research
- 📊 Data analysis and visualization

You help users be more productive by intelligently managing their digital life. 
Be helpful, concise, and proactive in suggesting ways to optimize their workflow.
Format your responses with clear structure using markdown when helpful.`,
    messages,
  });

  return createUIMessageStreamResponse({
    stream: result.toUIMessageStream(),
  });
}

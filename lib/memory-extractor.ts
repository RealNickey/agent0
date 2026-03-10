/**
 * lib/memory-extractor.ts
 *
 * Silent background service that extracts personal facts from every user
 * message and persists them to Supabase via saveMemory — without the user
 * having to ask.
 *
 * Runs as a fire-and-forget parallel call alongside the main chat stream so
 * it never adds latency. Uses gemini-2.0-flash (fast + cheap) with only the
 * saveMemory tool enabled, so there is no provider-tool mixing issue.
 */

import { google } from "@ai-sdk/google";
import { cohere } from "@ai-sdk/cohere";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import { createMemoryTools } from "@/ai/memory-tools";

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

const openrouter = createOpenAI({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

function resolveModel(modelId: string) {
  if (modelId.startsWith("groq:")) return groq(modelId.replace("groq:", ""));
  if (modelId.startsWith("cohere:")) return cohere(modelId.replace("cohere:", ""));
  if (modelId.startsWith("openrouter:")) return openrouter(modelId.replace("openrouter:", ""));
  return google(modelId);
}

const EXTRACTION_SYSTEM_PROMPT = `You are a silent memory extraction agent. Your ONLY job is to call saveMemory for any personal information you detect in the user's message. Never generate any text response — only call saveMemory.

Extract and save ANY of the following patterns:

**Identity / Name**
- "I'm [name]" / "my name is [name]" / "call me [name]" → key=preferred_name, category=personal
- "I go by [nickname]" → key=preferred_name, category=personal

**Contact info (self)**
- Any email address pattern (x@y.z) → key=email, category=contact
- Any phone / mobile number → key=phone, category=contact

**Other people's contact info**
- "[Name]'s email is X" / "email [Name] at X" → key=contact_[lowercasename]_email, category=contact
- "[Name]'s phone/number is X" → key=contact_[lowercasename]_phone, category=contact
- "[Name]'s address is X" → key=contact_[lowercasename]_address, category=contact

**Relationships**
- "my boss [Name]" / "my manager [Name]" → key=relationship_[lowercasename], value=boss, category=personal
- "my friend [Name]" / "my colleague [Name]" / "my wife/husband/partner [Name]" → key=relationship_[lowercasename], value=friend/colleague/partner/etc, category=personal

**Location / timezone**
- "I'm in [city/country]" / "I live in [place]" → key=location, category=personal
- "my timezone is X" / "I'm in [timezone]" → key=timezone, category=settings

**Occupation / work**
- "I work at [company]" / "I'm a [job title]" → key=occupation, category=work
- "my company is [name]" → key=company, category=work

**Preferences**
- "I prefer/like/love/always use X" for tools, languages, themes, colors, etc. → descriptive snake_case key, category=preferences
- "I hate/dislike/never use X" → key with value "dislikes X", category=preferences
- "my favorite [thing] is X" → key=favorite_[thing], category=preferences

**Goals / interests**
- "I'm trying to [goal]" / "I want to [goal]" → key=goal_[slug], category=interests
- "I'm interested in X" → key=interest_[slug], category=interests

**Language**
- "I speak [language]" / "respond in [language]" → key=preferred_language, category=settings

If the message contains NONE of the above, do nothing — make ZERO tool calls and produce NO text output.
Do NOT save generic facts, opinions, questions, or commands that are not personal data about the user or their contacts.`;

/**
 * Extracts personal information from a user message and silently persists it.
 * Call fire-and-forget: extractAndSaveMemories(...).catch(() => {})
 */
export async function extractAndSaveMemories(
  userId: string,
  userMessage: string,
  modelId = "gemini-2.0-flash"
): Promise<void> {
  if (!userMessage.trim()) return;

  const memTools = createMemoryTools(userId);

  await generateText({
    model: resolveModel(modelId),
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
    tools: {
      saveMemory: memTools.saveMemory,
    },
    toolChoice: "auto",
    stopWhen: stepCountIs(10), // Allow saving multiple facts in one pass
  });
}

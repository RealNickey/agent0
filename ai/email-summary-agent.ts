import { cohere } from "@ai-sdk/cohere";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { Output, ToolLoopAgent, stepCountIs } from "ai";
import { z } from "zod";

const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

// Groq's structured output strictly requires every key in `properties` to also
// appear in `required`. Using `.optional()` in zod produces non-required JSON
// Schema properties, which Groq rejects. Instead we use `.nullable()` so the
// field IS always present in `required` but may be null.
//
// For providers that don't have this restriction (Google, Cohere) the schema
// works fine with nullable fields too, so we use a single unified schema.

const emailActionItemSchema = z.object({
  text: z.string().describe("Specific action the recipient should consider taking."),
  dueLabel: z.string().nullable().describe("Human-readable deadline phrase when the email includes one. Null if none."),
});

const emailTodoItemSchema = z.object({
  title: z.string().describe("Short task title suitable for a to-do list."),
  notes: z.string().nullable().describe("Helpful context pulled from the email. Null if none."),
  due: z.string().nullable().describe("ISO 8601 or YYYY-MM-DD due date when the email clearly implies one. Null if none."),
  priority: z.enum(["high", "medium", "low"]).nullable().describe("Suggested task priority. Null if uncertain."),
});

const emailCalendarEventSchema = z.object({
  title: z.string().describe("Concise event title."),
  startDateTime: z.string().describe("Start date/time in ISO 8601 format, or YYYY-MM-DD for all-day events."),
  endDateTime: z.string().describe("End date/time in ISO 8601 format, or YYYY-MM-DD for all-day events."),
  location: z.string().nullable().describe("Location or meeting link if present. Null if none."),
  attendees: z.array(z.string().email()).nullable().describe("Attendee emails only when explicitly present. Null if none."),
  description: z.string().nullable().describe("Useful event details from the email. Null if none."),
});

const emailSummarySchema = z.object({
  emails: z.array(
    z.object({
      index: z.number().describe("Index of the email in the input array."),
      importance: z.enum(["high", "medium", "low"]).describe("Importance ranking for inbox triage."),
      shortTitle: z.string().describe("Concise AI title under 45 characters."),
      summary: z.string().describe("Markdown-friendly summary focused on why the email matters. Do not include a separate action-items section here."),
      suggestedReply: z.string().describe('Professional 2-4 sentence reply draft tailored to the sender and request. Return exactly "No reply needed." only for pure FYI, promotional, or automated emails that clearly do not merit any response.'),
      actionItems: z.array(emailActionItemSchema).describe("Concrete recipient actions only when they are actually relevant. Otherwise return an empty array."),
      todoItems: z.array(emailTodoItemSchema).describe("Structured tasks only when the email naturally maps to trackable to-dos. Otherwise return an empty array."),
      calendarEvent: emailCalendarEventSchema.nullable().describe("Structured event draft only when the email contains enough scheduling detail to create one. Otherwise return null."),
    })
  ),
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

const EMAIL_SUMMARY_AGENT_INSTRUCTIONS = `
You are an email triage agent.

Analyze each email independently and return one structured result for every input index.

Rules:
- Keep summaries specific, compact, and useful.
- Use markdown sparingly in summaries, mainly for bolding important names, dates, deadlines, amounts, or project names.
- Only return actionItems when the recipient has something meaningful to do.
- Only return todoItems when the email naturally maps to trackable tasks.
- Only return calendarEvent when the email includes enough scheduling detail to create a reasonable event draft.
- Draft a reply for most human-to-human emails, especially when there is a request, update, invitation, approval, scheduling note, deliverable, question, or follow-up opportunity.
- When writing suggestedReply, infer a sensible response goal from the subject and preview, acknowledge the sender's context, and include the next step when one is implied.
- Prefer a brief helpful reply over "No reply needed." when the email appears personal, collaborative, or work-related.
- For nullable fields (dueLabel, notes, due, priority, location, attendees, description), return null when the information is not present.
- Empty arrays and null are preferred over low-confidence guesses.
- Return exactly "No reply needed." only if the email is clearly automated, promotional, bulk informational, or a status update that obviously does not warrant any response.
- Do not invent dates, attendees, or deadlines that are not reasonably implied by the email.

Importance guidance:
- high: urgent, direct asks, approvals, blockers, meeting logistics, legal/financial urgency.
- medium: relevant work or personal communication worth attention but not urgent.
- low: newsletters, marketing, digests, routine automation with no clear action.
`;

export function createEmailSummaryAgent(modelId: string) {
  const model = resolveModel(modelId);

  return new ToolLoopAgent({
    model,
    instructions: EMAIL_SUMMARY_AGENT_INSTRUCTIONS,
    output: Output.object({
      schema: emailSummarySchema,
    }),
    stopWhen: stepCountIs(4),
    temperature: 0.2,
  });
}
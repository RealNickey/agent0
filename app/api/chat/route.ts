import { google } from "@ai-sdk/google";
import { cohere } from "@ai-sdk/cohere";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { z } from "zod";
import type { MyUIMessage } from "@/types/chat";
import { tools as weatherTools } from "@/ai/tools";
import { calendarTools } from "@/ai/calendar-tools";
import { formsTools } from "@/ai/forms-tools";
import { gmailTools } from "@/ai/gmail-tools";
import { tasksTools } from "@/ai/tasks-tools";
import { githubTools } from "@/ai/github-tools";
import { slidesTools } from "@/ai/slides-tools";
import { createImageTools } from "@/ai/image-tools";
import { movieTools } from "@/ai/movie-tools";
import { researchTools } from "@/ai/research-tools";
// PDF tools removed — handled entirely client-side to avoid tool part serialization issues
import { GMAIL_AGENT_PROMPT } from "@/ai/prompts/gmail";
import { GITHUB_AGENT_PROMPT } from "@/ai/prompts/github";
import { SLIDES_PROMPT } from "@/ai/prompts/slides";
import { isToolInstalled } from "@/lib/installed-tools";
import { getNextFallbackModel, isRateLimitError, type ModelRetryMetadata } from "@/lib/model-fallback";
import { auth } from '@clerk/nextjs/server';
import { getMemoriesForUser, formatMemoriesForPrompt } from '@/lib/db/memory';
import { createMemoryTools } from '@/ai/memory-tools';
import { extractAndSaveMemories } from '@/lib/memory-extractor';

// Initialize free provider clients
const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "",
});

const openrouter = createOpenAI({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Agent0",
  },
});

export const maxDuration = 60;

// Helper function to clean messages for non-Google providers
// Removes Google-specific parts (reasoning, sources) that other providers don't support
function cleanMessagesForProvider(messages: MyUIMessage[], isGoogleModel: boolean): MyUIMessage[] {
  if (isGoogleModel) {
    return messages; // Google models support all part types
  }

  // For non-Google providers, filter out unsupported parts
  const cleanedMessages = messages.map((msg) => {
    if (!msg.parts || !Array.isArray(msg.parts)) {
      return msg;
    }

    const cleanedParts = msg.parts.filter((part) => {
      // Keep standard parts: text, file, tool-*, image-url, image
      // Remove: reasoning, source-url, source-document
      if (part.type === "reasoning") return false;
      if (part.type === "source-url") return false;
      if (part.type === "source-document") return false;
      return true;
    });

    return {
      ...msg,
      parts: cleanedParts,
    };
  }).filter((msg) => {
    // Remove messages with no parts or empty parts array
    return msg.parts && msg.parts.length > 0;
  });

  return cleanedMessages;
}

function sanitizeToolParts(messages: MyUIMessage[]): MyUIMessage[] {
  return messages
    .map((msg) => {
      if (!msg.parts || !Array.isArray(msg.parts)) {
        return msg;
      }

      const sanitizedParts = msg.parts.filter((part: MyUIMessage["parts"][number]) => {
        if (!part || typeof part.type !== "string") {
          return false;
        }

        // Handle tool-invocation structure
        if (part.type === "tool-invocation") {
          const p = part as any;
          const toolName =
            p.toolName || p.toolInvocation?.toolName || p.tool?.name;
          if (typeof toolName !== "string" || toolName.trim().length === 0) {
            return false;
          }
          // Ensure state exists
          if (!p.state) {
            p.state = p.result || p.output ? "result" : "call";
          }
          return true;
        }

        // Handle tool-{name} format (AI SDK 5.0+)
        if (part.type.startsWith("tool-")) {
          const toolName = part.type.slice(5);
          if (toolName.trim().length === 0) {
            return false;
          }
          // Ensure these have proper structure
          const p = part as any;
          if (!p.toolName) {
            p.toolName = toolName;
          }
          if (!p.state) {
            p.state = p.result || p.output ? "result" : "call";
          }
          if (!p.toolCallId) {
            p.toolCallId = `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          return true;
        }

        return true;
      });

      return {
        ...msg,
        parts: sanitizedParts,
      };
    })
    .filter((msg) => msg.parts && msg.parts.length > 0);
}

// Helper function to get model instance and provider options
function getModelInstance(model: string, enableThinking: boolean) {
  let modelInstance: any;
  let providerOptions: any = {};

  if (model.startsWith("groq:")) {
    const modelId = model.replace("groq:", "");
    modelInstance = groq(modelId);
  } else if (model.startsWith("cohere:")) {
    const modelId = model.replace("cohere:", "");
    modelInstance = cohere(modelId);
  } else if (model.startsWith("openrouter:")) {
    const modelId = model.replace("openrouter:", "");
    modelInstance = openrouter(modelId);
  } else {
    // Default to Google Gemini
    modelInstance = google(model);
    providerOptions = {
      google: {
        ...(enableThinking &&
          model.includes("2.5") && {
            thinkingConfig: {
              thinkingBudget: 4096,
              includeThoughts: true,
            },
          }),
        ...(enableThinking &&
          model.includes("gemini-3") && {
            thinkingConfig: {
              thinkingLevel: "high",
              includeThoughts: true,
            },
          }),
      },
    };
  }

  return { modelInstance, providerOptions };
}

const bodySchema = z.object({
  messages: z.array(z.any()), // Will be validated as UIMessage[] at runtime
  model: z.string(),
  sessionId: z.string().uuid().optional(),
  enableSearch: z.boolean().optional(),
  enableThinking: z.boolean().optional(),
  enableUrlContext: z.boolean().optional(),
  enableCodeExecution: z.boolean().optional(),
  mentionedTools: z.array(z.string()).optional(),
});

// Custom error handler for user-friendly error messages
function getErrorMessage(error: unknown): string {
  if (error == null) {
    return "An unknown error occurred";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("rate limit")) {
      return "Rate limit exceeded. Please try again in a moment.";
    }
    if (error.message.includes("context length")) {
      return "The conversation is too long. Please start a new chat.";
    }
    if (error.message.includes("API key")) {
      return "API configuration error. Please contact support.";
    }
    return error.message;
  }

  return JSON.stringify(error);
}

export async function POST(req: Request) {
  let parsedBody;

  try {
    parsedBody = bodySchema.parse(await req.json());
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
        details: error instanceof Error ? error.message : error,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const {
    messages,
    model,
    sessionId,
    enableSearch = false,
    enableThinking = true,
    enableUrlContext = true,
    enableCodeExecution = true,
    mentionedTools = [],
  } = parsedBody;

  // Load user memories — always on, core property
  const { userId } = await auth()
  let memoryBlock = ''
  if (userId) {
    try {
      const memories = await getMemoriesForUser(userId)
      memoryBlock = formatMemoriesForPrompt(memories)
    } catch (e) {
      console.error("[Memory] Failed to load memories:", e);
    }

    // Fire-and-forget: silently extract personal facts from the last user message.
    // Runs in parallel with the main stream — never delays the response.
    const lastUserMsg = (messages as MyUIMessage[])
      .slice()
      .reverse()
      .find((m) => m.role === 'user')
    const lastUserText = lastUserMsg?.parts
      ?.filter((p: { type: string }) => p.type === 'text')
      .map((p: { type: string; text?: string }) => p.text ?? '')
      .join(' ')
      .trim()
    if (lastUserText) {
      extractAndSaveMemories(userId, lastUserText, model).catch((e) =>
        console.error('[MemoryExtractor] Failed:', e)
      )
    }
  }

  // Type-cast messages to MyUIMessage[] for type safety
  let uiMessages = messages as MyUIMessage[];

  // Mermaid prompt injection (backend-only, not visible to UI)
  const hasMermaid = mentionedTools.some(tool => tool.toLowerCase() === "mermaid");
  if (hasMermaid && uiMessages.length > 0) {
    const lastMessage = uiMessages[uiMessages.length - 1];
    if (lastMessage.role === "user" && lastMessage.parts) {
      const modifiedParts = lastMessage.parts.map(part => {
        if (part.type === "text" && typeof part.text === "string") {
          return {
            ...part,
            text: `CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:

You MUST return a Mermaid diagram wrapped in markdown code fence syntax. Do NOT return:
- HTML code
- JavaScript code
- Python code  
- Any explanatory text before or after the code block
- Multiple code blocks

REQUIRED OUTPUT FORMAT:
\`\`\`mermaid
[Mermaid diagram code here]
\`\`\`

VALID DIAGRAM TYPES (choose the most appropriate):
- flowchart TD / flowchart LR (for workflows, processes, decision trees)
- sequenceDiagram (for interactions between entities over time)
- classDiagram (for object-oriented class structures)
- erDiagram (for database entity relationships)
- gantt (for project timelines and schedules)
- gitGraph (for version control branches)
- journey (for user experience flows)
- stateDiagram-v2 (for state machines)
- pie (for percentage breakdowns)
- mindmap (for hierarchical concepts)
- timeline (for chronological events)
- graph TD / graph LR (simple node-edge graphs)

EXAMPLE CORRECT OUTPUT for "login page":
\`\`\`mermaid
flowchart TD
    A[User Opens App] --> B[Login Page]
    B --> C{Valid Credentials?}
    C -->|Yes| D[Dashboard]
    C -->|No| E[Error Message]
    E --> B
\`\`\`

Now generate the Mermaid diagram for: ${part.text}

Remember: Return ONLY the markdown code block with mermaid syntax. No additional text.`
          };
        }
        return part;
      });

      uiMessages = [
        ...uiMessages.slice(0, -1),
        {
          ...lastMessage,
          parts: modifiedParts,
        }
      ];
    }
  }

  // ALWAYS strip large base64 PDF file parts from ALL messages to prevent body size explosion
  // Also strip any PDF tool parts that may have leaked into message history
  uiMessages = uiMessages.map(msg => {
    if (msg.parts) {
      const cleanedParts = (msg.parts as any[])
        .filter(part => {
          // Remove PDF tool parts entirely — these are client-side only
          if (part.type === "tool-mergePDFs" || part.type === "tool-compressPDF") return false;
          if (part.type === "tool-invocation" && (part.toolName === "mergePDFs" || part.toolName === "compressPDF")) return false;
          // Remove generateImage tool parts entirely — base64 images are massive (500KB–2MB)
          // and the LLM has no need to see them; the result is rendered purely in the UI
          if (part.type === "tool-generateImage") return false;
          if (part.type === "tool-invocation" && part.toolName === "generateImage") return false;
          return true;
        })
        .map(part => {
        // Strip base64 PDF data URLs (they can be 10MB+ each)
        if (part.type === "file" && typeof part.url === "string" && part.url.startsWith("data:application/pdf")) {
          return { type: "text", text: "(PDF file - processed separately)" };
        }
        if (part.type === "file" && part.mediaType === "application/pdf" && typeof part.url === "string" && part.url.length > 1000) {
          return { type: "text", text: "(PDF file - processed separately)" };
        }
        // Also strip any giant tool result data (e.g. base64 PDF output stored in result)
        // Check both tool-invocation structure and tool-{name} structure
        if (part.type === "tool-invocation" || part.type?.startsWith?.("tool-")) {
          // Handle tool-invocation with nested result
          if (part.toolInvocation?.result?.fileUrl) {
            const url = part.toolInvocation.result.fileUrl;
            if (typeof url === "string" && url.length > 1000) {
              return {
                ...part,
                toolInvocation: {
                  ...part.toolInvocation,
                  result: { ...part.toolInvocation.result, fileUrl: "(stripped for API)" }
                }
              };
            }
          }
          // Handle tool-{name} with direct result property
          if (part.result?.fileUrl) {
            const url = part.result.fileUrl;
            if (typeof url === "string" && url.length > 1000) {
              return {
                ...part,
                result: { ...part.result, fileUrl: "(stripped for API)" }
              };
            }
          }
          // Handle args with file URLs (input PDFs)
          if (part.args?.fileUrls && Array.isArray(part.args.fileUrls)) {
            const hasLargeFiles = part.args.fileUrls.some((url: any) => 
              typeof url === "string" && url.length > 1000
            );
            if (hasLargeFiles) {
              return {
                ...part,
                args: { 
                  ...part.args, 
                  fileUrls: part.args.fileUrls.map(() => "(stripped for API)")
                }
              };
            }
          }
          if (part.args?.fileUrl && typeof part.args.fileUrl === "string" && part.args.fileUrl.length > 1000) {
            return {
              ...part,
              args: { ...part.args, fileUrl: "(stripped for API)" }
            };
          }
        }
        return part;
      });
      return { ...msg, parts: cleanedParts } as MyUIMessage;
    }
    return msg;
  }).filter(msg => {
    // Remove messages with empty parts (e.g., messages that only had PDF tool parts)
    if (msg.parts && Array.isArray(msg.parts) && msg.parts.length === 0) return false;
    return true;
  });

  // Check if using Google model
  const isGoogleModel = !model.includes(":");

  // Clean messages for non-Google providers (removes reasoning, sources, etc.)
  const cleanedMessages = cleanMessagesForProvider(uiMessages, isGoogleModel);
  const sanitizedMessages = sanitizeToolParts(cleanedMessages);

  // Log for debugging OpenRouter issues
  if (model.startsWith("openrouter:")) {
    console.log("OpenRouter request - cleaned messages count:", cleanedMessages.length);
    console.log("OpenRouter request - first message:", JSON.stringify(cleanedMessages[0], null, 2));
  }

  // Convert UI messages to model messages using the AI SDK helper (async in v6)
  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(sanitizedMessages);
  } catch (error) {
    console.error("convertToModelMessages failed", error);
    console.error("Sanitized messages that caused failure:", JSON.stringify(sanitizedMessages, null, 2));
    
    // Try to identify which message caused the issue
    for (let i = 0; i < sanitizedMessages.length; i++) {
      const msg = sanitizedMessages[i];
      console.error(`Message ${i} (${msg.role}):`, JSON.stringify(msg, null, 2));
    }
    
    return new Response(
      JSON.stringify({
        error: "Invalid messages",
        details:
          error instanceof Error ? error.message : "Unable to convert messages",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build tools object based on mentioned tools and enabled features
  const tools: Record<string, any> = {};
  const hasCustomTools = mentionedTools.length > 0;

  // Add @mentioned custom tools (like weather)
  // When custom tools are mentioned, ONLY use those tools (disable provider tools)
  if (hasCustomTools) {
    for (const toolName of mentionedTools) {
      const lowerToolName = toolName.toLowerCase();
      
      // Map mentioned tool names to actual tool implementations
      if (lowerToolName === "weather") {
        tools.displayWeather = weatherTools.displayWeather;
      }
      // Calendar tools
      if (lowerToolName === "calendar") {
        if (isToolInstalled("calendar")) {
          tools.scheduleCalendarEvent = calendarTools.scheduleCalendarEvent;
          tools.listCalendarEvents = calendarTools.listCalendarEvents;
          tools.updateCalendarEvent = calendarTools.updateCalendarEvent;
          tools.deleteCalendarEvent = calendarTools.deleteCalendarEvent;
          tools.findCalendarAvailability = calendarTools.findCalendarAvailability;
          tools.getCalendarEvent = calendarTools.getCalendarEvent;
        } else {
             // Optionally add a system message or error logic here if the tool is not installed
             // For now, we just don't add the tools
             console.warn("Calendar tool mentioned but not installed");
        }
      }
      // Forms/Survey tools
      if (lowerToolName === "forms" || lowerToolName === "survey") {
        if (isToolInstalled("forms")) {
          tools.createSurveyForm = formsTools.createSurveyForm;
          // confirmCreateForm is NOT registered here to prevent AI from bypassing HITL.
          // The UI handles confirmation via /api/forms/create directly (same pattern as calendar).
          tools.fetchNewResponses = formsTools.fetchNewResponses;
          tools.watchResponsesWebhook = formsTools.watchResponsesWebhook;
          tools.updateFormSchema = formsTools.updateFormSchema;
          tools.getResponseSummary = formsTools.getResponseSummary;
        } else {
          console.warn("Forms tool mentioned but not installed");
        }
      }
      // Gmail tools
      if (lowerToolName === "gmail") {
        if (isToolInstalled("gmail")) {
          tools.composeEmail = gmailTools.composeEmail;
          tools.searchEmails = gmailTools.searchEmails;
          tools.getThread = gmailTools.getThread;
          tools.createDraft = gmailTools.createDraft;
          tools.sendMessage = gmailTools.sendMessage;
          tools.getMessageContent = gmailTools.getMessageContent;
          tools.getImportantEmails = gmailTools.getImportantEmails;
          tools.getContactEmails = gmailTools.getContactEmails;
          tools.markAsImportant = gmailTools.markAsImportant;
        } else {
          console.warn("Gmail tool mentioned but not installed");
        }
      }
      // Tasks tools
      if (lowerToolName === "tasks" || lowerToolName === "task" || lowerToolName === "todo" || lowerToolName === "todos") {
        if (isToolInstalled("tasks")) {
          tools.scheduleTask = tasksTools.scheduleTask;
          tools.confirmScheduledTask = tasksTools.confirmScheduledTask;
          tools.createTask = tasksTools.createTask;
          tools.listTasks = tasksTools.listTasks;
          tools.updateTask = tasksTools.updateTask;
          tools.deleteTask = tasksTools.deleteTask;
          tools.completeTask = tasksTools.completeTask;
          tools.uncompleteTask = tasksTools.uncompleteTask;
          tools.getTask = tasksTools.getTask;
          tools.getTaskLists = tasksTools.getTaskLists;
        } else {
          console.warn("Tasks tool mentioned but not installed");
        }
      }
      // GitHub tools
      if (lowerToolName === "github") {
        if (isToolInstalled("github")) {
          tools.createIssue = githubTools.createIssue;
          tools.createBranch = githubTools.createBranch;
          tools.createPullRequest = githubTools.createPullRequest;
          tools.mergePullRequest = githubTools.mergePullRequest;
          tools.commentOnPR = githubTools.commentOnPR;
          tools.listPullRequests = githubTools.listPullRequests;
          tools.listRepositories = githubTools.listRepositories;
          tools.getRepository = githubTools.getRepository;
          tools.listBranches = githubTools.listBranches;
          tools.scheduleIssueCreation = githubTools.scheduleIssueCreation;
          tools.schedulePRCreation = githubTools.schedulePRCreation;
          tools.scheduleMerge = githubTools.scheduleMerge;
        } else {
          console.warn("GitHub tool mentioned but not installed");
        }
      }
      // Slides/Presentation tools
      if (lowerToolName === "slides" || lowerToolName === "presentation" || lowerToolName === "ppt") {
        if (isToolInstalled("slides")) {
          tools.schedulePresentationHeadings = slidesTools.schedulePresentationHeadings;
          tools.createPresentation = slidesTools.createPresentation;
        } else {
          console.warn("Slides tool mentioned but not installed");
        }
      }
      // Image generation tool (Cloudflare Workers AI - Flux-1-Schnell)
      // Only available to authenticated users — images are scoped to userId in Blob storage
      if (lowerToolName === "image" && userId) {
        tools.generateImage = createImageTools(userId).generateImage;
      }
      // Movie tool (TMDB)
      if (lowerToolName === "movie") {
        tools.searchMovie = movieTools.searchMovie;
      }
      // Research tool (Wikipedia, PubMed, OpenAlex, DuckDuckGo)
      if (lowerToolName === "research") {
        tools.conductResearch = researchTools.conductResearch;
      }
      // PDF tools — handled entirely client-side (no LLM involvement)
      // The @pdf mention is intercepted in chat-ui.tsx before reaching this route
      // Add more tool mappings here as needed
    }
  } else {
    // Only add Google provider tools when NO custom tools are mentioned
    // This prevents mixing function tools with provider-defined tools
    // Note: Google-specific tools only work with Google models
    const isGoogleModel = !model.includes(":");

    if (enableSearch && isGoogleModel) {
      tools.google_search = google.tools.googleSearch({});
    }

    if (enableUrlContext && isGoogleModel) {
      tools.url_context = google.tools.urlContext({});
    }

    if (enableCodeExecution && isGoogleModel) {
      tools.code_execution = google.tools.codeExecution({});
    }
  }

  // Inject memory tools — always active except when Google provider tools are present
  // (Google provider tools and function tools cannot be mixed in the same request)
  const hasProviderTools = 'google_search' in tools || 'url_context' in tools || 'code_execution' in tools;
  if (userId && !hasProviderTools) {
    const memTools = createMemoryTools(userId);
    tools.saveMemory = memTools.saveMemory;
    tools.getMemories = memTools.getMemories;
    tools.deleteMemory = memTools.deleteMemory;
    tools.searchMemory = memTools.searchMemory;
  }

  // Build guidance strings outside the retry loop to avoid redeclaration
  const calendarGuidance = mentionedTools.some(t => t.toLowerCase() === "calendar")
    ? " When the user asks about calendar events or scheduling, use the calendar tools to fetch, create, update, or delete events. For scheduling, use scheduleCalendarEvent to present options to the user first."
    : "";

  const formsGuidance = mentionedTools.some(t => t.toLowerCase() === "forms" || t.toLowerCase() === "survey")
    ? " When the user wants to create a form/survey, ALWAYS call createSurveyForm immediately with inferred questions. Infer question types: yes/no questions → MULTIPLE_CHOICE with ['Yes', 'No'], open-ended → PARAGRAPH or SHORT_ANSWER, rating → LINEAR_SCALE, selection → CHECKBOX or MULTIPLE_CHOICE. Let the user review in the UI before creating. For polling responses, use fetchNewResponses. For statistics, use getResponseSummary."
    : "";

  const tasksGuidance = mentionedTools.some(t => ["tasks", "task", "todo", "todos"].includes(t.toLowerCase()))
    ? " When the user wants to create a task/todo, use scheduleTask to present the task details for confirmation. For listing tasks, use listTasks. To mark tasks complete, use completeTask. For updating task details, use updateTask. For deleting tasks, use deleteTask (which requires confirmation). Always parse relative dates like 'tomorrow', 'next week' into proper ISO dates. CRITICAL: After calling any task tool (scheduleTask, createTask, updateTask, deleteTask, completeTask, listTasks), DO NOT provide any additional text explanation. The generative UI component displays all necessary information to the user. ONLY provide additional text if you need clarification from the user (e.g., asking which task to update if there are multiple matches)."
    : "";

  const githubGuidance = mentionedTools.some(t => t.toLowerCase() === "github")
    ? " GitHub Agent Instructions: You are a multi-step agentic GitHub assistant. CRITICAL WORKFLOW: " +
      "1) ALWAYS call listRepositories FIRST to get repo context before any operation. " +
      "2) For PRs: call listBranches to validate branch names and self-correct user input (e.g. 'worktree' → 'work-tree'). " +
      "3) For issues: use scheduleIssueCreation with pre-filled repo from listRepositories + availableRepos list for dropdown. NEVER list repos as text. " +
      "4) For PRs: use schedulePRCreation with validated branches + availableBranches list for dropdown. " +
      "5) For merges: call listPullRequests first to find the correct PR, then use scheduleMerge. " +
      "6) NEVER call createIssue, createPullRequest, or mergePullRequest directly — ALWAYS use schedule variants for Gen UI. " +
      "7) After calling schedule tools, DO NOT add extra text — the Gen UI handles display. " +
      "8) When user says 'PR from X to Y', that means head=X, base=Y — validate both branches exist first."
    : "";

  const gmailGuidance = mentionedTools.some(t => t.toLowerCase() === "gmail")
    ? " Gmail Agent Instructions: You are a multi-step agentic Gmail assistant. " +
      "When the user asks about important emails, use getImportantEmails to fetch starred/important messages. " +
      "When the user asks about emails from specific people or VIP contacts, use getContactEmails with their email addresses. " +
      "When the user wants to star or flag an email, use markAsImportant with the message ID. " +
      "For composing emails, ALWAYS use composeEmail to present a draft for user review before sending. " +
      "Chain tools when needed: e.g., searchEmails → getMessageContent → composeEmail for reply workflows. " +
      "After presenting email search results or drafts, DO NOT repeat the full content as text — the tool UI handles display."
    : "";

  const movieGuidance = mentionedTools.some(t => t.toLowerCase() === "movie")
    ? " Movie tool instructions: When the user asks about a movie (any language — English, Hindi, Malayalam, Tamil, Telugu, Korean, etc.), ALWAYS call searchMovie with just the bare movie title as the 'title' argument. Do NOT pass '@movie' or '@film' in the title field — strip that prefix. Do NOT answer from memory; always call the tool. After the tool result is rendered, DO NOT repeat the movie details as text."
    : "";

  const researchGuidance = mentionedTools.some(t => t.toLowerCase() === "research")
    ? " Research Agent Instructions: When the user asks about any topic, medical condition, project, technology, or concept, use conductResearch to search multiple authoritative sources simultaneously. Set category to 'medical' for health/disease queries, 'academic' for papers/studies, 'technology' for tech topics, or 'auto' to auto-detect. After research completes, DO NOT repeat the full findings as text — the Research Report Gen UI component displays everything with copy and download options. Only add brief commentary if needed."
    : "";

  const slidesGuidance = mentionedTools.some(t => ["slides", "presentation", "ppt"].includes(t.toLowerCase()))
    ? ` ${SLIDES_PROMPT}\n\nSlides workflow is mandatory: first call schedulePresentationHeadings to produce a pending confirmation heading plan (no HTML output). Generate SPECIFIC, DESCRIPTIVE headings that reflect real content about the topic — not generic headings like "Current Landscape" or "Key Drivers". For example, for "Ferrari vs Benz" use headings like "Ferrari's Racing Heritage: 75+ Years of F1 Dominance", "Mercedes-Benz: Engineering Luxury Since 1886", etc. Wait for user confirmation in UI. The backend AI agent automatically generates real factual content, picks topic-matching colors, and fetches relevant Unsplash images — you do NOT need to call createPresentation. Never output raw HTML directly as assistant text. When the presentation card/tool UI is available, do not output slide outlines, summaries, or duplicate narrative text in chat. Only send assistant text if you must ask a direct clarification question due to missing required inputs.`
    : "";

  // PDF guidance removed — PDF operations are handled client-side

  // Retry logic with automatic model fallback on rate limiting
  const maxRetries = 3;
  let currentModel = model;
  const attemptedModels = new Set<string>([currentModel]);
  let lastError: unknown = null;
  const retryMetadata: ModelRetryMetadata = {
    originalModel: model,
    attemptedModels: [currentModel],
    finalModel: currentModel,
    retryCount: 0,
  };

  // Try to get the stream with automatic fallback on rate limits
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Get model instance for current model
      const { modelInstance, providerOptions } = getModelInstance(currentModel, enableThinking);


      // Check if Google-specific tools should be disabled for non-Google models
      let currentTools = { ...tools };
      const isGoogleModel = !currentModel.includes(":");
      const isOpenRouterModel = currentModel.startsWith("openrouter:");

      if (!isGoogleModel && !hasCustomTools) {
        // Remove Google-specific tools for non-Google models
        delete currentTools.google_search;
        delete currentTools.url_context;
        delete currentTools.code_execution;
      }

      // Temporarily disable tools for OpenRouter free models due to API compatibility issues
      if (isOpenRouterModel && currentModel.includes(":free")) {
        console.warn("Disabling tools for OpenRouter free model due to API constraints");
        currentTools = {};
      }

      const hasCurrentTools = Object.keys(currentTools).length > 0;

      // Build system prompt with agent-specific persona if needed
      let systemPrompt = `The current date and time is ${new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}. Use this to resolve relative date mentions like "today", "tomorrow", "next Monday", etc. If the user asks for "events today" or "schedule", assume the default time range starts now and ends at the end of the day or covers a reasonable period, do not ask for clarification unless necessary.`;

      // Memory instructions — always present so the model can leverage stored context
      // even in provider-tool-only mode (memory block is always injected via system prompt).
      if (userId) {
        if (!hasProviderTools) {
          // Full tool-based instructions when saveMemory/searchMemory are available
          systemPrompt += `\n\nMemory Instructions: You have access to saveMemory, getMemories, deleteMemory, and searchMemory tools.\n- PROACTIVELY call saveMemory whenever the user shares ANY personal info (name, email, phone, location, timezone, occupation, preferences, goals, or anyone else's contact details). Do this silently without mentioning it.\n- When the user says "my name is X" or "call me X", immediately call saveMemory with key=preferred_name, category=personal.\n- When the user mentions another person's contact info ("Alice's email is x@y.z"), save it as key=contact_alice_email, category=contact.\n- When the user says "forget X" or "don't remember X", call deleteMemory.\n- ENTITY RESOLUTION: When the user refers to a person by name for any action ("send email to Johnson", "call Sarah", "schedule with Alice"), FIRST check the Contacts section of the memory block above. If their details are there, use them directly. If NOT found in the memory block, call searchMemory with the person's name to attempt a live lookup before asking the user.\n- Use getMemories only if the user explicitly asks what you know about them.`;
        } else {
          // Read-only guidance when only provider tools are active
          systemPrompt += `\n\nMemory Context: The memory block above contains facts about this user including contacts. When the user refers to a person by name ("email Johnson", "call Sarah"), check the Contacts section of the memory block first and use their details directly if found.`;
        }
      }

      // Add Gmail agent persona when Gmail tools are active
      if (mentionedTools.some(tool => tool.toLowerCase() === "gmail")) {
        systemPrompt += "\n\n" + GMAIL_AGENT_PROMPT;
      }

      // Add GitHub agent persona when GitHub tools are active
      if (mentionedTools.some(tool => tool.toLowerCase() === "github")) {
        systemPrompt += "\n\n" + GITHUB_AGENT_PROMPT;
      }

      // Add retry notification if this is not the first attempt
      if (attempt > 0) {
        systemPrompt += `\n\n[System: Automatically switched from ${retryMetadata.originalModel} to ${currentModel} due to rate limiting]`;
      }

      const result = streamText({
        model: modelInstance,
        system: `${systemPrompt}${calendarGuidance}${formsGuidance}${tasksGuidance}${gmailGuidance}${githubGuidance}${slidesGuidance}${movieGuidance}${researchGuidance}${memoryBlock}`,
        messages: modelMessages,
        tools: hasCurrentTools ? currentTools : undefined,
        toolChoice: hasCurrentTools ? "auto" : "none",
        providerOptions,
        // Always enable multi-step when any tools are present so the model can
        // call a tool (e.g. getMemories) AND then generate a text response in
        // the same turn. Without this, the stream stops after the tool call
        // and the user sees no answer until the next message.
        ...(hasCurrentTools && { stopWhen: stepCountIs(8) }),
        onError: (error) => {
          console.error("Stream error:", error);
        },
      });

      // Update metadata with successful model
      retryMetadata.finalModel = currentModel;
      retryMetadata.retryCount = attempt;

      return result.toUIMessageStreamResponse({
        sendReasoning: enableThinking,
        sendSources: true,
        originalMessages: uiMessages,
        onError: getErrorMessage,
        messageMetadata: ({ part }) => {
          // Send metadata when streaming starts
          if (part.type === "start") {
            return {
              createdAt: Date.now(),
              model: currentModel,
              retryMetadata: attempt > 0 ? retryMetadata : undefined,
            };
          }

          // Send additional metadata when streaming completes
          if (part.type === "finish" && part.totalUsage) {
            return {
              totalTokens: part.totalUsage.totalTokens,
              totalUsage: {
                inputTokens: part.totalUsage.inputTokens,
                outputTokens: part.totalUsage.outputTokens,
                totalTokens: part.totalUsage.totalTokens,
                reasoningTokens: part.totalUsage.reasoningTokens,
                cachedInputTokens: part.totalUsage.cachedInputTokens,
              },
              retryMetadata: attempt > 0 ? retryMetadata : undefined,
            };
          }

          return undefined;
        },
      });
    } catch (error: unknown) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed with model ${currentModel}:`, error);

      // Check if this is a rate limit error
      if (isRateLimitError(error)) {
        // Try to find next fallback model
        const nextModel = getNextFallbackModel(currentModel, attemptedModels);

        if (nextModel && attempt < maxRetries - 1) {
          console.log(`Rate limit hit, falling back to: ${nextModel}`);
          currentModel = nextModel;
          attemptedModels.add(nextModel);
          retryMetadata.attemptedModels.push(nextModel);
          // Continue to next iteration
          continue;
        } else {
          // No more fallback models or out of retries
          console.error("No more fallback models available or max retries reached");
          break;
        }
      } else {
        // Not a rate limit error, don't retry
        console.error("Non-rate-limit error, not retrying:", error);
        break;
      }
    }
  }

  // If we get here, all retries failed
  return new Response(
    JSON.stringify({
      error: "All models failed",
      details: getErrorMessage(lastError),
      attemptedModels: retryMetadata.attemptedModels,
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" }
    }
  );
}

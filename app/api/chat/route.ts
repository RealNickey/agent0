import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
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
// PDF tools removed — handled entirely client-side to avoid tool part serialization issues
import { GMAIL_AGENT_PROMPT } from "@/ai/prompts/gmail";
import { isToolInstalled } from "@/lib/installed-tools";
import { getNextFallbackModel, isRateLimitError, type ModelRetryMetadata } from "@/lib/model-fallback";

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

      const sanitizedParts = msg.parts.filter((part: any) => {
        if (!part || typeof part.type !== "string") {
          return false;
        }

        // Handle tool-invocation structure
        if (part.type === "tool-invocation") {
          const toolName =
            part.toolName || part.toolInvocation?.toolName || part.tool?.name;
          if (typeof toolName !== "string" || toolName.trim().length === 0) {
            return false;
          }
          // Ensure state exists
          if (!part.state) {
            part.state = part.result || part.output ? "result" : "call";
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
          if (!part.toolName) {
            part.toolName = toolName;
          }
          if (!part.state) {
            part.state = part.result || part.output ? "result" : "call";
          }
          if (!part.toolCallId) {
            part.toolCallId = `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    enableSearch = false,
    enableThinking = true,
    enableUrlContext = true,
    enableCodeExecution = true,
    mentionedTools = [],
  } = parsedBody;

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
  let tools: Record<string, any> = {};
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
          tools.confirmCreateForm = formsTools.confirmCreateForm;
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
          tools.listRepos = githubTools.listRepos;
          tools.getRepoSummary = githubTools.getRepoSummary;
          tools.listIssues = githubTools.listIssues;
          tools.getPullRequests = githubTools.getPullRequests;
          tools.readGitHubFile = githubTools.readGitHubFile;
        } else {
          console.warn("GitHub tool mentioned but not installed");
        }
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

  const hasTools = Object.keys(tools).length > 0;

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
    ? " When the user asks about GitHub repositories, issues, pull requests, or code files, use the appropriate GitHub tools. Use listRepos to browse repos, getRepoSummary for repo details with README, listIssues for issues, getPullRequests for PRs, and readGitHubFile to read files or list directories."
    : "";

  // PDF guidance removed — PDF operations are handled client-side

  // Retry logic with automatic model fallback on rate limiting
  const maxRetries = 3;
  let currentModel = model;
  const attemptedModels = new Set<string>([currentModel]);
  let lastError: any = null;
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

      // Add Gmail agent persona when Gmail tools are active
      if (mentionedTools.some(tool => tool.toLowerCase() === "gmail")) {
        systemPrompt += "\n\n" + GMAIL_AGENT_PROMPT;
      }

      // Add retry notification if this is not the first attempt
      if (attempt > 0) {
        systemPrompt += `\n\n[System: Automatically switched from ${retryMetadata.originalModel} to ${currentModel} due to rate limiting]`;
      }

      const result = streamText({
        model: modelInstance,
        system: `${systemPrompt}${calendarGuidance}${formsGuidance}${tasksGuidance}${githubGuidance}`,
        messages: modelMessages,
        tools: hasCurrentTools ? currentTools : undefined,
        toolChoice: hasCurrentTools ? "auto" : "none",
        providerOptions,
        // Use stopWhen for multi-step tool calls when custom tools are mentioned
        ...(mentionedTools.length > 0 && { stopWhen: stepCountIs(5) }),
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
    } catch (error: any) {
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

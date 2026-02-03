import { tool } from "ai";
import { z } from "zod";
import { getValidAccessToken } from "@/lib/google-calendar";

/**
 * Gmail Tools for Agent0
 * 
 * These tools allow the AI agent to interact with Gmail API directly.
 * Users invoke these tools using @gmail mentions in their prompts.
 * 
 * Available operations:
 * - searchEmails: Search for emails using Gmail search operators
 * - getThread: Get full email conversation thread
 * - createDraft: Create an email draft
 * - sendMessage: Send an email or draft
 * - getMessageContent: Get detailed content of a specific email
 */

// Gmail API base URL
const GMAIL_API_BASE = "https://www.googleapis.com/gmail/v1";

// Default user ID for development (matches what we use in auth routes)
const DEFAULT_USER_ID = "default-user";

// Get access token from token store
async function getAccessToken(): Promise<string | null> {
  return await getValidAccessToken(DEFAULT_USER_ID);
}

/**
 * Make authenticated request to Gmail API
 */
async function gmailRequest<T>(
  accessToken: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: Record<string, unknown> | string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (body && method !== "GET") {
      options.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(`${GMAIL_API_BASE}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `API request failed: ${response.statusText}`,
      };
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(data: string): string {
  // Replace base64url characters with base64 equivalents
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return data;
  }
}

/**
 * Encode string to base64url
 */
function encodeBase64Url(str: string): string {
  const base64 = Buffer.from(str, "utf-8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Parse email headers to get common fields
 */
function parseHeaders(headers: Array<{ name: string; value: string }>) {
  const result: Record<string, string> = {};
  for (const header of headers) {
    const name = header.name.toLowerCase();
    if (["from", "to", "cc", "bcc", "subject", "date", "message-id", "in-reply-to", "references"].includes(name)) {
      result[name] = header.value;
    }
  }
  return result;
}

/**
 * Extract text content from message parts recursively
 */
function extractTextContent(payload: any): { text: string; html: string } {
  let text = "";
  let html = "";

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/plain") {
      text = decoded;
    } else if (payload.mimeType === "text/html") {
      html = decoded;
    }
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const partContent = extractTextContent(part);
      if (partContent.text) text = text || partContent.text;
      if (partContent.html) html = html || partContent.html;
    }
  }

  return { text, html };
}

/**
 * Parse a Gmail message to a simplified format
 */
function parseMessage(message: any) {
  const headers = parseHeaders(message.payload?.headers || []);
  const content = extractTextContent(message.payload || {});
  
  return {
    id: message.id,
    threadId: message.threadId,
    snippet: message.snippet,
    labelIds: message.labelIds,
    from: headers.from,
    to: headers.to,
    cc: headers.cc,
    subject: headers.subject,
    date: headers.date,
    textContent: content.text,
    htmlContent: content.html,
    internalDate: message.internalDate 
      ? new Date(parseInt(message.internalDate)).toISOString() 
      : undefined,
  };
}

/**
 * Search for emails using Gmail search operators
 */
export const searchEmailsTool = tool({
  description: "Search for emails using Gmail search operators. Supports operators like from:, to:, subject:, is:unread, after:, before:, has:attachment, etc. Use this when the user wants to find specific emails.",
  inputSchema: z.object({
    query: z.string().describe("Search query with Gmail operators (e.g., 'from:example@gmail.com is:unread', 'subject:meeting after:2024/01/01', 'has:attachment')"),
    max_results: z.number().optional().default(10).describe("Maximum number of results to return (1-100)"),
  }),
  execute: async ({ query, max_results }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Gmail is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const params = new URLSearchParams({
        q: query,
        maxResults: String(max_results || 10),
      });

      const result = await gmailRequest<{ messages?: Array<{ id: string; threadId: string }> }>(
        accessToken,
        `/users/me/messages?${params.toString()}`
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to search emails",
        };
      }

      const messageIds = result.data?.messages || [];
      
      if (messageIds.length === 0) {
        return {
          error: false,
          messageCount: 0,
          messages: [],
          message: "No emails found matching the search query",
        };
      }

      // Fetch message details for each result
      const messages = await Promise.all(
        messageIds.slice(0, max_results || 10).map(async ({ id }) => {
          const msgResult = await gmailRequest<any>(
            accessToken,
            `/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
          );
          
          if (msgResult.success && msgResult.data) {
            const headers = parseHeaders(msgResult.data.payload?.headers || []);
            return {
              id: msgResult.data.id,
              threadId: msgResult.data.threadId,
              snippet: msgResult.data.snippet,
              from: headers.from,
              to: headers.to,
              subject: headers.subject,
              date: headers.date,
              labelIds: msgResult.data.labelIds,
            };
          }
          return null;
        })
      );

      const validMessages = messages.filter(Boolean);

      return {
        error: false,
        messageCount: validMessages.length,
        messages: validMessages,
        message: `Found ${validMessages.length} email(s) matching "${query}"`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to search emails",
      };
    }
  },
});

/**
 * Get full email thread/conversation
 */
export const getThreadTool = tool({
  description: "Get the full email conversation thread including all messages in the thread. Use this when the user wants to read an email conversation or see the full context of an email.",
  inputSchema: z.object({
    thread_id: z.string().describe("The ID of the email thread to retrieve"),
  }),
  execute: async ({ thread_id }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Gmail is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const result = await gmailRequest<{ id: string; messages: any[] }>(
        accessToken,
        `/users/me/threads/${encodeURIComponent(thread_id)}?format=full`
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to get email thread",
        };
      }

      const messages = (result.data?.messages || []).map(parseMessage);

      return {
        error: false,
        threadId: result.data?.id,
        messageCount: messages.length,
        messages,
        message: `Retrieved thread with ${messages.length} message(s)`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to get thread",
      };
    }
  },
});

/**
 * Create an email draft
 */
export const createDraftTool = tool({
  description: "Create an email draft for review before sending. Use this when the user wants to compose an email but review it before sending, or when you want to present an email for user approval.",
  inputSchema: z.object({
    to: z.string().describe("Recipient email address(es), comma-separated for multiple"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body content (plain text)"),
    cc: z.string().optional().describe("CC email address(es), comma-separated"),
    bcc: z.string().optional().describe("BCC email address(es), comma-separated"),
    thread_id: z.string().optional().describe("Thread ID if this is a reply to an existing conversation"),
  }),
  execute: async ({ to, subject, body, cc, bcc, thread_id }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Gmail is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      // Build the raw email message in RFC 2822 format
      const emailLines = [
        `To: ${to}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        ...(bcc ? [`Bcc: ${bcc}`] : []),
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body,
      ];
      
      const rawMessage = encodeBase64Url(emailLines.join("\r\n"));

      const draftBody: Record<string, unknown> = {
        message: {
          raw: rawMessage,
          ...(thread_id && { threadId: thread_id }),
        },
      };

      const result = await gmailRequest<any>(
        accessToken,
        "/users/me/drafts",
        "POST",
        draftBody
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to create draft",
        };
      }

      return {
        error: false,
        draftId: result.data?.id,
        messageId: result.data?.message?.id,
        threadId: result.data?.message?.threadId,
        to,
        subject,
        message: `Successfully created draft: "${subject}" to ${to}`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to create draft",
      };
    }
  },
});

/**
 * Send an email message
 */
export const sendMessageTool = tool({
  description: "Send an email message. Can send a previously created draft by ID, or send a new message directly with raw content. Use this when the user confirms they want to send an email.",
  inputSchema: z.object({
    draft_id: z.string().optional().describe("The ID of an existing draft to send. If provided, sends the draft."),
    to: z.string().optional().describe("Recipient email address(es) for a new message (required if not sending a draft)"),
    subject: z.string().optional().describe("Subject line for a new message (required if not sending a draft)"),
    body: z.string().optional().describe("Body content for a new message (required if not sending a draft)"),
    cc: z.string().optional().describe("CC email address(es), comma-separated"),
    bcc: z.string().optional().describe("BCC email address(es), comma-separated"),
    thread_id: z.string().optional().describe("Thread ID if this is a reply"),
  }),
  execute: async ({ draft_id, to, subject, body, cc, bcc, thread_id }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Gmail is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      // If draft_id is provided, send the draft
      if (draft_id) {
        const result = await gmailRequest<any>(
          accessToken,
          `/users/me/drafts/send`,
          "POST",
          { id: draft_id }
        );

        if (!result.success) {
          return {
            error: true,
            message: result.error || "Failed to send draft",
          };
        }

        return {
          error: false,
          messageId: result.data?.id,
          threadId: result.data?.threadId,
          message: "Successfully sent the draft email",
        };
      }

      // Otherwise, send a new message
      if (!to || !subject || !body) {
        return {
          error: true,
          message: "To send a new message, 'to', 'subject', and 'body' are required",
        };
      }

      // Build the raw email message
      const emailLines = [
        `To: ${to}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        ...(bcc ? [`Bcc: ${bcc}`] : []),
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body,
      ];
      
      const rawMessage = encodeBase64Url(emailLines.join("\r\n"));

      const sendBody: Record<string, unknown> = {
        raw: rawMessage,
        ...(thread_id && { threadId: thread_id }),
      };

      const result = await gmailRequest<any>(
        accessToken,
        "/users/me/messages/send",
        "POST",
        sendBody
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to send message",
        };
      }

      return {
        error: false,
        messageId: result.data?.id,
        threadId: result.data?.threadId,
        to,
        subject,
        message: `Successfully sent email: "${subject}" to ${to}`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to send message",
      };
    }
  },
});

/**
 * Get detailed content of a specific email
 */
export const getMessageContentTool = tool({
  description: "Get the detailed content of a specific email message including full body, headers, and attachments info. Use this when the user wants to read a specific email in detail.",
  inputSchema: z.object({
    message_id: z.string().describe("The ID of the email message to retrieve"),
  }),
  execute: async ({ message_id }) => {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return {
        error: true,
        message: "Gmail is not connected. Please connect your Google account first by visiting /api/auth/google",
      };
    }

    try {
      const result = await gmailRequest<any>(
        accessToken,
        `/users/me/messages/${encodeURIComponent(message_id)}?format=full`
      );

      if (!result.success) {
        return {
          error: true,
          message: result.error || "Failed to get message content",
        };
      }

      const parsed = parseMessage(result.data);
      
      // Check for attachments
      const attachments: Array<{ filename: string; mimeType: string; size: number; attachmentId: string }> = [];
      
      function findAttachments(parts: any[] = []) {
        for (const part of parts) {
          if (part.filename && part.body?.attachmentId) {
            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size || 0,
              attachmentId: part.body.attachmentId,
            });
          }
          if (part.parts) {
            findAttachments(part.parts);
          }
        }
      }
      
      findAttachments(result.data?.payload?.parts);

      return {
        error: false,
        ...parsed,
        attachments: attachments.length > 0 ? attachments : undefined,
        message: `Retrieved email: "${parsed.subject}" from ${parsed.from}`,
      };
    } catch (err) {
      return {
        error: true,
        message: err instanceof Error ? err.message : "Failed to get message content",
      };
    }
  },
});

/**
 * Export all Gmail tools
 */
export const gmailTools = {
  searchEmails: searchEmailsTool,
  getThread: getThreadTool,
  createDraft: createDraftTool,
  sendMessage: sendMessageTool,
  getMessageContent: getMessageContentTool,
};

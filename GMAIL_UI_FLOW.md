# Gmail UI Component Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interaction                            │
│                    "@gmail search for emails..."                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AI Agent (Gemini)                              │
│                 Calls appropriate Gmail tool                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Gmail Tools (ai/gmail-tools.ts)                │
├─────────────────────────────────────────────────────────────────────┤
│  • searchEmails          → Search inbox with query                  │
│  • getThread             → Fetch conversation thread                │
│  • getMessageContent     → Get detailed email content               │
│  • composeEmail          → Draft email with HITL                    │
│  • confirmSendEmail      → Send after user approval                 │
│  • sendMessage           → Direct send (no HITL)                    │
│  • createDraft           → Create Gmail draft                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Message List (message-list.tsx)                    │
│              Renders appropriate UI based on tool name              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│   Search Results UI       │   │    Read Email UI         │
├───────────────────────────┤   ├──────────────────────────┤
│ searchEmails              │   │ getThread                │
│    ↓                      │   │    ↓                     │
│ EmailSearchResults        │   │ EmailThread              │
│                           │   │                          │
│ Features:                 │   │ Features:                │
│ • Search query display    │   │ • Collapsible messages   │
│ • Result list            │   │ • Expand/Collapse All    │
│ • Unread indicators      │   │ • Message previews       │
│ • Click to open Gmail    │   │ • Thread actions         │
└───────────────────────────┘   └──────────────────────────┘

                ▼                         ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│                           │   │ getMessageContent        │
│                           │   │    ↓                     │
│                           │   │ EmailMessage             │
│                           │   │                          │
│                           │   │ Features:                │
│                           │   │ • Full email content     │
│                           │   │ • Attachments list       │
│                           │   │ • Unread badge          │
│                           │   │ • Open in Gmail         │
└───────────────────────────┘   └──────────────────────────┘

                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Compose Email Flow                           │
└─────────────────────────────────────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│   HITL Composition        │   │    Direct Send           │
├───────────────────────────┤   ├──────────────────────────┤
│ composeEmail              │   │ sendMessage              │
│    ↓                      │   │    ↓                     │
│ EmailDraftConfirmation    │   │ EmailSentSuccess         │
│                           │   │                          │
│ Features:                 │   │ Features:                │
│ • Editable form fields    │   │ • Success confirmation   │
│ • AI reasoning display    │   │ • Recipient/subject      │
│ • Send/Cancel buttons     │   │ • View in Gmail link     │
│ • Real-time validation    │   │ • Green success styling  │
│                           │   │                          │
│ User clicks "Send" ↓      │   │                          │
│                           │   │                          │
│ confirmSendEmail          │   │                          │
│    ↓                      │   │                          │
│ EmailSentSuccess          │   │                          │
│ (same component)          │   │                          │
└───────────────────────────┘   └──────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                          Shared Utilities                           │
├─────────────────────────────────────────────────────────────────────┤
│  getToolTitle()          → Human-readable tool names                │
│  getToolInvocations()    → Extract tool calls from messages         │
│  motion/react            → Smooth animations                        │
│  date-fns                → Date formatting                          │
│  lucide-react            → Icon components                          │
│  shadcn/ui               → Button, Input, Card primitives           │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                     Component Hierarchy                             │
└─────────────────────────────────────────────────────────────────────┘

MessageList
  └─ Message (role: assistant)
      └─ MessageContent
          ├─ Reasoning (if present)
          ├─ Tool Invocations ─┬─ EmailSearchResults
          │                    ├─ EmailThread
          │                    ├─ EmailMessage
          │                    ├─ EmailDraftConfirmation
          │                    ├─ EmailSentSuccess
          │                    └─ Tool (default fallback)
          ├─ Sources (if present)
          └─ MessageResponse (text content)


┌─────────────────────────────────────────────────────────────────────┐
│                        Color Coding System                          │
├─────────────────────────────────────────────────────────────────────┤
│  🔵 Blue Tones    → Unread emails, active/pending states           │
│  🟢 Green Tones   → Success states (emails sent)                   │
│  ⚪ Muted Tones   → Default/read states, neutral content           │
│  🔴 Red Tones     → Error states (handled by Tool component)       │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                      Animation Timeline                             │
├─────────────────────────────────────────────────────────────────────┤
│  0ms     → Component mounts (opacity: 0, y: 10, scale: 0.95)      │
│  0-400ms → Entry animation (opacity: 1, y: 0, scale: 1)           │
│  200ms   → Icon scale animation (spring effect)                    │
│  300ms   → Content fade-in                                         │
│  500ms   → Action button fade-in                                   │
│  [List]  → Staggered delays (50-100ms per item)                  │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                       Error Handling Flow                           │
├─────────────────────────────────────────────────────────────────────┤
│  Tool Returns Error                                                 │
│       ↓                                                             │
│  Component checks hasError flag                                     │
│       ↓                                                             │
│  Falls back to default Tool UI                                      │
│       ↓                                                             │
│  Displays error with red styling                                    │
│       ↓                                                             │
│  Shows error message and retry option                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Decision Tree

```
Tool Invocation Detected
    │
    ├─ toolName === "searchEmails" && isCompleted && !hasError
    │       └─→ Render EmailSearchResults
    │
    ├─ toolName === "getThread" && isCompleted && !hasError
    │       └─→ Render EmailThread
    │
    ├─ toolName === "getMessageContent" && isCompleted && !hasError
    │       └─→ Render EmailMessage
    │
    ├─ toolName === "composeEmail" && isCompleted
    │   │
    │   └─ result.status === "pending_confirmation"
    │       └─→ Render EmailDraftConfirmation
    │
    ├─ toolName === "confirmSendEmail" && isCompleted && !hasError
    │   │
    │   └─ result.status === "sent"
    │       └─→ Return null (EmailDraftConfirmation handles it)
    │
    ├─ toolName === "sendMessage" && isCompleted && !hasError
    │       └─→ Render EmailSentSuccess
    │
    └─ [DEFAULT]
        └─→ Render generic Tool component with input/output
```

## Data Flow Example

### Search Emails Flow

```
1. User Input
   "@gmail search for unread emails from boss@company.com"
   
2. AI Agent Processing
   Gemini interprets request → calls searchEmails tool
   
3. Tool Execution
   searchEmails({
     query: "from:boss@company.com is:unread",
     max_results: 10
   })
   
4. Gmail API Call
   GET /gmail/v1/users/me/messages?q=from:boss@company.com%20is:unread
   
5. Tool Result
   {
     error: false,
     messageCount: 3,
     messages: [
       { id, threadId, from, to, subject, date, snippet, labelIds },
       ...
     ]
   }
   
6. UI Rendering (message-list.tsx)
   Detects toolName === "searchEmails"
   → Renders <EmailSearchResults>
   
7. Component Display
   EmailSearchResults renders:
   - Header with search icon and query
   - List of 3 results with staggered animation
   - Each result shows: sender, subject, date, snippet
   - Unread indicator (blue dot + styling)
   - Click handlers to open in Gmail
   - "View All Results in Gmail" footer button
   
8. User Interaction
   Clicks result → Opens Gmail in new tab
   Clicks footer → Opens Gmail search view
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14+)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  chat-ui.tsx (useChat hook)                              │  │
│  │  - Manages chat state                                    │  │
│  │  - Sends messages to /api/chat                           │  │
│  │  - Receives streamed responses                           │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │  message-list.tsx                                        │  │
│  │  - Renders messages and tool invocations                 │  │
│  │  - Routes to appropriate UI components                   │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│          ┌────────────┴──────────────┐                          │
│          │                           │                          │
│  ┌───────▼───────┐          ┌───────▼──────────┐              │
│  │ Gmail UI      │          │  Other Tools     │              │
│  │ Components    │          │  (Calendar,      │              │
│  │               │          │   Forms, etc)    │              │
│  └───────────────┘          └──────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ HTTP POST /api/chat
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                      API Route Handler                           │
│                   app/api/chat/route.ts                          │
├──────────────────────────────────────────────────────────────────┤
│  - Receives messages from client                                 │
│  - Calls streamText() with Gemini model                          │
│  - Provides Gmail tools                                          │
│  - Returns toUIMessageStreamResponse()                           │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                      Gmail Tools Layer                           │
│                     ai/gmail-tools.ts                            │
├──────────────────────────────────────────────────────────────────┤
│  - searchEmails                                                  │
│  - getThread                                                     │
│  - getMessageContent                                             │
│  - composeEmail                                                  │
│  - confirmSendEmail                                              │
│  - sendMessage                                                   │
│  - createDraft                                                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ Gmail API calls
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                       Google Gmail API                           │
│               https://www.googleapis.com/gmail/v1                │
├──────────────────────────────────────────────────────────────────┤
│  - /users/me/messages (list, get, send)                          │
│  - /users/me/threads (list, get)                                 │
│  - /users/me/drafts (create, send)                               │
│  - OAuth 2.0 authentication                                      │
└──────────────────────────────────────────────────────────────────┘
```

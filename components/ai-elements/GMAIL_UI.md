# Gmail Generative UI Components

This document describes the generative UI components created for Gmail integration in Agent0.

## Overview

Gmail tools now have beautiful, interactive UI components that automatically render when the AI agent uses Gmail-related tools. These components follow the same design patterns as the existing Calendar and Forms integrations.

## Components

### 1. EmailMessage
**File**: `components/ai-elements/email-message.tsx`

Displays a detailed view of a single email message with full content.

**Features**:
- Shows sender, recipient, CC, subject, date
- Displays full email content (text/HTML)
- Lists attachments with file names and sizes
- "Unread" badge for unread messages
- "Open in Gmail" button with direct link
- Smooth animations and gradient design
- Truncates long content with preview

**Used by**: `getMessageContent` tool

**Props**:
```typescript
interface EmailMessageProps {
  id: string;
  from: string;
  to: string;
  subject: string;
  date?: string;
  snippet?: string;
  textContent?: string;
  htmlContent?: string;
  cc?: string;
  attachments?: Array<{ filename: string; mimeType: string; size: number }>;
  labelIds?: string[];
  className?: string;
}
```

### 2. EmailThread
**File**: `components/ai-elements/email-thread.tsx`

Displays a full email conversation thread with collapsible messages.

**Features**:
- Shows all messages in a thread
- Expandable/collapsible individual messages
- "Expand All" and "Collapse All" controls
- First message expanded by default
- Message preview when collapsed
- Individual message details when expanded
- "Open Thread in Gmail" button
- Animated expand/collapse transitions

**Used by**: `getThread` tool

**Props**:
```typescript
interface EmailThreadProps {
  threadId: string;
  messages: EmailThreadMessage[];
  messageCount: number;
  className?: string;
}

interface EmailThreadMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date?: string;
  snippet?: string;
  textContent?: string;
  htmlContent?: string;
  cc?: string;
}
```

### 3. EmailSearchResults
**File**: `components/ai-elements/email-search-results.tsx`

Displays a compact list of email search results.

**Features**:
- Shows search query used
- Lists all matching emails with preview
- Unread indicator (blue dot and styling)
- Click to open in Gmail
- Shows sender, subject, snippet, date
- "View All Results in Gmail" button
- Empty state when no results
- Staggered animation for results

**Used by**: `searchEmails` tool

**Props**:
```typescript
interface EmailSearchResultsProps {
  query: string;
  messages: EmailSearchResult[];
  messageCount: number;
  className?: string;
}

interface EmailSearchResult {
  id: string;
  threadId: string;
  from: string;
  to?: string;
  subject: string;
  date?: string;
  snippet?: string;
  labelIds?: string[];
}
```

### 4. EmailDraftConfirmation
**File**: `components/ai-elements/email-draft-confirmation.tsx`

Human-in-the-loop (HITL) confirmation UI for composing emails.

**Features**:
- Editable form fields (to, subject, body, cc, bcc)
- AI reasoning display with chain-of-thought
- Real-time validation
- "Send Email" and "Cancel" buttons
- Success state after sending
- Error handling with messages
- Loading state during send
- Smooth state transitions

**Used by**: `composeEmail` tool (shows confirmation form)

**Note**: This component was already implemented but updated to match the design system.

### 5. EmailSentSuccess
**File**: `components/ai-elements/email-sent-success.tsx`

Success confirmation after sending an email.

**Features**:
- Green success styling
- Shows recipient and subject
- "View in Gmail" button
- Links to sent message or thread
- Smooth scale animation
- Consistent with calendar event success UI

**Used by**: 
- `sendMessage` tool (direct send)
- `confirmSendEmail` tool (after HITL confirmation)

**Props**:
```typescript
interface EmailSentSuccessProps {
  to: string;
  subject: string;
  messageId?: string;
  threadId?: string;
  className?: string;
}
```

## Tool Integration

### Message List Rendering
All Gmail UI components are integrated into `components/ai-elements/message-list.tsx`:

```typescript
// Search Emails
if (toolInvocation.toolName === "searchEmails" && isCompleted) {
  return <EmailSearchResults ... />;
}

// Get Thread
if (toolInvocation.toolName === "getThread" && isCompleted) {
  return <EmailThread ... />;
}

// Get Message Content
if (toolInvocation.toolName === "getMessageContent" && isCompleted) {
  return <EmailMessage ... />;
}

// Compose Email (HITL)
if (toolInvocation.toolName === "composeEmail" && isCompleted) {
  return <EmailDraftConfirmation ... />;
}

// Send Message (direct)
if (toolInvocation.toolName === "sendMessage" && isCompleted) {
  return <EmailSentSuccess ... />;
}
```

### Tool Titles
Human-readable tool names are defined in `lib/chat-message-utils.ts`:

```typescript
export function getToolTitle(toolName: string): string {
  const titles: Record<string, string> = {
    searchEmails: "Search Emails",
    getThread: "Email Thread",
    getMessageContent: "Email Message",
    sendMessage: "Send Email",
    composeEmail: "Compose Email",
    confirmSendEmail: "Confirm Send Email",
    createDraft: "Create Draft",
  };
  return titles[toolName] || toolName;
}
```

## Design Patterns

### 1. Consistent Visual Hierarchy
- **Header section**: Tool icon, title, status
- **Content section**: Main information
- **Footer section**: Action buttons

### 2. Color Coding
- **Blue tones**: Unread emails, active states
- **Green tones**: Success states (sent emails)
- **Muted tones**: Default/read states
- **Red tones**: Error states (handled by parent Tool component)

### 3. Animation
- **Initial load**: Opacity + Y-axis + scale animation
- **Staggered lists**: Sequential delay for multiple items
- **State transitions**: Smooth height and opacity changes
- **Interactive elements**: Spring animations for buttons

### 4. Responsive Layout
- **Max width**: `max-w-2xl` for most components
- **Max width**: `max-w-lg` for success cards
- **Truncation**: Long text truncates with ellipsis
- **Wrapping**: Flexible layouts for different screen sizes

### 5. Accessibility
- **Links**: External links open in new tabs
- **Contrast**: High contrast text on backgrounds
- **Focus states**: Visible focus indicators on interactive elements
- **Semantic HTML**: Proper heading hierarchy

## Usage Example

### User Prompt
```
@gmail search for emails from john@example.com about the meeting
```

### AI Response Flow
1. AI calls `searchEmails` tool with query: `from:john@example.com meeting`
2. Tool returns list of matching emails
3. `EmailSearchResults` component renders automatically
4. User sees beautiful UI with clickable results

### Composing Email (HITL)
```
@gmail compose an email to team@company.com about tomorrow's standup
```

1. AI calls `composeEmail` with inferred details
2. `EmailDraftConfirmation` renders with editable form
3. User reviews/edits and clicks "Send Email"
4. API call to `/api/gmail/send-email`
5. `EmailSentSuccess` component shows success

## Error Handling

Errors are handled at two levels:

1. **Tool level**: Tools return `{ error: true, message: "..." }`
2. **Component level**: Components check `hasError` flag and show default Tool UI with error state

```typescript
if (toolInvocation.toolName === "searchEmails" && isCompleted) {
  if (!hasError && toolInvocation.result?.messages) {
    return <EmailSearchResults ... />;
  }
  // Falls through to default Tool rendering with error display
}
```

## Future Enhancements

Potential improvements for Gmail UI:

1. **Inline reply**: Reply to emails directly from the chat UI
2. **Draft editing**: Edit existing drafts with preview
3. **Attachment preview**: Show image/PDF thumbnails
4. **Rich text editor**: Support formatted email composition
5. **Email labels**: Display and filter by Gmail labels
6. **Thread actions**: Archive, delete, mark as read/unread
7. **Smart compose**: AI-powered email suggestions
8. **Batch operations**: Act on multiple emails at once

## Testing

To test Gmail UI components:

1. Connect Google account: `/api/auth/google`
2. Use `@gmail` mention in chat
3. Try different tools:
   - "search for emails from X"
   - "show me the thread about Y"
   - "read email with subject Z"
   - "compose email to X about Y"

## Related Files

- **Tools**: `ai/gmail-tools.ts`
- **API Routes**: `app/api/gmail/send-email/route.ts`
- **Auth**: `app/api/auth/google/route.ts`
- **Types**: `types/chat.ts`
- **Utils**: `lib/chat-message-utils.ts`
- **Calendar**: `lib/google-calendar.ts` (shared OAuth token management)

## Design Credits

These components follow the design system established by:
- Calendar components (events, scheduling confirmation)
- Form components (responses, summary cards)
- Weather component (custom UI pattern)
- shadcn/ui primitives (buttons, inputs, etc.)

All components use:
- **Motion** from `motion/react` for animations
- **date-fns** for date formatting
- **lucide-react** for icons
- **Tailwind CSS v4** for styling
- **OKLCH colors** for theming

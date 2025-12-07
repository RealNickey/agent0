# Agent0 - AI Chat Application

## Architecture Overview

This is a **Next.js 16** chat application using the **Vercel AI SDK** with **Google Gemini** models. The app follows a component-based architecture with clear separation between UI primitives and AI-specific components.

### Key Layers
- **API Layer**: [app/api/chat/route.ts](app/api/chat/route.ts) - Handles streaming chat via `streamText()` with Gemini models
- **Chat UI**: [components/chat-ui.tsx](components/chat-ui.tsx) - Main orchestrator using `useChat()` hook
- **AI Elements**: [components/ai-elements/](components/ai-elements/) - Specialized chat components from AI SDK registry
- **UI Primitives**: [components/ui/](components/ui/) - shadcn/ui components (new-york style)

### Data Flow
```
User Input → PromptInput → useChat() → POST /api/chat → streamText(google(model)) → UI Message Stream
```

## Component Patterns

### AI Elements (from `registry.ai-sdk.dev`)
Components in `components/ai-elements/` are sourced from the AI SDK component registry (see [components.json](components.json)). These follow compound component patterns:

```tsx
// Example: Tool invocation display
<Tool>
  <ToolHeader title="Google Search" type="tool-invocation" state="output-available" />
  <ToolContent>
    <ToolInput input={args} />
    <ToolOutput output={result} />
  </ToolContent>
</Tool>

// Example: Reasoning/thinking display
<Reasoning isStreaming={isLoading}>
  <ReasoningTrigger />
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>
```

### Message Structure
Messages use a `parts` array structure (not simple `content` string):
```tsx
// User message with attachments
{ role: "user", parts: [
  { type: "text", text: "..." },
  { type: "file", data: "data:...", mediaType: "image/png" }
]}

// Assistant message with reasoning + tools + sources
{ role: "assistant", parts: [
  { type: "reasoning", text: "..." },
  { type: "tool-invocation", toolInvocation: {...} },
  { type: "source", source: { url, title } },
  { type: "text", text: "..." }
]}
```

Use helpers from [lib/chat-message-utils.ts](lib/chat-message-utils.ts): `getMessageTextContent()`, `getMessageReasoning()`, `getToolInvocations()`, `getMessageSources()`.

## Gemini-Specific Features

### Model Configuration
Models are defined in `chat-ui.tsx` with `supportsThinking` flag for 2.5+ series. The API route configures thinking budget automatically:
```ts
// In route.ts - auto-configured for 2.5 models
thinkingConfig: { thinkingBudget: 4096, includeThoughts: true }
```

### Available Tools
Three Google-native tools are available via `google.tools.*`:
- `googleSearch` - Web search (toggled via UI)
- `urlContext` - URL content extraction (always enabled)
- `codeExecution` - Python code execution (always enabled)

## Styling Conventions

- **Tailwind CSS v4** with CSS variables in [app/globals.css](app/globals.css)
- **Dark mode only** (`className="dark"` on `<html>`)
- **OKLCH colors** for theme variables
- Use `cn()` from `@/lib/utils` for conditional classes
- Animation via `framer-motion` (imported as `motion/react`)
- Icons from `lucide-react`

## Development Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Authentication

Uses **Clerk** for auth (`@clerk/nextjs`). The `ClerkProvider` wraps the app in [app/layout.tsx](app/layout.tsx). Components like `SignInButton`, `SignedIn`, `SignedOut`, `UserButton` are available but not currently rendered in the main UI.

## File Attachment Handling

Attachments are converted to base64 data URLs client-side before sending. The API route converts these to appropriate `ImagePart` or `FilePart` types based on MIME type. Supported formats: images, PDF, text files, JSON, CSV.

## Key Dependencies
- `ai` / `@ai-sdk/react` / `@ai-sdk/google` - Vercel AI SDK
- `streamdown` - Streaming markdown renderer for assistant responses
- `shiki` - Syntax highlighting in code blocks
- `@xyflow/react` - Flow/graph visualization (for canvas features)

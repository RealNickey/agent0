# Agent0 - AI Chat Application

## Architecture Overview

**Next.js 14+** chat application using **Vercel AI SDK** with **Google Gemini** models. Component-based architecture with separation between UI primitives and AI-specific components.

### Key Files
- **API Route**: [app/api/chat/route.ts](app/api/chat/route.ts) - `streamText()` with Gemini, returns `toUIMessageStreamResponse()`
- **Chat UI**: [components/chat-ui.tsx](components/chat-ui.tsx) - Main orchestrator using `useChat()` hook with `DefaultChatTransport`
- **Tools**: [ai/tools.ts](ai/tools.ts) - Custom tools (weather) using `tool()` helper
- **AI Elements**: [components/ai-elements/](components/ai-elements/) - AI SDK component registry patterns
- **UI Primitives**: [components/ui/](components/ui/) - shadcn/ui (new-york style)

### Data Flow
```
User Input → sendMessage({ role, parts }) → POST /api/chat → streamText() → toUIMessageStreamResponse() → useChat messages
```

## Message Structure (AI SDK v5)

Messages use `parts` array (not `content` string):
```tsx
// User message with files
{ role: "user", parts: [
  { type: "text", text: "..." },
  { type: "file", url: "data:image/png;base64,...", mediaType: "image/png" }
]}

// Assistant message
{ role: "assistant", parts: [
  { type: "reasoning", text: "..." },        // From thinking models
  { type: "tool-displayWeather", ... },      // Tool invocations (tool-{name})
  { type: "source-url", ... },               // Sources from search
  { type: "text", text: "..." }              // Response text
]}
```

**Helpers** ([lib/chat-message-utils.ts](lib/chat-message-utils.ts)): `getMessageTextContent()`, `getMessageReasoning()`, `getToolInvocations()`, `getMessageSources()`

## AI SDK Patterns

### Route Handler Pattern
```ts
import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { streamText, convertToModelMessages, stepCountIs } from "ai";

const result = streamText({
  model: google(modelId),
  messages: convertToModelMessages(uiMessages),
  tools: { /* ... */ },
  providerOptions: {
    google: {
      thinkingConfig: { thinkingBudget: 4096, includeThoughts: true }  // For 2.5+ models
    }
  },
  stopWhen: stepCountIs(5),  // For multi-step tool calling
});

return result.toUIMessageStreamResponse({ sendReasoning: true, sendSources: true });
```

### Client-Side Chat
```tsx
const { messages, sendMessage, status } = useChat<MyUIMessage>({
  transport: new DefaultChatTransport({ api: "/api/chat" }),
});

// Send with parts for multi-modal
sendMessage({ role: "user", parts: [{ type: "text", text: input }, ...fileParts] }, {
  body: { model, enableSearch, enableThinking }
});
```

### Tool Definition
```ts
import { tool } from "ai";
import { z } from "zod";

const weatherTool = tool({
  description: "Get current weather",
  inputSchema: z.object({ location: z.string() }),
  execute: async ({ location }) => ({ temperature: 72, condition: "sunny" }),
});
```

## Implemented Features ✅

### Core Chat
- Streaming chat with Gemini models (2.0 Flash, 2.5 Flash/Pro/Lite)
- Multi-modal input (images, PDFs, text files via base64 data URLs)
- Thinking/reasoning display for 2.5+ models with collapsible UI
- Message persistence to localStorage

### Google Native Tools
- **Google Search** - Toggled via UI, grounding with `google.tools.googleSearch()`
- **URL Context** - Always enabled, `google.tools.urlContext()`
- **Code Execution** - Always enabled, `google.tools.codeExecution()`

### Custom Tools
- **Weather** - `@weather` mention triggers `displayWeather` tool via Open-Meteo API
- Tool mentions system (`@toolname` in prompt input)

### UI Features
- Model selector with thinking toggle
- File attachments with preview
- Feature badges row showing active capabilities
- Suggestion chips for quick prompts
- Table of contents for long conversations
- Integration panel/modal scaffolding
- Browser extension support (screenshot capture)

## Planned Features (from PRD) 📋

### Tools Not Yet Implemented
- Email Summary Tool (Gmail integration)
- Calendar Event Creation / Schedule Meeting (Google Calendar)
- To-Do List Management (Google Tasks)
- Video Download Tool (yt-dlp)
- PDF Operations (merge, compress)
- File Conversion Tool (formats via FFmpeg)
- Image Generator (DALL-E 3)
- Mermaid Graph Tool
- LaTeX Renderer
- Spotify Integration
- Movie Tool (TMDB/OMDB)

### Features Not Yet Implemented
- Human-in-the-Loop (HITL) approval prompts - AI SDK v6 has `needsApproval` support
- Tool chaining (sequential, parallel, conditional patterns)
- `@command` system for explicit tool invocation
- Dashboard with audio briefing (TTS)
- RAG with pgvector embeddings (Supabase schema exists but not wired)
- Database integration via Supabase

## AI SDK Component Patterns

### Tool Display (compound component)
```tsx
<Tool>
  <ToolHeader title="Weather" type="tool-displayWeather" state="output-available" />
  <ToolContent>
    <ToolInput input={args} />
    <ToolOutput output={result} />
  </ToolContent>
</Tool>
```

### Reasoning Display
```tsx
<Reasoning isStreaming={isLoading}>
  <ReasoningTrigger />
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>
```

### Markdown Streaming
```tsx
import { Streamdown } from "streamdown";
<Streamdown>{streamingText}</Streamdown>
```

## Styling

- **Tailwind CSS v4** with CSS variables in [app/globals.css](app/globals.css)
- **Dark mode only** (`className="dark"` on `<html>`)
- **OKLCH colors** for theme
- `cn()` from `@/lib/utils` for conditional classes
- `framer-motion` (import from `motion/react`)
- `lucide-react` for icons

## Key Dependencies
- `ai` / `@ai-sdk/react` / `@ai-sdk/google` - Vercel AI SDK
- `streamdown` - Streaming markdown renderer
- `shiki` - Syntax highlighting
- `@clerk/nextjs` - Auth (configured, not fully rendered)
- `zod` - Schema validation for tools and API

## Dev Commands
```bash
npm run dev      # Dev server (port 3000)
npm run build    # Production build
npm run lint     # ESLint
```

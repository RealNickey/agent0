## Plan: @slides Agent Tool — AI-Powered Presentations via Google Slides

**TL;DR:** Build a multi-step `@slides` agent that generates presentation outlines, lets the user edit them via a client-side tool (generative UI + HITL), fetches Unsplash images, generates PPTX via `pptxgenjs`, and uploads to Google Drive with auto-conversion to Google Slides. Uses AI SDK native patterns: multi-step agent loop (`stopWhen`), client-side tools (`addToolOutput`) for outline editing, `needsApproval` for final upload confirmation, `sendAutomaticallyWhen` for auto-resubmit, and `experimental_repairToolCall` for self-correction of malformed inputs.

### Agent Flow

```
User: "@slides Create a presentation on climate change"
  ↓
Step 1: Model generates structured outline → calls reviewSlideOutline (client-side tool, no execute)
  ↓
Step 2: <SlideOutlineEditor> renders editable outline (titles, bullets, slide types, image queries, theme)
  ↓
Step 3: User edits + clicks Confirm → addToolOutput(editedOutline) → auto-resubmits
  ↓
Step 4: Model receives edited outline → calls searchUnsplashImages(queries) → receives image URLs
  ↓
Step 5: Model calls createGoogleSlidesPresentation(outline, images) → needsApproval: true → approval UI shown
  ↓
Step 6: User confirms → execute runs → pptxgenjs generates PPTX → uploads to Google Drive → returns Slides URL
  ↓
Step 7: <SlidesResult> renders with Google Slides link, slide count, thumbnail
```

---

### Steps

**1. Add `pptxgenjs` dependency**

Install `pptxgenjs` via npm. No native dependencies — works in Node.js for server-side PPTX generation.

**2. Create `lib/unsplash.ts` — Unsplash API client**

- `searchImages(query: string, count?: number)` → fetches from `https://api.unsplash.com/search/photos` with `UNSPLASH_ACCESS_KEY` env var
- Returns `{ id, url, thumbUrl, altDescription, photographer, downloadUrl }[]`
- Trigger Unsplash download endpoint per API guidelines (required for compliance)

**3. Create `lib/pptx-generator.ts` — PPTX generation from structured data**

- Takes a `SlideOutline` (structured data with titles, bullets, images, theme) and generates PPTX buffer using `pptxgenjs`
- Supports slide types: `title`, `content`, `section-divider`, `two-column`, `image-focus`, `quote`
- Applies theme colors (`primaryColor`, `secondaryColor`, `fontFamily`) from the outline
- Embeds Unsplash images by URL (pptxgenjs supports URL-based image insertion)
- Adds speaker notes per slide
- Returns `Buffer` for upload

**4. Create `lib/google-slides.ts` — Google Drive upload with Slides conversion**

- Follow the same pattern as `lib/google-forms.ts` (re-export auth from `google-calendar.ts`)
- `uploadPresentationToDrive(name: string, pptxBuffer: Buffer)` → multipart upload to `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` with metadata `{ name, mimeType: "application/vnd.google-apps.presentation" }` so Drive auto-converts PPTX to native Google Slides
- `setFilePermission(fileId, role, type)` → make presentation viewable/editable via link
- Returns `{ fileId, webViewLink, thumbnailLink }`
- Uses `drive.file` scope (already present in Forms scopes) — no new OAuth scope needed if user has authed with Forms or "all"

**5. Create `ai/slides-tools.ts` — Three tool definitions**

- **`reviewSlideOutline`** — Client-side tool (NO `execute` function). The model's input IS the generated outline (`SlideOutline` Zod schema). It renders in the client as `<SlideOutlineEditor>`. User edits and confirms via `addToolOutput(editedOutline)`. This is the HITL + Generative UI checkpoint.

- **`searchUnsplashImages`** — Server-side auto-execute tool. Input: `{ queries: Array<{ slideId, query }> }`. Execute: calls Unsplash API for each query, returns `{ results: Array<{ slideId, images }> }`. The model uses this to pair images with slides.

- **`createGoogleSlidesPresentation`** — Server-side tool with `needsApproval: true`. Input: full `SlideOutline` + image assignments. When approved, execute: generates PPTX via `pptx-generator.ts` → uploads via `google-slides.ts` → returns `{ status: "created", slidesUrl, fileId, slideCount, title }`. This second HITL gate ensures the user confirms before uploading to their Google Drive.

- All tool schemas use Zod. Export as `slidesTools` object.

- Add `experimental_repairToolCall` on `streamText` call for self-correction of malformed tool inputs (model retries with corrected schema).

**6. Create `components/ai-elements/slide-outline-editor.tsx` — Generative UI for outline editing**

- Renders when `part.type === "tool-reviewSlideOutline"` in state `"input-available"` (client-side tool waiting for output)
- Shows the full outline in an editable form:
  - Presentation title (editable input)
  - Theme picker (primary/secondary color pickers, font selector)
  - Per-slide editor: drag-to-reorder slides, edit title/subtitle/bullets, change slide type via `<Select>`, toggle speaker notes
  - Add/remove slide buttons
- "Confirm Outline" button → calls `addToolOutput({ toolCallId: part.toolCallId, output: JSON.stringify(editedOutline) })`
- "Reject / Start Over" button → calls `addToolOutput({ toolCallId, output: JSON.stringify({ rejected: true, reason: "..." }) })`
- Uses `motion/react` for animations, shadcn/ui primitives (`Input`, `Textarea`, `Select`, `Button`, `Card`)
- Follow the visual style of `event-scheduling-confirmation.tsx` and `form-creation-confirmation.tsx` for consistency

**7. Create `components/ai-elements/slides-result.tsx` — Final result display**

- Renders when `createGoogleSlidesPresentation` tool has `state: "output-available"` with a successful result
- Shows: presentation title, slide count, "Open in Google Slides" button (links to `webViewLink`), thumbnail preview if available
- Error state if upload failed
- Consistent with existing result displays (e.g., `CalendarEvent`, `FormIdDisplay`)

**8. Create `components/ai-elements/slides-approval.tsx` — Upload confirmation UI**

- Renders when `createGoogleSlidesPresentation` tool has `state: "approval-requested"` (from `needsApproval: true`)
- Shows summary: "Ready to create presentation with N slides and upload to Google Slides?"
- Displays slide titles list, theme preview, image count
- "Create & Upload" button → `addToolApprovalResponse({ id: part.approval.id, approved: true })`
- "Cancel" button → `addToolApprovalResponse({ id: part.approval.id, approved: false })`

**9. Modify `app/api/chat/route.ts` — Add slides tool routing**

- Add `"slides"` case in the `mentionedTools` mapping (~line 270-330)
- Import `slidesTools` from `@/ai/slides-tools`
- Gate behind `isToolInstalled("slides")`
- Map: `"slides" | "presentation" | "ppt"` → all three slides tools
- Add slides-specific system prompt guidance (structured outline format, step-by-step instructions for the agent)
- Add `experimental_repairToolCall` to the `streamText` call when slides tools are active

**10. Modify `components/ai-elements/message-list.tsx` — Render slide components**

- Add cases in the tool rendering switch:
  - `"reviewSlideOutline"` → `<SlideOutlineEditor>` (when state is `input-available` or `output-available`)
  - `"searchUnsplashImages"` → small image grid preview or loading state
  - `"createGoogleSlidesPresentation"` → `<SlidesApproval>` (when `approval-requested`) or `<SlidesResult>` (when `output-available`)

**11. Modify `components/chat-ui.tsx` — Enable client-side tool + auto-submit**

- Destructure `addToolOutput` and `addToolApprovalResponse` from `useChat()`
- Add `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` to the `useChat` config (or conditionally when slides tool is active)
  - **Caution:** This auto-submits for ALL tools. May need to use `lastAssistantMessageIsCompleteWithApprovalResponses` for approval auto-submit, and handle `addToolOutput` manually for the client-side tool
- Pass `addToolOutput` and `addToolApprovalResponse` down to `MessageList` → slide components via props or context

**12. Modify `components/integrations-modal.tsx` — Add Slides integration**

- Add to `INTEGRATIONS` array: `{ id: "slides", name: "Slides", icon: Presentation, color: "text-teal-500" }` (use `Presentation` from lucide-react)

**13. Modify `app/api/auth/google/route.ts` — Add slides OAuth scope**

- Add `GOOGLE_SLIDES_SCOPES` with `drive.file` scope (already present, but add `service=slides` routing)
- Or reuse Forms scopes since `drive.file` is already there — add slides as a recognized service that maps to `drive.file` scope

**14. Modify `hooks/use-integration-handlers.ts` — Handle slides service auth**

- Add `"slides"` case in `handleAddIntegration` → opens OAuth popup with `service=slides`

**15. Add slides system prompt in `ai/prompts/slides.ts`**

- Detailed system prompt instructing the model on the multi-step agent workflow:
  1. "When asked to create a presentation, first generate a comprehensive outline using reviewSlideOutline"
  2. "The outline should include 8-15 slides with varied types (title, content, section-divider, two-column, image-focus, quote)"
  3. "After the user approves/edits the outline, search for relevant images using searchUnsplashImages"
  4. "Generate descriptive imageQuery strings for Unsplash (e.g., 'melting glacier aerial view')"
  5. "Finally, call createGoogleSlidesPresentation with the complete outline and image assignments"
  6. "If the user rejects the outline, regenerate based on their feedback"
- Color palette suggestions, design principles from the reveal.js skill

**16. Create `app/api/slides/upload/route.ts` — Direct upload endpoint (fallback)**

- POST endpoint that accepts PPTX buffer + metadata, uploads to Google Drive
- Used by the tool's `execute` function internally
- Follows the pattern of `/api/calendar/create-event` and `/api/forms/create`

---

### Data Types

```ts
// In ai/slides-tools.ts or types/slides.ts
interface SlideOutline {
  title: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  slides: SlideDefinition[];
}

interface SlideDefinition {
  id: string;
  type: "title" | "content" | "section-divider" | "two-column" | "image-focus" | "quote";
  title: string;
  subtitle?: string;
  content: string[];          // bullet points
  speakerNotes?: string;
  imageQuery?: string;         // Unsplash search query
  imageUrl?: string;           // Assigned after search
  quoteText?: string;          // For quote slides
  quoteAttribution?: string;
}
```

---

### Decisions

- **Client-side tool for outline editing** over `needsApproval`: Chosen because `needsApproval` doesn't support passing edited data back — only approve/deny. The client-side tool pattern (`addToolOutput`) allows the user to modify the outline before returning it to the model.
- **`needsApproval` for final upload**: Used on `createGoogleSlidesPresentation` as a second gate — user confirms before uploading to their Google Drive account.
- **PPTX → Drive upload** over Google Slides API: The Slides API is element-level and extremely verbose. PPTX generation via `pptxgenjs` + Drive conversion produces editable Google Slides with far less complexity.
- **`drive.file` scope** (no new scope): Already available from Forms auth. Sufficient for uploading and converting files the app creates.
- **Structured data approach**: The model generates structured `SlideOutline` data (not HTML). This feeds both the outline editor UI and the PPTX generator, keeping the pipeline clean.
- **`experimental_repairToolCall`**: Enabled for self-correction when the model generates malformed Zod inputs for the slides tools (complex nested schemas are prone to errors).

---

### Verification

- **Unit:** Test `pptx-generator.ts` by generating a PPTX buffer from sample data and verifying it's valid
- **Integration:** Test the full flow: `@slides Create a 5-slide presentation on AI` → outline appears → edit → confirm → images fetched → upload confirmed → Google Slides link returned
- **Auth:** Verify OAuth flow with `service=slides` grants `drive.file` scope → upload succeeds
- **Error cases:** Unsplash API down (graceful fallback — slides without images), Google Drive upload fails (error state in UI), malformed tool inputs (repaired via `experimental_repairToolCall`)
- **Build:** Run `npm run build` to verify no type errors

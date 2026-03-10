# Plan: Gmail Dashboard — Smart Email Cards with Expand, Reply & Mark-as-Read

## TL;DR

Upgrade the existing email card carousel on the dashboard to fetch 20 unread emails, AI-rank by importance (top 10), generate short AI summaries & titles, support in-card reply editing + send, animated mark-as-read removal, and an expand-to-center morph animation. All cards uniform size; tags as liquid-glass pills; sender Gmail profile picture when available.

---

## Current State Summary

### What already exists
- **API routes**: `/api/gmail/messages` (fetch up to 20, query param), `/api/gmail/categorize` (AI category via Gemini), `/api/gmail/mark-read`, `/api/gmail/send-email`
- **Components**: `EmailCard` (glassmorphism card, category badges, reply + mark-as-read buttons, DiceBear avatar), `EmailCardCarousel` (fetch 10 inbox emails, AI categorize, drag-scroll carousel with snap physics)
- **Dashboard**: `chat-ui.tsx` renders `AtAGlance` + `EmailCardCarousel` at the bottom of the empty state; `onReply` fills the chat input with `@gmail Reply to...`
- **Gmail tools**: 10 AI SDK tools including `composeEmail` (HITL), `searchEmails`, `sendMessage`, `getMessageContent`, etc.
- **Auth**: Google OAuth with Gmail scopes, token stored in `.google-tokens.json`

### What's missing / needs changing
1. **Fetches only 10 inbox emails** → need 20 unread, ranked by importance, top 10 displayed
2. **No AI summary or generated titles** → only raw `subject` and `snippet` from Gmail
3. **No importance ranking** → all emails shown equally
4. **Reply opens chat input** → should show editable reply in-card with send
5. **Mark-as-read just fades opacity** → should animate card up and remove it
6. **No expanded/morph view** → clicking card should expand to center, pushing siblings out
7. **No sender Gmail profile picture** → uses DiceBear; should use Google People API / Gmail photo
8. **Cards aren't uniform size** → content variation causes size differences
9. **Tags are nice but could be more "liquid glass pill"** → minor style tweak

---

## Phase 1: Backend — AI Summarization + Importance Ranking API

### Step 1.1: New API route `/api/gmail/summarize`
Create a new POST endpoint that accepts the raw email messages and returns:
- `importance`: "high" | "medium" | "low" (based on sender, subject urgency, content)
- `shortTitle`: AI-generated short title (max ~40 chars)
- `summary`: AI-generated 2-3 sentence summary (max ~120 chars for card display)
- `suggestedReply`: AI-generated contextual reply draft

**File**: Create `app/api/gmail/summarize/route.ts`
**Pattern**: Follow the same structure as `app/api/gmail/categorize/route.ts` — use `generateObject()` with a Zod schema and `google("gemini-2.0-flash")`
**Schema**:
```typescript
z.object({
  emails: z.array(z.object({
    index: z.number(),
    importance: z.enum(["high", "medium", "low"]),
    shortTitle: z.string(),
    summary: z.string(),
    suggestedReply: z.string(),
  }))
})
```
**Input**: Array of `{ subject, snippet, from, to }` — same shape as categorize but we add `to` for reply context

### Step 1.2: Update `/api/gmail/messages` to support 20 unread
- File: `app/api/gmail/messages/route.ts`
- Change: The route already supports `maxResults` up to 20 and custom `q` param. No backend change needed — the frontend will call with `?maxResults=20&q=is:unread`

### Step 1.3: Sender profile picture
- Option A: Use Google People API `people.get` with the sender email to get `photos[0].url` — requires `people.readonly` scope (new scope, OAuth re-consent)
- Option B: Use `https://www.google.com/s2/photos/profile/{email}` — undocumented, may not work reliably  
- Option C: Use Gmail API message `payload.headers` to find the sender, then query Google Contacts API
- **Recommendation**: Option A (People API) is most reliable but adds scope. For a simpler MVP, use Gravatar (`https://www.gravatar.com/avatar/{md5(email)}?d=404`) with DiceBear fallback. This requires no new OAuth scopes.
- **Decision needed**: Gravatar + DiceBear fallback (no scope change) vs People API (requires new scope)

---

## Phase 2: Frontend — Email Card Carousel Data Flow Upgrade

### Step 2.1: Update `EmailCardCarousel` fetch logic
**File**: `components/email-card-carousel.tsx`
- Change fetch URL: `?maxResults=20&q=is:unread` (instead of `?maxResults=10&q=is:inbox`)
- After fetch, call both `/api/gmail/categorize` AND new `/api/gmail/summarize` in parallel
- From the summarize response, filter to only `importance === "high"` or `"medium"`, take top 10
- Sort by importance (high first), then by date (newest first)
- Merge `categories`, `shortTitle`, `summary`, `suggestedReply` into each `EnrichedEmail`
- Update `EnrichedEmail` interface to add: `shortTitle`, `summary`, `suggestedReply`, `importance`

### Step 2.2: Update `EmailCardProps` and pass new data
**File**: `components/email-card.tsx`
- Add to `EmailCardProps`: `shortTitle?: string`, `summary?: string`, `suggestedReply?: string`, `senderProfileUrl?: string`
- Display `shortTitle` instead of raw `subject` as the card title (fall back to `subject` if missing)
- Display `summary` instead of raw `bodySnippet` as the card body (fall back to `snippet` if missing)
- Use `senderProfileUrl` for the avatar `<img>` with `onError` fallback to DiceBear

---

## Phase 3: Email Card UI Overhaul

### Step 3.1: Uniform card sizing
**File**: `components/email-card.tsx`
- Set fixed height on the card: `h-[320px]` (or similar) so all cards are identical
- Title: `line-clamp-1` (short AI title, max 1 line)
- Summary: `line-clamp-3` (clip after ~3 lines)
- Use `flex flex-col` with `flex-grow` on the content area so layout is stable regardless of content length

### Step 3.2: Liquid glass pill tags
**File**: `components/email-card.tsx`
- The existing category badges already have glassmorphism — refine to be more "liquid glass pill":
  - Increase `border-radius` to full pill (`rounded-full`)
  - Add subtle `backdrop-blur` + `saturate` to each pill
  - Slightly increase padding for pill feel
  - Move tags to right below the title (currently they're inside the white content box — move them between title and content box, or just below the title inside the box as they are now but with pill shape)

### Step 3.3: Mark-as-read animation — card slides up and vanishes
**File**: `components/email-card.tsx` + `components/email-card-carousel.tsx`
- In `EmailCard`: After `onMarkRead` succeeds, instead of just setting `markedRead = true` (which fades to 60% opacity), trigger a removal animation
- Implementation:
  - `EmailCardCarousel` wraps each card in `<AnimatePresence>` and uses `layoutId` for the card
  - When mark-as-read completes, remove the email from `emails` state array
  - The `exit` animation on the card's `motion.div`: `{ opacity: 0, y: -80, scale: 0.9, transition: { duration: 0.4, ease: "easeInOut" } }`
  - Use `AnimatePresence` with `mode="popLayout"` so remaining cards reflow smoothly
- **Change in carousel**: Wrap `emails.map(...)` with `<AnimatePresence>` and give each card a `key={email.id}` + `layoutId={email.id}`
- **Change in card**: `handleMarkRead` should call `onMarkRead` which removes from parent state; exit animation handled by `AnimatePresence`
- Update `onMarkRead` callback type: `(messageId: string) => Promise<void>` — the carousel's `handleMarkRead` should call the API, then `setEmails(prev => prev.filter(e => e.id !== messageId))` to trigger removal

### Step 3.4: In-card reply UI
**File**: `components/email-card.tsx`
- Add state: `showReply: boolean`, `replyText: string`, `sending: boolean`, `sent: boolean`
- When "reply" button clicked: set `showReply = true`, populate `replyText` with `suggestedReply` (from AI)
- Show a reply section within the card (replacing or overlaying the snippet area):
  - Editable `<textarea>` with the suggested reply, styled to match glassmorphism
  - "Send" button and "Cancel" button
  - On send: POST to `/api/gmail/send-email` with `{ to: senderEmail, subject: "Re: " + subject, body: replyText, thread_id: threadId }`
  - On success: show brief "Sent ✓" state, then collapse reply UI
  - On cancel: hide reply UI, reset state
- The reply UI should animate in with `motion` (slide down / fade in within the card)
- Card height remains fixed — reply UI replaces the content area, not expands the card

---

## Phase 4: Expand-to-Center Morph Animation

This is the most complex feature. When clicking an email card, it morphs into a larger centered view while other dashboard components animate out.

### Step 4.1: Layout architecture for morph
**File**: `components/email-card-carousel.tsx` (primary), `components/chat-ui.tsx` (dashboard coordination)

**Approach**: Use `layoutId` from `motion/react` for the card morph + `AnimatePresence` for the expanded overlay.

- Add state to carousel: `expandedEmailId: string | null`
- When a card is clicked (not on reply/mark-read buttons): set `expandedEmailId = email.id`
- Render an expanded overlay when `expandedEmailId` is set:
  - Full-screen overlay (`fixed inset-0 z-50`) with backdrop blur
  - The expanded card uses `layoutId={email.id}` matching the carousel card's `layoutId`
  - Motion handles the morph automatically between the small card position and the centered large card
  - Expanded card: `max-w-[700px] w-[90vw]` centered, showing full summary (no clamp), full email details, reply UI

### Step 4.2: Dashboard siblings animate out
**File**: `components/chat-ui.tsx`

- Lift `expandedEmailId` state up to `chat-ui.tsx` (or pass via callback/context)
- When an email is expanded:
  - `AtAGlance` component: animate `{ opacity: 0, y: -100, scale: 0.9 }` 
  - Right side widgets (`AudioWave`, `Folder`): animate `{ opacity: 0, x: 100 }`
  - Bottom music widget: animate `{ opacity: 0, y: 100 }`
  - Email carousel (other cards): animate `{ opacity: 0 }` (the expanded card stays via `layoutId`)
- When closed (click outside or close button): reverse all animations
- Use `motion` `animate` prop driven by `expandedEmailId !== null`

### Step 4.3: Expanded email card component
**File**: Create `components/email-card-expanded.tsx` (or inline in carousel)

- Shows full AI summary (no line clamp)
- Shows original subject line + AI short title
- Shows all categories
- Shows full sender info + profile picture
- Shows attachment list (if any)
- Reply UI (same as in-card but larger textarea)
- Mark as read button
- Close button (X) in top-right
- Date & time
- `layoutId` matching the card it morphed from
- Clicking outside the expanded card closes it

### Step 4.4: Prevent click-through on action buttons
**File**: `components/email-card.tsx`
- Add `e.stopPropagation()` on reply and mark-as-read button click handlers
- The card's outer `onClick` triggers expand; buttons don't bubble up

---

## Phase 5: Profile Picture with Fallback

### Step 5.1: Gravatar + DiceBear fallback
**File**: `components/email-card.tsx`
- Compute Gravatar URL: Use `md5` hash of lowercase trimmed email → `https://www.gravatar.com/avatar/{hash}?s=84&d=404`  
- `<img>` with `onError` → fall back to DiceBear URL
- Add a lightweight md5 utility (or use a simple hash function) — there's no need for a full crypto library, use `crypto.subtle` in browser or a small inline md5
- **Alternative simpler approach**: Use Google's profile picture endpoint `https://lh3.googleusercontent.com/a/default-user` — but this requires the sender's Google profile ID which we don't have
- **Simplest approach**: Keep DiceBear but allow `senderProfileUrl` prop override. The backend can try to resolve profile URLs later as an enhancement.

---

## Relevant Files

- [components/email-card.tsx](components/email-card.tsx) — Major changes: uniform sizing, liquid-glass pills, in-card reply, expanded click handler, profile picture, mark-as-read removal trigger, `suggestedReply`/`shortTitle`/`summary` props
- [components/email-card-carousel.tsx](components/email-card-carousel.tsx) — Major changes: fetch 20 unread, AI summarize call, importance filtering/sorting, `AnimatePresence` for removal animation, `layoutId` for morph, expanded state management
- [components/chat-ui.tsx](components/chat-ui.tsx) — Changes: lift `expandedEmailId`, animate dashboard siblings out when email expanded
- [app/api/gmail/summarize/route.ts](app/api/gmail/summarize/route.ts) — **New file**: AI importance ranking + summary + short title + suggested reply
- [app/api/gmail/categorize/route.ts](app/api/gmail/categorize/route.ts) — No changes needed
- [app/api/gmail/messages/route.ts](app/api/gmail/messages/route.ts) — No changes needed (already supports params)
- [app/api/gmail/mark-read/route.ts](app/api/gmail/mark-read/route.ts) — No changes needed
- [app/api/gmail/send-email/route.ts](app/api/gmail/send-email/route.ts) — No changes needed

---

## Step Execution Order & Dependencies

```
Phase 1 (Backend)
  Step 1.1: Create /api/gmail/summarize          [no deps, can start immediately]
  Step 1.2: Verify messages route params          [no deps, parallel with 1.1]
  Step 1.3: Decide profile picture approach       [no deps, parallel with 1.1]

Phase 2 (Data Flow)                               [depends on Phase 1]
  Step 2.1: Update carousel fetch logic           [depends on 1.1]
  Step 2.2: Update EmailCardProps                 [parallel with 2.1]

Phase 3 (Card UI)                                 [depends on Phase 2 for props]
  Step 3.1: Uniform card sizing                   [can start parallel with Phase 2]
  Step 3.2: Liquid glass pill tags                [parallel with 3.1]
  Step 3.3: Mark-as-read animation                [depends on 2.1 for state management]
  Step 3.4: In-card reply UI                      [depends on 2.2 for suggestedReply prop]

Phase 4 (Expand Animation)                        [depends on Phase 3]
  Step 4.1: Layout architecture for morph         [depends on 3.1 card structure]
  Step 4.2: Dashboard siblings animate out        [depends on 4.1]
  Step 4.3: Expanded email card component         [parallel with 4.2]
  Step 4.4: Click-through prevention              [parallel with 4.1]

Phase 5 (Profile Picture)                         [independent, parallel with Phase 3-4]
  Step 5.1: Gravatar + DiceBear fallback          [no deps]
```

---

## Verification

1. **API test**: `GET /api/gmail/messages?maxResults=20&q=is:unread` returns up to 20 unread messages  
2. **API test**: `POST /api/gmail/summarize` returns importance, shortTitle, summary, suggestedReply for each email  
3. **UI check**: Dashboard shows max 10 cards, all same height, with AI-generated titles and summaries  
4. **UI check**: Category tags appear as liquid-glass pills below the title  
5. **UI check**: Clicking "Mark as read" → card animates upward and vanishes, other cards reflow  
6. **API test**: After mark-as-read animation, verify `/api/gmail/mark-read` was called and email is marked in Gmail  
7. **UI check**: Clicking "Reply" → shows editable textarea in-card with AI-suggested reply  
8. **UI check**: Editing reply text and clicking "Send" → calls `/api/gmail/send-email`, shows success state  
9. **UI check**: Clicking on a card (not on buttons) → card morphs to center, other dashboard elements animate out  
10. **UI check**: Expanded card shows full summary, reply UI, close button; clicking outside closes and reverses animation  
11. **UI check**: All animations use `motion/react` (NOT `framer-motion` export)  
12. **Build**: `npm run build` passes with no TypeScript errors  

---

## Decisions

- **Profile picture**: Start with DiceBear (current) + Gravatar attempt via `onError` fallback. Defer People API integration to avoid OAuth scope changes.
- **Reply sends from card**: Reply goes directly via `/api/gmail/send-email` route, NOT through the AI chat. The AI only generates the suggested reply text.
- **Importance ranking**: Done server-side via Gemini in the new `/api/gmail/summarize` route. Combined with categorization (both calls happen in parallel).
- **Card height**: Fixed at a consistent value (~320px) regardless of content. Content is clipped.
- **Expanded view**: Uses `layoutId` morph animation from `motion/react`, not a separate modal.
- **Mark-as-read removal**: Card is removed from the `emails` state array after API success, `AnimatePresence` handles the exit animation.

---

## Further Considerations

1. **Batching summarize + categorize**: Could combine into a single Gemini call to reduce latency (one API call instead of two). Would simplify the schema and save one round-trip. **Recommendation**: Keep separate for now (categorize is already built); combine later if latency is an issue.
2. **Caching summaries**: If the user refreshes the page, all 20 emails get re-summarized. Could cache in localStorage keyed by message ID. **Recommendation**: Add localStorage caching in a follow-up to keep this scope focused.
3. **Reply in expanded view vs card view**: The plan includes reply in both the small card and expanded card. Could simplify to only show reply in the expanded view. **Recommendation**: Keep in both — small card has quick reply, expanded has full reply with more space.

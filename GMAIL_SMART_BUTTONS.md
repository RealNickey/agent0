# Gmail Draft & Send Feature - Smart Button Selection

## Overview
Enhanced the EmailDraftConfirmation component to intelligently provide "Save to Draft" and/or "Send Email" buttons based on user intent.

## Implementation

### 1. Smart Button Detection

The component now automatically determines which buttons to show:

#### **Show "Send Email" only**
- User says: "send email to...", "email john@example.com about..."
- Has recipient email address
- Reasoning contains "send", "deliver", "transmit"

#### **Show "Save to Draft" only**
- User says: "create a draft...", "draft an email...", "save email for later"
- Reasoning contains "draft", "save", "prepare"
- No clear recipient specified

#### **Show BOTH buttons**
- Intent is unclear from context
- Both send and draft keywords present
- User wants flexibility
- Default fallback option

### 2. Component Updates

**EmailDraftConfirmation** (`email-draft-confirmation.tsx`)

New features:
- **`intent` prop**: Optional "send" | "draft" | "both" parameter
- **Smart detection**: Analyzes reasoning text and email content to infer intent
- **Two actions**: `handleSend()` and `handleSaveDraft()`
- **Two success states**: 
  - Green card for "Email Sent Successfully" 
  - Blue card for "Draft Saved Successfully"
- **Flexible validation**: 
  - Send requires: to, subject, body
  - Draft requires: subject OR body (more lenient)

Buttons displayed:
```tsx
// Cancel button always shown
<Button variant="outline">Cancel</Button>

// Save to Draft (if enabled)
<Button variant="secondary">
  <SaveIcon /> Save to Draft
</Button>

// Send Email (if enabled)
<Button>
  <SendIcon /> Send Email
</Button>
```

### 3. Gmail Tools Update

**composeEmailTool** (`ai/gmail-tools.ts`)

Enhanced with:
- New `intent` parameter in schema
- Automatic intent detection from reasoning
- Updated description to guide AI
- Keywords detection:
  - Draft: "draft", "save", "prepare"
  - Send: "send", "email to", has recipient

Returns:
```typescript
{
  status: "pending_confirmation",
  emailDetails: { to, subject, body, cc, bcc, thread_id },
  intent: "send" | "draft" | "both",
  reasoning: "...",
  message: "..." // Varies based on intent
}
```

### 4. New API Route

**create-draft** (`app/api/gmail/create-draft/route.ts`)

New endpoint: `POST /api/gmail/create-draft`

Features:
- Creates Gmail draft via API
- Optional validation (allows empty fields)
- Returns draft ID for opening in Gmail
- Handles RFC 2822 email format
- OAuth token authentication

Request:
```json
{
  "to": "optional@example.com",
  "subject": "optional",
  "body": "optional",
  "cc": "optional",
  "bcc": "optional"
}
```

Response:
```json
{
  "error": false,
  "draftId": "draft_abc123",
  "messageId": "msg_xyz789",
  "message": "Draft saved successfully"
}
```

## User Experience Examples

### Example 1: Send Email Intent
**User**: `@gmail send an email to john@company.com about tomorrow's meeting`

**AI Response**:
1. Calls `composeEmail` tool
2. Detects intent = "send" (has recipient + "send" keyword)
3. Shows form with buttons:
   - ❌ Cancel
   - ✉️ Send Email

### Example 2: Draft Intent
**User**: `@gmail create a draft for the quarterly report email`

**AI Response**:
1. Calls `composeEmail` tool
2. Detects intent = "draft" ("create a draft" keyword)
3. Shows form with buttons:
   - ❌ Cancel
   - 💾 Save to Draft

### Example 3: Unclear Intent
**User**: `@gmail compose an email about the project update`

**AI Response**:
1. Calls `composeEmail` tool
2. Detects intent = "both" (no clear indicators)
3. Shows form with buttons:
   - ❌ Cancel
   - 💾 Save to Draft
   - ✉️ Send Email

## Success States

### Email Sent (Green Theme)
```
┌─────────────────────────────────┐
│ ✓ Email Sent Successfully       │
│   Your message has been delivered│
├─────────────────────────────────┤
│ To: john@company.com            │
│ Subject: Meeting Tomorrow       │
│                                 │
│ [View in Gmail] →               │
└─────────────────────────────────┘
```

### Draft Saved (Blue Theme)
```
┌─────────────────────────────────┐
│ 💾 Draft Saved Successfully      │
│   Your draft has been saved      │
├─────────────────────────────────┤
│ To: john@company.com            │
│ Subject: Meeting Tomorrow       │
│                                 │
│ [Open Draft in Gmail] →         │
└─────────────────────────────────┘
```

## Decision Logic Flowchart

```
User Request
    │
    ├─ Contains "draft", "save" → intent = "draft"
    ├─ Contains "send", has recipient → intent = "send"  
    └─ Unclear/both → intent = "both"
                │
                ▼
    EmailDraftConfirmation
                │
    ┌───────────┴────────────┐
    │                        │
    ▼                        ▼
Save to Draft            Send Email
    │                        │
    ▼                        ▼
POST /api/gmail/      POST /api/gmail/
create-draft          send-email
    │                        │
    ▼                        ▼
Draft Saved Success    Email Sent Success
(Blue Card)            (Green Card)
```

## Technical Details

### Button Rendering Logic
```typescript
const determineButtons = () => {
  // Explicit intent from tool
  if (intent === "send") return { showSend: true, showDraft: false };
  if (intent === "draft") return { showSend: false, showDraft: true };
  if (intent === "both") return { showSend: true, showDraft: true };

  // Analyze reasoning text
  const isDraftIntent = reasoning.includes("draft") || 
                        reasoning.includes("save");
  const isSendIntent = reasoning.includes("send") || 
                       formData.to.trim() !== "";

  // Both or unclear → show both
  if ((isDraftIntent && isSendIntent) || 
      (!isDraftIntent && !isSendIntent)) {
    return { showSend: true, showDraft: true };
  }

  return { showSend: isSendIntent, showDraft: isDraftIntent };
};
```

### State Management
```typescript
type Status = 
  | "pending"   // Show form
  | "sending"   // Sending email
  | "sent"      // Email sent successfully
  | "saving"    // Saving draft
  | "saved"     // Draft saved successfully
  | "cancelled" // User cancelled
  | "error";    // Error occurred

type ActionType = "send" | "draft" | null;
```

### Validation Rules
```typescript
// Send Email - strict validation
const isValidForSend = 
  formData.to && 
  formData.subject && 
  formData.body;

// Save to Draft - lenient validation
const isValidForDraft = 
  formData.subject || 
  formData.body;
```

## Files Modified/Created

### Modified (3 files)
1. **`components/ai-elements/email-draft-confirmation.tsx`**
   - Added `intent` prop
   - Added `SaveIcon` import
   - Added `determineButtons()` function
   - Added `handleSaveDraft()` function
   - Added "Draft Saved" success state
   - Updated button rendering logic
   - Added action type tracking

2. **`ai/gmail-tools.ts`**
   - Updated `composeEmailTool` description
   - Added `intent` parameter to schema
   - Added automatic intent detection
   - Updated reasoning instructions

3. **`components/ai-elements/message-list.tsx`**
   - Added `intent` prop to EmailDraftConfirmation

### Created (1 file)
4. **`app/api/gmail/create-draft/route.ts`**
   - New API endpoint for creating drafts
   - Zod validation schema
   - Gmail API integration
   - Error handling

## Testing Checklist

- [x] TypeScript compilation (no errors)
- [x] Component structure validated
- [ ] Test "send email" intent
- [ ] Test "create draft" intent
- [ ] Test both buttons shown
- [ ] Test save to draft functionality
- [ ] Test send email functionality
- [ ] Test validation (send vs draft)
- [ ] Test success states (green vs blue)
- [ ] Test error handling
- [ ] Test Cancel button
- [ ] Test "Open Draft in Gmail" link
- [ ] Test "View in Gmail" link

## Benefits

✅ **Intelligent UX**: AI automatically detects user intent
✅ **Flexibility**: User can choose send or draft when unclear
✅ **Clear Actions**: Distinct buttons with icons
✅ **Visual Feedback**: Different success cards (green vs blue)
✅ **Gmail Integration**: Direct links to drafts/sent messages
✅ **Lenient Validation**: Drafts don't require all fields
✅ **Error Handling**: Clear error messages for each action

## Keywords Detection

### Draft Keywords
- "draft"
- "save"
- "save for later"
- "prepare"
- "create a draft"

### Send Keywords
- "send"
- "send email"
- "email to"
- "deliver"
- "transmit"
- Has recipient email

## Future Enhancements

1. **Edit Draft**: Load existing draft for editing
2. **Auto-save**: Save draft automatically while composing
3. **Templates**: Save as template for reuse
4. **Schedule Send**: Schedule email for later
5. **Rich Text**: Support HTML formatting
6. **Attachments**: Add files to drafts

---

**Status**: ✅ Complete & Ready for Testing
**Implementation Date**: February 5, 2026

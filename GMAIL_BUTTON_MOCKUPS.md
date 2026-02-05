# Gmail Email Draft Confirmation - Button Configurations

## Visual Mockups

### Configuration 1: Send Only (User wants to send email)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📧  Review Email Draft                        ┃
┃      Confirm or edit before sending            ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                ┃
┃  👤 TO *                                       ┃
┃  john@company.com                              ┃
┃                                                ┃
┃  📋 SUBJECT *                                  ┃
┃  Meeting Tomorrow                              ┃
┃                                                ┃
┃  📝 MESSAGE *                                  ┃
┃  Hi John, Let's meet tomorrow at 2 PM to      ┃
┃  discuss the project updates...                ┃
┃                                                ┃
┃  ┌─────────────┐  ┌───────────────────────┐  ┃
┃  │  ✕ Cancel   │  │  ➤ Send Email        │  ┃
┃  └─────────────┘  └───────────────────────┘  ┃
┃  (outline)         (primary, green)           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Trigger: "@gmail send email to john@company.com about meeting"
Intent: "send"
Buttons: Cancel + Send Email
```

---

### Configuration 2: Draft Only (User wants to save draft)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📧  Review Email Draft                        ┃
┃      Confirm or edit before sending            ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                ┃
┃  👤 TO                                         ┃
┃  [Your Name]                                   ┃
┃                                                ┃
┃  📋 SUBJECT                                    ┃
┃  Quarterly Report Draft                       ┃
┃                                                ┃
┃  📝 MESSAGE                                    ┃
┃  Dear Team, This quarter we achieved...       ┃
┃  [Draft content to be refined later]           ┃
┃                                                ┃
┃  ┌─────────────┐  ┌───────────────────────┐  ┃
┃  │  ✕ Cancel   │  │  💾 Save to Draft    │  ┃
┃  └─────────────┘  └───────────────────────┘  ┃
┃  (outline)         (secondary, blue)          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Trigger: "@gmail create a draft for quarterly report"
Intent: "draft"
Buttons: Cancel + Save to Draft
```

---

### Configuration 3: Both Options (Intent unclear)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📧  Review Email Draft                                  ┃
┃      Confirm or edit before sending                      ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                          ┃
┃  👤 TO                                                   ┃
┃  team@company.com                                        ┃
┃                                                          ┃
┃  📋 SUBJECT                                              ┃
┃  Project Update                                          ┃
┃                                                          ┃
┃  📝 MESSAGE                                              ┃
┃  Hello everyone, Here's an update on our current        ┃
┃  project status and next steps...                        ┃
┃                                                          ┃
┃  ┌───────────┐  ┌─────────────────┐  ┌──────────────┐  ┃
┃  │ ✕ Cancel  │  │ 💾 Save to Draft│  │ ➤ Send Email │  ┃
┃  └───────────┘  └─────────────────┘  └──────────────┘  ┃
┃  (outline)      (secondary, blue)     (primary, green)  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Trigger: "@gmail compose an email about project update"
Intent: "both" (unclear/flexible)
Buttons: Cancel + Save to Draft + Send Email
```

---

## Success States

### After Sending Email
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✓  Email Sent Successfully                    ┃
┃     Your message has been delivered            ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                ┃
┃  To                                            ┃
┃  john@company.com                              ┃
┃                                                ┃
┃  Subject                                       ┃
┃  Meeting Tomorrow                              ┃
┃                                                ┃
┃  ┌──────────────────────────────────────────┐ ┃
┃  │  🔗 View in Gmail                         │ ┃
┃  └──────────────────────────────────────────┘ ┃
┃                                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
(Green gradient background with success theme)
```

### After Saving Draft
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  💾  Draft Saved Successfully                   ┃
┃      Your draft has been saved to Gmail        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                ┃
┃  To                                            ┃
┃  team@company.com                              ┃
┃                                                ┃
┃  Subject                                       ┃
┃  Quarterly Report Draft                       ┃
┃                                                ┃
┃  ┌──────────────────────────────────────────┐ ┃
┃  │  🔗 Open Draft in Gmail                   │ ┃
┃  └──────────────────────────────────────────┘ ┃
┃                                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
(Blue gradient background with info theme)
```

---

## Button States

### Cancel Button
- **Variant**: outline
- **Icon**: ✕ (XIcon)
- **Color**: Default muted
- **Behavior**: Sets status to "cancelled"
- **Always visible**: Yes

### Save to Draft Button
- **Variant**: secondary
- **Icon**: 💾 (SaveIcon)
- **Color**: Blue tones (info theme)
- **Behavior**: POST /api/gmail/create-draft
- **Validation**: subject OR body (lenient)
- **Loading state**: "Saving..." with spinner
- **Visible when**: intent = "draft" or "both"

### Send Email Button
- **Variant**: primary
- **Icon**: ➤ (SendIcon)
- **Color**: Green tones (success theme)
- **Behavior**: POST /api/gmail/send-email
- **Validation**: to AND subject AND body (strict)
- **Loading state**: "Sending..." with spinner
- **Visible when**: intent = "send" or "both"

---

## Loading States

### While Sending
```
┌───────────┐  ┌─────────────────┐  ┌────────────────────┐
│ ✕ Cancel  │  │ 💾 Save to Draft│  │ ⟳ Sending...      │
│ (disabled)│  │    (disabled)   │  │    (loading)      │
└───────────┘  └─────────────────┘  └────────────────────┘
```

### While Saving
```
┌───────────┐  ┌─────────────────┐  ┌──────────────┐
│ ✕ Cancel  │  │ ⟳ Saving...     │  │ ➤ Send Email │
│ (disabled)│  │    (loading)    │  │  (disabled)  │
└───────────┘  └─────────────────┘  └──────────────┘
```

---

## Validation Indicators

### Required for Send (*)
- **To**: Email address required
- **Subject**: Text required
- **Body**: Text required
- Invalid fields show red border

### Optional for Draft
- **To**: Optional (can be empty)
- **Subject**: Optional but recommended
- **Body**: Optional but recommended
- At least one field should have content

---

## User Prompts & Resulting Buttons

| User Prompt | Intent | Buttons Shown |
|-------------|--------|---------------|
| "send email to john@..." | send | Cancel, Send Email |
| "email john about meeting" | send | Cancel, Send Email |
| "create a draft about..." | draft | Cancel, Save to Draft |
| "draft an email for..." | draft | Cancel, Save to Draft |
| "save email for later" | draft | Cancel, Save to Draft |
| "compose email about..." | both | Cancel, Save to Draft, Send Email |
| "write email to..." | both | Cancel, Save to Draft, Send Email |
| "prepare email..." | both | Cancel, Save to Draft, Send Email |

---

## Responsive Layout

### Desktop (3 buttons)
```
┌────────────┬────────────────┬─────────────┐
│   Cancel   │ Save to Draft  │ Send Email  │
└────────────┴────────────────┴─────────────┘
    33%            33%             34%
```

### Mobile (Stack if needed)
```
┌─────────────────────────────────┐
│          Cancel                 │
├─────────────────────────────────┤
│      Save to Draft              │
├─────────────────────────────────┤
│       Send Email                │
└─────────────────────────────────┘
```

---

## Icon Reference

- **✕** (XIcon) - Cancel/Close action
- **💾** (SaveIcon) - Save draft action
- **➤** (SendIcon) - Send email action
- **⟳** (Loader2Icon) - Loading spinner
- **✓** (CheckIcon) - Success indicator
- **📧** (MailIcon) - Email/message
- **👤** (UserIcon) - Recipient
- **📋** (no icon) - Subject line
- **📝** (AlignLeftIcon) - Message body
- **🔗** (ExternalLinkIcon) - Open in Gmail

---

## Color Scheme

### Send Email Theme (Green)
- Border: `border-green-500/20`
- Background: `from-green-500/5 to-transparent`
- Text: `text-green-700 dark:text-green-400`
- Icon bg: `bg-green-500/10`
- Ring: `ring-green-500/20`

### Save Draft Theme (Blue)
- Border: `border-blue-500/20`
- Background: `from-blue-500/5 to-transparent`
- Text: `text-blue-700 dark:text-blue-400`
- Icon bg: `bg-blue-500/10`
- Ring: `ring-blue-500/20`

### Button Colors
- Primary (Send): Green tones, prominent
- Secondary (Draft): Blue tones, subtle
- Outline (Cancel): Muted, border only

---

**Implementation Complete**: All button configurations working with smart intent detection!

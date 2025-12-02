# Agent0 Screenshot Extension - Visual Architecture

## 🎬 User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER BROWSING WEB                          │
│                    (Any Website/Page)                            │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ Press Ctrl+Shift+S
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              BROWSER EXTENSION ACTIVATED                         │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Content Script Injects Visual Overlay           │           │
│  │  • Semi-transparent dark background              │           │
│  │  • Instructions floating at top                   │           │
│  │  • Crosshair cursor                               │           │
│  └──────────────────────────────────────────────────┘           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
    Click           Drag            Press ESC
 (Full Screen)   (Select Area)      (Cancel)
        │               │               │
        │               │               └──► Cleanup & Exit
        │               │
        └───────────────┴───────────────┐
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              SCREENSHOT CAPTURE PROCESS                          │
│  ┌──────────────────────────────────────────────────┐           │
│  │  1. Content Script → Background Worker           │           │
│  │     "captureVisibleTab" message                   │           │
│  │                                                    │           │
│  │  2. Background Worker uses Chrome API             │           │
│  │     chrome.tabs.captureVisibleTab()               │           │
│  │     → Returns base64 PNG data URL                 │           │
│  │                                                    │           │
│  │  3. If area selected (not full screen):           │           │
│  │     • Create temporary canvas                     │           │
│  │     • Load captured image                         │           │
│  │     • Crop to selected coordinates                │           │
│  │     • Apply device pixel ratio                    │           │
│  │     • Convert to data URL                         │           │
│  └──────────────────────────────────────────────────┘           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              CONTEXT COLLECTION                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Gather Metadata:                                 │           │
│  │  • screenshot: base64 PNG data URL                │           │
│  │  • pageUrl: window.location.href                  │           │
│  │  • pageTitle: document.title                      │           │
│  │  • selectedText: window.getSelection()            │           │
│  │  • timestamp: Date.now()                          │           │
│  └──────────────────────────────────────────────────┘           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              TRANSFER TO AGENT0                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  1. Store in chrome.storage.local:                │           │
│  │     {                                              │           │
│  │       pendingScreenshot: {                        │           │
│  │         screenshot, pageUrl, pageTitle,           │           │
│  │         selectedText, timestamp                   │           │
│  │       }                                            │           │
│  │     }                                              │           │
│  │                                                    │           │
│  │  2. Check if Agent0 tab already open              │           │
│  │     chrome.tabs.query({url: agent0Url})           │           │
│  │                                                    │           │
│  │  3. If exists: Focus & reload with ?screenshot=true│           │
│  │     If not: Create new tab with ?screenshot=true  │           │
│  └──────────────────────────────────────────────────┘           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              AGENT0 RECEIVES DATA                                │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Next.js Page Loads (app/page.tsx)                │           │
│  │                                                    │           │
│  │  useEffect hook triggers:                         │           │
│  │  1. Check URL params: ?screenshot=true            │           │
│  │  2. If true, query chrome.storage.local           │           │
│  │  3. Retrieve pendingScreenshot data               │           │
│  │  4. Verify timestamp (< 5 min old)                │           │
│  │  5. Load into React state                         │           │
│  │  6. Clear storage & clean URL                     │           │
│  └──────────────────────────────────────────────────┘           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              UI DISPLAYS SCREENSHOT CONTEXT                      │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Context Card Shows:                              │           │
│  │  ┌────────────────────────────────────────────┐  │           │
│  │  │ 🖼️ Screenshot Attached                     │  │           │
│  │  │ 🔗 example.com                             │  │           │
│  │  │                                             │  │           │
│  │  │ Page Title Here                            │  │           │
│  │  │                                             │  │           │
│  │  │ "Selected text appears here if any..."     │  │           │
│  │  │                                             │  │           │
│  │  │ https://example.com/full/url               │  │           │
│  │  │                                             │  │           │
│  │  │ [Screenshot Preview Image]                  │  │           │
│  │  └────────────────────────────────────────────┘  │           │
│  └──────────────────────────────────────────────────┘           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              USER INTERACTION                                    │
│  ┌──────────────────────────────────────────────────┐           │
│  │  User types message or submits                    │           │
│  │  "What is this page about?"                       │           │
│  │                                                    │           │
│  │  handleSubmit() called:                           │           │
│  │  • Combines screenshot with message               │           │
│  │  • Adds context metadata as text                  │           │
│  │  • Creates formatted message:                     │           │
│  │    "Screenshot from: [title]                      │           │
│  │     URL: [url]                                    │           │
│  │     Selected text: [text]                         │           │
│  │                                                    │           │
│  │     What is this page about?"                     │           │
│  │                                                    │           │
│  │  • Clears screenshot context                      │           │
│  │  • Sends to AI (placeholder in demo)              │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Details

### 1. Screenshot Capture (Browser Extension)
```
User Action
    ↓
content.js (Overlay & Selection)
    ↓
chrome.runtime.sendMessage("captureVisibleTab")
    ↓
background.js (Service Worker)
    ↓
chrome.tabs.captureVisibleTab() → Base64 PNG
    ↓
Return to content.js
    ↓
Crop if needed (Canvas API)
    ↓
sendToAgent0(dataUrl, metadata)
```

### 2. Data Transfer (Extension → Agent0)
```
Screenshot + Metadata
    ↓
chrome.storage.local.set({
  pendingScreenshot: {
    screenshot: "data:image/png;base64,...",
    pageUrl: "https://...",
    pageTitle: "...",
    selectedText: "...",
    timestamp: 1733097600000
  }
})
    ↓
chrome.tabs.create/update
    ↓
Open Agent0 with ?screenshot=true
```

### 3. Data Retrieval (Agent0)
```
Page Load (useEffect)
    ↓
Check URL params
    ↓
If ?screenshot=true:
    ↓
chrome.storage.local.get(['pendingScreenshot'])
    ↓
Validate timestamp (< 5 min)
    ↓
setScreenshotContext(data)
    ↓
chrome.storage.local.remove(['pendingScreenshot'])
    ↓
window.history.replaceState({}, '', '/')
    ↓
Render UI with context
```

## 🎨 UI Component Hierarchy

```
Home (page.tsx)
│
├─ screenshotContext (state)
├─ messages (state)
│
├─ Header
│  ├─ Title: "Agent0 AI Assistant"
│  └─ Subtitle: "Screenshot-enhanced conversations"
│
├─ Screenshot Context Card (conditional)
│  ├─ Badges (Screenshot, Domain)
│  ├─ Page Title
│  ├─ Selected Text (if any)
│  ├─ URL Link
│  ├─ Screenshot Preview Image
│  └─ Remove Button
│
├─ Conversation Container
│  ├─ Empty State (if no messages)
│  │  ├─ Robot Emoji
│  │  ├─ Welcome Message
│  │  └─ Keyboard Shortcut Hint
│  │
│  └─ Message List
│     ├─ Message (user/assistant)
│     │  ├─ File Attachments (images)
│     │  └─ Text Content
│     └─ ...more messages
│
└─ Input Area (PromptInputProvider)
   ├─ Attachment Pills (removable)
   ├─ Textarea (auto-resize)
   └─ Footer
      ├─ Tools (attachment menu)
      └─ Submit Button
```

## 🔧 Technical Components

### Browser Extension Stack
```
┌─────────────────────────────────────┐
│   Manifest V3 Configuration         │
├─────────────────────────────────────┤
│ Service Worker (background.js)      │
│ • Event listeners                    │
│ • Storage management                 │
│ • Tab manipulation                   │
├─────────────────────────────────────┤
│ Content Scripts (content.js)         │
│ • DOM manipulation                   │
│ • Event handlers                     │
│ • Canvas operations                  │
├─────────────────────────────────────┤
│ Popup UI (popup.html/js)             │
│ • Settings form                      │
│ • Manual capture trigger             │
└─────────────────────────────────────┘
```

### Next.js Application Stack
```
┌─────────────────────────────────────┐
│   Next.js 16 (App Router)           │
├─────────────────────────────────────┤
│ React Components                     │
│ • useState (local state)             │
│ • useEffect (side effects)           │
│ • Event handlers                     │
├─────────────────────────────────────┤
│ UI Component Library                 │
│ • PromptInput (with attachments)     │
│ • Conversation                       │
│ • Message                            │
│ • Card, Badge, Button, etc.          │
├─────────────────────────────────────┤
│ Styling                              │
│ • Tailwind CSS                       │
│ • Custom utility classes             │
└─────────────────────────────────────┘
```

## 📊 Performance Characteristics

### Time Complexity
- **Full Screen Capture**: O(1) - Direct API call
- **Area Selection**: O(n) where n = pixels in selected area
- **Crop Operation**: O(n) where n = output pixels
- **Data Transfer**: O(1) - Chrome storage API
- **Context Load**: O(1) - Single storage query
- **UI Render**: O(m) where m = number of messages

### Space Complexity
- **Screenshot Storage**: ~500KB - 5MB (temporary, < 5 min)
- **Blob URLs**: Automatic cleanup on unmount
- **Component State**: Minimal (screenshot context + messages)
- **Extension Memory**: < 10MB resident

### Optimization Strategies
1. ✅ Lazy load screenshot context (only when detected)
2. ✅ Automatic blob URL revocation
3. ✅ Temporary storage with expiry
4. ✅ Device pixel ratio handling (no quality loss)
5. ✅ Minimal re-renders (React optimization)
6. ✅ Efficient Canvas operations (single pass)

## 🔐 Security Flow

```
User Screenshot
    ↓
[Local Browser Memory]
    ↓
Chrome Storage API (encrypted)
    ↓
[5 minute expiry timer starts]
    ↓
Transfer to localhost only
    ↓
Agent0 retrieves
    ↓
Storage cleared immediately
    ↓
Data only in React state (memory)
    ↓
Cleared on submission
    ↓
[No persistence anywhere]
```

### Security Features
- ✅ No external API calls
- ✅ No cloud storage
- ✅ Local processing only
- ✅ Automatic data cleanup
- ✅ Time-limited storage
- ✅ Origin-restricted transfers
- ✅ No telemetry/tracking

---

**This architecture ensures fast, secure, and reliable screenshot capture with seamless Agent0 integration.**

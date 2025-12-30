# Focus Mode - Phase 2: Chat UI Integration

Integration of focus mode with the Agent0 chat interface, allowing users to control focus sessions through AI conversation.

## ✅ Completed Features

### 1. Browser Extension Updates

#### **background.js** - Agent0 Communication
- Added `sendFocusUpdateToAgent0()` function to push updates to the web app
- Updated focus session handlers to broadcast events:
  - `AGENT0_FOCUS_STARTED` - Session started with mode, duration, taskName
  - `AGENT0_FOCUS_COMPLETE` - Session completed successfully
  - `AGENT0_FOCUS_STOPPED` - Session stopped early
- New handler: `handleStartFocusFromChat()` - Receives commands from chat UI
- Validates active tab and forwards commands to content script

#### **agent0-bridge.js** - New Content Script
- Bridges communication between Agent0 web app and extension
- Only injected on `http://localhost:3000/*`
- Listens for messages from background script → forwards to React app via `postMessage`
- Listens for messages from React app → forwards to background script
- Handles:
  - `AGENT0_FOCUS_COMMAND` - Start/pause/resume/stop commands from chat
  - `AGENT0_FOCUS_STATUS_REQUEST` - Status queries
  - Sends responses back to React app

#### **focus-overlay.js** - Enhanced
- Added `startFocusSession` message handler to accept commands from chat UI
- Stores `currentTaskName` for sessions initiated by AI
- Passes taskName to background script for notifications
- Shows overlay automatically when started from chat

#### **manifest.json** - Updated
- Added agent0-bridge.js content script for localhost:3000

### 2. Next.js Application Updates

#### **app/api/focus-mode/route.ts** - New API Endpoint
- `POST /api/focus-mode` - Handles focus mode commands from AI tool
- Validates:
  - Actions: start, pause, resume, stop, status
  - Modes: pomodoro, flowtime, countdown
  - Duration: 1-180 minutes for countdown mode
- Returns command object and user-friendly message
- `GET /api/focus-mode` - Returns available actions and modes

#### **lib/focus-mode-tool.ts** - AI Tool Definition
- Tool name: `focusMode`
- Zod schema for parameters (action, mode, duration, taskName)
- Executes via `/api/focus-mode` endpoint
- Sends command to extension via `postMessage`
- Returns success/error messages to AI

#### **ai/tools.ts** - Tool Registration
- Added `focusModeTool` to tools export
- Now exports: `{ displayWeather, focusMode }`

#### **components/chat-ui.tsx** - Chat Interface
- Added `focusSession` state to track active sessions
- Enhanced `postMessage` listener to handle:
  - `AGENT0_FOCUS_STARTED` - Updates UI when session starts
  - `AGENT0_FOCUS_COMPLETE` - Clears session on completion
  - `AGENT0_FOCUS_STOPPED` - Clears session on manual stop
  - `AGENT0_FOCUS_STATUS` - Updates session status
  - `AGENT0_FOCUS_COMMAND_RESPONSE` - Logs command responses
- Added focus session badge to feature badges row:
  - Shows `🎯 Focus: {mode}` when session is active
  - Pink color badge

## 🔄 Communication Flow

### Starting a Focus Session via Chat

```
User: "Start a 25-minute pomodoro session for coding"
  ↓
AI Agent invokes focusMode tool
  ↓
Tool calls POST /api/focus-mode
  ↓
API validates and returns command
  ↓
Tool sends postMessage(AGENT0_FOCUS_COMMAND)
  ↓
agent0-bridge.js forwards to background script
  ↓
background.js sends to active tab's content script
  ↓
focus-overlay.js shows overlay and starts timer
  ↓
background.js sends update to Agent0 page
  ↓
agent0-bridge.js forwards AGENT0_FOCUS_STARTED
  ↓
chat-ui.tsx updates focusSession state
  ↓
UI shows "🎯 Focus: pomodoro" badge
```

### Session Completion

```
Timer completes
  ↓
focus-overlay.js notifies background script
  ↓
background.js shows notification
  ↓
background.js sends AGENT0_FOCUS_COMPLETE to Agent0 page
  ↓
agent0-bridge.js forwards to React app
  ↓
chat-ui.tsx clears focusSession state
  ↓
Focus badge disappears from UI
```

## 🎯 Usage Examples

### Natural Language Commands

Users can now say things like:

- "Start a pomodoro session"
- "Set a 45-minute focus timer"
- "Help me focus for the next hour"
- "Start flowtime mode"
- "Pause my focus session"
- "Stop the timer"
- "Am I in a focus session?"

The AI will invoke the `focusMode` tool automatically.

### Tool Parameters

```javascript
// Start Pomodoro
{
  action: "start",
  mode: "pomodoro",
  taskName: "Write documentation"
}

// Start Countdown
{
  action: "start",
  mode: "countdown",
  duration: 45,
  taskName: "Deep work session"
}

// Start Flowtime
{
  action: "start",
  mode: "flowtime",
  taskName: "Creative brainstorming"
}

// Check Status
{
  action: "status"
}

// Pause/Resume/Stop
{
  action: "pause" | "resume" | "stop"
}
```

## 📦 Files Modified/Created

### Browser Extension
- ✏️ `browser-extension/background.js` - Added Agent0 communication
- ✨ `browser-extension/agent0-bridge.js` - NEW: Bridge script
- ✏️ `browser-extension/focus-mode/focus-overlay.js` - Added chat command handler
- ✏️ `browser-extension/manifest.json` - Added bridge script

### Next.js App
- ✨ `app/api/focus-mode/route.ts` - NEW: API endpoint
- ✨ `lib/focus-mode-tool.ts` - NEW: AI tool definition
- ✏️ `ai/tools.ts` - Added focusMode tool
- ✏️ `components/chat-ui.tsx` - Added focus session state and handlers

## 🧪 Testing Checklist

- [ ] Load extension in Chrome
- [ ] Open Agent0 at localhost:3000
- [ ] Check console for "Agent0 Focus Mode Bridge initialized"
- [ ] Say "Start a pomodoro session" in chat
- [ ] Verify focus overlay appears and starts
- [ ] Verify "🎯 Focus: pomodoro" badge appears in chat UI
- [ ] Complete or stop session
- [ ] Verify badge disappears
- [ ] Try other modes (flowtime, countdown)
- [ ] Try pause/resume/stop commands

## 🐛 Known Limitations

1. **Extension Required**: Focus mode only works when the Agent0 browser extension is installed and active
2. **Active Tab**: Commands apply to the currently active browser tab
3. **Restricted Pages**: Cannot start focus mode on chrome:// or extension pages
4. **Local Only**: Currently hardcoded to localhost:3000

## 🚀 Future Enhancements (Phase 3+)

- [ ] Voice notifications for session completion
- [ ] Focus session history and analytics in chat
- [ ] AI-suggested break activities
- [ ] Automatic website blocking during sessions
- [ ] Integration with task management tools
- [ ] Session scheduling and reminders
- [ ] Multi-device sync via Supabase
- [ ] Custom focus mode strategies
- [ ] Focus session reports and insights

## 📝 Architecture Notes

### Why postMessage?

We use `window.postMessage()` for communication between:
- Extension content script ↔ React app (same page, different contexts)
- This is the standard way for web pages and content scripts to communicate

### Why chrome.runtime.sendMessage?

We use `chrome.runtime.sendMessage()` for:
- Content script ↔ Background script (extension internal communication)
- This is the Chrome extension API for cross-context messaging

### Message Types

All messages follow this convention:
- `AGENT0_FOCUS_*` - Events from extension → web app
- `AGENT0_FOCUS_COMMAND` - Commands from web app → extension

## 🎨 UI Integration

The focus session badge appears in the feature badges row alongside:
- Google Search
- Thinking
- URL Context
- Code Execution
- @tool mentions

The badge is pink with an emoji: `🎯 Focus: {mode}`

---

Phase 2 Complete! 🎉

Users can now control focus sessions through natural conversation with the AI agent. The system seamlessly integrates the browser extension with the chat interface, providing a unified productivity experience.

# Focus Mode - Phase 1 (MVP)

Browser extension focus mode system with Pomodoro, Flowtime, and Countdown strategies.

## ✅ Completed Features

### Core Timer System
- **timer-engine.js** - Complete timer engine with:
  - Start/Pause/Resume/Stop functionality
  - Elapsed and remaining time tracking
  - Progress calculation (0-100%)
  - Event system with listeners
  - 100ms update intervals
  - Time formatting utilities

### Focus Strategies
- **strategies.js** - Three focus modes:
  1. **Pomodoro** - 25min work sessions with 5min short breaks and 15min long breaks every 4 cycles
  2. **Flowtime** - Unlimited work time, break duration calculated as 20% of work time (5-20 min range)
  3. **Countdown** - Custom duration timer (1-180 minutes)

### Storage & Persistence
- **storage.js** - Chrome storage wrapper with:
  - Last selected mode persistence
  - Strategy configurations (per-mode settings)
  - Current session state (for recovery after browser restart)
  - Session history tracking
  - User preferences (sounds, notifications, overlay position)
  - Import/Export capabilities

### Overlay UI
- **focus-overlay.js** - Draggable overlay with:
  - Mode selector buttons (Pomodoro/Flowtime/Countdown)
  - Timer display with MM:SS formatting
  - Progress bar
  - Start/Pause/Resume/Stop controls
  - Minimize/Close buttons
  - Draggable positioning (saves position to storage)
  - Beautiful gradient design with smooth animations
  - Keyboard shortcut support (Ctrl+Shift+F / Cmd+Shift+F)

### Extension Integration
- **manifest.json** - Updated with:
  - Focus mode content scripts
  - Storage and notifications permissions
  - Keyboard command: `toggle-focus-mode`

- **background.js** - Message handlers for:
  - `startFocusSession` - Initialize focus session
  - `pauseFocusSession` - Pause current session
  - `stopFocusSession` - Stop current session
  - `getFocusStatus` - Get current session state
  - Session notifications (started, completed, stopped)

## 🚀 How to Use

1. **Load the Extension**
   - Open Chrome/Edge and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `browser-extension` folder

2. **Toggle Focus Mode**
   - Press `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac)
   - Or use the extension popup

3. **Select a Mode**
   - Click Pomodoro, Flowtime, or Countdown button
   - Each mode has different behaviors

4. **Start a Session**
   - Click "Start" to begin
   - Timer will display remaining/elapsed time
   - Progress bar shows visual progress

5. **Pause/Resume**
   - Click "Pause" to pause timer
   - Click "Resume" to continue from where you left off

6. **Stop Session**
   - Click "Stop" to end session early
   - Session data is saved to history

7. **Move the Overlay**
   - Click and drag the header to reposition
   - Position is automatically saved

8. **Minimize**
   - Click "−" to minimize overlay
   - Click again to restore

## 📋 Technical Details

### Timer Engine
```javascript
const timer = new TimerEngine();

// Start a 25-minute session
timer.start(25 * 60, 'pomodoro');

// Listen to events
timer.addListener((event, state) => {
  console.log(event, state); // 'start', 'tick', 'complete', etc.
});

// Get current state
const state = timer.getState();
// {
//   status: 'running',
//   elapsedTime: 120,
//   remainingTime: 1380,
//   progress: 8.7,
//   mode: 'pomodoro',
//   ...
// }
```

### Strategies
```javascript
// Get a strategy
const strategy = getStrategy('pomodoro');

// Get initial duration
const duration = strategy.getInitialDuration(config);

// Get break duration
const breakDuration = strategy.getBreakDuration(cycleNumber, config);
```

### Storage
```javascript
// Get/Set last mode
await FocusStorage.setLastMode('pomodoro');
const mode = await FocusStorage.getLastMode();

// Get/Set preferences
await FocusStorage.updatePreference('soundEnabled', true);
const prefs = await FocusStorage.getPreferences();

// Session history
await FocusStorage.addSessionToHistory({
  mode: 'pomodoro',
  duration: 1500,
  completedAt: Date.now()
});
```

## 🎨 Design Features

- **Gradient Background** - Purple gradient (667eea → 764ba2)
- **Smooth Animations** - Slide-in animation, button hover effects
- **Responsive Controls** - Context-aware button states
- **Modern UI** - Clean, minimal design with rounded corners
- **Draggable** - Move overlay anywhere on screen
- **Persistent** - Position and settings saved automatically

## 📦 File Structure

```
browser-extension/
├── focus-mode/
│   ├── timer-engine.js     # Core timer logic
│   ├── strategies.js       # Focus mode strategies
│   ├── storage.js          # Chrome storage wrapper
│   ├── focus-overlay.js    # UI overlay
│   └── README.md           # This file
├── background.js           # Updated with focus handlers
└── manifest.json           # Updated with focus config
```

## 🔄 Next Steps (Phase 2)

- [ ] Integration with main Agent0 chat UI
- [ ] Dashboard with focus statistics
- [ ] Audio notifications and sounds
- [ ] Custom themes and colors
- [ ] Break reminders and suggestions
- [ ] Focus session scheduling
- [ ] Pomodoro cycle visualization
- [ ] Website blocking during sessions
- [ ] Productivity analytics

## 🐛 Known Issues

None at this time. This is a fresh Phase 1 implementation.

## 📝 Notes

- Focus overlay only works on regular web pages (not chrome:// or extension pages)
- Storage uses `chrome.storage.local` (synced across devices if Chrome Sync is enabled)
- Timer uses 100ms intervals for smooth progress updates
- All times are stored in seconds internally
- Maximum countdown duration is 3 hours (180 minutes)

---

Built with ❤️ for Agent0

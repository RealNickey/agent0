# Quick Start Guide - Screenshot to Agent0

## 5-Minute Setup

### Step 1: Start Agent0
```bash
cd agent0
npm run dev
```
Agent0 should now be running at http://localhost:3000

### Step 2: Load the Extension

**Chrome/Edge/Brave:**
1. Open browser and go to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Navigate to and select the `browser-extension` folder
5. ✅ Extension loaded!

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from `browser-extension` folder

### Step 3: Test It Out

1. **Open any webpage** (e.g., https://github.com)
2. **Press `Ctrl+Shift+S`** (Windows/Linux) or `Cmd+Shift+S` (Mac)
3. **Capture:**
   - Click anywhere for full screen
   - OR drag to select a specific area
4. **Watch the magic:**
   - ✨ Browser switches to Agent0 tab
   - 📸 Screenshot appears attached to the prompt
   - 📝 Page context is added to input

### Step 4: Send to AI

1. Type your question about the screenshot
2. Press Enter
3. AI responds with context about your screenshot!

## Example Use Cases

### Debug a Website Issue
1. Navigate to the problematic page
2. Select any error text on the page
3. Press `Ctrl+Shift+S` and capture
4. Ask: "What's wrong with this error?"

### Ask About Design
1. Open any website
2. Capture a specific UI component
3. Ask: "How can I recreate this design?"

### Analyze Content
1. Select interesting text on a page
2. Capture the area
3. Ask: "Summarize this content"

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Start capture | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| Cancel | `ESC` | `ESC` |
| Full screen | Click anywhere | Click anywhere |
| Area select | Click + Drag | Click + Drag |

## Troubleshooting

**Extension not showing up?**
- Make sure you selected the `browser-extension` folder (not a parent folder)
- Check for errors at `chrome://extensions/`

**Screenshot not appearing in Agent0?**
- Verify Agent0 is running: http://localhost:3000
- Check browser console (F12) for errors
- Make sure extension URL is set to `http://localhost:3000`

**Keyboard shortcut not working?**
- Some pages block shortcuts (chrome://, about: pages)
- Try on a regular webpage like https://example.com
- Check `chrome://extensions/shortcuts` for conflicts

## Next Steps

- Customize the Agent0 URL in extension popup for production
- Add custom icons to make it yours
- Star the repository if you find it useful! ⭐

---

**Need help?** Check the full [README.md](README.md) or open an issue on GitHub.

# Agent0 Screenshot Extension - Installation Guide

## Quick Start (5 minutes)

### Step 1: Install the Extension

#### For Chrome/Edge/Brave:

1. Open your browser and navigate to:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`

2. Enable **Developer mode**:
   - Look for a toggle switch in the top-right corner
   - Click it to enable

3. Click **"Load unpacked"** button

4. Navigate to your project folder:
   ```
   D:\main project\agent0\browser-extension
   ```

5. Select the `browser-extension` folder and click **"Select Folder"**

6. ✅ Extension installed! You should see "Agent0 Screenshot Capture" in your extensions list

#### For Firefox:

1. Open Firefox and go to: `about:debugging#/runtime/this-firefox`

2. Click **"Load Temporary Add-on..."**

3. Navigate to:
   ```
   D:\main project\agent0\browser-extension
   ```

4. Select the `manifest.json` file

5. ✅ Extension installed! (Note: In Firefox, temporary extensions are removed when you close the browser)

### Step 2: Create Icons (Optional but Recommended)

The extension works without icons, but for a better experience:

1. Navigate to `browser-extension/icons/`
2. Follow the instructions in `SETUP.md` to create PNG icons
3. Reload the extension after adding icons

**Quick method**: Use the SVG file provided and convert it online at https://cloudconvert.com/svg-to-png

### Step 3: Start Agent0

1. Open a terminal in your project root:
   ```bash
   cd D:\main project\agent0
   ```

2. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to: `http://localhost:3000`

### Step 4: Test the Extension

1. Navigate to any website (e.g., https://github.com)

2. Press the keyboard shortcut:
   - **Windows/Linux**: `Ctrl + Shift + S`
   - **Mac**: `Cmd + Shift + S`

3. You'll see an overlay appear:
   - **Click anywhere** to capture the full visible screen
   - **Click and drag** to select a specific area
   - **Press ESC** to cancel

4. After capture, Agent0 will automatically open with your screenshot!

## Configuration

Click the extension icon in your browser toolbar to:
- Set custom Agent0 URL (if not using `http://localhost:3000`)
- Capture screenshots manually

## Troubleshooting

### Extension not appearing after installation

- Make sure you selected the `browser-extension` folder, not the entire project
- Refresh the extensions page
- Check for error messages in the extensions list

### Keyboard shortcut not working

- Some pages (like `chrome://` or `edge://`) cannot be captured for security reasons
- Try on a regular website like GitHub or Google
- Check if another extension is using the same shortcut

### Screenshot not appearing in Agent0

1. Verify Agent0 is running: `http://localhost:3000` should load
2. Check the extension settings (click extension icon)
3. Ensure the URL is set correctly: `http://localhost:3000`
4. Check browser console (F12) for errors

### Icons not showing

Icons are optional. To add them:
1. See `browser-extension/icons/SETUP.md`
2. Create PNG files in required sizes
3. Reload extension from `chrome://extensions/`

## Next Steps

1. ✅ Extension installed and working
2. 📸 Test screenshot capture on various websites
3. 💬 Try asking questions about your screenshots in Agent0
4. 🎨 Customize icons (optional)
5. 🚀 Integrate your AI model (see main README.md)

## Common Usage Patterns

### Capturing specific content
1. Select text on a page
2. Press `Ctrl+Shift+S`
3. Drag to select the area around the text
4. Screenshot will include both the image AND the selected text as context

### Full page capture
1. Press `Ctrl+Shift+S`
2. Click anywhere (don't drag)
3. Full visible screen is captured

### Quick questions
1. Capture screenshot
2. In Agent0, it auto-includes page title and URL
3. Ask your question about the screenshot

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review the main README.md in the project root
3. Check browser console for errors (F12)
4. Ensure all files are present in `browser-extension/` folder

---

**Happy screenshotting! 📸**

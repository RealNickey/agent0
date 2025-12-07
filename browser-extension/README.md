# Agent0 Screenshot Extension

A browser extension that captures screenshots with keyboard shortcuts and sends them to your Agent0 AI assistant with context.

## Features

- 🎯 **Smart Screenshot Capture**: Capture full screen or select specific areas
- ⌨️ **Keyboard Shortcut**: Quick capture with `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac)
- 🔄 **Context-Aware**: Automatically includes page title, URL, and selected text
- 🚀 **Seamless Integration**: Screenshots appear instantly in Agent0 chat with full context
- 🎨 **Interactive Selection**: Visual overlay with dimension display

## Installation

### Chrome/Edge/Brave

1. Navigate to `browser-extension` folder in your project
2. Open Chrome/Edge and go to `chrome://extensions/` or `edge://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `browser-extension` folder
6. The extension is now installed!

### Firefox

1. Navigate to `browser-extension` folder
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select the `manifest.json` file from `browser-extension` folder

## Usage

### Method 1: Keyboard Shortcut (Recommended)

1. Navigate to any webpage
2. Press `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac)
3. Choose capture mode:
   - **Click** anywhere to capture the full visible screen
   - **Drag** to select a specific area
   - Press **ESC** to cancel
4. Screenshot automatically opens in Agent0 with full context

### Method 2: Extension Icon

1. Click the Agent0 extension icon in your browser toolbar
2. Click **📸 Capture Screenshot**
3. Follow the same selection process as above

## Configuration

Click the extension icon to access settings:

- **Agent0 URL**: Set the URL where your Agent0 application is running (default: `http://localhost:3000`)

## How It Works

1. **Capture**: Extension captures screenshot with metadata (URL, title, selected text)
2. **Transfer**: Data is temporarily stored in browser's local storage
3. **Display**: Agent0 automatically detects and displays the screenshot with context
4. **Context**: Full page information is included in your conversation

## Development

### Project Structure

```
browser-extension/
├── manifest.json         # Extension configuration
├── background.js         # Service worker for extension logic
├── content.js           # Screenshot capture & UI
├── content.css          # Styling for capture overlay
├── popup.html           # Settings popup UI
├── popup.js             # Settings popup logic
└── icons/               # Extension icons (add your own)
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Creating Icons

You need to create 3 icon sizes for the extension:
- `icon16.png` - 16x16px (toolbar icon)
- `icon48.png` - 48x48px (extension management)
- `icon128.png` - 128x128px (Chrome Web Store)

Place them in the `browser-extension/icons/` folder.

### Testing Locally

1. Make sure Agent0 is running: `npm run dev`
2. Load the extension in your browser (see Installation)
3. Navigate to any webpage
4. Test the screenshot capture
5. Verify it appears in Agent0 at `http://localhost:3000`

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave
- ✅ Firefox 109+ (with minor compatibility differences)
- ✅ Opera

## Security & Privacy

- Screenshots are processed locally and sent only to your configured Agent0 URL
- No data is sent to external servers
- Temporary storage is cleared after successful transfer
- All communication happens over your local network (by default)

## Troubleshooting

### Extension not capturing

- Ensure you have granted the necessary permissions
- Some protected pages (chrome://, about:) cannot be captured for security reasons
- Try refreshing the page and capturing again

### Screenshot not appearing in Agent0

- Verify Agent0 is running at the configured URL
- Check browser console for errors (F12)
- Ensure the Agent0 URL in extension settings is correct
- Clear browser cache and reload

### High-DPI display issues

The extension automatically handles device pixel ratio for high-resolution displays. If screenshots appear blurry, ensure your browser zoom is set to 100%.

## Performance

- **Capture time**: < 100ms for full screen
- **Processing**: O(1) for full screen, O(n) for selection where n = selected pixels
- **Memory**: Efficient blob URL handling with automatic cleanup
- **Storage**: Temporary (< 5 minutes expiry)

## Contributing

This extension is part of the Agent0 project. To contribute:

1. Make your changes in the `browser-extension/` folder
2. Test thoroughly in multiple browsers
3. Follow the existing code style
4. Submit a pull request

## License

Same as the main Agent0 project.

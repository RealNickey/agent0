# Extension Icon Setup

## Current Status
⚠️ **Icons are currently disabled in manifest.json** to allow the extension to load immediately.

The extension works perfectly without icons - Chrome will display a default puzzle piece icon.

## Quick Icon Generation

### Option 1: Use Online Converter (Easiest - 2 minutes)

1. The `icon.svg` file is already in this folder
2. Go to https://cloudconvert.com/svg-to-png
3. Upload `icon.svg`
4. Convert to PNG and set these sizes:
   - **16x16px** → save as `icon16.png`
   - **48x48px** → save as `icon48.png`
   - **128x128px** → save as `icon128.png`
5. Save all 3 PNG files in this `icons/` folder
6. Then uncomment the icon sections in `manifest.json`
7. Reload the extension in Chrome

### Option 2: Use ImageMagick (Command Line)

If you have ImageMagick installed:

```powershell
cd browser-extension/icons

# Convert SVG to PNG at different sizes
magick convert -background none icon.svg -resize 16x16 icon16.png
magick convert -background none icon.svg -resize 48x48 icon48.png
magick convert -background none icon.svg -resize 128x128 icon128.png
```

### Option 3: Use Node.js with Sharp

```powershell
npm install sharp
node -e "const sharp=require('sharp'); const fs=require('fs'); const svg=fs.readFileSync('icon.svg'); [16,48,128].forEach(s=>sharp(svg).resize(s,s).png().toFile('icon'+s+'.png'))"
```

## After Creating Icons

1. Verify all 3 PNG files exist in this folder:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

2. Edit `manifest.json` and add back the icon references:

```json
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
```

3. Reload the extension:
   - Go to `chrome://extensions/`
   - Click the reload icon on the Agent0 extension
   - Your custom icons will now appear!

## Custom Icon Design

If you want to create your own custom icon:

1. Use Figma, Canva, or Photoshop
2. Create a 128x128px canvas
3. Design your icon (camera + "A0" branding works well)
4. Export as PNG in all three sizes
5. Place in this folder

### Icon Guidelines

- **Simple**: Should be recognizable at 16x16px
- **High contrast**: Works in both light and dark themes
- **Brand colors**: Use Agent0's blue (#3b82f6) as primary
- **Clear purpose**: Include camera or screenshot symbol

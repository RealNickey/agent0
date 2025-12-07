# Agent0 Screenshot Extension - Icon Guide

This folder should contain the extension icons in the following sizes:

- **icon16.png** - 16x16 pixels (toolbar icon)
- **icon48.png** - 48x48 pixels (extension management page)
- **icon128.png** - 128x128 pixels (Chrome Web Store listing)

## Creating Icons

You can create icons using any image editor. Here are some options:

### Option 1: Use an Online Generator
- Visit [Favicon.io](https://favicon.io/) or similar tools
- Create a simple icon with "A0" or camera symbol
- Download and resize to the required dimensions

### Option 2: Use Design Tools
- **Figma**: Create 128x128 artboard, export at different scales
- **Canva**: Use built-in templates for app icons
- **Photoshop/GIMP**: Create and export at required sizes

### Design Suggestions

For a professional look:
- Use Agent0's brand colors (blue: #3b82f6)
- Include a camera or screenshot symbol
- Keep it simple and recognizable at small sizes
- Ensure good contrast for both light and dark themes

## Quick Icon Creation (SVG to PNG)

If you have an SVG icon, you can convert it to PNG:

```bash
# Using ImageMagick
magick convert -density 300 -background none icon.svg -resize 16x16 icon16.png
magick convert -density 300 -background none icon.svg -resize 48x48 icon48.png
magick convert -density 300 -background none icon.svg -resize 128x128 icon128.png
```

## Temporary Placeholder

Until you create custom icons, you can use emoji-based icons or simple colored squares. The extension will work without them, but browsers will show a default icon.

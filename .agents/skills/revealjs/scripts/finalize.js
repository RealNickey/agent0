#!/usr/bin/env node

/**
 * Finalize presentation - Integrate styles and clean artifacts
 * 
 * This script:
 * 1. Creates assets/ folder if it doesn't exist
 * 2. Integrates any custom CSS files (*.css except lib/offline-v2.css) into lib/offline-v2.css
 * 3. Removes external CSS references from index.html (except lib/offline-v2.css)
 * 4. Cleans up build artifacts (screenshots/, output.pdf)
 * 
 * Usage: node finalize.js <deck-path>
 */

const fs = require('fs');
const path = require('path');

const deckPath = process.argv[2] || '.';

if (!fs.existsSync(deckPath)) {
  console.error(`Error: Deck path does not exist: ${deckPath}`);
  process.exit(1);
}

const indexPath = path.join(deckPath, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error(`Error: index.html not found in ${deckPath}`);
  process.exit(1);
}

console.log(`Finalizing presentation: ${deckPath}\n`);

// 1. Ensure assets folder exists
const assetsPath = path.join(deckPath, 'assets');
if (!fs.existsSync(assetsPath)) {
  fs.mkdirSync(assetsPath, { recursive: true });
  console.log('✓ Created assets folder');
} else {
  console.log('✓ Assets folder already exists');
}

// 2. Integrate custom CSS files if they exist
const mainCssPath = path.join(deckPath, 'lib/offline-v2.css');
if (!fs.existsSync(mainCssPath)) {
  console.warn('⚠ Warning: lib/offline-v2.css not found, skipping CSS integration');
} else {
  // Find all CSS files in deck root (excluding lib/ directory)
  const cssFiles = [];
  const entries = fs.readdirSync(deckPath);
  
  for (const entry of entries) {
    const entryPath = path.join(deckPath, entry);
    const stat = fs.statSync(entryPath);
    
    // Only process CSS files in root, not in subdirectories
    if (stat.isFile() && entry.endsWith('.css') && entry !== 'offline-v2.css') {
      cssFiles.push(entryPath);
    }
  }
  
  if (cssFiles.length > 0) {
    console.log(`Found ${cssFiles.length} custom CSS file(s) to integrate:`);
    
    let customCss = '\n\n/* === Custom Styles === */\n';
    
    cssFiles.forEach(cssFile => {
      const cssContent = fs.readFileSync(cssFile, 'utf8');
      const fileName = path.basename(cssFile);
      customCss += `\n/* Integrated from ${fileName} */\n${cssContent}\n`;
      console.log(`  - Integrating ${fileName}`);
    });
    
    // Append to main CSS file
    const mainCss = fs.readFileSync(mainCssPath, 'utf8');
    fs.writeFileSync(mainCssPath, mainCss + customCss);
    console.log('✓ Integrated custom CSS into lib/offline-v2.css');
    
    // Remove custom CSS files
    cssFiles.forEach(cssFile => {
      fs.unlinkSync(cssFile);
      console.log(`  - Removed ${path.basename(cssFile)}`);
    });
  } else {
    console.log('✓ No custom CSS files found');
  }
}

// 3. Remove CSS references from HTML (except lib/offline-v2.css)
let html = fs.readFileSync(indexPath, 'utf8');
const originalHtml = html;

// Remove link tags that reference CSS files other than lib/offline-v2.css
html = html.replace(/<link[^>]*href="[^"]*\.css"[^>]*>/gi, (match) => {
  if (match.includes('lib/offline-v2.css')) {
    return match;
  }
  return '';
});

if (html !== originalHtml) {
  fs.writeFileSync(indexPath, html);
  console.log('✓ Updated HTML CSS references (removed external CSS links)');
} else {
  console.log('✓ HTML CSS references already clean');
}

// 4. Remove build artifacts
const artifacts = ['screenshots', 'output.pdf'];
let cleanedCount = 0;

artifacts.forEach(artifact => {
  const artifactPath = path.join(deckPath, artifact);
  if (fs.existsSync(artifactPath)) {
    const stat = fs.statSync(artifactPath);
    if (stat.isDirectory()) {
      fs.rmSync(artifactPath, { recursive: true, force: true });
      console.log(`✓ Removed directory: ${artifact}/`);
      cleanedCount++;
    } else {
      fs.unlinkSync(artifactPath);
      console.log(`✓ Removed file: ${artifact}`);
      cleanedCount++;
    }
  }
});

if (cleanedCount === 0) {
  console.log('✓ No build artifacts found');
}

console.log('\n✓ Presentation finalized successfully!');
console.log(`\nNext steps:`);
console.log(`  - Add images/docs to ${path.join(deckPath, 'assets')}/`);
console.log(`  - Open ${indexPath} in a browser to view`);

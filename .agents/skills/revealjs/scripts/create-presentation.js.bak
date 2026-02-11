#!/usr/bin/env node

/**
 * Creates a reveal.js presentation by extracting and customizing a template.
 * Usage: node create-presentation.js [options]
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const cheerio = require('cheerio');

// Path to the template zip file (relative to this script)
const TEMPLATE_ZIP_PATH = path.join(__dirname, '..', 'references', 'template.zip');

/**
 * Generate a random 6-character hex slug
 */
function generateSlug() {
  return Math.random().toString(16).substring(2, 8);
}

/**
 * Extract template.zip to a new deck folder
 */
function extractTemplate(slug, outputDir) {
  const deckFolderName = `deck-${slug}`;
  const deckPath = path.join(outputDir, deckFolderName);
  
  if (fs.existsSync(deckPath)) {
    throw new Error(`Deck folder already exists: ${deckPath}`);
  }

  // Extract zip to temporary location
  const tempExtractPath = path.join(outputDir, `temp-extract-${Date.now()}`);
  const zip = new AdmZip(TEMPLATE_ZIP_PATH);
  zip.extractAllTo(tempExtractPath, true);

  // Move extracted files to deck-{slug} folder
  // Template extracts with index.html and lib/ at root, plus deck-c2bbd4/ folder
  fs.mkdirSync(deckPath, { recursive: true });
  
  // Move index.html
  if (fs.existsSync(path.join(tempExtractPath, 'index.html'))) {
    fs.renameSync(
      path.join(tempExtractPath, 'index.html'),
      path.join(deckPath, 'index.html')
    );
  }
  
  // Move lib/ folder
  if (fs.existsSync(path.join(tempExtractPath, 'lib'))) {
    fs.renameSync(
      path.join(tempExtractPath, 'lib'),
      path.join(deckPath, 'lib')
    );
  }
  
  // Remove temp directory and any other extracted files
  try {
    const entries = fs.readdirSync(tempExtractPath);
    for (const entry of entries) {
      const entryPath = path.join(tempExtractPath, entry);
      const stat = fs.statSync(entryPath);
      if (stat.isDirectory()) {
        fs.rmSync(entryPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(entryPath);
      }
    }
    fs.rmdirSync(tempExtractPath);
  } catch (err) {
    // Ignore cleanup errors
  }

  return deckPath;
}

/**
 * Generate slides HTML from structure array
 */
function generateSlides(structure) {
  let slides = '';
  let hIndex = 1;
  let dividerCount = 1;

  for (let colIndex = 0; colIndex < structure.length; colIndex++) {
    const item = structure[colIndex];

    if (item === 'd') {
      // Section divider
      slides += `\t\t\t<section id="divider-${dividerCount}" class="section-divider" data-state="is-section-divider">\n`;
      slides += `\t\t\t\t<h1>Section ${dividerCount} Title</h1>\n`;
      slides += `\t\t\t</section>\n`;
      dividerCount++;
      hIndex++;
    } else if (item === 1) {
      // Single horizontal slide
      if (hIndex === 1) {
        slides += `\t\t\t<section id="title" class="section-divider" data-state="is-section-divider">\n`;
        slides += `\t\t\t\t<h1>Presentation Title</h1>\n`;
        slides += `\t\t\t</section>\n`;
      } else {
        slides += `\t\t\t<section id="slide-${hIndex}">\n`;
        slides += `\t\t\t\t<h2>Slide ${hIndex} Title Here</h2>\n`;
        slides += `\t\t\t</section>\n`;
      }
      hIndex++;
    } else {
      // Vertical stack
      slides += `\t\t\t<section>\n`;
      for (let vIndex = 1; vIndex <= item; vIndex++) {
        slides += `\t\t\t\t<section id="slide-${hIndex}-${vIndex}">\n`;
        slides += `\t\t\t\t\t<h2>Slide ${hIndex}.${vIndex} Title Here</h2>\n`;
        slides += `\t\t\t\t</section>\n`;
      }
      slides += `\t\t\t</section>\n`;
      hIndex++;
    }
  }

  return slides;
}

/**
 * Clean template HTML and add new slide structure
 */
function cleanTemplateHTML(html, options) {
  const $ = cheerio.load(html, { decodeEntities: false });

  // Remove all existing slides content
  $('.slides').empty();

  // Add new slides based on structure
  const slidesHTML = generateSlides(options.structure);
  $('.slides').append(slidesHTML);

  // Update title tag
  $('title').text(options.title);

  // Update SLConfig with new deck metadata
  const scriptContent = $('script').filter((i, el) => {
    return $(el).html().includes('SLConfig');
  }).html();

  if (scriptContent) {
    // Extract and update SLConfig
    const configMatch = scriptContent.match(/var SLConfig = ({[\s\S]*?});/);
    if (configMatch) {
      try {
        const config = JSON.parse(configMatch[1]);
        config.deck.slug = `deck-${options.slug}`;
        config.deck.title = options.title;
        config.deck.slide_count = options.structure.reduce((a, b) => a + (b === 'd' ? 1 : b), 0);
        
        // Update the script content
        const newScriptContent = scriptContent.replace(
          /var SLConfig = {[\s\S]*?};/,
          `var SLConfig = ${JSON.stringify(config, null, 2)};`
        );
        $('script').filter((i, el) => {
          return $(el).html().includes('SLConfig');
        }).html(newScriptContent);
      } catch (e) {
        // If JSON parsing fails, just update slug and title in the string
        const updatedScript = scriptContent
          .replace(/"slug":"[^"]*"/, `"slug":"deck-${options.slug}"`)
          .replace(/"title":"[^"]*"/, `"title":"${options.title.replace(/"/g, '\\"')}"`);
        $('script').filter((i, el) => {
          return $(el).html().includes('SLConfig');
        }).html(updatedScript);
      }
    }
  }

  return $.html();
}

function parseArgs(args) {
  const options = {
    slides: null,
    structure: null,
    outputDir: '.',
    title: 'Presentation',
    slug: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--slides' || arg === '-s') {
      options.slides = parseInt(args[++i], 10);
    } else if (arg === '--structure') {
      options.structure = args[++i].split(',').map(n => n === 'd' ? 'd' : parseInt(n, 10));
    } else if (arg === '--output-dir' || arg === '-o') {
      options.outputDir = args[++i];
    } else if (arg === '--title') {
      options.title = args[++i];
    } else if (arg === '--slug') {
      options.slug = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
create-presentation.js - Extract and customize a reveal.js presentation from template

Usage: node create-presentation.js [options]

Options:
  --slides, -s <num>      Number of horizontal slides (simple mode)
  --structure <list>      Mixed layout: comma-separated values (e.g., "1,1,d,3,1,d,1")
                          - Number 1 = single horizontal slide
                          - Number >1 = vertical stack of that many slides
                          - 'd' = section divider slide
                          Cannot be used with --slides
  --output-dir, -o <dir>  Output directory for deck folder (default: current directory)
  --title <text>          Presentation title (default: Presentation)
  --slug <text>           Custom slug for deck folder (default: random hex)
  --help, -h              Show this help message

Examples:
  node create-presentation.js --slides 10 --output-dir ./presentations
  node create-presentation.js --structure 1,1,d,3,1,d,1 --title "Q4 Review" --output-dir ./decks
  node create-presentation.js --structure 1,1,1,d,3,d,1,1 --title "My Deck" --slug mydeck
`);
}

function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Validate mutually exclusive options
  if (options.slides !== null && options.structure !== null) {
    console.error('Error: Cannot use both --slides and --structure. Choose one.');
    process.exit(1);
  }

  // Default to 5 horizontal slides if neither specified
  if (options.slides === null && options.structure === null) {
    options.structure = [1, 1, 1, 1, 1];
  } else if (options.slides !== null) {
    // Convert --slides N to structure of N ones
    if (options.slides < 1 || isNaN(options.slides)) {
      console.error('Error: Slide count must be at least 1.');
      process.exit(1);
    }
    options.structure = Array(options.slides).fill(1);
  } else {
    // Validate structure
    if (options.structure.some(n => n !== 'd' && (n < 1 || isNaN(n)))) {
      console.error('Error: Structure values must be positive integers or "d" for dividers.');
      process.exit(1);
    }
  }

  // Generate slug if not provided
  if (!options.slug) {
    options.slug = generateSlug();
  }

  // Validate template zip exists
  if (!fs.existsSync(TEMPLATE_ZIP_PATH)) {
    console.error(`Error: Template zip not found at ${TEMPLATE_ZIP_PATH}`);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
  }

  try {
    // Extract template
    console.log(`Extracting template to deck-${options.slug}...`);
    const deckPath = extractTemplate(options.slug, options.outputDir);
    const indexPath = path.join(deckPath, 'index.html');

    // Read and clean HTML
    console.log('Customizing template HTML...');
    const html = fs.readFileSync(indexPath, 'utf-8');
    const cleanedHTML = cleanTemplateHTML(html, options);

    // Write cleaned HTML
    fs.writeFileSync(indexPath, cleanedHTML);

    const totalSlides = options.structure.reduce((a, b) => a + (b === 'd' ? 1 : b), 0);

    console.log(`\n✓ Presentation created: ${deckPath}`);
    console.log(`  - ${totalSlides} slides (structure: ${options.structure.join(',')})`);
    console.log(`  - Open ${path.join(deckPath, 'index.html')} in a browser to view`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();

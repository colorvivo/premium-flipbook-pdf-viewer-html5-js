#!/usr/bin/env node

/**
 * PDF to Images CLI Tool
 * Converts PDF files to optimized images for Premium FlipBook
 */

const fs = require('fs');
const path = require('path');
const { program } = require('commander');

program
  .name('pfb-convert')
  .description('Convert PDF to optimized images for Premium FlipBook')
  .version('1.0.0')
  .argument('<input>', 'Input PDF file')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-f, --format <format>', 'Image format (jpg, png, webp)', 'jpg')
  .option('-q, --quality <number>', 'Image quality (1-100)', '85')
  .option('-w, --width <number>', 'Page width in pixels', '1600')
  .option('-t, --thumb-width <number>', 'Thumbnail width in pixels', '200')
  .option('--no-thumbnails', 'Skip thumbnail generation')
  .option('--no-text', 'Skip text extraction')
  .option('--no-toc', 'Skip TOC extraction')
  .option('-v, --verbose', 'Verbose output')
  .action(async (input, options) => {
    await convertPDF(input, options);
  });

program.parse();

async function convertPDF(inputPath, options) {
  const log = options.verbose ? console.log : () => {};

  // Validate input
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`\nPremium FlipBook PDF Converter`);
  console.log(`==============================\n`);
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${options.output}`);
  console.log(`Format: ${options.format}`);
  console.log(`Quality: ${options.quality}%`);
  console.log(`Page Width: ${options.width}px`);
  console.log('');

  try {
    // Load dependencies
    log('Loading dependencies...');
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    const { createCanvas } = require('canvas');
    const sharp = require('sharp');

    // Create output directories
    const outputDir = path.resolve(options.output);
    const pagesDir = path.join(outputDir, 'pages');
    const thumbsDir = path.join(outputDir, 'thumbs');

    fs.mkdirSync(pagesDir, { recursive: true });
    if (options.thumbnails) {
      fs.mkdirSync(thumbsDir, { recursive: true });
    }

    log(`Created output directories`);

    // Load PDF
    log('Loading PDF...');
    const data = new Uint8Array(fs.readFileSync(inputPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const numPages = pdf.numPages;

    console.log(`Loaded PDF with ${numPages} pages\n`);

    // Get metadata
    const metadata = await pdf.getMetadata().catch(() => ({}));
    const outline = options.toc ? await pdf.getOutline().catch(() => null) : null;

    // Process pages
    const pages = [];
    const width = parseInt(options.width);
    const thumbWidth = parseInt(options.thumbWidth);
    const quality = parseInt(options.quality);

    for (let i = 1; i <= numPages; i++) {
      process.stdout.write(`Processing page ${i}/${numPages}...`);

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });

      // Calculate scale to match desired width
      const scale = width / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      // Create canvas
      const canvas = createCanvas(scaledViewport.width, scaledViewport.height);
      const context = canvas.getContext('2d');

      // Render page
      await page.render({
        canvasContext: context,
        viewport: scaledViewport
      }).promise;

      // Save page image
      const pageFilename = `page-${String(i).padStart(4, '0')}.${options.format}`;
      const pagePath = path.join(pagesDir, pageFilename);

      let sharpInstance = sharp(canvas.toBuffer('image/png'));

      if (options.format === 'jpg' || options.format === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({ quality });
      } else if (options.format === 'webp') {
        sharpInstance = sharpInstance.webp({ quality });
      } else {
        sharpInstance = sharpInstance.png();
      }

      await sharpInstance.toFile(pagePath);

      // Generate thumbnail
      let thumbFilename = null;
      if (options.thumbnails) {
        thumbFilename = `thumb-${String(i).padStart(4, '0')}.${options.format}`;
        const thumbPath = path.join(thumbsDir, thumbFilename);

        await sharp(canvas.toBuffer('image/png'))
          .resize(thumbWidth)
          .jpeg({ quality: 70 })
          .toFile(thumbPath);
      }

      // Extract text
      let textContent = '';
      if (options.text) {
        try {
          const text = await page.getTextContent();
          textContent = text.items.map(item => item.str).join(' ').trim();
        } catch (e) {
          // Text extraction failed
        }
      }

      pages.push({
        src: `pages/${pageFilename}`,
        thumb: thumbFilename ? `thumbs/${thumbFilename}` : undefined,
        text: textContent || undefined,
        width: Math.round(scaledViewport.width),
        height: Math.round(scaledViewport.height)
      });

      process.stdout.write(' Done\n');
    }

    // Process TOC
    let toc = [];
    if (outline) {
      toc = await processOutline(pdf, outline);
    }

    // Generate config JSON
    const config = {
      title: metadata.info?.Title || path.basename(inputPath, '.pdf'),
      author: metadata.info?.Author || undefined,
      pageWidth: pages[0]?.width,
      pageHeight: pages[0]?.height,
      pages,
      toc: toc.length > 0 ? toc : undefined
    };

    const configPath = path.join(outputDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(`\nConversion complete!`);
    console.log(`Output: ${outputDir}`);
    console.log(`Pages: ${numPages}`);
    console.log(`Config: ${configPath}`);
    console.log(`\nUsage:`);
    console.log(`  new PremiumFlipBook({`);
    console.log(`    container: '#flipbook',`);
    console.log(`    optimizedImages: { jsonUrl: '${path.relative('.', configPath)}' }`);
    console.log(`  });`);

  } catch (error) {
    console.error(`\nError: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function processOutline(pdf, items, level = 0) {
  const result = [];

  for (const item of items) {
    let page = 1;

    try {
      if (item.dest) {
        const dest = typeof item.dest === 'string'
          ? await pdf.getDestination(item.dest)
          : item.dest;

        if (dest) {
          const ref = dest[0];
          page = await pdf.getPageIndex(ref) + 1;
        }
      }
    } catch (e) {
      // Use default page
    }

    const tocItem = {
      title: item.title,
      page,
      level
    };

    if (item.items && item.items.length > 0) {
      tocItem.children = await processOutline(pdf, item.items, level + 1);
    }

    result.push(tocItem);
  }

  return result;
}

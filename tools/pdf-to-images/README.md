# PDF to Images Converter

CLI tool to convert PDF files to optimized images for Premium FlipBook.

## Installation

```bash
# Install globally
npm install -g pfb-convert

# Or run directly with npx
npx pfb-convert document.pdf
```

## Usage

```bash
pfb-convert <input.pdf> [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | `./output` |
| `-f, --format <format>` | Image format (jpg, png, webp) | `jpg` |
| `-q, --quality <number>` | Image quality (1-100) | `85` |
| `-w, --width <number>` | Page width in pixels | `1600` |
| `-t, --thumb-width <number>` | Thumbnail width | `200` |
| `--no-thumbnails` | Skip thumbnail generation | - |
| `--no-text` | Skip text extraction | - |
| `--no-toc` | Skip TOC extraction | - |
| `-v, --verbose` | Verbose output | - |

### Examples

```bash
# Basic conversion
pfb-convert document.pdf

# Custom output directory
pfb-convert document.pdf -o ./magazine

# High quality WebP images
pfb-convert document.pdf -f webp -q 95

# Lower resolution for web
pfb-convert document.pdf -w 1200 -q 75

# Skip text extraction (faster)
pfb-convert document.pdf --no-text
```

## Output

The tool generates:

```
output/
├── pages/
│   ├── page-0001.jpg
│   ├── page-0002.jpg
│   └── ...
├── thumbs/
│   ├── thumb-0001.jpg
│   ├── thumb-0002.jpg
│   └── ...
└── config.json
```

### Config JSON Format

```json
{
  "title": "Document Title",
  "author": "Author Name",
  "pageWidth": 1600,
  "pageHeight": 2262,
  "pages": [
    {
      "src": "pages/page-0001.jpg",
      "thumb": "thumbs/thumb-0001.jpg",
      "text": "Extracted text content...",
      "width": 1600,
      "height": 2262
    }
  ],
  "toc": [
    {
      "title": "Chapter 1",
      "page": 1,
      "level": 0
    }
  ]
}
```

## Using with Premium FlipBook

```javascript
import PremiumFlipBook from 'premium-flipbook-pdf-viewer';

new PremiumFlipBook({
  container: '#flipbook',
  optimizedImages: {
    jsonUrl: './output/config.json'
  }
});
```

## Requirements

- Node.js 18+
- Native dependencies for canvas and sharp:
  - On macOS: `brew install pkg-config cairo pango libpng jpeg giflib librsvg`
  - On Ubuntu: `apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
  - On Windows: See [node-canvas docs](https://github.com/Automattic/node-canvas#compiling)

## Benefits of Pre-rendering

1. **Faster Load Times**: No PDF parsing at runtime
2. **No PDF.js Required**: Smaller client bundle
3. **Searchable Text**: Text is pre-extracted
4. **TOC Support**: Bookmarks are preserved
5. **Optimized Images**: Compressed and sized appropriately
6. **CDN Friendly**: Static files can be cached

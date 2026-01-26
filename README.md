# Premium FlipBook PDF Viewer

A complete flipbook PDF/image viewer library with WebGL 3D, CSS 3D/2D, and Swipe rendering modes. Pure JavaScript (no jQuery), modular architecture, comprehensive UI.

## Features

### Rendering Modes
- **WebGL 3D** - Realistic page flip with lighting, shadows, and bend effects using Three.js
- **CSS 3D** - Hardware-accelerated 3D transforms with gradient overlays
- **Swipe** - Touch-optimized mode for mobile devices
- **Auto-detection** - Automatically selects the best renderer for each device

### Content Sources
- PDF documents (via PDF.js)
- Image arrays (JPG, PNG, WebP)
- Optimized image sets with JSON manifest

### User Interface
- Customizable toolbar with all controls
- Thumbnail navigation panel
- Table of Contents (TOC) support
- Full-text search with highlighting
- Page number input with validation
- Keyboard navigation
- Touch and mouse gestures

### Advanced Features
- Zoom with pinch, wheel, and double-tap support
- Fullscreen mode
- Deep linking (hash-based navigation)
- Lightbox mode
- Autoplay with configurable intervals
- Page flip sound effects
- RTL (right-to-left) support
- Responsive design with single/double page modes

### Performance
- Lazy loading for images and pages
- Texture caching for WebGL
- Configurable preloading
- Debounced resize handling

### Accessibility
- ARIA labels and roles
- Keyboard navigation
- Screen reader announcements
- Focus indicators

### Internationalization
- Built-in i18n support
- Customizable UI strings
- Multiple locale support

## Installation

```bash
npm install premium-flipbook-pdf-viewer
```

## Usage

### Basic HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="dist/premium-flipbook.css">
</head>
<body>
  <div id="flipbook-container"></div>

  <script src="dist/premium-flipbook.min.js"></script>
  <script>
    const flipbook = new PremiumFlipBook({
      container: '#flipbook-container',
      pdfUrl: 'path/to/document.pdf'
    });
  </script>
</body>
</html>
```

### ES Module Import

```javascript
import PremiumFlipBook from 'premium-flipbook-pdf-viewer';
import 'premium-flipbook-pdf-viewer/css';

const flipbook = new PremiumFlipBook({
  container: '#flipbook-container',
  pdfUrl: 'path/to/document.pdf'
});
```

### Using Images Instead of PDF

```javascript
const flipbook = new PremiumFlipBook({
  container: '#flipbook-container',
  images: [
    'pages/page1.jpg',
    'pages/page2.jpg',
    'pages/page3.jpg'
  ]
});
```

### Full Configuration Example

```javascript
const flipbook = new PremiumFlipBook({
  container: '#flipbook-container',
  pdfUrl: 'document.pdf',

  // Rendering
  renderMode: 'webgl',  // 'webgl', 'css', 'swipe', 'auto'
  startPage: 1,
  rtl: false,

  // Dimensions
  width: '100%',
  height: 600,

  // WebGL options
  webgl: {
    lighting: { enabled: true, ambient: 0.6 },
    bendIntensity: 0.3,
    flipDuration: 800
  },

  // Zoom
  zoom: {
    enabled: true,
    min: 1,
    max: 4,
    pinchZoom: true,
    wheelZoom: true
  },

  // UI
  ui: {
    toolbar: {
      position: 'bottom',
      buttons: ['prev', 'pageInput', 'next', 'fullscreen']
    },
    thumbnails: { enabled: true, position: 'left' },
    search: { enabled: true }
  },

  // Features
  features: {
    deepLinking: true,
    fullscreen: true,
    download: true,
    autoplay: { enabled: false, interval: 5000 }
  }
});
```

## API

### Methods

```javascript
// Navigation
flipbook.goToPage(5);
flipbook.nextPage();
flipbook.previousPage();
flipbook.firstPage();
flipbook.lastPage();

// Zoom
flipbook.zoomIn();
flipbook.zoomOut();
flipbook.setZoom(2);

// State
flipbook.getCurrentPage();
flipbook.getTotalPages();

// Lifecycle
flipbook.destroy();
```

### Events

```javascript
flipbook.on('ready', () => {
  console.log('FlipBook is ready');
});

flipbook.on('pageChange', ({ current, previous }) => {
  console.log(`Page changed from ${previous} to ${current}`);
});

flipbook.on('flipStart', ({ fromPage, toPage }) => {
  console.log(`Flipping from ${fromPage} to ${toPage}`);
});

flipbook.on('flipEnd', ({ page }) => {
  console.log(`Flip ended on page ${page}`);
});

flipbook.on('zoomChange', ({ zoom }) => {
  console.log(`Zoom level: ${zoom}`);
});

flipbook.on('error', ({ code, message }) => {
  console.error(`Error ${code}: ${message}`);
});
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- iOS Safari 12+
- Android Chrome 60+

## Dependencies

- **PDF.js** (optional) - Required for PDF rendering
- **Three.js** (optional) - Required for WebGL 3D mode

## License

MIT License

## Author

**Color Vivo Internet**

- Website: [https://colorvivo.com](https://colorvivo.com)

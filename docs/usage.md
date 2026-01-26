# Usage Guide

## Installation

### NPM

```bash
npm install premium-flipbook-pdf-viewer
```

### CDN

```html
<!-- CSS -->
<link rel="stylesheet" href="https://unpkg.com/premium-flipbook-pdf-viewer/dist/premium-flipbook.css">

<!-- JavaScript (UMD) -->
<script src="https://unpkg.com/premium-flipbook-pdf-viewer/dist/premium-flipbook.min.js"></script>

<!-- Or ES Module -->
<script type="module">
  import PremiumFlipBook from 'https://unpkg.com/premium-flipbook-pdf-viewer/dist/premium-flipbook.esm.js';
</script>
```

## Basic Usage

### Using Images

The simplest way to use PremiumFlipBook is with an array of images:

```html
<div id="flipbook" style="width: 100%; height: 600px;"></div>

<script type="module">
  import PremiumFlipBook from 'premium-flipbook-pdf-viewer';

  const flipbook = new PremiumFlipBook({
    container: '#flipbook',
    images: [
      'images/page1.jpg',
      'images/page2.jpg',
      'images/page3.jpg',
      'images/page4.jpg'
    ]
  });
</script>
```

### Using PDF

To load a PDF file, you need PDF.js:

```html
<div id="flipbook" style="width: 100%; height: 600px;"></div>

<!-- PDF.js is loaded automatically when needed -->
<script type="module">
  import PremiumFlipBook from 'premium-flipbook-pdf-viewer';

  const flipbook = new PremiumFlipBook({
    container: '#flipbook',
    pdfUrl: 'documents/magazine.pdf'
  });
</script>
```

### Using Optimized Source

For maximum performance, use pre-rendered images with a JSON config:

```javascript
const flipbook = new PremiumFlipBook({
  container: '#flipbook',
  optimizedImages: {
    jsonUrl: 'magazine/config.json'
  }
});
```

## Renderer Selection

### Automatic (Recommended)

```javascript
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  renderMode: 'auto'  // Automatically selects best renderer
});
```

### Force WebGL

```javascript
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  renderMode: 'webgl'  // Requires Three.js
});
```

### Force CSS

```javascript
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  renderMode: 'css'  // Works everywhere
});
```

### Force Swipe

```javascript
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  renderMode: 'swipe'  // Best for mobile
});
```

## Responsive Design

### Auto Single Page Mode

```javascript
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  singlePageMode: 'auto',         // Switch based on viewport
  singlePageBreakpoint: 768       // Switch below this width
});
```

### Always Single Page

```javascript
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  singlePageMode: 'always'
});
```

## Customizing the Toolbar

```javascript
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  ui: {
    toolbar: {
      enabled: true,
      position: 'bottom',  // 'top' or 'bottom'
      buttons: [
        'first',
        'prev',
        'pageInput',
        'next',
        'last',
        'separator',
        'zoomOut',
        'zoomIn',
        'separator',
        'thumbnails',
        'toc',
        'search',
        'separator',
        'fullscreen',
        'download'
      ]
    }
  }
});
```

## Events

```javascript
const flipbook = new PremiumFlipBook({
  container: '#flipbook',
  images: myImages
});

// Page changed
flipbook.on('pageChange', ({ page, previousPage, totalPages }) => {
  console.log(`Page ${page} of ${totalPages}`);
});

// Flip animation started
flipbook.on('flipStart', ({ direction, fromPage }) => {
  console.log(`Flipping ${direction} from page ${fromPage}`);
});

// Flip animation ended
flipbook.on('flipEnd', ({ page }) => {
  console.log(`Landed on page ${page}`);
});

// Zoom changed
flipbook.on('zoomChange', ({ zoom, previousZoom }) => {
  console.log(`Zoom: ${zoom * 100}%`);
});

// Ready
flipbook.on('ready', ({ flipbook }) => {
  console.log('FlipBook is ready!');
});

// Error
flipbook.on('error', (error) => {
  console.error('FlipBook error:', error);
});
```

## Lightbox Mode

```javascript
// Option 1: Trigger with selector
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  features: {
    lightbox: true,
    lightboxTrigger: '.open-flipbook'  // CSS selector for trigger elements
  }
});

// Option 2: Open programmatically
const flipbook = new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  features: { lightbox: true }
});

// Open to page 5
document.querySelector('#openBtn').addEventListener('click', () => {
  flipbook.openLightbox(5);
});
```

## Page Transitions

Control how pages animate when flipping:

```javascript
const flipbook = new PremiumFlipBook({
  container: '#flipbook',
  images: myImages
});

// Set transition type dynamically
flipbook.setTransition('fade');   // Smooth fade (default)
flipbook.setTransition('slide');  // 3D slide with perspective
flipbook.setTransition('flip');   // Classic page flip rotation
flipbook.setTransition('none');   // Instant change

// Get current transition
const current = flipbook.getTransition();
```

## Display Mode

Switch between single and double page display:

```javascript
// Set via options
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  singlePageMode: 'always'  // 'auto', 'always', 'never'
});

// Or change dynamically
flipbook.setDisplayMode('single');  // Show one page
flipbook.setDisplayMode('double');  // Show two pages side by side

// Get current mode
const mode = flipbook.getDisplayMode();  // 'single' or 'double'
```

## RTL (Right-to-Left) Support

```javascript
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  rtl: true  // Enable RTL mode
});
```

## Autoplay

```javascript
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  features: {
    autoplay: {
      enabled: true,
      interval: 5000,      // 5 seconds
      pauseOnHover: true,  // Pause when mouse is over
      loop: true           // Loop back to start
    }
  }
});

// Control programmatically
flipbook.startAutoplay();
flipbook.stopAutoplay();
flipbook.toggleAutoplay();
```

## Sound Effects

```javascript
new PremiumFlipBook({
  container: '#flipbook',
  images: myImages,
  features: {
    sound: {
      enabled: true,
      flipSound: 'sounds/page-flip.mp3',
      volume: 0.5
    }
  }
});
```

## Cleanup

Always destroy the flipbook when removing it from the DOM:

```javascript
const flipbook = new PremiumFlipBook({...});

// Later, when cleaning up:
flipbook.destroy();
```

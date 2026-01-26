# Options Reference

## Container Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `string\|HTMLElement` | `null` | Container element or CSS selector (required) |
| `width` | `number\|string` | `'auto'` | Container width |
| `height` | `number\|string` | `'auto'` | Container height |
| `aspectRatio` | `number` | `1.414` | Aspect ratio (height/width) for auto sizing |

## Source Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pdfUrl` | `string` | `null` | URL to PDF file |
| `images` | `string[]` | `null` | Array of image URLs |
| `optimizedImages` | `object` | `null` | Optimized source config (see below) |

### Optimized Images Config

```javascript
optimizedImages: {
  jsonUrl: 'config.json',  // URL to JSON config
  // OR inline config:
  basePath: '/images/',
  pages: [
    { src: 'page1.jpg', thumb: 'thumb1.jpg', text: '...' }
  ],
  toc: [
    { title: 'Chapter 1', page: 1 }
  ]
}
```

## Rendering Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `renderMode` | `string` | `'auto'` | Renderer: `'webgl'`, `'css'`, `'swipe'`, `'auto'` |
| `autoDetectRenderer` | `boolean` | `true` | Auto-detect best renderer |
| `singlePageMode` | `string` | `'auto'` | Single page: `'auto'`, `'always'`, `'never'` |
| `singlePageBreakpoint` | `number` | `768` | Width to switch to single page |
| `rtl` | `boolean` | `false` | Right-to-left mode |
| `startPage` | `number` | `1` | Initial page number |

## Page Display Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pageWidth` | `number` | `400` | Base page width (px) |
| `pageHeight` | `number` | `565` | Base page height (px) |
| `pageGap` | `number` | `2` | Gap between pages |
| `pageCornerRadius` | `number` | `0` | Corner radius |
| `pageShadow` | `boolean` | `true` | Show page shadows |
| `pageColor` | `string` | `'#ffffff'` | Page background color |

## WebGL Options

```javascript
webgl: {
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: false,
  powerPreference: 'default',  // 'high-performance', 'low-power'
  maxTextureSize: 2048,
  lighting: {
    enabled: true,
    ambient: 0.6,
    directional: 0.4,
    position: [0, 1, 1]
  },
  bendIntensity: 0.3,
  flipDuration: 800,
  easing: 'easeInOutCubic'
}
```

## CSS Options

```javascript
css: {
  perspective: 2000,
  flipDuration: 600,
  easing: 'ease-in-out',
  shadow: true,
  gradientOverlay: true
}
```

## Swipe Options

```javascript
swipe: {
  threshold: 50,        // Min swipe distance
  velocity: 0.3,        // Min velocity
  resistance: 0.8,      // Edge resistance
  animationDuration: 300
}
```

## Transition Options

Page transitions can be set dynamically using the API:

```javascript
// Available transition types
flipbook.setTransition('fade');   // Smooth opacity transition (default)
flipbook.setTransition('slide');  // 3D slide with perspective
flipbook.setTransition('flip');   // Classic page flip rotation
flipbook.setTransition('none');   // Instant page change

// Get current transition
const transition = flipbook.getTransition();
```

| Transition | Description |
|------------|-------------|
| `fade` | Smooth opacity fade between pages (default) |
| `slide` | 3D slide effect with perspective and scaling |
| `flip` | Classic book-like page flip rotation |
| `none` | Instant page change without animation |

## Zoom Options

```javascript
zoom: {
  enabled: true,
  min: 1,
  max: 4,
  step: 0.25,
  doubleTapZoom: 2,
  pinchZoom: true,
  wheelZoom: true,
  panEnabled: true
}
```

## UI Options

### Toolbar

```javascript
ui: {
  toolbar: {
    enabled: true,
    position: 'bottom',  // 'top', 'bottom'
    autoHide: false,
    autoHideDelay: 3000,
    buttons: [
      'first', 'prev', 'pageInput', 'next', 'last',
      'separator',
      'zoomOut', 'zoomIn',
      'separator',
      'thumbnails', 'toc', 'search',
      'separator',
      'fullscreen', 'download'
    ]
  }
}
```

Available buttons: `first`, `prev`, `next`, `last`, `pageInput`, `zoomIn`, `zoomOut`, `thumbnails`, `toc`, `search`, `fullscreen`, `download`, `print`, `share`, `autoplay`, `separator`

### Navigation

```javascript
ui: {
  navigation: {
    arrows: true,
    arrowsAutoHide: true,
    clickToFlip: true,
    keyboard: true,
    mouseWheel: false
  }
}
```

### Thumbnails

```javascript
ui: {
  thumbnails: {
    enabled: true,
    position: 'left',  // 'left', 'right', 'bottom'
    width: 200,
    lazyLoad: true,
    preloadCount: 5
  }
}
```

### Table of Contents

```javascript
ui: {
  toc: {
    enabled: true,
    position: 'left'
  }
}
```

### Search

```javascript
ui: {
  search: {
    enabled: true,
    highlightColor: 'rgba(255, 255, 0, 0.4)',
    matchCase: false
  }
}
```

### Page Input

```javascript
ui: {
  pageInput: {
    enabled: true,
    showTotal: true
  }
}
```

## Feature Options

```javascript
features: {
  deepLinking: true,
  hashPrefix: 'page',
  lightbox: false,
  lightboxTrigger: null,
  fullscreen: true,
  download: false,
  downloadUrl: null,
  print: false,
  share: false,
  autoplay: {
    enabled: false,
    interval: 5000,
    pauseOnHover: true,
    loop: true
  },
  sound: {
    enabled: false,
    flipSound: null,
    volume: 0.5
  }
}
```

## Performance Options

```javascript
performance: {
  lazyLoad: true,
  preloadPages: 2,
  cacheSize: 20,
  thumbnailQuality: 0.5,
  renderQuality: 1,
  debounceResize: 150
}
```

## Accessibility Options

```javascript
accessibility: {
  enabled: true,
  ariaLabels: true,
  focusIndicator: true,
  announcePageChange: true
}
```

## Localization

```javascript
i18n: {
  locale: 'en',
  strings: {
    firstPage: 'First page',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    lastPage: 'Last page',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    thumbnails: 'Thumbnails',
    tableOfContents: 'Table of contents',
    search: 'Search',
    download: 'Download',
    print: 'Print',
    share: 'Share',
    pageOf: 'of',
    loading: 'Loading...',
    error: 'Error loading content',
    noResults: 'No results found',
    close: 'Close'
  }
}
```

## Callbacks (Legacy)

These callbacks are deprecated. Use events instead.

```javascript
{
  onReady: (flipbook) => {},
  onPageChange: ({ page, totalPages }) => {},
  onFlipStart: ({ direction }) => {},
  onFlipEnd: ({ page }) => {},
  onZoomChange: ({ zoom }) => {},
  onError: (error) => {}
}
```

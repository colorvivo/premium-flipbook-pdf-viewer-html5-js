/**
 * Default configuration options for PremiumFlipBook
 */

export const defaultOptions = {
  // Source options
  pdfUrl: null,                      // URL to PDF file
  images: null,                      // Array of image URLs
  optimizedImages: null,             // { jsonUrl: string } or { pages: [], toc: [] }

  // Container
  container: null,                   // DOM element or selector
  width: 'auto',                     // Width (number, 'auto', '100%')
  height: 'auto',                    // Height (number, 'auto', '100%')
  aspectRatio: 1.414,                // Default A4 ratio (297/210)

  // Rendering
  renderMode: 'auto',                // 'webgl', 'css', 'swipe', 'auto'
  autoDetectRenderer: true,          // Auto-detect best renderer
  singlePageMode: 'auto',            // 'auto', 'always', 'never'
  singlePageBreakpoint: 768,         // Width for single page mode
  rtl: false,                        // Right-to-left mode
  startPage: 1,                      // Initial page number

  // Page display
  pageWidth: 400,                    // Base page width in pixels
  pageHeight: 565,                   // Base page height in pixels
  pageGap: 2,                        // Gap between pages
  pageCornerRadius: 0,               // Corner radius for pages
  pageShadow: true,                  // Show page shadows
  pageColor: '#ffffff',              // Background color for pages

  // WebGL specific
  webgl: {
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'default',      // 'default', 'high-performance', 'low-power'
    maxTextureSize: 2048,
    lighting: {
      enabled: true,
      ambient: 0.6,
      directional: 0.4,
      position: [0, 1, 1]
    },
    bendIntensity: 0.3,              // Page bend during flip
    flipDuration: 800,               // Flip animation duration (ms)
    easing: 'easeInOutCubic'
  },

  // CSS renderer specific
  css: {
    perspective: 2000,               // CSS perspective value
    flipDuration: 600,               // Flip animation duration (ms)
    easing: 'ease-in-out',
    shadow: true,
    gradientOverlay: true
  },

  // Swipe renderer specific
  swipe: {
    threshold: 50,                   // Minimum swipe distance
    velocity: 0.3,                   // Minimum velocity
    resistance: 0.8,                 // Edge resistance
    animationDuration: 300
  },

  // Zoom
  zoom: {
    enabled: true,
    min: 1,
    max: 4,
    step: 0.25,
    doubleTapZoom: 2,
    pinchZoom: true,
    wheelZoom: true,
    panEnabled: true
  },

  // UI options
  ui: {
    enabled: true,
    toolbar: {
      enabled: true,
      position: 'bottom',            // 'top', 'bottom'
      autoHide: false,
      autoHideDelay: 3000,
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
    },
    navigation: {
      arrows: true,
      arrowsAutoHide: true,
      clickToFlip: true,
      keyboard: true,
      mouseWheel: false
    },
    thumbnails: {
      enabled: true,
      position: 'left',              // 'left', 'right', 'bottom'
      width: 200,
      lazyLoad: true,
      preloadCount: 5
    },
    toc: {
      enabled: true,
      position: 'left'
    },
    search: {
      enabled: true,
      highlightColor: 'rgba(255, 255, 0, 0.4)',
      matchCase: false
    },
    pageInput: {
      enabled: true,
      showTotal: true
    }
  },

  // Features
  features: {
    deepLinking: true,               // Hash-based navigation
    hashPrefix: 'page',              // URL hash prefix
    lightbox: false,                 // Open in lightbox mode
    lightboxTrigger: null,           // Selector for lightbox trigger
    fullscreen: true,
    download: false,                 // Show download button
    downloadUrl: null,               // Custom download URL
    print: false,                    // Show print button
    share: false,                    // Show share button
    autoplay: {
      enabled: false,
      interval: 5000,
      pauseOnHover: true,
      loop: true
    },
    sound: {
      enabled: false,
      flipSound: null,               // URL to flip sound
      volume: 0.5
    }
  },

  // Performance
  performance: {
    lazyLoad: true,
    preloadPages: 2,                 // Pages to preload ahead
    cacheSize: 20,                   // Max cached textures
    thumbnailQuality: 0.5,           // Thumbnail scale factor
    renderQuality: 1,                // Main render quality
    debounceResize: 150
  },

  // Accessibility
  accessibility: {
    enabled: true,
    ariaLabels: true,
    focusIndicator: true,
    announcePageChange: true
  },

  // Localization
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
  },

  // Callbacks (deprecated - use events instead)
  onReady: null,
  onPageChange: null,
  onFlipStart: null,
  onFlipEnd: null,
  onZoomChange: null,
  onError: null
};

/**
 * Deep merge options with defaults
 */
export function mergeOptions(defaults, options) {
  const result = { ...defaults };

  for (const key in options) {
    if (options[key] !== undefined) {
      if (
        typeof options[key] === 'object' &&
        options[key] !== null &&
        !Array.isArray(options[key]) &&
        typeof defaults[key] === 'object' &&
        defaults[key] !== null
      ) {
        result[key] = mergeOptions(defaults[key], options[key]);
      } else {
        result[key] = options[key];
      }
    }
  }

  return result;
}

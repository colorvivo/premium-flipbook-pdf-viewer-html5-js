/**
 * PremiumFlipBook - Main class for the flipbook viewer
 */

import { EventEmitter, Events } from './core/EventEmitter.js';
import { StateManager } from './core/StateManager.js';
import { RendererManager } from './core/RendererManager.js';
import { SourceLoader } from './sources/SourceLoader.js';
import { UIManager } from './ui/UIManager.js';
import { ZoomController } from './features/ZoomController.js';
import { SearchEngine } from './features/SearchEngine.js';
import { DeepLinking } from './features/DeepLinking.js';
import { Lightbox } from './features/Lightbox.js';
import { Fullscreen } from './features/Fullscreen.js';
import { Autoplay } from './features/Autoplay.js';
import { Sound } from './features/Sound.js';
import { KeyboardHandler } from './utils/KeyboardHandler.js';
import { TouchHandler } from './utils/TouchHandler.js';
import { defaultOptions, mergeOptions } from './defaultOptions.js';
import { ErrorCodes, FlipBookError, ErrorHandler } from './utils/errors.js';
import { detectBrowser, getViewportSize } from './utils/browser.js';
import { createElement, $, debounce } from './utils/dom.js';

/**
 * Main FlipBook class
 */
export default class PremiumFlipBook extends EventEmitter {
  /**
   * Create a new FlipBook instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    super();

    // Merge options with defaults
    this.options = mergeOptions(defaultOptions, options);

    // Initialize error handler
    this.errorHandler = new ErrorHandler({
      onError: this.options.onError,
      logErrors: true,
      throwErrors: false
    });

    // Initialize state
    this.state = new StateManager(this.options);
    this.source = null;
    this.renderer = null;
    this.ui = null;

    // Feature modules
    this.features = {
      zoom: null,
      search: null,
      deepLinking: null,
      lightbox: null,
      fullscreen: null,
      autoplay: null,
      sound: null
    };

    // Input handlers
    this.keyboard = null;
    this.touch = null;

    // Container
    this.container = null;
    this.wrapper = null;

    // Browser info
    this.browser = detectBrowser();

    // Resize handler
    this._resizeHandler = debounce(this._onResize.bind(this), this.options.performance.debounceResize);

    // Auto-init if container provided
    if (this.options.container) {
      this.init();
    }
  }

  /**
   * Initialize the flipbook
   * @param {Element|string} [container] - Container element or selector
   * @returns {Promise<PremiumFlipBook>}
   */
  async init(container) {
    try {
      // Get container
      this.container = this._resolveContainer(container || this.options.container);
      if (!this.container) {
        throw new FlipBookError(ErrorCodes.CONTAINER_NOT_FOUND);
      }

      // Create wrapper
      this._createWrapper();

      // Forward state events
      this._forwardStateEvents();

      // Determine source type and load
      await this._loadSource();

      // Initialize renderer
      await this._initRenderer();

      // Initialize UI
      if (this.options.ui.enabled) {
        this._initUI();
      }

      // Initialize features
      this._initFeatures();

      // Initialize input handlers
      this._initInputHandlers();

      // Set up resize listener
      window.addEventListener('resize', this._resizeHandler);

      // Check for deep link
      this._checkDeepLink();

      // Update loading state
      this.state.set({
        isLoading: false,
        loadProgress: 100
      });

      // Emit ready event
      this.emit(Events.READY, { flipbook: this });

      // Legacy callback
      if (typeof this.options.onReady === 'function') {
        this.options.onReady(this);
      }

      return this;

    } catch (error) {
      this.errorHandler.handle(error, ErrorCodes.INIT_FAILED);
      this.emit(Events.ERROR, error);
      throw error;
    }
  }

  /**
   * Resolve container element
   * @private
   */
  _resolveContainer(container) {
    if (!container) return null;
    if (typeof container === 'string') {
      return $(container);
    }
    return container;
  }

  /**
   * Create wrapper element
   * @private
   */
  _createWrapper() {
    this.container.classList.add('pfb-container');

    // Set dimensions
    this._updateDimensions();

    // Create inner wrapper
    this.wrapper = createElement('div', { className: 'pfb-wrapper' });
    this.container.appendChild(this.wrapper);

    // Add RTL class if needed
    if (this.options.rtl) {
      this.container.classList.add('pfb-rtl');
    }
  }

  /**
   * Update container dimensions
   * @private
   */
  _updateDimensions() {
    const { width, height, aspectRatio } = this.options;

    if (width !== 'auto') {
      this.container.style.width = typeof width === 'number' ? `${width}px` : width;
    }

    if (height !== 'auto') {
      this.container.style.height = typeof height === 'number' ? `${height}px` : height;
    } else if (width !== 'auto' && aspectRatio) {
      // Calculate height from width and aspect ratio
      const containerWidth = this.container.offsetWidth;
      this.container.style.height = `${containerWidth / aspectRatio}px`;
    }
  }

  /**
   * Forward state events to main emitter
   * @private
   */
  _forwardStateEvents() {
    // Forward all state events
    Object.values(Events).forEach(event => {
      this.state.on(event, (...args) => {
        this.emit(event, ...args);

        // Legacy callbacks
        switch (event) {
          case Events.PAGE_CHANGE:
            if (typeof this.options.onPageChange === 'function') {
              this.options.onPageChange(...args);
            }
            break;
          case Events.FLIP_START:
            if (typeof this.options.onFlipStart === 'function') {
              this.options.onFlipStart(...args);
            }
            break;
          case Events.FLIP_END:
            if (typeof this.options.onFlipEnd === 'function') {
              this.options.onFlipEnd(...args);
            }
            break;
          case Events.ZOOM_CHANGE:
            if (typeof this.options.onZoomChange === 'function') {
              this.options.onZoomChange(...args);
            }
            break;
          case Events.ERROR:
            if (typeof this.options.onError === 'function') {
              this.options.onError(...args);
            }
            break;
        }
      });
    });
  }

  /**
   * Load content source
   * @private
   */
  async _loadSource() {
    this.emit(Events.SOURCE_LOAD_START);

    this.source = await SourceLoader.create(this.options, {
      onProgress: (progress) => {
        this.state.set({ loadProgress: progress });
        this.emit(Events.SOURCE_LOAD_PROGRESS, { progress });
      }
    });

    // Update state with source info
    this.state.set({
      totalPages: this.source.pageCount,
      sourceType: this.source.type
    });

    this.emit(Events.SOURCE_LOAD_COMPLETE, {
      pageCount: this.source.pageCount,
      type: this.source.type
    });
  }

  /**
   * Initialize renderer
   * @private
   */
  async _initRenderer() {
    this.renderer = new RendererManager(this, this.options);
    await this.renderer.init(this.wrapper);

    // Update state with renderer type
    this.state.set({
      rendererType: this.renderer.activeRenderer?.type
    });

    // Update display mode based on viewport
    this._updateDisplayMode();
  }

  /**
   * Initialize UI components
   * @private
   */
  _initUI() {
    this.ui = new UIManager(this, this.options);
    this.ui.init(this.container);
  }

  /**
   * Initialize feature modules
   * @private
   */
  _initFeatures() {
    const { features, zoom } = this.options;

    // Zoom controller
    if (zoom.enabled) {
      this.features.zoom = new ZoomController(this, this.options);
    }

    // Search engine
    if (this.options.ui.search.enabled && this.source.searchable) {
      this.features.search = new SearchEngine(this, this.options);
    }

    // Deep linking
    if (features.deepLinking) {
      this.features.deepLinking = new DeepLinking(this, this.options);
    }

    // Lightbox
    if (features.lightbox) {
      this.features.lightbox = new Lightbox(this, this.options);
    }

    // Fullscreen
    if (features.fullscreen) {
      this.features.fullscreen = new Fullscreen(this, this.options);
    }

    // Autoplay
    if (features.autoplay.enabled) {
      this.features.autoplay = new Autoplay(this, this.options);
    }

    // Sound
    if (features.sound.enabled) {
      this.features.sound = new Sound(this, this.options);
    }
  }

  /**
   * Initialize input handlers
   * @private
   */
  _initInputHandlers() {
    // Keyboard navigation
    if (this.options.ui.navigation.keyboard) {
      this.keyboard = new KeyboardHandler(this, this.options);
    }

    // Touch handling
    if (this.browser.hasTouch) {
      this.touch = new TouchHandler(this, this.options);
    }
  }

  /**
   * Check for deep link on init
   * @private
   */
  _checkDeepLink() {
    if (this.features.deepLinking) {
      const page = this.features.deepLinking.getPageFromHash();
      if (page && page !== this.state.get('currentPage')) {
        this.goToPage(page);
      }
    }
  }

  /**
   * Handle window resize
   * @private
   */
  _onResize() {
    this._updateDimensions();
    this._updateDisplayMode();

    if (this.renderer) {
      this.renderer.resize();
    }

    this.emit(Events.RESIZE, {
      width: this.container.offsetWidth,
      height: this.container.offsetHeight
    });
  }

  /**
   * Update display mode based on viewport
   * @private
   */
  _updateDisplayMode() {
    const { singlePageMode, singlePageBreakpoint } = this.options;

    let mode;
    if (singlePageMode === 'always') {
      mode = 'single';
    } else if (singlePageMode === 'never') {
      mode = 'double';
    } else {
      // Auto detect
      const viewport = getViewportSize();
      const containerWidth = this.container.offsetWidth;
      mode = (containerWidth < singlePageBreakpoint || viewport.width < singlePageBreakpoint)
        ? 'single'
        : 'double';
    }

    if (mode !== this.state.get('displayMode')) {
      this.state.set({ displayMode: mode });
    }
  }

  // =========================================
  // Public API - Navigation
  // =========================================

  /**
   * Go to a specific page
   * @param {number} page - Page number (1-based)
   * @returns {Promise<boolean>}
   */
  async goToPage(page) {
    if (this.state.get('isFlipping')) return false;

    const currentPage = this.state.get('currentPage');
    const targetPage = this.state.validatePage(page);

    if (targetPage === currentPage) return false;

    const direction = targetPage > currentPage ? 'forward' : 'backward';

    this.state.set({
      isFlipping: true,
      flipDirection: direction
    });

    try {
      // Update state BEFORE flip so render() shows the correct page
      this.state.set({ currentPage: targetPage }, true); // silent update
      await this.renderer.flip(currentPage, targetPage, direction);
      // Emit the page change event
      this.state.goToPage(targetPage);
    } finally {
      this.state.set({
        isFlipping: false,
        flipDirection: null,
        flipProgress: 0
      });
    }

    return true;
  }

  /**
   * Go to next page
   * @returns {Promise<boolean>}
   */
  async nextPage() {
    if (!this.state.canGoNext()) return false;
    const increment = this.state.get('displayMode') === 'double' ? 2 : 1;
    return this.goToPage(this.state.get('currentPage') + increment);
  }

  /**
   * Go to previous page
   * @returns {Promise<boolean>}
   */
  async prevPage() {
    if (!this.state.canGoPrev()) return false;
    const decrement = this.state.get('displayMode') === 'double' ? 2 : 1;
    return this.goToPage(this.state.get('currentPage') - decrement);
  }

  /**
   * Go to first page
   * @returns {Promise<boolean>}
   */
  async firstPage() {
    return this.goToPage(1);
  }

  /**
   * Go to last page
   * @returns {Promise<boolean>}
   */
  async lastPage() {
    return this.goToPage(this.state.get('totalPages'));
  }

  /**
   * Set page transition type
   * @param {string} type - 'fade', 'slide', 'flip', 'none'
   */
  setTransition(type) {
    console.log('FlipBook setTransition:', type, 'renderer:', this.renderer?.type);
    if (this.renderer && typeof this.renderer.setTransition === 'function') {
      this.renderer.setTransition(type);
    } else {
      console.warn('Renderer does not support setTransition');
    }
  }

  /**
   * Get current transition type
   * @returns {string}
   */
  getTransition() {
    return this.renderer?.transitionType || 'fade';
  }

  // =========================================
  // Public API - Zoom
  // =========================================

  /**
   * Set zoom level
   * @param {number} zoom - Zoom level (1 = 100%)
   * @returns {boolean}
   */
  setZoom(zoom) {
    if (this.features.zoom) {
      return this.features.zoom.setZoom(zoom);
    }
    return this.state.setZoom(zoom);
  }

  /**
   * Zoom in
   * @param {number} [step] - Zoom step
   * @returns {boolean}
   */
  zoomIn(step) {
    if (this.features.zoom) {
      return this.features.zoom.zoomIn(step);
    }
    return this.state.zoomIn(step);
  }

  /**
   * Zoom out
   * @param {number} [step] - Zoom step
   * @returns {boolean}
   */
  zoomOut(step) {
    if (this.features.zoom) {
      return this.features.zoom.zoomOut(step);
    }
    return this.state.zoomOut(step);
  }

  /**
   * Reset zoom to default
   * @returns {boolean}
   */
  resetZoom() {
    if (this.features.zoom) {
      return this.features.zoom.reset();
    }
    return this.state.resetZoom();
  }

  // =========================================
  // Public API - UI Toggles
  // =========================================

  /**
   * Toggle thumbnail panel
   * @param {boolean} [show] - Force show/hide
   */
  toggleThumbnails(show) {
    if (this.ui) {
      this.ui.toggleThumbnails(show);
    }
  }

  /**
   * Toggle table of contents
   * @param {boolean} [show] - Force show/hide
   */
  toggleTOC(show) {
    if (this.ui) {
      this.ui.toggleTOC(show);
    }
  }

  /**
   * Toggle search panel
   * @param {boolean} [show] - Force show/hide
   */
  toggleSearch(show) {
    if (this.ui) {
      this.ui.toggleSearch(show);
    }
  }

  /**
   * Toggle fullscreen
   * @returns {Promise<boolean>}
   */
  async toggleFullscreen() {
    if (this.features.fullscreen) {
      return this.features.fullscreen.toggle();
    }
    return false;
  }

  // =========================================
  // Public API - Features
  // =========================================

  /**
   * Search for text
   * @param {string} query - Search query
   * @returns {Promise<Object[]>} Search results
   */
  async search(query) {
    if (!this.features.search) {
      throw new FlipBookError(ErrorCodes.SEARCH_NOT_AVAILABLE);
    }
    return this.features.search.search(query);
  }

  /**
   * Clear search
   */
  clearSearch() {
    if (this.features.search) {
      this.features.search.clear();
    }
  }

  /**
   * Start autoplay
   * @param {number} [interval] - Custom interval in ms
   */
  startAutoplay(interval) {
    if (this.features.autoplay) {
      this.features.autoplay.start(interval);
    }
  }

  /**
   * Stop autoplay
   */
  stopAutoplay() {
    if (this.features.autoplay) {
      this.features.autoplay.stop();
    }
  }

  /**
   * Toggle autoplay
   * @returns {boolean} New autoplay state
   */
  toggleAutoplay() {
    if (this.features.autoplay) {
      return this.features.autoplay.toggle();
    }
    return false;
  }

  /**
   * Open in lightbox
   * @param {number} [page] - Page to open
   */
  openLightbox(page) {
    if (this.features.lightbox) {
      this.features.lightbox.open(page);
    }
  }

  /**
   * Close lightbox
   */
  closeLightbox() {
    if (this.features.lightbox) {
      this.features.lightbox.close();
    }
  }

  // =========================================
  // Public API - State
  // =========================================

  /**
   * Get current page number
   * @returns {number}
   */
  getCurrentPage() {
    return this.state.get('currentPage');
  }

  /**
   * Get total page count
   * @returns {number}
   */
  getPageCount() {
    return this.state.get('totalPages');
  }

  /**
   * Get current zoom level
   * @returns {number}
   */
  getZoom() {
    return this.state.get('zoom');
  }

  /**
   * Get display mode
   * @returns {string} 'single' or 'double'
   */
  getDisplayMode() {
    return this.state.get('displayMode');
  }

  /**
   * Set display mode
   * @param {string} mode - 'single' or 'double'
   * @returns {boolean}
   */
  setDisplayMode(mode) {
    if (mode !== 'single' && mode !== 'double') {
      console.warn('Invalid display mode. Use "single" or "double".');
      return false;
    }

    if (mode === this.state.get('displayMode')) {
      return true;
    }

    this.state.set({ displayMode: mode });

    // Re-render with new mode
    if (this.renderer) {
      this.renderer.render();
    }

    return true;
  }

  /**
   * Get current state
   * @returns {Object}
   */
  getState() {
    return this.state.state;
  }

  /**
   * Check if flipbook is flipping
   * @returns {boolean}
   */
  isFlipping() {
    return this.state.get('isFlipping');
  }

  /**
   * Check if flipbook is loading
   * @returns {boolean}
   */
  isLoading() {
    return this.state.get('isLoading');
  }

  // =========================================
  // Public API - Renderer
  // =========================================

  /**
   * Switch renderer
   * @param {string} type - Renderer type ('webgl', 'css', 'swipe')
   * @returns {Promise<boolean>}
   */
  async switchRenderer(type) {
    if (this.renderer) {
      return this.renderer.switchTo(type);
    }
    return false;
  }

  /**
   * Get current renderer type
   * @returns {string}
   */
  getRendererType() {
    return this.state.get('rendererType');
  }

  // =========================================
  // Public API - Source
  // =========================================

  /**
   * Get page image/canvas
   * @param {number} page - Page number
   * @param {number} [scale=1] - Render scale
   * @returns {Promise<HTMLCanvasElement|HTMLImageElement>}
   */
  async getPage(page, scale = 1) {
    if (!this.source) return null;
    return this.source.getPage(page, scale);
  }

  /**
   * Get thumbnail
   * @param {number} page - Page number
   * @returns {Promise<HTMLCanvasElement|HTMLImageElement>}
   */
  async getThumbnail(page) {
    if (!this.source) return null;
    return this.source.getThumbnail(page);
  }

  /**
   * Get table of contents
   * @returns {Object[]}
   */
  getTableOfContents() {
    if (!this.source) return [];
    return this.source.getTableOfContents();
  }

  // =========================================
  // Public API - Lifecycle
  // =========================================

  /**
   * Update options
   * @param {Object} options - New options
   */
  updateOptions(options) {
    this.options = mergeOptions(this.options, options);
    // Apply relevant changes
    this._updateDimensions();
    this._updateDisplayMode();
  }

  /**
   * Refresh the flipbook
   * @returns {Promise}
   */
  async refresh() {
    if (this.renderer) {
      await this.renderer.refresh();
    }
  }

  /**
   * Destroy the flipbook instance
   */
  destroy() {
    this.emit(Events.DESTROY);

    // Remove resize listener
    window.removeEventListener('resize', this._resizeHandler);

    // Destroy features
    Object.values(this.features).forEach(feature => {
      if (feature && typeof feature.destroy === 'function') {
        feature.destroy();
      }
    });

    // Destroy input handlers
    if (this.keyboard) this.keyboard.destroy();
    if (this.touch) this.touch.destroy();

    // Destroy UI
    if (this.ui) this.ui.destroy();

    // Destroy renderer
    if (this.renderer) this.renderer.destroy();

    // Destroy source
    if (this.source) this.source.destroy();

    // Destroy state
    if (this.state) this.state.destroy();

    // Clean up container
    if (this.container) {
      this.container.classList.remove('pfb-container', 'pfb-rtl');
      this.container.innerHTML = '';
    }

    // Clear references
    this.container = null;
    this.wrapper = null;
    this.source = null;
    this.renderer = null;
    this.ui = null;
    this.features = {};

    // Clear events
    this.removeAllListeners();
  }

  // =========================================
  // Static methods
  // =========================================

  /**
   * Get version
   * @returns {string}
   */
  static get version() {
    return '1.0.0';
  }

  /**
   * Get browser capabilities
   * @returns {Object}
   */
  static getBrowserInfo() {
    return detectBrowser();
  }

  /**
   * Check if WebGL is supported
   * @returns {boolean}
   */
  static isWebGLSupported() {
    return detectBrowser().supportsWebGL;
  }

  /**
   * Check if CSS 3D is supported
   * @returns {boolean}
   */
  static isCSS3DSupported() {
    return detectBrowser().supportsCSS3D;
  }
}

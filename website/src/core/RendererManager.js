/**
 * RendererManager - Manages renderer selection and switching
 */

import { EventEmitter, Events } from './EventEmitter.js';
import { RendererType } from '../renderers/BaseRenderer.js';
import { WebGLRenderer } from '../renderers/webgl/WebGLRenderer.js';
import { CSSRenderer } from '../renderers/css/CSSRenderer.js';
import { SwipeRenderer } from '../renderers/swipe/SwipeRenderer.js';
import { detectBrowser } from '../utils/browser.js';
import { ErrorCodes, FlipBookError } from '../utils/errors.js';

/**
 * Renderer manager for flipbook
 */
export class RendererManager extends EventEmitter {
  /**
   * Create a renderer manager
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Configuration options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.options = options;
    this.state = flipbook.state;
    this.source = flipbook.source;

    this.container = null;
    this.activeRenderer = null;
    this.renderers = new Map();

    this.browser = detectBrowser();
  }

  /**
   * Initialize renderer
   * @param {HTMLElement} container - Container element
   * @returns {Promise}
   */
  async init(container) {
    this.container = container;

    // Determine which renderer to use
    const rendererType = this._determineRenderer();

    // Create and initialize renderer
    await this._createRenderer(rendererType);

    return this;
  }

  /**
   * Determine best renderer based on options and capabilities
   * @private
   * @returns {string}
   */
  _determineRenderer() {
    const { renderMode, autoDetectRenderer } = this.options;

    // Explicit mode
    if (renderMode && renderMode !== 'auto') {
      return renderMode;
    }

    // Auto-detect
    if (autoDetectRenderer) {
      return this.browser.recommendedRenderer;
    }

    // Fallback chain
    if (this.browser.supportsWebGL) {
      return RendererType.WEBGL;
    }

    if (this.browser.supportsCSS3D) {
      return RendererType.CSS;
    }

    return RendererType.SWIPE;
  }

  /**
   * Create a renderer instance
   * @private
   */
  async _createRenderer(type) {
    // Check if already created
    if (this.renderers.has(type)) {
      this.activeRenderer = this.renderers.get(type);
      return;
    }

    let renderer;

    try {
      switch (type) {
        case RendererType.WEBGL:
          if (!this.browser.supportsWebGL) {
            throw new FlipBookError(ErrorCodes.WEBGL_NOT_SUPPORTED);
          }
          renderer = new WebGLRenderer(this.flipbook, this.options);
          break;

        case RendererType.CSS:
          if (!this.browser.supportsCSS3D) {
            throw new FlipBookError(ErrorCodes.CSS3D_NOT_SUPPORTED);
          }
          renderer = new CSSRenderer(this.flipbook, this.options);
          break;

        case RendererType.SWIPE:
        default:
          renderer = new SwipeRenderer(this.flipbook, this.options);
          break;
      }

      await renderer.init(this.container);

      this.renderers.set(type, renderer);
      this.activeRenderer = renderer;

      this.emit(Events.RENDERER_CHANGE, { type });

    } catch (error) {
      console.error(`Failed to create ${type} renderer:`, error);

      // Try fallback
      if (type === RendererType.WEBGL) {
        console.log('Falling back to CSS renderer');
        return this._createRenderer(RendererType.CSS);
      }

      if (type === RendererType.CSS) {
        console.log('Falling back to Swipe renderer');
        return this._createRenderer(RendererType.SWIPE);
      }

      throw FlipBookError.wrap(error, ErrorCodes.RENDERER_INIT_FAILED);
    }
  }

  /**
   * Switch to a different renderer
   * @param {string} type - Renderer type
   * @returns {Promise<boolean>}
   */
  async switchTo(type) {
    if (this.activeRenderer && this.activeRenderer.type === type) {
      return true;
    }

    // Pause current renderer
    if (this.activeRenderer) {
      this.activeRenderer.pause();
      this.activeRenderer.clear();
    }

    try {
      await this._createRenderer(type);

      // Render current state
      await this.activeRenderer.render();

      this.state.set({ rendererType: type });

      return true;

    } catch (error) {
      console.error(`Failed to switch to ${type} renderer:`, error);

      // Restore previous renderer
      if (this.activeRenderer) {
        this.activeRenderer.resume();
        await this.activeRenderer.render();
      }

      return false;
    }
  }

  /**
   * Flip pages
   * @param {number} fromPage - Starting page
   * @param {number} toPage - Target page
   * @param {string} direction - 'forward' or 'backward'
   * @returns {Promise}
   */
  async flip(fromPage, toPage, direction) {
    if (!this.activeRenderer) return;
    return this.activeRenderer.flip(fromPage, toPage, direction);
  }

  /**
   * Render current state
   * @returns {Promise}
   */
  async render() {
    if (!this.activeRenderer) return;
    return this.activeRenderer.render();
  }

  /**
   * Refresh the display
   * @returns {Promise}
   */
  async refresh() {
    if (!this.activeRenderer) return;

    this.activeRenderer.clear();
    return this.activeRenderer.render();
  }

  /**
   * Handle resize
   */
  resize() {
    if (this.activeRenderer) {
      this.activeRenderer.resize();
    }
  }

  /**
   * Apply zoom
   * @param {number} zoom - Zoom level
   * @param {number} panX - Pan X
   * @param {number} panY - Pan Y
   */
  applyZoom(zoom, panX = 0, panY = 0) {
    if (this.activeRenderer) {
      this.activeRenderer.applyZoom(zoom, panX, panY);
    }
  }

  /**
   * Get page bounds
   * @param {number} pageNumber - Page number
   * @returns {Object|null}
   */
  getPageBounds(pageNumber) {
    if (!this.activeRenderer) return null;
    return this.activeRenderer.getPageBounds(pageNumber);
  }

  /**
   * Get active renderer capabilities
   * @returns {Object}
   */
  getCapabilities() {
    if (!this.activeRenderer) {
      return { type: null, features: [] };
    }
    return this.activeRenderer.getCapabilities();
  }

  /**
   * Check if a feature is supported
   * @param {string} feature - Feature name
   * @returns {boolean}
   */
  supportsFeature(feature) {
    if (!this.activeRenderer) return false;
    return this.activeRenderer.supportsFeature(feature);
  }

  /**
   * Preload pages
   * @param {number[]} pages - Page numbers
   * @returns {Promise}
   */
  async preload(pages) {
    if (!this.activeRenderer) return;
    return this.activeRenderer.preload(pages);
  }

  /**
   * Set transition type for page flips
   * @param {string} type - 'fade', 'slide', 'flip', 'none'
   */
  setTransition(type) {
    console.log('RendererManager setTransition:', type, 'activeRenderer:', this.activeRenderer?.type);
    if (this.activeRenderer && typeof this.activeRenderer.setTransition === 'function') {
      this.activeRenderer.setTransition(type);
    }
  }

  /**
   * Get current transition type
   * @returns {string}
   */
  getTransition() {
    return this.activeRenderer?.transitionType || 'fade';
  }

  /**
   * Pause rendering
   */
  pause() {
    if (this.activeRenderer) {
      this.activeRenderer.pause();
    }
  }

  /**
   * Resume rendering
   */
  resume() {
    if (this.activeRenderer) {
      this.activeRenderer.resume();
    }
  }

  /**
   * Destroy all renderers
   */
  destroy() {
    for (const renderer of this.renderers.values()) {
      renderer.destroy();
    }

    this.renderers.clear();
    this.activeRenderer = null;
    this.container = null;
    this.flipbook = null;

    this.removeAllListeners();
  }
}

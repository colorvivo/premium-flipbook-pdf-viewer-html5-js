/**
 * BaseRenderer - Abstract base class for all renderers
 */

import { EventEmitter } from '../core/EventEmitter.js';

/**
 * Renderer types
 */
export const RendererType = {
  WEBGL: 'webgl',
  CSS: 'css',
  SWIPE: 'swipe'
};

/**
 * Abstract base class for renderers
 */
export class BaseRenderer extends EventEmitter {
  /**
   * Create a renderer
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Configuration options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.options = options;
    this.state = flipbook.state;
    this.source = flipbook.source;

    this.type = 'base';
    this.container = null;
    this.initialized = false;
    this.isAnimating = false;

    // Page dimensions
    this.pageWidth = options.pageWidth || 400;
    this.pageHeight = options.pageHeight || 565;

    // Viewport dimensions
    this.viewportWidth = 0;
    this.viewportHeight = 0;
  }

  /**
   * Initialize the renderer
   * @param {HTMLElement} container - Container element
   * @returns {Promise}
   */
  async init(container) {
    this.container = container;
    this.updateViewport();
    this.initialized = true;
  }

  /**
   * Render the current view
   * @returns {Promise}
   */
  async render() {
    throw new Error('BaseRenderer.render() must be implemented by subclass');
  }

  /**
   * Flip from one page to another
   * @param {number} fromPage - Starting page
   * @param {number} toPage - Target page
   * @param {string} direction - 'forward' or 'backward'
   * @returns {Promise}
   */
  async flip(fromPage, toPage, direction) {
    throw new Error('BaseRenderer.flip() must be implemented by subclass');
  }

  /**
   * Update viewport dimensions
   */
  updateViewport() {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    this.viewportWidth = rect.width;
    this.viewportHeight = rect.height;
  }

  /**
   * Handle container resize
   */
  resize() {
    this.updateViewport();
    this.render();
  }

  /**
   * Apply zoom transformation
   * @param {number} zoom - Zoom level
   * @param {number} [panX=0] - Pan X offset
   * @param {number} [panY=0] - Pan Y offset
   */
  applyZoom(zoom, panX = 0, panY = 0) {
    // Default implementation - override in subclasses
  }

  /**
   * Get page bounds in screen coordinates
   * @param {number} pageNumber - Page number
   * @returns {Object|null} { left, top, right, bottom, width, height }
   */
  getPageBounds(pageNumber) {
    return null;
  }

  /**
   * Check if renderer supports a feature
   * @param {string} feature - Feature name
   * @returns {boolean}
   */
  supportsFeature(feature) {
    const supportedFeatures = this.getSupportedFeatures();
    return supportedFeatures.includes(feature);
  }

  /**
   * Get list of supported features
   * @returns {string[]}
   */
  getSupportedFeatures() {
    return ['flip', 'zoom', 'pan'];
  }

  /**
   * Get renderer capabilities
   * @returns {Object}
   */
  getCapabilities() {
    return {
      type: this.type,
      supports3D: false,
      supportsShaders: false,
      supportsRealisticFlip: false,
      maxTextureSize: 2048,
      features: this.getSupportedFeatures()
    };
  }

  /**
   * Preload pages for rendering
   * @param {number[]} pages - Page numbers to preload
   * @returns {Promise}
   */
  async preload(pages) {
    if (!this.source) return;
    await this.source.preload(pages);
  }

  /**
   * Update a specific page display
   * @param {number} pageNumber - Page number
   * @returns {Promise}
   */
  async updatePage(pageNumber) {
    // Default: re-render everything
    await this.render();
  }

  /**
   * Clear all rendered content
   */
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * Pause animations
   */
  pause() {
    // Override in subclasses if needed
  }

  /**
   * Resume animations
   */
  resume() {
    // Override in subclasses if needed
  }

  /**
   * Get current animation progress
   * @returns {number} 0-1
   */
  getAnimationProgress() {
    return this.isAnimating ? 0.5 : 1;
  }

  /**
   * Cancel current animation
   */
  cancelAnimation() {
    this.isAnimating = false;
  }

  /**
   * Destroy the renderer
   */
  destroy() {
    this.cancelAnimation();
    this.clear();
    this.container = null;
    this.flipbook = null;
    this.source = null;
    this.initialized = false;
    this.removeAllListeners();
  }
}

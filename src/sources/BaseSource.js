/**
 * BaseSource - Abstract base class for content sources
 */

import { EventEmitter } from '../core/EventEmitter.js';

/**
 * Abstract base class for all source loaders
 */
export class BaseSource extends EventEmitter {
  constructor(options) {
    super();

    this.options = options;
    this.type = 'base';
    this.pageCount = 0;
    this.pages = [];
    this.toc = [];
    this.searchable = false;
    this.initialized = false;

    // Page dimensions
    this.pageWidth = options.pageWidth || 400;
    this.pageHeight = options.pageHeight || 565;

    // Cache for loaded pages
    this._pageCache = new Map();
    this._thumbnailCache = new Map();
  }

  /**
   * Initialize the source
   * @param {Object} callbacks - Callback functions
   * @returns {Promise}
   */
  async init(callbacks = {}) {
    throw new Error('BaseSource.init() must be implemented by subclass');
  }

  /**
   * Get a page at specified scale
   * @param {number} pageNumber - Page number (1-based)
   * @param {number} [scale=1] - Render scale
   * @returns {Promise<HTMLCanvasElement|HTMLImageElement>}
   */
  async getPage(pageNumber, scale = 1) {
    throw new Error('BaseSource.getPage() must be implemented by subclass');
  }

  /**
   * Get thumbnail for a page
   * @param {number} pageNumber - Page number (1-based)
   * @returns {Promise<HTMLCanvasElement|HTMLImageElement>}
   */
  async getThumbnail(pageNumber) {
    // Default: get page at thumbnail scale
    const scale = this.options.performance?.thumbnailQuality || 0.5;
    return this.getPage(pageNumber, scale);
  }

  /**
   * Get page dimensions
   * @param {number} pageNumber - Page number
   * @returns {Object} { width, height }
   */
  getPageDimensions(pageNumber) {
    return {
      width: this.pageWidth,
      height: this.pageHeight
    };
  }

  /**
   * Get table of contents
   * @returns {Object[]}
   */
  getTableOfContents() {
    return this.toc;
  }

  /**
   * Search for text in the source
   * @param {string} query - Search query
   * @param {Object} [options] - Search options
   * @returns {Promise<Object[]>}
   */
  async search(query, options = {}) {
    // Default implementation returns empty results
    return [];
  }

  /**
   * Get text content for a page
   * @param {number} pageNumber - Page number
   * @returns {Promise<string>}
   */
  async getTextContent(pageNumber) {
    // Default implementation returns empty string
    return '';
  }

  /**
   * Preload pages
   * @param {number[]} pageNumbers - Page numbers to preload
   * @returns {Promise}
   */
  async preload(pageNumbers) {
    const promises = pageNumbers.map(page => this.getPage(page));
    await Promise.allSettled(promises);
  }

  /**
   * Clear page from cache
   * @param {number} pageNumber - Page number
   */
  clearPage(pageNumber) {
    this._pageCache.delete(pageNumber);
    this._thumbnailCache.delete(pageNumber);
  }

  /**
   * Clear all cached pages
   */
  clearCache() {
    this._pageCache.clear();
    this._thumbnailCache.clear();
  }

  /**
   * Check if a page is cached
   * @param {number} pageNumber - Page number
   * @returns {boolean}
   */
  isPageCached(pageNumber) {
    return this._pageCache.has(pageNumber);
  }

  /**
   * Get cache size
   * @returns {number}
   */
  getCacheSize() {
    return this._pageCache.size;
  }

  /**
   * Validate page number
   * @param {number} pageNumber - Page number
   * @returns {boolean}
   */
  isValidPage(pageNumber) {
    return pageNumber >= 1 && pageNumber <= this.pageCount;
  }

  /**
   * Destroy the source and clean up resources
   */
  destroy() {
    this.clearCache();
    this.pages = [];
    this.toc = [];
    this.initialized = false;
    this.removeAllListeners();
  }
}

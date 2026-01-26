/**
 * OptimizedSource - Load flipbook from optimized images + JSON configuration
 * This source type is designed for maximum performance without requiring PDF.js
 */

import { BaseSource } from './BaseSource.js';
import { ErrorCodes, FlipBookError } from '../utils/errors.js';
import { loadImage, createCanvas } from '../utils/dom.js';

/**
 * Optimized image + JSON source loader
 */
export class OptimizedSource extends BaseSource {
  constructor(options) {
    super(options);

    this.type = 'optimized';
    this.searchable = true; // Can have searchable text from JSON
    this.config = null;
    this.basePath = '';
    this.textContent = new Map();
  }

  /**
   * Initialize the optimized source
   * @param {Object} callbacks - Callback functions
   * @returns {Promise}
   */
  async init(callbacks = {}) {
    const { onProgress } = callbacks;
    const { optimizedImages } = this.options;

    try {
      // Load configuration
      if (optimizedImages.jsonUrl) {
        // Load from JSON URL
        this.config = await this._loadJSON(optimizedImages.jsonUrl);
        // Extract base path from JSON URL
        this.basePath = optimizedImages.jsonUrl.substring(
          0,
          optimizedImages.jsonUrl.lastIndexOf('/') + 1
        );
      } else if (optimizedImages.pages) {
        // Direct configuration object
        this.config = optimizedImages;
        this.basePath = optimizedImages.basePath || '';
      } else {
        throw new FlipBookError(
          ErrorCodes.INVALID_OPTIONS,
          'optimizedImages must have jsonUrl or pages'
        );
      }

      // Validate configuration
      if (!this.config.pages || !Array.isArray(this.config.pages)) {
        throw new FlipBookError(
          ErrorCodes.JSON_LOAD_FAILED,
          'Invalid configuration: pages array required'
        );
      }

      this.pageCount = this.config.pages.length;

      if (this.pageCount === 0) {
        throw new FlipBookError(
          ErrorCodes.SOURCE_LOAD_FAILED,
          'No pages in configuration'
        );
      }

      // Set page dimensions from config or first page
      if (this.config.pageWidth && this.config.pageHeight) {
        this.pageWidth = this.config.pageWidth;
        this.pageHeight = this.config.pageHeight;
      } else {
        // Load first page to get dimensions
        const firstPage = await this._loadPageImage(0);
        this.pageWidth = firstPage.naturalWidth || firstPage.width;
        this.pageHeight = firstPage.naturalHeight || firstPage.height;
      }

      // Set up pages array
      this.pages = this.config.pages.map((page, index) => ({
        index: index + 1,
        url: this._resolveUrl(page.src || page.url || page),
        thumbUrl: page.thumb ? this._resolveUrl(page.thumb) : null,
        text: page.text || '',
        title: page.title || null,
        loaded: false
      }));

      // Set up text content for search
      this.pages.forEach((page, index) => {
        if (page.text) {
          this.textContent.set(index + 1, page.text);
        }
      });

      // Set up table of contents
      if (this.config.toc && Array.isArray(this.config.toc)) {
        this.toc = this.config.toc.map(item => ({
          title: item.title,
          page: item.page,
          level: item.level || 0,
          children: item.children || []
        }));
      }

      // Check for page-specific TOC entries
      this.pages.forEach(page => {
        if (page.title && !this.toc.find(t => t.page === page.index)) {
          this.toc.push({
            title: page.title,
            page: page.index,
            level: 0
          });
        }
      });

      // Sort TOC by page number
      this.toc.sort((a, b) => a.page - b.page);

      this.initialized = true;

      if (onProgress) {
        onProgress(100);
      }

      return this;

    } catch (error) {
      if (error instanceof FlipBookError) {
        throw error;
      }
      throw FlipBookError.wrap(
        error,
        ErrorCodes.SOURCE_LOAD_FAILED,
        { optimizedImages }
      );
    }
  }

  /**
   * Load JSON configuration
   * @private
   */
  async _loadJSON(url) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      throw new FlipBookError(
        ErrorCodes.JSON_LOAD_FAILED,
        `Failed to load JSON: ${url}`,
        error,
        { url }
      );
    }
  }

  /**
   * Resolve a URL relative to base path
   * @private
   */
  _resolveUrl(url) {
    if (!url) return null;

    // Absolute URL
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return url;
    }

    // Data URL
    if (url.startsWith('data:')) {
      return url;
    }

    // Relative URL
    return this.basePath + url;
  }

  /**
   * Load page image
   * @private
   */
  async _loadPageImage(index) {
    const page = this.pages[index];

    if (!page || !page.url) {
      throw new FlipBookError(
        ErrorCodes.PAGE_NOT_FOUND,
        `Page ${index + 1} not found or has no URL`
      );
    }

    try {
      return await loadImage(page.url);
    } catch (error) {
      throw new FlipBookError(
        ErrorCodes.IMAGE_LOAD_FAILED,
        `Failed to load page image: ${page.url}`,
        error,
        { pageNumber: index + 1, url: page.url }
      );
    }
  }

  /**
   * Get a page image
   * @param {number} pageNumber - Page number (1-based)
   * @param {number} [scale=1] - Render scale
   * @returns {Promise<HTMLCanvasElement|HTMLImageElement>}
   */
  async getPage(pageNumber, scale = 1) {
    if (!this.isValidPage(pageNumber)) {
      throw new FlipBookError(
        ErrorCodes.PAGE_NOT_FOUND,
        `Page ${pageNumber} not found`,
        null,
        { pageNumber, totalPages: this.pageCount }
      );
    }

    const index = pageNumber - 1;
    const cacheKey = `${pageNumber}-${scale}`;

    // Check cache
    if (this._pageCache.has(cacheKey)) {
      return this._pageCache.get(cacheKey);
    }

    // Load image
    const img = await this._loadPageImage(index);

    // If scale is 1, return the image directly
    if (scale === 1) {
      this._pageCache.set(cacheKey, img);
      this.pages[index].loaded = true;
      return img;
    }

    // Scale the image using canvas
    const scaledWidth = Math.round(img.naturalWidth * scale);
    const scaledHeight = Math.round(img.naturalHeight * scale);

    const { canvas, ctx } = createCanvas(scaledWidth, scaledHeight);
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

    this._pageCache.set(cacheKey, canvas);
    this.pages[index].loaded = true;

    return canvas;
  }

  /**
   * Get thumbnail for a page
   * @param {number} pageNumber - Page number (1-based)
   * @returns {Promise<HTMLCanvasElement|HTMLImageElement>}
   */
  async getThumbnail(pageNumber) {
    const thumbCacheKey = `thumb-${pageNumber}`;

    // Check thumbnail cache
    if (this._thumbnailCache.has(thumbCacheKey)) {
      return this._thumbnailCache.get(thumbCacheKey);
    }

    const index = pageNumber - 1;
    const page = this.pages[index];

    // Use pre-generated thumbnail if available
    if (page && page.thumbUrl) {
      try {
        const thumb = await loadImage(page.thumbUrl);
        this._thumbnailCache.set(thumbCacheKey, thumb);
        return thumb;
      } catch (e) {
        // Fall back to scaled main image
      }
    }

    // Generate thumbnail from main image
    const scale = this.options.performance?.thumbnailQuality || 0.25;
    const thumb = await this.getPage(pageNumber, scale);

    this._thumbnailCache.set(thumbCacheKey, thumb);
    return thumb;
  }

  /**
   * Get text content for a page
   * @param {number} pageNumber - Page number
   * @returns {Promise<string>}
   */
  async getTextContent(pageNumber) {
    return this.textContent.get(pageNumber) || '';
  }

  /**
   * Search for text in the source
   * @param {string} query - Search query
   * @param {Object} [options] - Search options
   * @returns {Promise<Object[]>}
   */
  async search(query, options = {}) {
    if (!query || query.trim() === '') {
      return [];
    }

    const results = [];
    const searchQuery = options.matchCase ? query : query.toLowerCase();

    for (const [pageNumber, text] of this.textContent) {
      const searchText = options.matchCase ? text : text.toLowerCase();
      let index = 0;
      let matchIndex;

      while ((matchIndex = searchText.indexOf(searchQuery, index)) !== -1) {
        // Get context around the match
        const contextStart = Math.max(0, matchIndex - 50);
        const contextEnd = Math.min(text.length, matchIndex + searchQuery.length + 50);
        const context = text.substring(contextStart, contextEnd);

        results.push({
          page: pageNumber,
          index: matchIndex,
          context: context.trim(),
          highlight: {
            start: matchIndex - contextStart,
            end: matchIndex - contextStart + searchQuery.length
          }
        });

        index = matchIndex + 1;
      }
    }

    return results;
  }

  /**
   * Get page dimensions for a specific page
   * @param {number} pageNumber - Page number
   * @returns {Object} { width, height }
   */
  getPageDimensions(pageNumber) {
    const page = this.config.pages[pageNumber - 1];

    if (page && page.width && page.height) {
      return {
        width: page.width,
        height: page.height
      };
    }

    return {
      width: this.pageWidth,
      height: this.pageHeight
    };
  }

  /**
   * Get metadata from configuration
   * @returns {Object}
   */
  getMetadata() {
    return {
      title: this.config.title || null,
      author: this.config.author || null,
      subject: this.config.subject || null,
      keywords: this.config.keywords || null,
      creator: this.config.creator || null,
      creationDate: this.config.creationDate || null,
      ...this.config.metadata
    };
  }

  /**
   * Destroy the source
   */
  destroy() {
    this.config = null;
    this.textContent.clear();
    super.destroy();
  }
}

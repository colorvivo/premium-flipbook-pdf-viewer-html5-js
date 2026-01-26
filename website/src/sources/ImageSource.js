/**
 * ImageSource - Load flipbook from an array of image URLs
 */

import { BaseSource } from './BaseSource.js';
import { ErrorCodes, FlipBookError } from '../utils/errors.js';
import { loadImage, createCanvas } from '../utils/dom.js';

/**
 * Image array source loader
 */
export class ImageSource extends BaseSource {
  constructor(options) {
    super(options);

    this.type = 'images';
    this.searchable = false;
    this.images = options.images || [];
  }

  /**
   * Initialize the image source
   * @param {Object} callbacks - Callback functions
   * @returns {Promise}
   */
  async init(callbacks = {}) {
    const { onProgress } = callbacks;

    try {
      this.pageCount = this.images.length;

      if (this.pageCount === 0) {
        throw new FlipBookError(
          ErrorCodes.SOURCE_LOAD_FAILED,
          'No images provided'
        );
      }

      // Load first image to get dimensions
      const firstImage = await this._loadImage(0, onProgress, 1);
      this.pageWidth = firstImage.naturalWidth || firstImage.width;
      this.pageHeight = firstImage.naturalHeight || firstImage.height;

      // Initialize pages array with image URLs
      this.pages = this.images.map((url, index) => ({
        index: index + 1,
        url,
        loaded: index === 0
      }));

      this.initialized = true;

      if (onProgress) {
        onProgress(100);
      }

      return this;

    } catch (error) {
      throw FlipBookError.wrap(
        error,
        ErrorCodes.SOURCE_LOAD_FAILED,
        { images: this.images }
      );
    }
  }

  /**
   * Load an image by index
   * @private
   */
  async _loadImage(index, onProgress, total) {
    const url = this.images[index];

    try {
      const img = await loadImage(url);

      if (onProgress && total) {
        onProgress(Math.round(((index + 1) / total) * 50));
      }

      return img;

    } catch (error) {
      throw new FlipBookError(
        ErrorCodes.IMAGE_LOAD_FAILED,
        `Failed to load image: ${url}`,
        error,
        { url, index }
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
    const img = await this._loadImage(index);

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

    const scale = this.options.performance?.thumbnailQuality || 0.25;
    const thumb = await this.getPage(pageNumber, scale);

    this._thumbnailCache.set(thumbCacheKey, thumb);
    return thumb;
  }

  /**
   * Get page dimensions
   * @param {number} pageNumber - Page number
   * @returns {Object} { width, height }
   */
  getPageDimensions(pageNumber) {
    // For images, all pages have the same dimensions as the first page
    return {
      width: this.pageWidth,
      height: this.pageHeight
    };
  }

  /**
   * Preload specific pages
   * @param {number[]} pageNumbers - Page numbers to preload
   * @returns {Promise}
   */
  async preload(pageNumbers) {
    const promises = pageNumbers
      .filter(page => this.isValidPage(page))
      .map(page => this.getPage(page));

    await Promise.allSettled(promises);
  }

  /**
   * Get all image URLs
   * @returns {string[]}
   */
  getImageUrls() {
    return [...this.images];
  }

  /**
   * Get image URL for a specific page
   * @param {number} pageNumber - Page number
   * @returns {string|null}
   */
  getImageUrl(pageNumber) {
    if (!this.isValidPage(pageNumber)) return null;
    return this.images[pageNumber - 1];
  }

  /**
   * Destroy the source
   */
  destroy() {
    this.images = [];
    super.destroy();
  }
}

/**
 * PDFSource - Load flipbook from PDF using PDF.js
 */

import { BaseSource } from './BaseSource.js';
import { ErrorCodes, FlipBookError } from '../utils/errors.js';
import { createCanvas } from '../utils/dom.js';

/**
 * PDF source loader using PDF.js
 */
export class PDFSource extends BaseSource {
  constructor(options) {
    super(options);

    this.type = 'pdf';
    this.searchable = true;
    this.pdfDocument = null;
    this.pdfjsLib = null;
    this.pdfUrl = options.pdfUrl;
    this.textContent = new Map();
    this._pageRenderTasks = new Map();
  }

  /**
   * Initialize the PDF source
   * @param {Object} callbacks - Callback functions
   * @returns {Promise}
   */
  async init(callbacks = {}) {
    const { onProgress } = callbacks;

    try {
      // Dynamically import PDF.js
      this.pdfjsLib = await this._loadPDFJS();

      if (onProgress) onProgress(10);

      // Load PDF document
      const version = this._pdfjsVersion || '4.10.38';
      const loadingTask = this.pdfjsLib.getDocument({
        url: this.pdfUrl,
        cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/cmaps/`,
        cMapPacked: true,
        enableXfa: true
      });

      // Track loading progress
      loadingTask.onProgress = (data) => {
        if (onProgress && data.total > 0) {
          const progress = 10 + Math.round((data.loaded / data.total) * 60);
          onProgress(Math.min(progress, 70));
        }
      };

      this.pdfDocument = await loadingTask.promise;

      if (onProgress) onProgress(75);

      this.pageCount = this.pdfDocument.numPages;

      // Get first page dimensions
      const firstPage = await this.pdfDocument.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      this.pageWidth = viewport.width;
      this.pageHeight = viewport.height;

      // Initialize pages array
      this.pages = [];
      for (let i = 1; i <= this.pageCount; i++) {
        this.pages.push({
          index: i,
          loaded: false
        });
      }

      if (onProgress) onProgress(85);

      // Load table of contents
      await this._loadTableOfContents();

      if (onProgress) onProgress(95);

      // Get metadata
      await this._loadMetadata();

      this.initialized = true;

      if (onProgress) onProgress(100);

      return this;

    } catch (error) {
      if (error instanceof FlipBookError) {
        throw error;
      }
      throw FlipBookError.wrap(
        error,
        ErrorCodes.PDF_LOAD_FAILED,
        { pdfUrl: this.pdfUrl }
      );
    }
  }

  /**
   * Load PDF.js library
   * @private
   */
  async _loadPDFJS() {
    // Check if PDF.js is already loaded globally
    if (typeof window !== 'undefined' && window.pdfjsLib) {
      return window.pdfjsLib;
    }

    try {
      // Dynamic import
      const pdfjsLib = await import('pdfjs-dist');

      // Get version from the library
      const version = pdfjsLib.version || '4.10.38';

      // Set worker source using the correct version
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      }

      // Store version for cMapUrl
      this._pdfjsVersion = version;

      return pdfjsLib;

    } catch (error) {
      throw new FlipBookError(
        ErrorCodes.PDF_JS_NOT_FOUND,
        'Failed to load PDF.js library. Make sure pdfjs-dist is installed or use image source.',
        error
      );
    }
  }

  /**
   * Load table of contents from PDF outline
   * @private
   */
  async _loadTableOfContents() {
    try {
      const outline = await this.pdfDocument.getOutline();

      if (!outline) {
        this.toc = [];
        return;
      }

      this.toc = await this._processOutline(outline, 0);

    } catch (error) {
      console.warn('Failed to load PDF outline:', error);
      this.toc = [];
    }
  }

  /**
   * Process PDF outline recursively
   * @private
   */
  async _processOutline(items, level) {
    const result = [];

    for (const item of items) {
      let page = 1;

      // Resolve destination to page number
      if (item.dest) {
        try {
          const dest = typeof item.dest === 'string'
            ? await this.pdfDocument.getDestination(item.dest)
            : item.dest;

          if (dest) {
            const ref = dest[0];
            page = await this.pdfDocument.getPageIndex(ref) + 1;
          }
        } catch (e) {
          // Use first page as fallback
        }
      }

      const tocItem = {
        title: item.title,
        page: page,
        level: level
      };

      // Process children
      if (item.items && item.items.length > 0) {
        tocItem.children = await this._processOutline(item.items, level + 1);
      }

      result.push(tocItem);
    }

    return result;
  }

  /**
   * Load PDF metadata
   * @private
   */
  async _loadMetadata() {
    try {
      const metadata = await this.pdfDocument.getMetadata();
      this.metadata = {
        title: metadata.info?.Title || null,
        author: metadata.info?.Author || null,
        subject: metadata.info?.Subject || null,
        keywords: metadata.info?.Keywords || null,
        creator: metadata.info?.Creator || null,
        producer: metadata.info?.Producer || null,
        creationDate: metadata.info?.CreationDate || null,
        modDate: metadata.info?.ModDate || null
      };
    } catch (error) {
      this.metadata = {};
    }
  }

  /**
   * Get a page rendered to canvas
   * @param {number} pageNumber - Page number (1-based)
   * @param {number} [scale=1] - Render scale
   * @returns {Promise<HTMLCanvasElement>}
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

    const cacheKey = `${pageNumber}-${scale}`;

    // Check cache
    if (this._pageCache.has(cacheKey)) {
      return this._pageCache.get(cacheKey);
    }

    // Cancel any existing render task for this page
    if (this._pageRenderTasks.has(cacheKey)) {
      this._pageRenderTasks.get(cacheKey).cancel();
    }

    try {
      const pdfPage = await this.pdfDocument.getPage(pageNumber);
      const viewport = pdfPage.getViewport({ scale: scale });

      const { canvas, ctx } = createCanvas(
        Math.round(viewport.width),
        Math.round(viewport.height)
      );

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
        enableWebGL: false,
        renderInteractiveForms: false
      };

      const renderTask = pdfPage.render(renderContext);
      this._pageRenderTasks.set(cacheKey, renderTask);

      await renderTask.promise;

      this._pageRenderTasks.delete(cacheKey);
      this._pageCache.set(cacheKey, canvas);
      this.pages[pageNumber - 1].loaded = true;

      return canvas;

    } catch (error) {
      this._pageRenderTasks.delete(cacheKey);

      if (error.name === 'RenderingCancelledException') {
        return null;
      }

      throw new FlipBookError(
        ErrorCodes.PAGE_RENDER_FAILED,
        `Failed to render page ${pageNumber}`,
        error,
        { pageNumber }
      );
    }
  }

  /**
   * Get thumbnail for a page
   * @param {number} pageNumber - Page number (1-based)
   * @returns {Promise<HTMLCanvasElement>}
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
   * Get text content for a page
   * @param {number} pageNumber - Page number
   * @returns {Promise<string>}
   */
  async getTextContent(pageNumber) {
    if (this.textContent.has(pageNumber)) {
      return this.textContent.get(pageNumber);
    }

    try {
      const pdfPage = await this.pdfDocument.getPage(pageNumber);
      const textContent = await pdfPage.getTextContent();

      const text = textContent.items
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      this.textContent.set(pageNumber, text);
      return text;

    } catch (error) {
      console.warn(`Failed to get text content for page ${pageNumber}:`, error);
      return '';
    }
  }

  /**
   * Search for text in the PDF
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

    for (let pageNum = 1; pageNum <= this.pageCount; pageNum++) {
      const text = await this.getTextContent(pageNum);
      const searchText = options.matchCase ? text : text.toLowerCase();

      let index = 0;
      let matchIndex;

      while ((matchIndex = searchText.indexOf(searchQuery, index)) !== -1) {
        // Get context around the match
        const contextStart = Math.max(0, matchIndex - 50);
        const contextEnd = Math.min(text.length, matchIndex + searchQuery.length + 50);
        const context = text.substring(contextStart, contextEnd);

        results.push({
          page: pageNum,
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
  async getPageDimensions(pageNumber) {
    if (!this.isValidPage(pageNumber)) {
      return { width: this.pageWidth, height: this.pageHeight };
    }

    try {
      const pdfPage = await this.pdfDocument.getPage(pageNumber);
      const viewport = pdfPage.getViewport({ scale: 1 });
      return {
        width: viewport.width,
        height: viewport.height
      };
    } catch (error) {
      return { width: this.pageWidth, height: this.pageHeight };
    }
  }

  /**
   * Get PDF metadata
   * @returns {Object}
   */
  getMetadata() {
    return this.metadata || {};
  }

  /**
   * Cancel all pending render tasks
   */
  cancelAllRenders() {
    for (const task of this._pageRenderTasks.values()) {
      task.cancel();
    }
    this._pageRenderTasks.clear();
  }

  /**
   * Destroy the source
   */
  destroy() {
    this.cancelAllRenders();

    if (this.pdfDocument) {
      this.pdfDocument.destroy();
      this.pdfDocument = null;
    }

    this.textContent.clear();
    this.pdfjsLib = null;

    super.destroy();
  }
}

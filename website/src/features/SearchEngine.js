/**
 * SearchEngine - Text search functionality
 */

import { EventEmitter } from '../core/EventEmitter.js';

/**
 * Search engine for flipbook content
 */
export class SearchEngine extends EventEmitter {
  /**
   * Create a search engine
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.source = flipbook.source;
    this.options = options;

    this.searchOptions = options.ui?.search || {};
    this.highlightColor = this.searchOptions.highlightColor || 'rgba(255, 255, 0, 0.4)';
    this.matchCase = this.searchOptions.matchCase || false;

    this._results = [];
    this._currentIndex = -1;
    this._query = '';
    this._cache = new Map();
  }

  /**
   * Search for text
   * @param {string} query - Search query
   * @param {Object} [options] - Search options
   * @returns {Promise<Object[]>}
   */
  async search(query, options = {}) {
    if (!query || query.trim() === '') {
      this.clear();
      return [];
    }

    this._query = query;
    const searchOptions = {
      matchCase: options.matchCase ?? this.matchCase
    };

    // Check cache
    const cacheKey = `${query}-${searchOptions.matchCase}`;
    if (this._cache.has(cacheKey)) {
      this._results = this._cache.get(cacheKey);
      this.emit('searchComplete', { query, results: this._results });
      return this._results;
    }

    this.emit('searchStart', { query });

    try {
      // Use source's search if available
      if (this.source && typeof this.source.search === 'function') {
        this._results = await this.source.search(query, searchOptions);
      } else {
        this._results = [];
      }

      // Cache results
      this._cache.set(cacheKey, this._results);

      // Limit cache size
      if (this._cache.size > 50) {
        const firstKey = this._cache.keys().next().value;
        this._cache.delete(firstKey);
      }

      this._currentIndex = -1;

      this.emit('searchComplete', { query, results: this._results });

      return this._results;

    } catch (error) {
      this.emit('searchError', { query, error });
      throw error;
    }
  }

  /**
   * Get current results
   * @returns {Object[]}
   */
  getResults() {
    return [...this._results];
  }

  /**
   * Get current query
   * @returns {string}
   */
  getQuery() {
    return this._query;
  }

  /**
   * Get result count
   * @returns {number}
   */
  getResultCount() {
    return this._results.length;
  }

  /**
   * Get current result index
   * @returns {number}
   */
  getCurrentIndex() {
    return this._currentIndex;
  }

  /**
   * Go to next result
   * @returns {Object|null}
   */
  nextResult() {
    if (this._results.length === 0) return null;

    this._currentIndex++;
    if (this._currentIndex >= this._results.length) {
      this._currentIndex = 0;
    }

    const result = this._results[this._currentIndex];
    this._navigateToResult(result);
    return result;
  }

  /**
   * Go to previous result
   * @returns {Object|null}
   */
  prevResult() {
    if (this._results.length === 0) return null;

    this._currentIndex--;
    if (this._currentIndex < 0) {
      this._currentIndex = this._results.length - 1;
    }

    const result = this._results[this._currentIndex];
    this._navigateToResult(result);
    return result;
  }

  /**
   * Go to a specific result
   * @param {number} index - Result index
   * @returns {Object|null}
   */
  goToResult(index) {
    if (index < 0 || index >= this._results.length) return null;

    this._currentIndex = index;
    const result = this._results[this._currentIndex];
    this._navigateToResult(result);
    return result;
  }

  /**
   * Navigate to a result
   * @private
   */
  _navigateToResult(result) {
    if (result && result.page) {
      this.flipbook.goToPage(result.page);
      this.emit('resultSelect', {
        result,
        index: this._currentIndex,
        total: this._results.length
      });
    }
  }

  /**
   * Get results for a specific page
   * @param {number} pageNumber - Page number
   * @returns {Object[]}
   */
  getPageResults(pageNumber) {
    return this._results.filter(r => r.page === pageNumber);
  }

  /**
   * Get pages with results
   * @returns {number[]}
   */
  getPagesWithResults() {
    const pages = new Set(this._results.map(r => r.page));
    return Array.from(pages).sort((a, b) => a - b);
  }

  /**
   * Clear search
   */
  clear() {
    this._results = [];
    this._currentIndex = -1;
    this._query = '';

    this.emit('searchClear');
  }

  /**
   * Clear cache
   */
  clearCache() {
    this._cache.clear();
  }

  /**
   * Destroy search engine
   */
  destroy() {
    this.clear();
    this.clearCache();
    this.removeAllListeners();
  }
}

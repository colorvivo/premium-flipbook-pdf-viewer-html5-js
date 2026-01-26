/**
 * DeepLinking - Hash-based navigation
 */

import { EventEmitter, Events } from '../core/EventEmitter.js';

/**
 * Deep linking handler for URL hash navigation
 */
export class DeepLinking extends EventEmitter {
  /**
   * Create a deep linking handler
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.enabled = options.features?.deepLinking !== false;
    this.prefix = options.features?.hashPrefix || 'page';

    this._onHashChange = this._onHashChange.bind(this);

    if (this.enabled) {
      this._init();
    }
  }

  /**
   * Initialize deep linking
   * @private
   */
  _init() {
    // Listen for hash changes
    window.addEventListener('hashchange', this._onHashChange);

    // Listen for page changes to update hash
    this.state.on('pageChange', ({ page }) => {
      this._updateHash(page);
    });
  }

  /**
   * Handle hash change event
   * @private
   */
  _onHashChange() {
    const page = this.getPageFromHash();
    if (page && page !== this.state.get('currentPage')) {
      this.flipbook.goToPage(page);
      this.emit(Events.DEEP_LINK_CHANGE, { page, hash: window.location.hash });
    }
  }

  /**
   * Get page number from current hash
   * @returns {number|null}
   */
  getPageFromHash() {
    const hash = window.location.hash.slice(1); // Remove #

    if (!hash) return null;

    // Try prefix format: #page-5 or #page/5
    const prefixPattern = new RegExp(`^${this.prefix}[-/]?(\\d+)$`);
    const prefixMatch = hash.match(prefixPattern);
    if (prefixMatch) {
      return parseInt(prefixMatch[1], 10);
    }

    // Try simple number: #5
    const numberMatch = hash.match(/^(\d+)$/);
    if (numberMatch) {
      return parseInt(numberMatch[1], 10);
    }

    return null;
  }

  /**
   * Update URL hash
   * @private
   */
  _updateHash(page) {
    if (!this.enabled) return;

    const newHash = `#${this.prefix}-${page}`;

    // Only update if different to avoid unnecessary history entries
    if (window.location.hash !== newHash) {
      // Use replaceState to avoid polluting history
      const url = new URL(window.location.href);
      url.hash = newHash;
      window.history.replaceState(null, '', url.toString());
    }
  }

  /**
   * Set hash to specific page
   * @param {number} page - Page number
   */
  setPage(page) {
    this._updateHash(page);
  }

  /**
   * Clear hash
   */
  clearHash() {
    const url = new URL(window.location.href);
    url.hash = '';
    window.history.replaceState(null, '', url.toString());
  }

  /**
   * Get shareable URL for current page
   * @returns {string}
   */
  getShareableUrl() {
    const page = this.state.get('currentPage');
    const url = new URL(window.location.href);
    url.hash = `${this.prefix}-${page}`;
    return url.toString();
  }

  /**
   * Get shareable URL for specific page
   * @param {number} page - Page number
   * @returns {string}
   */
  getUrlForPage(page) {
    const url = new URL(window.location.href);
    url.hash = `${this.prefix}-${page}`;
    return url.toString();
  }

  /**
   * Enable deep linking
   */
  enable() {
    if (!this.enabled) {
      this.enabled = true;
      window.addEventListener('hashchange', this._onHashChange);
    }
  }

  /**
   * Disable deep linking
   */
  disable() {
    if (this.enabled) {
      this.enabled = false;
      window.removeEventListener('hashchange', this._onHashChange);
    }
  }

  /**
   * Destroy deep linking handler
   */
  destroy() {
    window.removeEventListener('hashchange', this._onHashChange);
    this.removeAllListeners();
  }
}

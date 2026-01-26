/**
 * State manager for flipbook state
 */

import { EventEmitter, Events } from './EventEmitter.js';

export class StateManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this._state = {
      // Page state
      currentPage: options.startPage || 1,
      totalPages: 0,
      displayMode: 'double', // 'single' or 'double'

      // Zoom state
      zoom: 1,
      minZoom: options.zoom?.min || 1,
      maxZoom: options.zoom?.max || 4,
      isPanning: false,
      panX: 0,
      panY: 0,

      // Animation state
      isFlipping: false,
      flipDirection: null, // 'forward' or 'backward'
      flipProgress: 0,

      // UI state
      isToolbarVisible: true,
      isThumbnailsOpen: false,
      isTocOpen: false,
      isSearchOpen: false,
      isFullscreen: false,

      // Feature state
      isAutoplayActive: false,
      isLightboxOpen: false,

      // Loading state
      isLoading: true,
      loadProgress: 0,
      loadedPages: new Set(),

      // Source state
      sourceType: null, // 'pdf', 'images', 'optimized'
      rendererType: null, // 'webgl', 'css', 'swipe'

      // Search state
      searchQuery: '',
      searchResults: [],
      currentSearchIndex: -1,

      // Error state
      error: null
    };

    this._history = [];
    this._maxHistory = 50;
  }

  /**
   * Get current state
   * @returns {Object}
   */
  get state() {
    return { ...this._state };
  }

  /**
   * Get specific state value
   * @param {string} key - State key
   * @returns {*}
   */
  get(key) {
    return this._state[key];
  }

  /**
   * Set state values
   * @param {Object} updates - State updates
   * @param {boolean} [silent=false] - Don't emit events
   */
  set(updates, silent = false) {
    const oldState = { ...this._state };
    const changedKeys = [];

    for (const key in updates) {
      if (this._state[key] !== updates[key]) {
        this._state[key] = updates[key];
        changedKeys.push(key);
      }
    }

    if (changedKeys.length > 0 && !silent) {
      // Save to history
      this._saveHistory(oldState);

      // Emit specific events based on what changed
      this._emitChangeEvents(changedKeys, oldState);

      // Emit general state change
      this.emit('stateChange', {
        changedKeys,
        oldState,
        newState: this.state
      });
    }
  }

  /**
   * Emit specific events based on changed keys
   * @private
   */
  _emitChangeEvents(changedKeys, oldState) {
    for (const key of changedKeys) {
      switch (key) {
        case 'currentPage':
          this.emit(Events.PAGE_CHANGE, {
            page: this._state.currentPage,
            previousPage: oldState.currentPage,
            totalPages: this._state.totalPages
          });
          break;

        case 'zoom':
          this.emit(Events.ZOOM_CHANGE, {
            zoom: this._state.zoom,
            previousZoom: oldState.zoom
          });
          break;

        case 'isFlipping':
          if (this._state.isFlipping) {
            this.emit(Events.FLIP_START, {
              direction: this._state.flipDirection,
              fromPage: oldState.currentPage
            });
          } else {
            this.emit(Events.FLIP_END, {
              page: this._state.currentPage
            });
          }
          break;

        case 'flipProgress':
          if (this._state.isFlipping) {
            this.emit(Events.FLIP_PROGRESS, {
              progress: this._state.flipProgress
            });
          }
          break;

        case 'isFullscreen':
          this.emit(Events.FULLSCREEN_CHANGE, {
            isFullscreen: this._state.isFullscreen
          });
          break;

        case 'isThumbnailsOpen':
          this.emit(Events.THUMBNAILS_TOGGLE, {
            isOpen: this._state.isThumbnailsOpen
          });
          break;

        case 'isTocOpen':
          this.emit(Events.TOC_TOGGLE, {
            isOpen: this._state.isTocOpen
          });
          break;

        case 'isSearchOpen':
          this.emit(Events.SEARCH_TOGGLE, {
            isOpen: this._state.isSearchOpen
          });
          break;

        case 'displayMode':
          this.emit(Events.MODE_CHANGE, {
            mode: this._state.displayMode
          });
          break;

        case 'rendererType':
          this.emit(Events.RENDERER_CHANGE, {
            renderer: this._state.rendererType
          });
          break;

        case 'isAutoplayActive':
          this.emit(
            this._state.isAutoplayActive ? Events.AUTOPLAY_START : Events.AUTOPLAY_STOP
          );
          break;

        case 'isLightboxOpen':
          this.emit(
            this._state.isLightboxOpen ? Events.LIGHTBOX_OPEN : Events.LIGHTBOX_CLOSE
          );
          break;

        case 'error':
          if (this._state.error) {
            this.emit(Events.ERROR, this._state.error);
          }
          break;
      }
    }
  }

  /**
   * Save state to history
   * @private
   */
  _saveHistory(state) {
    this._history.push(state);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  /**
   * Go to a specific page
   * @param {number} page - Page number
   * @returns {boolean} Success
   */
  goToPage(page) {
    const validPage = this.validatePage(page);
    if (validPage !== this._state.currentPage) {
      this.set({ currentPage: validPage });
      return true;
    }
    return false;
  }

  /**
   * Go to next page
   * @returns {boolean} Success
   */
  nextPage() {
    const increment = this._state.displayMode === 'double' ? 2 : 1;
    return this.goToPage(this._state.currentPage + increment);
  }

  /**
   * Go to previous page
   * @returns {boolean} Success
   */
  prevPage() {
    const decrement = this._state.displayMode === 'double' ? 2 : 1;
    return this.goToPage(this._state.currentPage - decrement);
  }

  /**
   * Go to first page
   * @returns {boolean} Success
   */
  firstPage() {
    return this.goToPage(1);
  }

  /**
   * Go to last page
   * @returns {boolean} Success
   */
  lastPage() {
    return this.goToPage(this._state.totalPages);
  }

  /**
   * Validate page number
   * @param {number} page - Page number
   * @returns {number} Valid page number
   */
  validatePage(page) {
    const p = Math.round(page);
    if (p < 1) return 1;
    if (p > this._state.totalPages) return this._state.totalPages;

    // In double page mode, ensure we're on an odd page (left page)
    if (this._state.displayMode === 'double' && p > 1) {
      return p % 2 === 0 ? p - 1 : p;
    }

    return p;
  }

  /**
   * Set zoom level
   * @param {number} zoom - Zoom level
   * @returns {boolean} Success
   */
  setZoom(zoom) {
    const validZoom = Math.max(this._state.minZoom, Math.min(this._state.maxZoom, zoom));
    if (validZoom !== this._state.zoom) {
      this.set({ zoom: validZoom });
      return true;
    }
    return false;
  }

  /**
   * Zoom in
   * @param {number} [step=0.25] - Zoom step
   * @returns {boolean} Success
   */
  zoomIn(step = 0.25) {
    return this.setZoom(this._state.zoom + step);
  }

  /**
   * Zoom out
   * @param {number} [step=0.25] - Zoom step
   * @returns {boolean} Success
   */
  zoomOut(step = 0.25) {
    return this.setZoom(this._state.zoom - step);
  }

  /**
   * Reset zoom
   * @returns {boolean} Success
   */
  resetZoom() {
    const changed = this._state.zoom !== 1 || this._state.panX !== 0 || this._state.panY !== 0;
    this.set({ zoom: 1, panX: 0, panY: 0 });
    return changed;
  }

  /**
   * Set pan position
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  setPan(x, y) {
    this.set({ panX: x, panY: y });
  }

  /**
   * Check if can go to next page
   * @returns {boolean}
   */
  canGoNext() {
    const increment = this._state.displayMode === 'double' ? 2 : 1;
    return this._state.currentPage + increment <= this._state.totalPages;
  }

  /**
   * Check if can go to previous page
   * @returns {boolean}
   */
  canGoPrev() {
    return this._state.currentPage > 1;
  }

  /**
   * Mark a page as loaded
   * @param {number} page - Page number
   */
  markPageLoaded(page) {
    this._state.loadedPages.add(page);
    this.emit(Events.PAGE_LOAD, { page });
  }

  /**
   * Check if a page is loaded
   * @param {number} page - Page number
   * @returns {boolean}
   */
  isPageLoaded(page) {
    return this._state.loadedPages.has(page);
  }

  /**
   * Get visible pages
   * @returns {number[]} Array of visible page numbers
   */
  getVisiblePages() {
    const pages = [this._state.currentPage];
    if (this._state.displayMode === 'double' && this._state.currentPage < this._state.totalPages) {
      pages.push(this._state.currentPage + 1);
    }
    return pages;
  }

  /**
   * Get pages to preload
   * @param {number} [count=2] - Number of pages to preload
   * @returns {number[]} Array of page numbers to preload
   */
  getPagesToPreload(count = 2) {
    const pages = [];
    const visible = this.getVisiblePages();
    const lastVisible = visible[visible.length - 1];

    // Preload ahead
    for (let i = 1; i <= count; i++) {
      const page = lastVisible + i;
      if (page <= this._state.totalPages && !this._state.loadedPages.has(page)) {
        pages.push(page);
      }
    }

    // Preload behind
    for (let i = 1; i <= count; i++) {
      const page = this._state.currentPage - i;
      if (page >= 1 && !this._state.loadedPages.has(page)) {
        pages.push(page);
      }
    }

    return pages;
  }

  /**
   * Reset state
   */
  reset() {
    const totalPages = this._state.totalPages;
    const sourceType = this._state.sourceType;
    const rendererType = this._state.rendererType;

    this._state = {
      currentPage: 1,
      totalPages,
      displayMode: 'double',
      zoom: 1,
      minZoom: this._state.minZoom,
      maxZoom: this._state.maxZoom,
      isPanning: false,
      panX: 0,
      panY: 0,
      isFlipping: false,
      flipDirection: null,
      flipProgress: 0,
      isToolbarVisible: true,
      isThumbnailsOpen: false,
      isTocOpen: false,
      isSearchOpen: false,
      isFullscreen: false,
      isAutoplayActive: false,
      isLightboxOpen: false,
      isLoading: false,
      loadProgress: 100,
      loadedPages: this._state.loadedPages,
      sourceType,
      rendererType,
      searchQuery: '',
      searchResults: [],
      currentSearchIndex: -1,
      error: null
    };

    this._history = [];
  }

  /**
   * Destroy state manager
   */
  destroy() {
    this._history = [];
    this._state.loadedPages.clear();
    super.destroy();
  }
}

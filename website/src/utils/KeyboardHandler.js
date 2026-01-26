/**
 * KeyboardHandler - Keyboard navigation for flipbook
 */

import { EventEmitter } from '../core/EventEmitter.js';

/**
 * Keyboard navigation handler
 */
export class KeyboardHandler extends EventEmitter {
  /**
   * Create a keyboard handler
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.enabled = options.ui?.navigation?.keyboard !== false;

    this._onKeyDown = this._onKeyDown.bind(this);

    if (this.enabled) {
      this._init();
    }
  }

  /**
   * Initialize keyboard handling
   * @private
   */
  _init() {
    document.addEventListener('keydown', this._onKeyDown);

    // Make container focusable
    if (this.flipbook.container) {
      this.flipbook.container.setAttribute('tabindex', '0');
    }
  }

  /**
   * Handle key down
   * @private
   */
  _onKeyDown(e) {
    // Only handle if flipbook is focused or no specific element is focused
    const activeElement = document.activeElement;
    const container = this.flipbook.container;

    const isInput = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );

    // Don't handle if typing in an input
    if (isInput) return;

    // Check if flipbook container is focused or is ancestor
    const isFocused = container &&
      (container === activeElement || container.contains(activeElement));

    // Allow global navigation keys, but require focus for others
    const globalKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!isFocused && !globalKeys.includes(e.key)) {
      return;
    }

    // Handle key
    const handled = this._handleKey(e.key, e);

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /**
   * Handle specific key
   * @private
   */
  _handleKey(key, event) {
    const rtl = this.options.rtl;

    switch (key) {
      // Navigation
      case 'ArrowLeft':
        if (rtl) {
          this.flipbook.nextPage();
        } else {
          this.flipbook.prevPage();
        }
        return true;

      case 'ArrowRight':
        if (rtl) {
          this.flipbook.prevPage();
        } else {
          this.flipbook.nextPage();
        }
        return true;

      case 'ArrowUp':
      case 'PageUp':
        this.flipbook.prevPage();
        return true;

      case 'ArrowDown':
      case 'PageDown':
        this.flipbook.nextPage();
        return true;

      case 'Home':
        this.flipbook.firstPage();
        return true;

      case 'End':
        this.flipbook.lastPage();
        return true;

      // Zoom
      case '+':
      case '=':
        if (event.ctrlKey || event.metaKey) {
          this.flipbook.zoomIn();
          return true;
        }
        break;

      case '-':
      case '_':
        if (event.ctrlKey || event.metaKey) {
          this.flipbook.zoomOut();
          return true;
        }
        break;

      case '0':
        if (event.ctrlKey || event.metaKey) {
          this.flipbook.resetZoom();
          return true;
        }
        break;

      // Fullscreen
      case 'f':
      case 'F':
        if (!event.ctrlKey && !event.metaKey) {
          this.flipbook.toggleFullscreen();
          return true;
        }
        break;

      // Escape
      case 'Escape':
        // Exit fullscreen or close panels
        if (this.state.get('isFullscreen')) {
          this.flipbook.toggleFullscreen();
          return true;
        }
        if (this.state.get('isLightboxOpen')) {
          this.flipbook.closeLightbox();
          return true;
        }
        if (this.state.get('isThumbnailsOpen')) {
          this.flipbook.toggleThumbnails(false);
          return true;
        }
        if (this.state.get('isTocOpen')) {
          this.flipbook.toggleTOC(false);
          return true;
        }
        if (this.state.get('isSearchOpen')) {
          this.flipbook.toggleSearch(false);
          return true;
        }
        break;

      // Search
      case 'f':
        if (event.ctrlKey || event.metaKey) {
          this.flipbook.toggleSearch();
          return true;
        }
        break;

      // Go to page (g)
      case 'g':
      case 'G':
        if (!event.ctrlKey && !event.metaKey) {
          // Focus page input
          const pageInput = this.flipbook.container?.querySelector('.pfb-page-input__field');
          if (pageInput) {
            pageInput.focus();
            pageInput.select();
            return true;
          }
        }
        break;

      // Thumbnails
      case 't':
      case 'T':
        if (!event.ctrlKey && !event.metaKey) {
          this.flipbook.toggleThumbnails();
          return true;
        }
        break;

      // Table of contents
      case 'o':
      case 'O':
        if (!event.ctrlKey && !event.metaKey) {
          this.flipbook.toggleTOC();
          return true;
        }
        break;

      // Space for autoplay toggle
      case ' ':
        if (this.options.features?.autoplay?.enabled) {
          this.flipbook.toggleAutoplay();
          return true;
        }
        break;
    }

    return false;
  }

  /**
   * Enable keyboard handling
   */
  enable() {
    if (!this.enabled) {
      this.enabled = true;
      document.addEventListener('keydown', this._onKeyDown);
    }
  }

  /**
   * Disable keyboard handling
   */
  disable() {
    if (this.enabled) {
      this.enabled = false;
      document.removeEventListener('keydown', this._onKeyDown);
    }
  }

  /**
   * Get keyboard shortcuts
   * @returns {Object[]}
   */
  getShortcuts() {
    return [
      { key: 'Arrow Left/Right', description: 'Previous/Next page' },
      { key: 'Home/End', description: 'First/Last page' },
      { key: 'Page Up/Down', description: 'Previous/Next page' },
      { key: 'Ctrl + +/-', description: 'Zoom in/out' },
      { key: 'Ctrl + 0', description: 'Reset zoom' },
      { key: 'F', description: 'Toggle fullscreen' },
      { key: 'T', description: 'Toggle thumbnails' },
      { key: 'O', description: 'Toggle table of contents' },
      { key: 'G', description: 'Go to page' },
      { key: 'Ctrl + F', description: 'Search' },
      { key: 'Space', description: 'Toggle autoplay' },
      { key: 'Escape', description: 'Close panel/Exit fullscreen' }
    ];
  }

  /**
   * Destroy keyboard handler
   */
  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    this.removeAllListeners();
  }
}

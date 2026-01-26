/**
 * UIManager - Manages all UI components
 */

import { EventEmitter, Events } from '../core/EventEmitter.js';
import { Toolbar } from './Toolbar.js';
import { ThumbnailPanel } from './ThumbnailPanel.js';
import { TOCPanel } from './TOCPanel.js';
import { SearchPanel } from './SearchPanel.js';
import { createElement } from '../utils/dom.js';
import { createIconElement } from './icons.js';

/**
 * UI manager for flipbook
 */
export class UIManager extends EventEmitter {
  /**
   * Create a UI manager
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Configuration options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.container = null;

    // UI components
    this.toolbar = null;
    this.thumbnailPanel = null;
    this.tocPanel = null;
    this.searchPanel = null;

    // Navigation arrows
    this.prevArrow = null;
    this.nextArrow = null;

    // Loading overlay
    this.loadingOverlay = null;
  }

  /**
   * Initialize UI
   * @param {HTMLElement} container - Container element
   */
  init(container) {
    this.container = container;

    // Create UI container
    const uiContainer = createElement('div', {
      className: 'pfb-ui'
    });
    container.appendChild(uiContainer);

    // Initialize toolbar
    if (this.options.ui?.toolbar?.enabled !== false) {
      this.toolbar = new Toolbar(this.flipbook, this.options);
      this.toolbar.init(uiContainer);
    }

    // Initialize thumbnail panel
    if (this.options.ui?.thumbnails?.enabled !== false) {
      this.thumbnailPanel = new ThumbnailPanel(this.flipbook, this.options);
      this.thumbnailPanel.init(uiContainer);
    }

    // Initialize TOC panel
    if (this.options.ui?.toc?.enabled !== false) {
      this.tocPanel = new TOCPanel(this.flipbook, this.options);
      this.tocPanel.init(uiContainer);
    }

    // Initialize search panel
    if (this.options.ui?.search?.enabled !== false && this.flipbook.source?.searchable) {
      this.searchPanel = new SearchPanel(this.flipbook, this.options);
      this.searchPanel.init(uiContainer);
    }

    // Initialize navigation arrows
    if (this.options.ui?.navigation?.arrows !== false) {
      this._createNavigationArrows(uiContainer);
    }

    // Initialize loading overlay
    this._createLoadingOverlay(uiContainer);

    // Bind events
    this._bindEvents();
  }

  /**
   * Create navigation arrows
   * @private
   */
  _createNavigationArrows(container) {
    const navOptions = this.options.ui?.navigation || {};
    const i18n = this.options.i18n?.strings || {};

    // Previous arrow
    this.prevArrow = createElement('button', {
      className: 'pfb-nav-arrow pfb-nav-arrow--prev',
      type: 'button',
      'aria-label': i18n.previousPage || 'Previous page',
      onClick: () => this.flipbook.prevPage()
    });
    this.prevArrow.appendChild(createIconElement('chevronLeft'));

    // Next arrow
    this.nextArrow = createElement('button', {
      className: 'pfb-nav-arrow pfb-nav-arrow--next',
      type: 'button',
      'aria-label': i18n.nextPage || 'Next page',
      onClick: () => this.flipbook.nextPage()
    });
    this.nextArrow.appendChild(createIconElement('chevronRight'));

    container.appendChild(this.prevArrow);
    container.appendChild(this.nextArrow);

    // Auto-hide arrows
    if (navOptions.arrowsAutoHide !== false) {
      let hideTimer;

      const showArrows = () => {
        this.prevArrow.classList.remove('pfb-nav-arrow--hidden');
        this.nextArrow.classList.remove('pfb-nav-arrow--hidden');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideArrows, 3000);
      };

      const hideArrows = () => {
        this.prevArrow.classList.add('pfb-nav-arrow--hidden');
        this.nextArrow.classList.add('pfb-nav-arrow--hidden');
      };

      this.container.addEventListener('mousemove', showArrows);
      this.container.addEventListener('touchstart', showArrows);

      // Initial state
      hideTimer = setTimeout(hideArrows, 3000);
    }

    // Click to flip zones
    if (navOptions.clickToFlip !== false) {
      this._setupClickToFlip();
    }
  }

  /**
   * Set up click-to-flip zones
   * @private
   */
  _setupClickToFlip() {
    const clickZones = createElement('div', {
      className: 'pfb-click-zones'
    });

    const leftZone = createElement('div', {
      className: 'pfb-click-zone pfb-click-zone--left',
      onClick: () => this.flipbook.prevPage()
    });

    const rightZone = createElement('div', {
      className: 'pfb-click-zone pfb-click-zone--right',
      onClick: () => this.flipbook.nextPage()
    });

    clickZones.appendChild(leftZone);
    clickZones.appendChild(rightZone);

    // Insert before UI elements
    this.flipbook.wrapper.appendChild(clickZones);
  }

  /**
   * Create loading overlay
   * @private
   */
  _createLoadingOverlay(container) {
    const i18n = this.options.i18n?.strings || {};

    this.loadingOverlay = createElement('div', {
      className: 'pfb-loading'
    });

    const spinner = createIconElement('loading', 'pfb-loading__spinner');

    const text = createElement('span', {
      className: 'pfb-loading__text'
    }, i18n.loading || 'Loading...');

    this.loadingOverlay.appendChild(spinner);
    this.loadingOverlay.appendChild(text);

    container.appendChild(this.loadingOverlay);
  }

  /**
   * Bind event listeners
   * @private
   */
  _bindEvents() {
    // State changes
    this.state.on('stateChange', ({ changedKeys }) => {
      if (changedKeys.includes('isLoading')) {
        this._updateLoadingState();
      }

      if (changedKeys.includes('currentPage')) {
        this._updateNavigationState();
      }
    });

    // Forward panel events
    if (this.thumbnailPanel) {
      this.thumbnailPanel.on('pageSelect', (data) => this.emit('pageSelect', data));
    }

    if (this.tocPanel) {
      this.tocPanel.on('pageSelect', (data) => this.emit('pageSelect', data));
    }

    if (this.searchPanel) {
      this.searchPanel.on('resultSelect', (data) => this.emit('searchResultSelect', data));
    }

    if (this.toolbar) {
      this.toolbar.on('buttonClick', (data) => this.emit('toolbarButtonClick', data));
    }
  }

  /**
   * Update loading state
   * @private
   */
  _updateLoadingState() {
    const isLoading = this.state.get('isLoading');

    if (this.loadingOverlay) {
      this.loadingOverlay.classList.toggle('pfb-loading--visible', isLoading);
    }
  }

  /**
   * Update navigation arrows state
   * @private
   */
  _updateNavigationState() {
    const currentPage = this.state.get('currentPage');
    const totalPages = this.state.get('totalPages');

    if (this.prevArrow) {
      this.prevArrow.disabled = currentPage <= 1;
      this.prevArrow.classList.toggle('pfb-nav-arrow--disabled', currentPage <= 1);
    }

    if (this.nextArrow) {
      this.nextArrow.disabled = currentPage >= totalPages;
      this.nextArrow.classList.toggle('pfb-nav-arrow--disabled', currentPage >= totalPages);
    }
  }

  /**
   * Toggle thumbnails panel
   * @param {boolean} [show] - Force show/hide
   */
  toggleThumbnails(show) {
    // Close other panels
    if (show !== false) {
      if (this.tocPanel?.isOpen()) this.tocPanel.close();
      if (this.searchPanel?.isOpen()) this.searchPanel.close();
    }

    if (this.thumbnailPanel) {
      this.thumbnailPanel.toggle(show);
    }
  }

  /**
   * Toggle TOC panel
   * @param {boolean} [show] - Force show/hide
   */
  toggleTOC(show) {
    // Close other panels
    if (show !== false) {
      if (this.thumbnailPanel?.isOpen()) this.thumbnailPanel.close();
      if (this.searchPanel?.isOpen()) this.searchPanel.close();
    }

    if (this.tocPanel) {
      this.tocPanel.toggle(show);
    }
  }

  /**
   * Toggle search panel
   * @param {boolean} [show] - Force show/hide
   */
  toggleSearch(show) {
    // Close other panels
    if (show !== false) {
      if (this.thumbnailPanel?.isOpen()) this.thumbnailPanel.close();
      if (this.tocPanel?.isOpen()) this.tocPanel.close();
    }

    if (this.searchPanel) {
      this.searchPanel.toggle(show);
    }
  }

  /**
   * Close all panels
   */
  closeAllPanels() {
    if (this.thumbnailPanel?.isOpen()) this.thumbnailPanel.close();
    if (this.tocPanel?.isOpen()) this.tocPanel.close();
    if (this.searchPanel?.isOpen()) this.searchPanel.close();
  }

  /**
   * Show loading
   * @param {string} [message] - Loading message
   */
  showLoading(message) {
    if (this.loadingOverlay) {
      if (message) {
        const textEl = this.loadingOverlay.querySelector('.pfb-loading__text');
        if (textEl) textEl.textContent = message;
      }
      this.loadingOverlay.classList.add('pfb-loading--visible');
    }
  }

  /**
   * Hide loading
   */
  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove('pfb-loading--visible');
    }
  }

  /**
   * Show a notification
   * @param {string} message - Message
   * @param {string} [type='info'] - Type ('info', 'success', 'error')
   * @param {number} [duration=3000] - Duration in ms
   */
  showNotification(message, type = 'info', duration = 3000) {
    const notification = createElement('div', {
      className: `pfb-notification pfb-notification--${type}`
    }, message);

    this.container.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add('pfb-notification--visible');
    });

    // Remove after duration
    setTimeout(() => {
      notification.classList.remove('pfb-notification--visible');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  /**
   * Destroy UI
   */
  destroy() {
    if (this.toolbar) {
      this.toolbar.destroy();
      this.toolbar = null;
    }

    if (this.thumbnailPanel) {
      this.thumbnailPanel.destroy();
      this.thumbnailPanel = null;
    }

    if (this.tocPanel) {
      this.tocPanel.destroy();
      this.tocPanel = null;
    }

    if (this.searchPanel) {
      this.searchPanel.destroy();
      this.searchPanel = null;
    }

    this.prevArrow = null;
    this.nextArrow = null;
    this.loadingOverlay = null;
    this.container = null;

    this.removeAllListeners();
  }
}

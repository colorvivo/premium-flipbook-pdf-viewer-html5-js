/**
 * Toolbar - Configurable toolbar component
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { createElement } from '../utils/dom.js';
import { icons, createIconElement } from './icons.js';
import { PageInput } from './PageInput.js';

/**
 * Toolbar component
 */
export class Toolbar extends EventEmitter {
  /**
   * Create a toolbar
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Toolbar options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.toolbarOptions = options.ui?.toolbar || {};
    this.i18n = options.i18n?.strings || {};

    this.element = null;
    this.buttons = new Map();
    this.pageInput = null;

    // Auto-hide timer
    this._hideTimer = null;
  }

  /**
   * Initialize and render the toolbar
   * @param {HTMLElement} container - Container element
   */
  init(container) {
    this.element = createElement('div', {
      className: 'pfb-toolbar',
      role: 'toolbar',
      'aria-label': 'FlipBook controls'
    });

    // Position class
    const position = this.toolbarOptions.position || 'bottom';
    this.element.classList.add(`pfb-toolbar--${position}`);

    // Create buttons container
    const buttonsContainer = createElement('div', {
      className: 'pfb-toolbar__buttons'
    });

    // Add configured buttons
    const buttonConfig = this.toolbarOptions.buttons || [
      'first', 'prev', 'pageInput', 'next', 'last',
      'separator',
      'zoomOut', 'zoomIn',
      'separator',
      'thumbnails', 'toc', 'search',
      'separator',
      'fullscreen', 'download'
    ];

    buttonConfig.forEach(button => {
      if (button === 'separator') {
        buttonsContainer.appendChild(this._createSeparator());
      } else if (button === 'pageInput') {
        this.pageInput = new PageInput(this.flipbook, this.options);
        buttonsContainer.appendChild(this.pageInput.render());
      } else {
        const btn = this._createButton(button);
        if (btn) {
          buttonsContainer.appendChild(btn);
          this.buttons.set(button, btn);
        }
      }
    });

    this.element.appendChild(buttonsContainer);
    container.appendChild(this.element);

    // Set up auto-hide
    if (this.toolbarOptions.autoHide) {
      this._setupAutoHide();
    }

    // Listen for state changes
    this._bindStateEvents();

    // Initial state update
    this._updateButtonStates();
  }

  /**
   * Create a toolbar button
   * @private
   */
  _createButton(type) {
    const config = this._getButtonConfig(type);
    if (!config) return null;

    // Check if feature is enabled
    if (config.featureCheck && !config.featureCheck()) {
      return null;
    }

    const button = createElement('button', {
      className: `pfb-toolbar__button pfb-toolbar__button--${type}`,
      type: 'button',
      title: config.title,
      'aria-label': config.title,
      dataset: { action: type },
      onClick: (e) => this._handleButtonClick(type, e)
    });

    // Add icon
    const icon = createIconElement(config.icon);
    button.appendChild(icon);

    return button;
  }

  /**
   * Get button configuration
   * @private
   */
  _getButtonConfig(type) {
    const configs = {
      first: {
        icon: 'first',
        title: this.i18n.firstPage || 'First page',
        action: () => this.flipbook.firstPage()
      },
      prev: {
        icon: 'prev',
        title: this.i18n.previousPage || 'Previous page',
        action: () => this.flipbook.prevPage()
      },
      next: {
        icon: 'next',
        title: this.i18n.nextPage || 'Next page',
        action: () => this.flipbook.nextPage()
      },
      last: {
        icon: 'last',
        title: this.i18n.lastPage || 'Last page',
        action: () => this.flipbook.lastPage()
      },
      zoomIn: {
        icon: 'zoomIn',
        title: this.i18n.zoomIn || 'Zoom in',
        action: () => this.flipbook.zoomIn(),
        featureCheck: () => this.options.zoom?.enabled
      },
      zoomOut: {
        icon: 'zoomOut',
        title: this.i18n.zoomOut || 'Zoom out',
        action: () => this.flipbook.zoomOut(),
        featureCheck: () => this.options.zoom?.enabled
      },
      thumbnails: {
        icon: 'thumbnails',
        title: this.i18n.thumbnails || 'Thumbnails',
        action: () => this.flipbook.toggleThumbnails(),
        toggle: true,
        featureCheck: () => this.options.ui?.thumbnails?.enabled
      },
      toc: {
        icon: 'toc',
        title: this.i18n.tableOfContents || 'Table of contents',
        action: () => this.flipbook.toggleTOC(),
        toggle: true,
        featureCheck: () => this.options.ui?.toc?.enabled
      },
      search: {
        icon: 'search',
        title: this.i18n.search || 'Search',
        action: () => this.flipbook.toggleSearch(),
        toggle: true,
        featureCheck: () => this.options.ui?.search?.enabled
      },
      fullscreen: {
        icon: 'fullscreen',
        title: this.i18n.fullscreen || 'Fullscreen',
        action: () => this.flipbook.toggleFullscreen(),
        featureCheck: () => this.options.features?.fullscreen
      },
      download: {
        icon: 'download',
        title: this.i18n.download || 'Download',
        action: () => this._handleDownload(),
        featureCheck: () => this.options.features?.download
      },
      print: {
        icon: 'print',
        title: this.i18n.print || 'Print',
        action: () => window.print(),
        featureCheck: () => this.options.features?.print
      },
      share: {
        icon: 'share',
        title: this.i18n.share || 'Share',
        action: () => this._handleShare(),
        featureCheck: () => this.options.features?.share
      },
      autoplay: {
        icon: 'play',
        title: 'Autoplay',
        action: () => this.flipbook.toggleAutoplay(),
        toggle: true,
        featureCheck: () => this.options.features?.autoplay?.enabled
      }
    };

    return configs[type];
  }

  /**
   * Create separator element
   * @private
   */
  _createSeparator() {
    return createElement('div', { className: 'pfb-toolbar__separator' });
  }

  /**
   * Handle button click
   * @private
   */
  _handleButtonClick(type, event) {
    const config = this._getButtonConfig(type);
    if (config && config.action) {
      config.action();
    }
    this.emit('buttonClick', { type, event });
  }

  /**
   * Handle download
   * @private
   */
  _handleDownload() {
    const url = this.options.features?.downloadUrl || this.options.pdfUrl;
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.click();
    }
  }

  /**
   * Handle share
   * @private
   */
  async _handleShare() {
    const url = window.location.href;
    const title = document.title;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (e) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        this.emit('share', { copied: true, url });
      } catch (e) {
        this.emit('share', { copied: false, url });
      }
    }
  }

  /**
   * Set up auto-hide behavior
   * @private
   */
  _setupAutoHide() {
    const delay = this.toolbarOptions.autoHideDelay || 3000;

    const showToolbar = () => {
      this.show();
      clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => this.hide(), delay);
    };

    const container = this.flipbook.container;
    container.addEventListener('mousemove', showToolbar);
    container.addEventListener('touchstart', showToolbar);

    // Initial hide after delay
    this._hideTimer = setTimeout(() => this.hide(), delay);
  }

  /**
   * Bind state event listeners
   * @private
   */
  _bindStateEvents() {
    this.state.on('stateChange', () => this._updateButtonStates());
  }

  /**
   * Update button states based on current state
   * @private
   */
  _updateButtonStates() {
    const currentPage = this.state.get('currentPage');
    const totalPages = this.state.get('totalPages');
    const zoom = this.state.get('zoom');
    const minZoom = this.state.get('minZoom');
    const maxZoom = this.state.get('maxZoom');
    const isFullscreen = this.state.get('isFullscreen');
    const isThumbnailsOpen = this.state.get('isThumbnailsOpen');
    const isTocOpen = this.state.get('isTocOpen');
    const isSearchOpen = this.state.get('isSearchOpen');
    const isAutoplayActive = this.state.get('isAutoplayActive');

    // Navigation buttons - use state methods that account for display mode
    const canGoPrev = this.state.canGoPrev();
    const canGoNext = this.state.canGoNext();
    this._setButtonDisabled('first', currentPage <= 1);
    this._setButtonDisabled('prev', !canGoPrev);
    this._setButtonDisabled('next', !canGoNext);
    this._setButtonDisabled('last', !canGoNext);

    // Zoom buttons
    this._setButtonDisabled('zoomIn', zoom >= maxZoom);
    this._setButtonDisabled('zoomOut', zoom <= minZoom);

    // Toggle buttons
    this._setButtonActive('thumbnails', isThumbnailsOpen);
    this._setButtonActive('toc', isTocOpen);
    this._setButtonActive('search', isSearchOpen);
    this._setButtonActive('autoplay', isAutoplayActive);

    // Fullscreen icon swap
    const fullscreenBtn = this.buttons.get('fullscreen');
    if (fullscreenBtn) {
      const icon = isFullscreen ? 'exitFullscreen' : 'fullscreen';
      const title = isFullscreen
        ? (this.i18n.exitFullscreen || 'Exit fullscreen')
        : (this.i18n.fullscreen || 'Fullscreen');

      fullscreenBtn.innerHTML = '';
      fullscreenBtn.appendChild(createIconElement(icon));
      fullscreenBtn.title = title;
      fullscreenBtn.setAttribute('aria-label', title);
    }

    // Autoplay icon swap
    const autoplayBtn = this.buttons.get('autoplay');
    if (autoplayBtn) {
      const icon = isAutoplayActive ? 'pause' : 'play';
      autoplayBtn.innerHTML = '';
      autoplayBtn.appendChild(createIconElement(icon));
    }

    // Update page input
    if (this.pageInput) {
      this.pageInput.update();
    }
  }

  /**
   * Set button disabled state
   * @private
   */
  _setButtonDisabled(type, disabled) {
    const button = this.buttons.get(type);
    if (button) {
      button.disabled = disabled;
      button.classList.toggle('pfb-toolbar__button--disabled', disabled);
    }
  }

  /**
   * Set button active state
   * @private
   */
  _setButtonActive(type, active) {
    const button = this.buttons.get(type);
    if (button) {
      button.classList.toggle('pfb-toolbar__button--active', active);
      button.setAttribute('aria-pressed', active);
    }
  }

  /**
   * Show toolbar
   */
  show() {
    if (this.element) {
      this.element.classList.remove('pfb-toolbar--hidden');
    }
    this.state.set({ isToolbarVisible: true });
  }

  /**
   * Hide toolbar
   */
  hide() {
    if (this.element) {
      this.element.classList.add('pfb-toolbar--hidden');
    }
    this.state.set({ isToolbarVisible: false });
  }

  /**
   * Toggle toolbar visibility
   */
  toggle() {
    if (this.element?.classList.contains('pfb-toolbar--hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Destroy toolbar
   */
  destroy() {
    clearTimeout(this._hideTimer);

    if (this.pageInput) {
      this.pageInput.destroy();
    }

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.buttons.clear();
    this.element = null;

    this.removeAllListeners();
  }
}

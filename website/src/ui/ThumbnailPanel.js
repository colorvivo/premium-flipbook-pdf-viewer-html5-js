/**
 * ThumbnailPanel - Thumbnail navigation panel
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { createElement, setStyles } from '../utils/dom.js';
import { createIconElement } from './icons.js';

/**
 * Thumbnail panel component
 */
export class ThumbnailPanel extends EventEmitter {
  /**
   * Create a thumbnail panel
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.source = flipbook.source;
    this.options = options;

    this.thumbnailOptions = options.ui?.thumbnails || {};
    this.i18n = options.i18n?.strings || {};

    this.element = null;
    this.listElement = null;
    this.thumbnails = [];
    this.observer = null;

    this._isOpen = false;
  }

  /**
   * Initialize the panel
   * @param {HTMLElement} container - Container element
   */
  init(container) {
    const position = this.thumbnailOptions.position || 'left';
    const width = this.thumbnailOptions.width || 200;

    // Create panel element
    this.element = createElement('div', {
      className: `pfb-thumbnails pfb-thumbnails--${position}`,
      'aria-label': this.i18n.thumbnails || 'Thumbnails',
      role: 'navigation'
    });

    setStyles(this.element, {
      '--pfb-thumbnails-width': `${width}px`
    });

    // Header
    const header = createElement('div', {
      className: 'pfb-thumbnails__header'
    });

    const title = createElement('span', {
      className: 'pfb-thumbnails__title'
    }, this.i18n.thumbnails || 'Thumbnails');

    const closeBtn = createElement('button', {
      className: 'pfb-thumbnails__close',
      type: 'button',
      'aria-label': this.i18n.close || 'Close',
      onClick: () => this.close()
    });
    closeBtn.appendChild(createIconElement('close'));

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Thumbnail list
    this.listElement = createElement('div', {
      className: 'pfb-thumbnails__list',
      role: 'listbox'
    });

    this.element.appendChild(header);
    this.element.appendChild(this.listElement);
    container.appendChild(this.element);

    // Create thumbnail placeholders
    this._createThumbnails();

    // Set up intersection observer for lazy loading
    if (this.thumbnailOptions.lazyLoad !== false) {
      this._setupLazyLoading();
    }

    // Listen for state changes
    this._bindStateEvents();
  }

  /**
   * Create thumbnail elements
   * @private
   */
  _createThumbnails() {
    const totalPages = this.state.get('totalPages');

    for (let i = 1; i <= totalPages; i++) {
      const thumb = this._createThumbnailElement(i);
      this.listElement.appendChild(thumb);
      this.thumbnails.push(thumb);
    }
  }

  /**
   * Create a single thumbnail element
   * @private
   */
  _createThumbnailElement(pageNumber) {
    const thumb = createElement('div', {
      className: 'pfb-thumbnail',
      role: 'option',
      tabindex: '0',
      'aria-label': `Page ${pageNumber}`,
      dataset: { page: pageNumber },
      onClick: () => this._onThumbnailClick(pageNumber),
      onKeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._onThumbnailClick(pageNumber);
        }
      }
    });

    // Image container
    const imgContainer = createElement('div', {
      className: 'pfb-thumbnail__image'
    });

    // Loading placeholder
    const placeholder = createElement('div', {
      className: 'pfb-thumbnail__placeholder'
    });
    placeholder.appendChild(createIconElement('loading', 'pfb-thumbnail__loading'));

    imgContainer.appendChild(placeholder);

    // Page number
    const label = createElement('span', {
      className: 'pfb-thumbnail__label'
    }, String(pageNumber));

    thumb.appendChild(imgContainer);
    thumb.appendChild(label);

    return thumb;
  }

  /**
   * Set up lazy loading with Intersection Observer
   * @private
   */
  _setupLazyLoading() {
    const options = {
      root: this.listElement,
      rootMargin: '100px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pageNumber = parseInt(entry.target.dataset.page, 10);
          this._loadThumbnail(pageNumber);
          this.observer.unobserve(entry.target);
        }
      });
    }, options);

    // Observe all thumbnails
    this.thumbnails.forEach(thumb => {
      this.observer.observe(thumb);
    });
  }

  /**
   * Load a thumbnail image
   * @private
   */
  async _loadThumbnail(pageNumber) {
    const thumb = this.thumbnails[pageNumber - 1];
    if (!thumb || thumb.dataset.loaded === 'true') return;

    const imgContainer = thumb.querySelector('.pfb-thumbnail__image');

    try {
      const thumbImage = await this.source.getThumbnail(pageNumber);

      // Remove placeholder
      imgContainer.innerHTML = '';

      // Add image
      if (thumbImage instanceof HTMLCanvasElement) {
        const img = new Image();
        img.src = thumbImage.toDataURL();
        img.className = 'pfb-thumbnail__img';
        img.alt = `Page ${pageNumber}`;
        imgContainer.appendChild(img);
      } else if (thumbImage instanceof HTMLImageElement) {
        const img = thumbImage.cloneNode();
        img.className = 'pfb-thumbnail__img';
        img.alt = `Page ${pageNumber}`;
        imgContainer.appendChild(img);
      }

      thumb.dataset.loaded = 'true';

    } catch (error) {
      imgContainer.innerHTML = '<div class="pfb-thumbnail__error">Error</div>';
    }
  }

  /**
   * Handle thumbnail click
   * @private
   */
  _onThumbnailClick(pageNumber) {
    this.flipbook.goToPage(pageNumber);
    this.emit('pageSelect', { page: pageNumber });

    // Close panel on mobile
    if (window.innerWidth < 768) {
      this.close();
    }
  }

  /**
   * Bind state events
   * @private
   */
  _bindStateEvents() {
    this.state.on('pageChange', ({ page }) => {
      this._updateActiveThumbnail(page);
      this._scrollToThumbnail(page);
    });

    this.state.on('thumbnailsToggle', ({ isOpen }) => {
      this._isOpen = isOpen;
      this.element.classList.toggle('pfb-thumbnails--open', isOpen);
    });
  }

  /**
   * Update active thumbnail highlight
   * @private
   */
  _updateActiveThumbnail(pageNumber) {
    this.thumbnails.forEach((thumb, index) => {
      const isActive = (index + 1) === pageNumber;
      thumb.classList.toggle('pfb-thumbnail--active', isActive);
      thumb.setAttribute('aria-selected', isActive);
    });
  }

  /**
   * Scroll to show active thumbnail
   * @private
   */
  _scrollToThumbnail(pageNumber) {
    const thumb = this.thumbnails[pageNumber - 1];
    if (thumb && this._isOpen) {
      thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Open the panel
   */
  open() {
    this._isOpen = true;
    this.state.set({ isThumbnailsOpen: true });

    // Preload visible thumbnails
    const preloadCount = this.thumbnailOptions.preloadCount || 5;
    const currentPage = this.state.get('currentPage');

    for (let i = currentPage - preloadCount; i <= currentPage + preloadCount; i++) {
      if (i >= 1 && i <= this.state.get('totalPages')) {
        this._loadThumbnail(i);
      }
    }

    // Scroll to current page
    this._updateActiveThumbnail(currentPage);
    this._scrollToThumbnail(currentPage);
  }

  /**
   * Close the panel
   */
  close() {
    this._isOpen = false;
    this.state.set({ isThumbnailsOpen: false });
  }

  /**
   * Toggle the panel
   * @param {boolean} [show] - Force show/hide
   */
  toggle(show) {
    if (show === undefined) {
      show = !this._isOpen;
    }

    if (show) {
      this.open();
    } else {
      this.close();
    }
  }

  /**
   * Check if panel is open
   * @returns {boolean}
   */
  isOpen() {
    return this._isOpen;
  }

  /**
   * Destroy the panel
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.thumbnails = [];
    this.element = null;
    this.listElement = null;

    this.removeAllListeners();
  }
}

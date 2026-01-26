/**
 * Lightbox - Modal display mode
 */

import { EventEmitter, Events } from '../core/EventEmitter.js';
import { createElement, $ } from '../utils/dom.js';
import { createIconElement } from '../ui/icons.js';

/**
 * Lightbox handler for modal display
 */
export class Lightbox extends EventEmitter {
  /**
   * Create a lightbox handler
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.enabled = options.features?.lightbox !== false;
    this.triggerSelector = options.features?.lightboxTrigger;

    this.element = null;
    this.isOpen = false;
    this._originalParent = null;
    this._originalStyles = null;

    this._onKeyDown = this._onKeyDown.bind(this);

    if (this.enabled) {
      this._init();
    }
  }

  /**
   * Initialize lightbox
   * @private
   */
  _init() {
    // Create lightbox element
    this._createLightbox();

    // Set up trigger if provided
    if (this.triggerSelector) {
      this._setupTrigger();
    }
  }

  /**
   * Create lightbox DOM
   * @private
   */
  _createLightbox() {
    const i18n = this.options.i18n?.strings || {};

    this.element = createElement('div', {
      className: 'pfb-lightbox',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'FlipBook viewer'
    });

    // Close button
    const closeBtn = createElement('button', {
      className: 'pfb-lightbox__close',
      type: 'button',
      'aria-label': i18n.close || 'Close',
      onClick: () => this.close()
    });
    closeBtn.appendChild(createIconElement('close'));

    // Content container
    const content = createElement('div', {
      className: 'pfb-lightbox__content'
    });

    this.element.appendChild(closeBtn);
    this.element.appendChild(content);

    // Add to body but hidden
    document.body.appendChild(this.element);

    // Close on backdrop click
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });
  }

  /**
   * Set up trigger element
   * @private
   */
  _setupTrigger() {
    const triggers = document.querySelectorAll(this.triggerSelector);

    triggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();

        // Get page from data attribute if available
        const page = trigger.dataset.page
          ? parseInt(trigger.dataset.page, 10)
          : null;

        this.open(page);
      });
    });
  }

  /**
   * Open lightbox
   * @param {number} [page] - Page to show
   */
  open(page) {
    if (this.isOpen) return;

    const container = this.flipbook.container;
    const lightboxContent = this.element.querySelector('.pfb-lightbox__content');

    // Store original position
    this._originalParent = container.parentElement;
    this._originalStyles = {
      position: container.style.position,
      top: container.style.top,
      left: container.style.left,
      width: container.style.width,
      height: container.style.height
    };

    // Move container to lightbox
    lightboxContent.appendChild(container);

    // Update container styles
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';

    // Show lightbox
    this.element.classList.add('pfb-lightbox--open');
    this.isOpen = true;

    // Add keyboard listener
    document.addEventListener('keydown', this._onKeyDown);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Navigate to page if specified
    if (page) {
      this.flipbook.goToPage(page);
    }

    // Resize renderer
    if (this.flipbook.renderer) {
      setTimeout(() => {
        this.flipbook.renderer.resize();
      }, 100);
    }

    this.state.set({ isLightboxOpen: true });
    this.emit(Events.LIGHTBOX_OPEN);
  }

  /**
   * Close lightbox
   */
  close() {
    if (!this.isOpen) return;

    const container = this.flipbook.container;

    // Move container back
    if (this._originalParent) {
      this._originalParent.appendChild(container);

      // Restore original styles
      Object.assign(container.style, this._originalStyles);
    }

    // Hide lightbox
    this.element.classList.remove('pfb-lightbox--open');
    this.isOpen = false;

    // Remove keyboard listener
    document.removeEventListener('keydown', this._onKeyDown);

    // Restore body scroll
    document.body.style.overflow = '';

    // Resize renderer
    if (this.flipbook.renderer) {
      setTimeout(() => {
        this.flipbook.renderer.resize();
      }, 100);
    }

    this.state.set({ isLightboxOpen: false });
    this.emit(Events.LIGHTBOX_CLOSE);
  }

  /**
   * Toggle lightbox
   * @param {number} [page] - Page to show when opening
   */
  toggle(page) {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(page);
    }
  }

  /**
   * Handle keyboard events
   * @private
   */
  _onKeyDown(e) {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  /**
   * Check if lightbox is open
   * @returns {boolean}
   */
  isOpened() {
    return this.isOpen;
  }

  /**
   * Destroy lightbox
   */
  destroy() {
    if (this.isOpen) {
      this.close();
    }

    document.removeEventListener('keydown', this._onKeyDown);

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.removeAllListeners();
  }
}

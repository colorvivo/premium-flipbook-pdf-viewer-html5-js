/**
 * SwipeRenderer - Horizontal swipe renderer for mobile devices
 */

import { BaseRenderer, RendererType } from '../BaseRenderer.js';
import { createElement, setStyles } from '../../utils/dom.js';

/**
 * Swipe-based renderer optimized for touch devices
 */
export class SwipeRenderer extends BaseRenderer {
  constructor(flipbook, options) {
    super(flipbook, options);

    this.type = RendererType.SWIPE;

    // Swipe specific options
    this.swipeOptions = options.swipe || {};
    this.threshold = this.swipeOptions.threshold || 50;
    this.velocity = this.swipeOptions.velocity || 0.3;
    this.resistance = this.swipeOptions.resistance || 0.8;
    this.animationDuration = this.swipeOptions.animationDuration || 300;

    // DOM elements
    this.trackEl = null;
    this.pages = [];

    // Touch state
    this._startX = 0;
    this._startY = 0;
    this._currentX = 0;
    this._isDragging = false;
    this._startTime = 0;

    // Bound handlers
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  /**
   * Initialize the swipe renderer
   * @param {HTMLElement} container - Container element
   * @returns {Promise}
   */
  async init(container) {
    await super.init(container);

    this._createDOM();
    this._attachEvents();
    await this.render();

    return this;
  }

  /**
   * Create DOM structure
   * @private
   */
  _createDOM() {
    // Track container for sliding pages
    this.trackEl = createElement('div', {
      className: 'pfb-swipe-track'
    });

    this.container.appendChild(this.trackEl);
    this.container.classList.add('pfb-swipe-container');

    this._updateLayout();
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEvents() {
    // Touch events
    this.trackEl.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.trackEl.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.trackEl.addEventListener('touchend', this._onTouchEnd);
    this.trackEl.addEventListener('touchcancel', this._onTouchEnd);

    // Mouse events for desktop
    this.trackEl.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEvents() {
    if (this.trackEl) {
      this.trackEl.removeEventListener('touchstart', this._onTouchStart);
      this.trackEl.removeEventListener('touchmove', this._onTouchMove);
      this.trackEl.removeEventListener('touchend', this._onTouchEnd);
      this.trackEl.removeEventListener('touchcancel', this._onTouchEnd);
      this.trackEl.removeEventListener('mousedown', this._onMouseDown);
    }
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
  }

  /**
   * Update layout
   * @private
   */
  _updateLayout() {
    if (!this.trackEl) return;

    const zoom = this.state.get('zoom');
    const totalPages = this.state.get('totalPages');

    // Calculate page dimensions
    const padding = 20;
    const pageAspect = this.pageWidth / this.pageHeight;

    let pageW = this.viewportWidth - padding * 2;
    let pageH = pageW / pageAspect;

    if (pageH > this.viewportHeight - padding * 2) {
      pageH = this.viewportHeight - padding * 2;
      pageW = pageH * pageAspect;
    }

    this._computedPageWidth = pageW;
    this._computedPageHeight = pageH;
    this._padding = padding;
    this._zoom = zoom;

    // Set track dimensions - position relative for absolute children
    setStyles(this.trackEl, {
      position: 'relative',
      width: (pageW + padding) * totalPages,
      height: pageH
    });

    // Update page positions (absolute positioning within track)
    this.pages.forEach((pageEl, index) => {
      setStyles(pageEl, {
        position: 'absolute',
        width: pageW,
        height: pageH,
        left: index * (pageW + padding),
        top: 0
      });
    });
  }

  /**
   * Render pages
   * @returns {Promise}
   */
  async render() {
    if (!this.initialized) return;

    const currentPage = this.state.get('currentPage');
    const totalPages = this.state.get('totalPages');

    this._updateLayout();

    // Create page elements if needed
    while (this.pages.length < totalPages) {
      const pageEl = this._createPageElement(this.pages.length + 1);
      this.trackEl.appendChild(pageEl);
      this.pages.push(pageEl);
    }

    // Render visible pages and neighbors
    const pagesToRender = this._getVisiblePageRange();

    for (const pageNum of pagesToRender) {
      await this._renderPage(pageNum);
    }

    // Scroll to current page
    this._scrollToPage(currentPage, false);
  }

  /**
   * Create a page element
   * @private
   */
  _createPageElement(pageNumber) {
    const pageEl = createElement('div', {
      className: 'pfb-swipe-page',
      dataset: { page: pageNumber }
    });

    // Set absolute positioning for track layout
    setStyles(pageEl, {
      position: 'absolute'
    });

    const contentEl = createElement('div', {
      className: 'pfb-swipe-page__content'
    });
    pageEl.appendChild(contentEl);

    return pageEl;
  }

  /**
   * Render a specific page
   * @private
   */
  async _renderPage(pageNumber) {
    const pageEl = this.pages[pageNumber - 1];
    if (!pageEl) return;

    const contentEl = pageEl.querySelector('.pfb-swipe-page__content');
    if (pageEl.dataset.rendered === 'true') return;

    try {
      const pageContent = await this.source.getPage(pageNumber);

      contentEl.innerHTML = '';

      if (pageContent instanceof HTMLImageElement) {
        const img = pageContent.cloneNode();
        img.className = 'pfb-swipe-page__image';
        contentEl.appendChild(img);
      } else if (pageContent instanceof HTMLCanvasElement) {
        const img = new Image();
        img.src = pageContent.toDataURL();
        img.className = 'pfb-swipe-page__image';
        contentEl.appendChild(img);
      }

      pageEl.dataset.rendered = 'true';

    } catch (error) {
      contentEl.innerHTML = '<div class="pfb-swipe-page__error">Error loading page</div>';
    }
  }

  /**
   * Get range of visible pages
   * @private
   */
  _getVisiblePageRange() {
    const currentPage = this.state.get('currentPage');
    const totalPages = this.state.get('totalPages');
    const preload = this.options.performance?.preloadPages || 2;

    const pages = [];
    for (let i = currentPage - preload; i <= currentPage + preload; i++) {
      if (i >= 1 && i <= totalPages) {
        pages.push(i);
      }
    }
    return pages;
  }

  /**
   * Scroll to a specific page
   * @private
   */
  _scrollToPage(pageNumber, animate = true) {
    if (!this.trackEl) return;

    const padding = this._padding || 20;
    const zoom = this._zoom || 1;
    const offset = (pageNumber - 1) * (this._computedPageWidth + padding);
    const centerOffset = (this.viewportWidth - this._computedPageWidth) / 2;

    const x = -offset + centerOffset;

    if (animate) {
      setStyles(this.trackEl, {
        transition: `transform ${this.animationDuration}ms ease-out`,
        transform: `translateX(${x}px) scale(${zoom})`
      });

      setTimeout(() => {
        if (this.trackEl) {
          this.trackEl.style.transition = '';
        }
      }, this.animationDuration);
    } else {
      setStyles(this.trackEl, {
        transition: '',
        transform: `translateX(${x}px) scale(${zoom})`
      });
    }

    this._currentTranslateX = x;
  }

  /**
   * Set transition type (swipe always uses slide)
   * @param {string} type - ignored for swipe renderer
   */
  setTransition(type) {
    // Swipe renderer always uses slide transition
  }

  /**
   * Flip to a page
   * @param {number} fromPage - Starting page
   * @param {number} toPage - Target page
   * @param {string} direction - 'forward' or 'backward'
   * @returns {Promise}
   */
  async flip(fromPage, toPage, direction) {
    this.isAnimating = true;

    // Preload target page
    await this._renderPage(toPage);

    // Animate to target
    this._scrollToPage(toPage, true);

    return new Promise(resolve => {
      setTimeout(() => {
        this.isAnimating = false;
        resolve();
      }, this.animationDuration);
    });
  }

  // Touch event handlers

  _onTouchStart(e) {
    if (this.isAnimating) return;

    const touch = e.touches[0];
    this._startDrag(touch.clientX, touch.clientY);
  }

  _onTouchMove(e) {
    if (!this._isDragging) return;

    const touch = e.touches[0];
    this._moveDrag(touch.clientX, touch.clientY);

    // Prevent scrolling while swiping
    if (Math.abs(this._currentX - this._startX) > 10) {
      e.preventDefault();
    }
  }

  _onTouchEnd(e) {
    if (!this._isDragging) return;
    this._endDrag();
  }

  // Mouse event handlers

  _onMouseDown(e) {
    if (this.isAnimating) return;
    e.preventDefault();
    this._startDrag(e.clientX, e.clientY);
  }

  _onMouseMove(e) {
    if (!this._isDragging) return;
    this._moveDrag(e.clientX, e.clientY);
  }

  _onMouseUp(e) {
    if (!this._isDragging) return;
    this._endDrag();
  }

  // Drag logic

  _startDrag(x, y) {
    this._isDragging = true;
    this._startX = x;
    this._startY = y;
    this._currentX = x;
    this._startTime = Date.now();
    this._initialTranslateX = this._currentTranslateX || 0;

    this.trackEl.style.transition = '';
  }

  _moveDrag(x, y) {
    this._currentX = x;
    const deltaX = x - this._startX;

    // Apply resistance at edges
    const currentPage = this.state.get('currentPage');
    const totalPages = this.state.get('totalPages');

    let resistance = 1;
    if ((currentPage === 1 && deltaX > 0) ||
        (currentPage === totalPages && deltaX < 0)) {
      resistance = this.resistance;
    }

    const newX = this._initialTranslateX + deltaX * resistance;
    const zoom = this._zoom || 1;
    this.trackEl.style.transform = `translateX(${newX}px) scale(${zoom})`;
  }

  _endDrag() {
    this._isDragging = false;

    const deltaX = this._currentX - this._startX;
    const deltaTime = Date.now() - this._startTime;
    const velocityX = deltaX / deltaTime;

    const currentPage = this.state.get('currentPage');
    const totalPages = this.state.get('totalPages');

    let targetPage = currentPage;

    // Determine if we should change page
    if (Math.abs(deltaX) > this.threshold || Math.abs(velocityX) > this.velocity) {
      if (deltaX < 0 && currentPage < totalPages) {
        targetPage = currentPage + 1;
      } else if (deltaX > 0 && currentPage > 1) {
        targetPage = currentPage - 1;
      }
    }

    // Scroll to target page
    this._scrollToPage(targetPage, true);

    // Update state if page changed
    if (targetPage !== currentPage) {
      setTimeout(() => {
        this.state.goToPage(targetPage);
        this.emit('pageChange', { page: targetPage });

        // Render nearby pages
        this._getVisiblePageRange().forEach(p => this._renderPage(p));
      }, this.animationDuration);
    }
  }

  /**
   * Apply zoom
   * @param {number} zoom - Zoom level
   * @param {number} panX - Pan X
   * @param {number} panY - Pan Y
   */
  applyZoom(zoom, panX = 0, panY = 0) {
    this._updateLayout();
    this._scrollToPage(this.state.get('currentPage'), false);
  }

  /**
   * Resize handler
   */
  resize() {
    super.resize();
    this._updateLayout();
    this._scrollToPage(this.state.get('currentPage'), false);
  }

  /**
   * Get supported features
   * @returns {string[]}
   */
  getSupportedFeatures() {
    return ['swipe', 'zoom', 'touch'];
  }

  /**
   * Get capabilities
   * @returns {Object}
   */
  getCapabilities() {
    return {
      ...super.getCapabilities(),
      supports3D: false,
      supportsShaders: false,
      supportsRealisticFlip: false
    };
  }

  /**
   * Destroy renderer
   */
  destroy() {
    this._detachEvents();
    this.pages = [];
    this.trackEl = null;
    super.destroy();
  }
}

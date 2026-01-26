/**
 * CSSRenderer - CSS 3D transform based page flip renderer
 */

import { BaseRenderer, RendererType } from '../BaseRenderer.js';
import { CSSFlip } from './CSSFlip.js';
import { createElement, setStyles } from '../../utils/dom.js';

/**
 * CSS 3D transform renderer
 */
export class CSSRenderer extends BaseRenderer {
  constructor(flipbook, options) {
    super(flipbook, options);

    this.type = RendererType.CSS;

    // CSS specific options
    this.cssOptions = options.css || {};
    this.perspective = this.cssOptions.perspective || 2000;
    this.flipDuration = this.cssOptions.flipDuration || 600;
    this.easing = this.cssOptions.easing || 'ease-in-out';
    this.showShadow = this.cssOptions.shadow !== false;
    this.showGradient = this.cssOptions.gradientOverlay !== false;

    // DOM elements
    this.stageEl = null;
    this.bookEl = null;
    this.leftPage = null;
    this.rightPage = null;
    this.flippingPage = null;

    // Flip animation handler
    this.flipAnimation = new CSSFlip(this);

    // Current pages
    this._currentLeftPage = null;
    this._currentRightPage = null;
  }

  /**
   * Initialize the CSS renderer
   * @param {HTMLElement} container - Container element
   * @returns {Promise}
   */
  async init(container) {
    await super.init(container);

    this._createDOM();
    await this.render();

    return this;
  }

  /**
   * Create DOM structure
   * @private
   */
  _createDOM() {
    // Stage with perspective
    this.stageEl = createElement('div', {
      className: 'pfb-css-stage',
      style: {
        perspective: `${this.perspective}px`,
        perspectiveOrigin: '50% 50%'
      }
    });

    // Book container
    this.bookEl = createElement('div', {
      className: 'pfb-css-book'
    });

    // Left page
    this.leftPage = this._createPageElement('left');
    this.bookEl.appendChild(this.leftPage);

    // Right page
    this.rightPage = this._createPageElement('right');
    this.bookEl.appendChild(this.rightPage);

    this.stageEl.appendChild(this.bookEl);
    this.container.appendChild(this.stageEl);

    this._updateLayout();
  }

  /**
   * Create a page element
   * @private
   */
  _createPageElement(side) {
    const pageEl = createElement('div', {
      className: `pfb-css-page pfb-css-page--${side}`,
      dataset: { side }
    });

    // Page content container
    const contentEl = createElement('div', {
      className: 'pfb-css-page__content'
    });
    pageEl.appendChild(contentEl);

    // Shadow overlay
    if (this.showShadow) {
      const shadowEl = createElement('div', {
        className: 'pfb-css-page__shadow'
      });
      pageEl.appendChild(shadowEl);
    }

    // Gradient overlay for 3D effect
    if (this.showGradient) {
      const gradientEl = createElement('div', {
        className: 'pfb-css-page__gradient'
      });
      pageEl.appendChild(gradientEl);
    }

    return pageEl;
  }

  /**
   * Update layout based on viewport
   * @private
   */
  _updateLayout() {
    if (!this.stageEl) return;

    const displayMode = this.state.get('displayMode');
    const isSingle = displayMode === 'single';

    // Calculate page size to fit viewport
    const padding = 40;
    const availableWidth = this.viewportWidth - padding * 2;
    const availableHeight = this.viewportHeight - padding * 2;

    const pageAspect = this.pageWidth / this.pageHeight;
    const bookAspect = isSingle ? pageAspect : pageAspect * 2;

    let bookWidth, bookHeight;

    if (availableWidth / availableHeight > bookAspect) {
      // Height constrained
      bookHeight = availableHeight;
      bookWidth = bookHeight * bookAspect;
    } else {
      // Width constrained
      bookWidth = availableWidth;
      bookHeight = bookWidth / bookAspect;
    }

    const pageW = isSingle ? bookWidth : bookWidth / 2;
    const pageH = bookHeight;

    // Apply zoom
    const zoom = this.state.get('zoom');
    const panX = this.state.get('panX');
    const panY = this.state.get('panY');

    setStyles(this.bookEl, {
      width: bookWidth,
      height: bookHeight,
      transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`
    });

    // Update page sizes
    setStyles(this.leftPage, { width: pageW, height: pageH });
    setStyles(this.rightPage, { width: pageW, height: pageH });

    // Toggle single/double mode
    this.bookEl.classList.toggle('pfb-css-book--single', isSingle);

    // Store computed dimensions
    this._computedPageWidth = pageW;
    this._computedPageHeight = pageH;
  }

  /**
   * Render current pages
   * @returns {Promise}
   */
  async render() {
    if (!this.initialized) return;

    const currentPage = this.state.get('currentPage');
    const totalPages = this.state.get('totalPages');
    const displayMode = this.state.get('displayMode');
    const isSingle = displayMode === 'single';

    this._updateLayout();

    if (isSingle) {
      // Single page mode
      await this._renderPage(this.leftPage, currentPage);
      this.rightPage.style.display = 'none';
      this._currentLeftPage = currentPage;
      this._currentRightPage = null;
    } else {
      // Double page mode
      const leftPageNum = currentPage;
      const rightPageNum = currentPage < totalPages ? currentPage + 1 : null;

      await Promise.all([
        this._renderPage(this.leftPage, leftPageNum),
        this._renderPage(this.rightPage, rightPageNum)
      ]);

      this.rightPage.style.display = '';
      this._currentLeftPage = leftPageNum;
      this._currentRightPage = rightPageNum;
    }
  }

  /**
   * Render a specific page into an element
   * @private
   */
  async _renderPage(pageEl, pageNumber) {
    const contentEl = pageEl.querySelector('.pfb-css-page__content');

    if (!pageNumber || pageNumber < 1 || pageNumber > this.state.get('totalPages')) {
      contentEl.innerHTML = '';
      pageEl.classList.add('pfb-css-page--empty');
      return;
    }

    pageEl.classList.remove('pfb-css-page--empty');

    try {
      const pageContent = await this.source.getPage(pageNumber);

      contentEl.innerHTML = '';

      if (pageContent instanceof HTMLImageElement) {
        const img = pageContent.cloneNode();
        img.className = 'pfb-css-page__image';
        contentEl.appendChild(img);
      } else if (pageContent instanceof HTMLCanvasElement) {
        // Convert canvas to image for better CSS handling
        const img = new Image();
        img.src = pageContent.toDataURL();
        img.className = 'pfb-css-page__image';
        contentEl.appendChild(img);
      }

    } catch (error) {
      console.error(`Failed to render page ${pageNumber}:`, error);
      contentEl.innerHTML = '<div class="pfb-css-page__error">Error loading page</div>';
    }
  }

  /**
   * Set transition type
   * @param {string} type - 'fade', 'slide', 'flip', 'none'
   */
  setTransition(type) {
    console.log('CSS Renderer: setTransition called with:', type);
    this.transitionType = type;
  }

  /**
   * Flip from one page to another
   * @param {number} fromPage - Starting page
   * @param {number} toPage - Target page
   * @param {string} direction - 'forward' or 'backward'
   * @returns {Promise}
   */
  async flip(fromPage, toPage, direction) {
    if (this.isAnimating) return;

    this.isAnimating = true;
    const duration = this.flipDuration;
    const type = this.transitionType || 'fade';

    console.log('CSS Renderer flip - transition type:', type, 'direction:', direction);

    try {
      switch (type) {
        case 'none':
          await this.render();
          break;

        case 'slide':
          console.log('Executing SLIDE transition');
          await this._slideTransition(direction, duration);
          break;

        case 'flip':
          console.log('Executing FLIP transition');
          await this._flipTransition(direction, duration);
          break;

        case 'fade':
        default:
          console.log('Executing FADE transition');
          await this._fadeTransition(duration);
          break;
      }
    } finally {
      this.isAnimating = false;
      // Clean up all styles
      this.leftPage.style.transition = '';
      this.leftPage.style.transform = '';
      this.leftPage.style.opacity = '';
      this.leftPage.style.transformOrigin = '';
      this.leftPage.style.transformStyle = '';
      this.leftPage.style.backfaceVisibility = '';
      this.bookEl.style.transition = '';
      this.bookEl.style.transform = '';
      this.bookEl.style.opacity = '';
      this.bookEl.style.transformStyle = '';
      this.bookEl.style.transformOrigin = '';
      this.bookEl.style.overflow = '';
      this.stageEl.style.overflow = '';
      this.stageEl.style.perspective = '';
    }
  }

  /**
   * Fade transition - animates entire bookEl so both pages fade together
   * @private
   */
  async _fadeTransition(duration) {
    this.bookEl.style.transition = `opacity ${duration/2}ms ease-out`;
    this.bookEl.style.opacity = '0';
    await new Promise(r => setTimeout(r, duration/2));

    await this.render();

    this.bookEl.style.transition = `opacity ${duration/2}ms ease-in`;
    this.bookEl.style.opacity = '1';
    await new Promise(r => setTimeout(r, duration/2));
  }

  /**
   * Slide transition - slides and scales within container
   * @private
   */
  async _slideTransition(direction, duration) {
    const isForward = direction === 'forward';
    const half = duration / 2;

    // Phase 1: Current page slides out and shrinks
    this.bookEl.style.transition = `transform ${half}ms ease-in`;
    this.bookEl.style.transform = `translateX(${isForward ? '-30%' : '30%'}) scale(0.7) rotateY(${isForward ? '15deg' : '-15deg'})`;
    await new Promise(r => setTimeout(r, half));

    await this.render();

    // Phase 2: New page slides in from opposite side
    this.bookEl.style.transition = 'none';
    this.bookEl.style.transform = `translateX(${isForward ? '30%' : '-30%'}) scale(0.7) rotateY(${isForward ? '-15deg' : '15deg'})`;
    await new Promise(r => setTimeout(r, 30));

    this.bookEl.style.transition = `transform ${half}ms ease-out`;
    this.bookEl.style.transform = 'translateX(0) scale(1) rotateY(0deg)';
    await new Promise(r => setTimeout(r, half));

    this.bookEl.style.transition = '';
    this.bookEl.style.transform = '';
  }

  /**
   * 3D Flip transition - page flips like turning a book page
   * @private
   */
  async _flipTransition(direction, duration) {
    const isForward = direction === 'forward';
    const half = duration / 2;

    // Setup 3D
    this.stageEl.style.perspective = '1000px';
    this.bookEl.style.transformStyle = 'preserve-3d';

    // Phase 1: Flip out - page rotates away
    this.bookEl.style.transformOrigin = isForward ? 'left center' : 'right center';
    this.bookEl.style.transition = `transform ${half}ms ease-in`;
    this.bookEl.style.transform = `rotateY(${isForward ? '-90deg' : '90deg'})`;
    await new Promise(r => setTimeout(r, half));

    await this.render();

    // Phase 2: Flip in - new page rotates into view
    this.bookEl.style.transition = 'none';
    this.bookEl.style.transform = `rotateY(${isForward ? '90deg' : '-90deg'})`;
    await new Promise(r => setTimeout(r, 30));

    this.bookEl.style.transition = `transform ${half}ms ease-out`;
    this.bookEl.style.transform = 'rotateY(0deg)';
    await new Promise(r => setTimeout(r, half));

    // Cleanup
    this.bookEl.style.transition = '';
    this.bookEl.style.transform = '';
    this.bookEl.style.transformOrigin = '';
    this.bookEl.style.transformStyle = '';
  }

  /**
   * Apply zoom transformation
   * @param {number} zoom - Zoom level
   * @param {number} [panX=0] - Pan X offset
   * @param {number} [panY=0] - Pan Y offset
   */
  applyZoom(zoom, panX = 0, panY = 0) {
    if (this.bookEl) {
      setStyles(this.bookEl, {
        transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`
      });
    }
  }

  /**
   * Handle resize
   */
  resize() {
    super.resize();
    this._updateLayout();
  }

  /**
   * Get page bounds
   * @param {number} pageNumber - Page number
   * @returns {Object|null}
   */
  getPageBounds(pageNumber) {
    if (!this.bookEl) return null;

    const bookRect = this.bookEl.getBoundingClientRect();
    const displayMode = this.state.get('displayMode');
    const isSingle = displayMode === 'single';

    if (isSingle) {
      if (pageNumber === this._currentLeftPage) {
        return {
          left: bookRect.left,
          top: bookRect.top,
          right: bookRect.right,
          bottom: bookRect.bottom,
          width: bookRect.width,
          height: bookRect.height
        };
      }
    } else {
      const pageWidth = bookRect.width / 2;

      if (pageNumber === this._currentLeftPage) {
        return {
          left: bookRect.left,
          top: bookRect.top,
          right: bookRect.left + pageWidth,
          bottom: bookRect.bottom,
          width: pageWidth,
          height: bookRect.height
        };
      }

      if (pageNumber === this._currentRightPage) {
        return {
          left: bookRect.left + pageWidth,
          top: bookRect.top,
          right: bookRect.right,
          bottom: bookRect.bottom,
          width: pageWidth,
          height: bookRect.height
        };
      }
    }

    return null;
  }

  /**
   * Get supported features
   * @returns {string[]}
   */
  getSupportedFeatures() {
    return ['flip', 'zoom', 'pan', 'css3d'];
  }

  /**
   * Get capabilities
   * @returns {Object}
   */
  getCapabilities() {
    return {
      ...super.getCapabilities(),
      supports3D: true,
      supportsShaders: false,
      supportsRealisticFlip: false
    };
  }

  /**
   * Destroy the renderer
   */
  destroy() {
    if (this.flipAnimation) {
      this.flipAnimation.destroy();
      this.flipAnimation = null;
    }

    this.stageEl = null;
    this.bookEl = null;
    this.leftPage = null;
    this.rightPage = null;

    super.destroy();
  }
}

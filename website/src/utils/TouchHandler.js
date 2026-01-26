/**
 * TouchHandler - Touch event handling for flipbook
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { getPassiveOptions } from './browser.js';

/**
 * Touch event handler
 */
export class TouchHandler extends EventEmitter {
  /**
   * Create a touch handler
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.container = flipbook.container;

    // Swipe settings
    this.swipeThreshold = options.swipe?.threshold || 50;
    this.swipeVelocity = options.swipe?.velocity || 0.3;

    // Touch state
    this._touches = [];
    this._startX = 0;
    this._startY = 0;
    this._startTime = 0;
    this._isTracking = false;
    this._direction = null;

    // Bound handlers
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    this._init();
  }

  /**
   * Initialize touch handling
   * @private
   */
  _init() {
    if (!this.container) return;

    this.container.addEventListener('touchstart', this._onTouchStart, getPassiveOptions(false));
    this.container.addEventListener('touchmove', this._onTouchMove, getPassiveOptions(false));
    this.container.addEventListener('touchend', this._onTouchEnd);
    this.container.addEventListener('touchcancel', this._onTouchEnd);
  }

  /**
   * Handle touch start
   * @private
   */
  _onTouchStart(e) {
    // Don't handle multi-touch (that's for zoom)
    if (e.touches.length !== 1) return;

    // Don't handle if zoomed in (pan mode)
    if (this.state.get('zoom') > 1) return;

    // Don't handle if flipping
    if (this.state.get('isFlipping')) return;

    const touch = e.touches[0];

    this._isTracking = true;
    this._startX = touch.clientX;
    this._startY = touch.clientY;
    this._startTime = Date.now();
    this._direction = null;

    this.emit('touchStart', {
      x: touch.clientX,
      y: touch.clientY
    });
  }

  /**
   * Handle touch move
   * @private
   */
  _onTouchMove(e) {
    if (!this._isTracking) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - this._startX;
    const deltaY = touch.clientY - this._startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Determine direction if not set
    if (!this._direction && (absX > 10 || absY > 10)) {
      this._direction = absX > absY ? 'horizontal' : 'vertical';
    }

    // Only handle horizontal swipes
    if (this._direction === 'horizontal') {
      e.preventDefault();

      this.emit('touchMove', {
        x: touch.clientX,
        y: touch.clientY,
        deltaX,
        deltaY,
        direction: deltaX > 0 ? 'right' : 'left'
      });
    }
  }

  /**
   * Handle touch end
   * @private
   */
  _onTouchEnd(e) {
    if (!this._isTracking) return;

    this._isTracking = false;

    // Get last touch position
    const touch = e.changedTouches?.[0];
    if (!touch) return;

    const deltaX = touch.clientX - this._startX;
    const deltaY = touch.clientY - this._startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const deltaTime = Date.now() - this._startTime;
    const velocity = absX / deltaTime;

    this.emit('touchEnd', {
      x: touch.clientX,
      y: touch.clientY,
      deltaX,
      deltaY,
      velocity
    });

    // Check for swipe
    if (this._direction === 'horizontal') {
      const isSwipe = absX > this.swipeThreshold || velocity > this.swipeVelocity;

      if (isSwipe) {
        const swipeDirection = deltaX > 0 ? 'right' : 'left';

        this.emit('swipe', {
          direction: swipeDirection,
          deltaX,
          velocity
        });

        // Navigate based on swipe direction
        if (swipeDirection === 'left') {
          this.flipbook.nextPage();
        } else {
          this.flipbook.prevPage();
        }
      }
    }

    // Check for tap
    if (absX < 10 && absY < 10 && deltaTime < 300) {
      this._handleTap(touch.clientX, touch.clientY);
    }

    this._direction = null;
  }

  /**
   * Handle tap
   * @private
   */
  _handleTap(x, y) {
    const rect = this.container.getBoundingClientRect();
    const relativeX = x - rect.left;
    const centerX = rect.width / 2;

    // Determine tap zone
    const zone = relativeX < centerX * 0.3
      ? 'left'
      : relativeX > centerX * 1.7
        ? 'right'
        : 'center';

    this.emit('tap', { x, y, zone });

    // Handle navigation on edge taps
    if (this.options.ui?.navigation?.clickToFlip !== false) {
      if (zone === 'left') {
        this.flipbook.prevPage();
      } else if (zone === 'right') {
        this.flipbook.nextPage();
      }
    }
  }

  /**
   * Enable touch handling
   */
  enable() {
    if (!this.container) return;

    this.container.addEventListener('touchstart', this._onTouchStart, getPassiveOptions(false));
    this.container.addEventListener('touchmove', this._onTouchMove, getPassiveOptions(false));
    this.container.addEventListener('touchend', this._onTouchEnd);
    this.container.addEventListener('touchcancel', this._onTouchEnd);
  }

  /**
   * Disable touch handling
   */
  disable() {
    if (!this.container) return;

    this.container.removeEventListener('touchstart', this._onTouchStart);
    this.container.removeEventListener('touchmove', this._onTouchMove);
    this.container.removeEventListener('touchend', this._onTouchEnd);
    this.container.removeEventListener('touchcancel', this._onTouchEnd);
  }

  /**
   * Destroy touch handler
   */
  destroy() {
    this.disable();
    this.container = null;
    this.removeAllListeners();
  }
}

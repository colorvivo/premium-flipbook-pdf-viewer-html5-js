/**
 * Fullscreen - Fullscreen mode handler
 */

import { EventEmitter, Events } from '../core/EventEmitter.js';
import {
  requestFullscreen,
  exitFullscreen,
  isFullscreen,
  onFullscreenChange
} from '../utils/browser.js';

/**
 * Fullscreen handler
 */
export class Fullscreen extends EventEmitter {
  /**
   * Create a fullscreen handler
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.enabled = options.features?.fullscreen !== false;
    this._removeListener = null;

    if (this.enabled) {
      this._init();
    }
  }

  /**
   * Initialize fullscreen handler
   * @private
   */
  _init() {
    // Listen for fullscreen changes
    this._removeListener = onFullscreenChange(() => {
      const fs = isFullscreen();
      this.state.set({ isFullscreen: fs });
      this.emit(Events.FULLSCREEN_CHANGE, { isFullscreen: fs });

      // Resize after transition
      setTimeout(() => {
        if (this.flipbook.renderer) {
          this.flipbook.renderer.resize();
        }
      }, 100);
    });
  }

  /**
   * Enter fullscreen mode
   * @returns {Promise<boolean>}
   */
  async enter() {
    if (!this.enabled) return false;

    try {
      await requestFullscreen(this.flipbook.container);
      return true;
    } catch (error) {
      console.warn('Failed to enter fullscreen:', error);
      return false;
    }
  }

  /**
   * Exit fullscreen mode
   * @returns {Promise<boolean>}
   */
  async exit() {
    try {
      await exitFullscreen();
      return true;
    } catch (error) {
      console.warn('Failed to exit fullscreen:', error);
      return false;
    }
  }

  /**
   * Toggle fullscreen mode
   * @returns {Promise<boolean>}
   */
  async toggle() {
    if (this.isActive()) {
      return this.exit();
    } else {
      return this.enter();
    }
  }

  /**
   * Check if in fullscreen mode
   * @returns {boolean}
   */
  isActive() {
    return isFullscreen();
  }

  /**
   * Check if fullscreen is supported
   * @returns {boolean}
   */
  isSupported() {
    return !!(
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled
    );
  }

  /**
   * Destroy fullscreen handler
   */
  destroy() {
    if (this._removeListener) {
      this._removeListener();
      this._removeListener = null;
    }

    this.removeAllListeners();
  }
}

/**
 * Autoplay - Automatic page flipping
 */

import { EventEmitter, Events } from '../core/EventEmitter.js';

/**
 * Autoplay handler for automatic page flipping
 */
export class Autoplay extends EventEmitter {
  /**
   * Create an autoplay handler
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.autoplayOptions = options.features?.autoplay || {};
    this.interval = this.autoplayOptions.interval || 5000;
    this.pauseOnHover = this.autoplayOptions.pauseOnHover !== false;
    this.loop = this.autoplayOptions.loop !== false;

    this._timer = null;
    this._isActive = false;
    this._isPaused = false;

    this._onMouseEnter = this._onMouseEnter.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);
    this._onFlipEnd = this._onFlipEnd.bind(this);

    this._init();
  }

  /**
   * Initialize autoplay
   * @private
   */
  _init() {
    // Pause on hover
    if (this.pauseOnHover) {
      const container = this.flipbook.container;
      container.addEventListener('mouseenter', this._onMouseEnter);
      container.addEventListener('mouseleave', this._onMouseLeave);
    }

    // Listen for flip end to schedule next flip
    this.state.on('flipEnd', this._onFlipEnd);
  }

  /**
   * Handle mouse enter (pause)
   * @private
   */
  _onMouseEnter() {
    if (this._isActive) {
      this._pause();
    }
  }

  /**
   * Handle mouse leave (resume)
   * @private
   */
  _onMouseLeave() {
    if (this._isActive && this._isPaused) {
      this._resume();
    }
  }

  /**
   * Handle flip end
   * @private
   */
  _onFlipEnd() {
    if (this._isActive && !this._isPaused) {
      this._scheduleNext();
    }
  }

  /**
   * Schedule next flip
   * @private
   */
  _scheduleNext() {
    this._clearTimer();

    this._timer = setTimeout(() => {
      this._flipNext();
    }, this.interval);
  }

  /**
   * Flip to next page
   * @private
   */
  async _flipNext() {
    const currentPage = this.state.get('currentPage');
    const totalPages = this.state.get('totalPages');
    const displayMode = this.state.get('displayMode');
    const increment = displayMode === 'double' ? 2 : 1;

    const nextPage = currentPage + increment;

    if (nextPage > totalPages) {
      if (this.loop) {
        // Loop back to start
        await this.flipbook.goToPage(1);
      } else {
        // Stop at end
        this.stop();
      }
    } else {
      await this.flipbook.nextPage();
    }
  }

  /**
   * Clear timer
   * @private
   */
  _clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * Internal pause
   * @private
   */
  _pause() {
    this._isPaused = true;
    this._clearTimer();
  }

  /**
   * Internal resume
   * @private
   */
  _resume() {
    this._isPaused = false;
    this._scheduleNext();
  }

  /**
   * Start autoplay
   * @param {number} [interval] - Custom interval in ms
   */
  start(interval) {
    if (interval) {
      this.interval = interval;
    }

    this._isActive = true;
    this._isPaused = false;

    this.state.set({ isAutoplayActive: true });
    this.emit(Events.AUTOPLAY_START, { interval: this.interval });

    this._scheduleNext();
  }

  /**
   * Stop autoplay
   */
  stop() {
    this._isActive = false;
    this._isPaused = false;
    this._clearTimer();

    this.state.set({ isAutoplayActive: false });
    this.emit(Events.AUTOPLAY_STOP);
  }

  /**
   * Pause autoplay (can be resumed)
   */
  pause() {
    if (this._isActive) {
      this._pause();
      this.emit('autoplayPause');
    }
  }

  /**
   * Resume autoplay after pause
   */
  resume() {
    if (this._isActive && this._isPaused) {
      this._resume();
      this.emit('autoplayResume');
    }
  }

  /**
   * Toggle autoplay
   * @returns {boolean} New state
   */
  toggle() {
    if (this._isActive) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  /**
   * Check if autoplay is active
   * @returns {boolean}
   */
  isActive() {
    return this._isActive;
  }

  /**
   * Check if autoplay is paused
   * @returns {boolean}
   */
  isPaused() {
    return this._isPaused;
  }

  /**
   * Set interval
   * @param {number} interval - Interval in ms
   */
  setInterval(interval) {
    this.interval = interval;

    // Restart timer if active
    if (this._isActive && !this._isPaused) {
      this._scheduleNext();
    }
  }

  /**
   * Set loop mode
   * @param {boolean} loop - Enable loop
   */
  setLoop(loop) {
    this.loop = loop;
  }

  /**
   * Destroy autoplay handler
   */
  destroy() {
    this.stop();

    const container = this.flipbook.container;
    if (container) {
      container.removeEventListener('mouseenter', this._onMouseEnter);
      container.removeEventListener('mouseleave', this._onMouseLeave);
    }

    this.removeAllListeners();
  }
}

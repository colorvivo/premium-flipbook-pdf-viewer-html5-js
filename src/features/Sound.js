/**
 * Sound - Page flip sound effects
 */

import { EventEmitter } from '../core/EventEmitter.js';

/**
 * Sound handler for page flip effects
 */
export class Sound extends EventEmitter {
  /**
   * Create a sound handler
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.soundOptions = options.features?.sound || {};
    this.enabled = this.soundOptions.enabled !== false;
    this.volume = this.soundOptions.volume ?? 0.5;
    this.flipSoundUrl = this.soundOptions.flipSound;

    this._flipSound = null;
    this._muted = false;
    this._loaded = false;

    if (this.enabled && this.flipSoundUrl) {
      this._init();
    }
  }

  /**
   * Initialize sound
   * @private
   */
  _init() {
    this._loadSound();

    // Play sound on flip start
    this.state.on('flipStart', () => {
      this.playFlipSound();
    });
  }

  /**
   * Load flip sound
   * @private
   */
  async _loadSound() {
    try {
      this._flipSound = new Audio(this.flipSoundUrl);
      this._flipSound.volume = this.volume;
      this._flipSound.preload = 'auto';

      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        this._flipSound.addEventListener('canplaythrough', resolve, { once: true });
        this._flipSound.addEventListener('error', reject, { once: true });
      });

      this._loaded = true;
      this.emit('soundLoaded');

    } catch (error) {
      console.warn('Failed to load flip sound:', error);
      this.emit('soundError', { error });
    }
  }

  /**
   * Play flip sound
   */
  playFlipSound() {
    if (!this.enabled || !this._loaded || this._muted || !this._flipSound) {
      return;
    }

    // Clone and play to allow overlapping sounds
    const sound = this._flipSound.cloneNode();
    sound.volume = this.volume;

    sound.play().catch(error => {
      // Autoplay may be blocked
      if (error.name !== 'NotAllowedError') {
        console.warn('Failed to play flip sound:', error);
      }
    });
  }

  /**
   * Set volume
   * @param {number} volume - Volume (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this._flipSound) {
      this._flipSound.volume = this.volume;
    }
  }

  /**
   * Get volume
   * @returns {number}
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Mute sounds
   */
  mute() {
    this._muted = true;
    this.emit('mute');
  }

  /**
   * Unmute sounds
   */
  unmute() {
    this._muted = false;
    this.emit('unmute');
  }

  /**
   * Toggle mute
   * @returns {boolean} New muted state
   */
  toggleMute() {
    if (this._muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this._muted;
  }

  /**
   * Check if muted
   * @returns {boolean}
   */
  isMuted() {
    return this._muted;
  }

  /**
   * Enable sounds
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable sounds
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Check if sounds are loaded
   * @returns {boolean}
   */
  isLoaded() {
    return this._loaded;
  }

  /**
   * Set flip sound URL
   * @param {string} url - Sound URL
   */
  async setFlipSound(url) {
    this.flipSoundUrl = url;
    this._loaded = false;

    if (url) {
      await this._loadSound();
    }
  }

  /**
   * Destroy sound handler
   */
  destroy() {
    if (this._flipSound) {
      this._flipSound = null;
    }

    this._loaded = false;
    this.removeAllListeners();
  }
}

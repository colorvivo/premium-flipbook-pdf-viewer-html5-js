/**
 * Simple event emitter for pub/sub pattern
 */

export class EventEmitter {
  constructor() {
    this._events = new Map();
    this._onceEvents = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Event callback must be a function');
    }

    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }

    this._events.get(event).add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Event callback must be a function');
    }

    if (!this._onceEvents.has(event)) {
      this._onceEvents.set(event, new Set());
    }

    this._onceEvents.get(event).add(callback);

    return () => {
      const callbacks = this._onceEvents.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} [callback] - Specific callback to remove (removes all if not provided)
   */
  off(event, callback) {
    if (callback) {
      const callbacks = this._events.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this._events.delete(event);
        }
      }

      const onceCallbacks = this._onceEvents.get(event);
      if (onceCallbacks) {
        onceCallbacks.delete(callback);
        if (onceCallbacks.size === 0) {
          this._onceEvents.delete(event);
        }
      }
    } else {
      this._events.delete(event);
      this._onceEvents.delete(event);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...*} args - Arguments to pass to callbacks
   */
  emit(event, ...args) {
    // Regular listeners
    const callbacks = this._events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    }

    // Once listeners
    const onceCallbacks = this._onceEvents.get(event);
    if (onceCallbacks) {
      onceCallbacks.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in once handler for "${event}":`, error);
        }
      });
      this._onceEvents.delete(event);
    }
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    const regular = this._events.get(event)?.size || 0;
    const once = this._onceEvents.get(event)?.size || 0;
    return regular + once;
  }

  /**
   * Check if event has listeners
   * @param {string} event - Event name
   * @returns {boolean}
   */
  hasListeners(event) {
    return this.listenerCount(event) > 0;
  }

  /**
   * Get all event names
   * @returns {string[]}
   */
  eventNames() {
    const names = new Set([
      ...this._events.keys(),
      ...this._onceEvents.keys()
    ]);
    return Array.from(names);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this._events.clear();
    this._onceEvents.clear();
  }

  /**
   * Destroy the emitter
   */
  destroy() {
    this.removeAllListeners();
  }
}

// Event name constants
export const Events = {
  // Lifecycle
  INIT: 'init',
  READY: 'ready',
  DESTROY: 'destroy',
  ERROR: 'error',

  // Page events
  PAGE_CHANGE: 'pageChange',
  PAGE_LOAD: 'pageLoad',
  PAGE_RENDER: 'pageRender',

  // Flip events
  FLIP_START: 'flipStart',
  FLIP_PROGRESS: 'flipProgress',
  FLIP_END: 'flipEnd',
  FLIP_CANCEL: 'flipCancel',

  // Zoom events
  ZOOM_CHANGE: 'zoomChange',
  ZOOM_START: 'zoomStart',
  ZOOM_END: 'zoomEnd',
  PAN_START: 'panStart',
  PAN_MOVE: 'panMove',
  PAN_END: 'panEnd',

  // UI events
  TOOLBAR_TOGGLE: 'toolbarToggle',
  THUMBNAILS_TOGGLE: 'thumbnailsToggle',
  TOC_TOGGLE: 'tocToggle',
  SEARCH_TOGGLE: 'searchToggle',
  FULLSCREEN_CHANGE: 'fullscreenChange',

  // Feature events
  AUTOPLAY_START: 'autoplayStart',
  AUTOPLAY_STOP: 'autoplayStop',
  LIGHTBOX_OPEN: 'lightboxOpen',
  LIGHTBOX_CLOSE: 'lightboxClose',
  DEEP_LINK_CHANGE: 'deepLinkChange',

  // Source events
  SOURCE_LOAD_START: 'sourceLoadStart',
  SOURCE_LOAD_PROGRESS: 'sourceLoadProgress',
  SOURCE_LOAD_COMPLETE: 'sourceLoadComplete',
  SOURCE_LOAD_ERROR: 'sourceLoadError',

  // Renderer events
  RENDERER_CHANGE: 'rendererChange',
  RESIZE: 'resize',
  MODE_CHANGE: 'modeChange' // single/double page mode
};

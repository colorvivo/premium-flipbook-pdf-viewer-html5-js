/**
 * TextureCache - LRU cache for textures and page images
 */

/**
 * LRU cache for managing textures and page images
 */
export class TextureCache {
  /**
   * Create a texture cache
   * @param {number} [maxSize=20] - Maximum number of items to cache
   */
  constructor(maxSize = 20) {
    this.maxSize = maxSize;
    this._cache = new Map();
    this._accessOrder = [];
  }

  /**
   * Get an item from cache
   * @param {string} key - Cache key
   * @returns {*} Cached item or undefined
   */
  get(key) {
    if (!this._cache.has(key)) {
      return undefined;
    }

    // Update access order (move to end)
    this._updateAccessOrder(key);

    return this._cache.get(key);
  }

  /**
   * Set an item in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} [options] - Options
   * @param {Function} [options.onEvict] - Callback when item is evicted
   */
  set(key, value, options = {}) {
    // If already exists, update it
    if (this._cache.has(key)) {
      const existing = this._cache.get(key);
      if (existing._onEvict) {
        // Don't call evict for update, just replace
      }
      this._cache.set(key, { value, _onEvict: options.onEvict });
      this._updateAccessOrder(key);
      return;
    }

    // Evict oldest if at capacity
    while (this._cache.size >= this.maxSize) {
      this._evictOldest();
    }

    // Add new item
    this._cache.set(key, { value, _onEvict: options.onEvict });
    this._accessOrder.push(key);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this._cache.has(key);
  }

  /**
   * Delete an item from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if item was deleted
   */
  delete(key) {
    if (!this._cache.has(key)) {
      return false;
    }

    const item = this._cache.get(key);

    // Call evict callback
    if (item._onEvict) {
      try {
        item._onEvict(item.value);
      } catch (e) {
        console.error('Error in cache evict callback:', e);
      }
    }

    this._cache.delete(key);
    this._accessOrder = this._accessOrder.filter(k => k !== key);

    return true;
  }

  /**
   * Clear all items from cache
   */
  clear() {
    // Call evict callbacks
    for (const [key, item] of this._cache) {
      if (item._onEvict) {
        try {
          item._onEvict(item.value);
        } catch (e) {
          console.error('Error in cache evict callback:', e);
        }
      }
    }

    this._cache.clear();
    this._accessOrder = [];
  }

  /**
   * Get cache size
   * @returns {number}
   */
  get size() {
    return this._cache.size;
  }

  /**
   * Get all keys
   * @returns {string[]}
   */
  keys() {
    return Array.from(this._cache.keys());
  }

  /**
   * Get all values
   * @returns {*[]}
   */
  values() {
    return Array.from(this._cache.values()).map(item => item.value);
  }

  /**
   * Update access order for LRU
   * @private
   */
  _updateAccessOrder(key) {
    const index = this._accessOrder.indexOf(key);
    if (index > -1) {
      this._accessOrder.splice(index, 1);
    }
    this._accessOrder.push(key);
  }

  /**
   * Evict oldest item
   * @private
   */
  _evictOldest() {
    if (this._accessOrder.length === 0) return;

    const oldestKey = this._accessOrder.shift();
    const item = this._cache.get(oldestKey);

    if (item && item._onEvict) {
      try {
        item._onEvict(item.value);
      } catch (e) {
        console.error('Error in cache evict callback:', e);
      }
    }

    this._cache.delete(oldestKey);
  }

  /**
   * Resize cache
   * @param {number} newSize - New max size
   */
  resize(newSize) {
    this.maxSize = newSize;

    // Evict excess items
    while (this._cache.size > this.maxSize) {
      this._evictOldest();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    return {
      size: this._cache.size,
      maxSize: this.maxSize,
      keys: this.keys()
    };
  }
}

/**
 * Create a texture cache with WebGL texture disposal
 * @param {number} maxSize - Max size
 * @returns {TextureCache}
 */
export function createTextureCache(maxSize = 20) {
  const cache = new TextureCache(maxSize);

  // Override set to handle texture disposal
  const originalSet = cache.set.bind(cache);
  cache.set = (key, texture, options = {}) => {
    originalSet(key, texture, {
      ...options,
      onEvict: (tex) => {
        // Dispose Three.js texture
        if (tex && typeof tex.dispose === 'function') {
          tex.dispose();
        }
        // Call original onEvict if provided
        if (options.onEvict) {
          options.onEvict(tex);
        }
      }
    });
  };

  return cache;
}

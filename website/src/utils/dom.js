/**
 * DOM utility functions
 */

/**
 * Create an element with attributes and children
 * @param {string} tag - Tag name
 * @param {Object} [attrs] - Attributes
 * @param {...(Node|string)} children - Child nodes or text
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, value);
    } else if (key === 'innerHTML') {
      el.innerHTML = value;
    } else if (value !== null && value !== undefined && value !== false) {
      el.setAttribute(key, value === true ? '' : value);
    }
  }

  for (const child of children) {
    if (child != null) {
      el.appendChild(
        child instanceof Node ? child : document.createTextNode(String(child))
      );
    }
  }

  return el;
}

/**
 * Shorthand for createElement
 */
export const h = createElement;

/**
 * Query selector with optional context
 * @param {string} selector - CSS selector
 * @param {Element} [context=document] - Context element
 * @returns {Element|null}
 */
export function $(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * Query selector all with optional context
 * @param {string} selector - CSS selector
 * @param {Element} [context=document] - Context element
 * @returns {Element[]}
 */
export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/**
 * Add event listener with optional delegation
 * @param {Element} el - Element
 * @param {string} event - Event name
 * @param {string|Function} selectorOrHandler - Selector for delegation or handler
 * @param {Function} [handler] - Handler if delegation
 * @returns {Function} Remove listener function
 */
export function on(el, event, selectorOrHandler, handler) {
  if (typeof selectorOrHandler === 'function') {
    el.addEventListener(event, selectorOrHandler);
    return () => el.removeEventListener(event, selectorOrHandler);
  }

  // Event delegation
  const delegatedHandler = (e) => {
    const target = e.target.closest(selectorOrHandler);
    if (target && el.contains(target)) {
      handler.call(target, e, target);
    }
  };

  el.addEventListener(event, delegatedHandler);
  return () => el.removeEventListener(event, delegatedHandler);
}

/**
 * Add class(es) to element
 * @param {Element} el - Element
 * @param {...string} classes - Class names
 */
export function addClass(el, ...classes) {
  el.classList.add(...classes.filter(Boolean));
}

/**
 * Remove class(es) from element
 * @param {Element} el - Element
 * @param {...string} classes - Class names
 */
export function removeClass(el, ...classes) {
  el.classList.remove(...classes.filter(Boolean));
}

/**
 * Toggle class on element
 * @param {Element} el - Element
 * @param {string} className - Class name
 * @param {boolean} [force] - Force add/remove
 * @returns {boolean} Class present after toggle
 */
export function toggleClass(el, className, force) {
  return el.classList.toggle(className, force);
}

/**
 * Check if element has class
 * @param {Element} el - Element
 * @param {string} className - Class name
 * @returns {boolean}
 */
export function hasClass(el, className) {
  return el.classList.contains(className);
}

/**
 * Set CSS styles on element
 * @param {Element} el - Element
 * @param {Object} styles - Style properties
 */
export function setStyles(el, styles) {
  for (const [prop, value] of Object.entries(styles)) {
    if (value === null || value === undefined) {
      el.style.removeProperty(prop);
    } else {
      el.style[prop] = typeof value === 'number' && prop !== 'zIndex' && prop !== 'opacity'
        ? `${value}px`
        : value;
    }
  }
}

/**
 * Get element dimensions
 * @param {Element} el - Element
 * @returns {{width: number, height: number, top: number, left: number}}
 */
export function getRect(el) {
  const rect = el.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom
  };
}

/**
 * Get element offset relative to document
 * @param {Element} el - Element
 * @returns {{top: number, left: number}}
 */
export function getOffset(el) {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.pageYOffset,
    left: rect.left + window.pageXOffset
  };
}

/**
 * Check if element is visible in viewport
 * @param {Element} el - Element
 * @param {number} [threshold=0] - Visibility threshold (0-1)
 * @returns {boolean}
 */
export function isInViewport(el, threshold = 0) {
  const rect = el.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  const vertVisible = rect.top <= windowHeight * (1 - threshold) &&
                      rect.bottom >= windowHeight * threshold;
  const horizVisible = rect.left <= windowWidth * (1 - threshold) &&
                       rect.right >= windowWidth * threshold;

  return vertVisible && horizVisible;
}

/**
 * Empty an element
 * @param {Element} el - Element
 */
export function empty(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

/**
 * Remove an element from DOM
 * @param {Element} el - Element
 */
export function remove(el) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

/**
 * Insert element after another
 * @param {Element} el - Element to insert
 * @param {Element} reference - Reference element
 */
export function insertAfter(el, reference) {
  reference.parentNode.insertBefore(el, reference.nextSibling);
}

/**
 * Wrap element with another
 * @param {Element} el - Element to wrap
 * @param {Element} wrapper - Wrapper element
 * @returns {Element} Wrapper element
 */
export function wrap(el, wrapper) {
  el.parentNode.insertBefore(wrapper, el);
  wrapper.appendChild(el);
  return wrapper;
}

/**
 * Get or set data attribute
 * @param {Element} el - Element
 * @param {string} key - Data key
 * @param {*} [value] - Value to set
 * @returns {*}
 */
export function data(el, key, value) {
  if (value === undefined) {
    const val = el.dataset[key];
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  el.dataset[key] = typeof value === 'object' ? JSON.stringify(value) : value;
}

/**
 * Request animation frame with cancel
 * @param {Function} callback - Animation callback
 * @returns {Object} Object with cancel method
 */
export function raf(callback) {
  let id = requestAnimationFrame(callback);
  return {
    cancel: () => cancelAnimationFrame(id)
  };
}

/**
 * Wait for next frame
 * @returns {Promise}
 */
export function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

/**
 * Wait for transition end
 * @param {Element} el - Element
 * @param {number} [timeout] - Fallback timeout
 * @returns {Promise}
 */
export function waitForTransition(el, timeout) {
  return new Promise(resolve => {
    const onEnd = () => {
      el.removeEventListener('transitionend', onEnd);
      resolve();
    };

    el.addEventListener('transitionend', onEnd);

    if (timeout) {
      setTimeout(onEnd, timeout);
    }
  });
}

/**
 * Debounce function
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
export function debounce(fn, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Throttle function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Limit time in ms
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Load an image
 * @param {string} src - Image source
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Create a canvas with optional context
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
 */
export function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

/**
 * Convert element to selector string (for debugging)
 * @param {Element} el - Element
 * @returns {string}
 */
export function toSelector(el) {
  if (el.id) return `#${el.id}`;
  let selector = el.tagName.toLowerCase();
  if (el.className) {
    selector += '.' + el.className.split(' ').join('.');
  }
  return selector;
}

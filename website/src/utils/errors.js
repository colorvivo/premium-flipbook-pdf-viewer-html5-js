/**
 * Error codes and error handling utilities
 */

/**
 * Error codes enumeration
 */
export const ErrorCodes = {
  // Initialization errors (1xx)
  INIT_FAILED: 'E101',
  CONTAINER_NOT_FOUND: 'E102',
  INVALID_OPTIONS: 'E103',
  NO_SOURCE: 'E104',

  // Source loading errors (2xx)
  SOURCE_LOAD_FAILED: 'E201',
  PDF_LOAD_FAILED: 'E202',
  IMAGE_LOAD_FAILED: 'E203',
  JSON_LOAD_FAILED: 'E204',
  PDF_JS_NOT_FOUND: 'E205',
  CORS_ERROR: 'E206',
  NETWORK_ERROR: 'E207',

  // Rendering errors (3xx)
  RENDERER_INIT_FAILED: 'E301',
  WEBGL_NOT_SUPPORTED: 'E302',
  WEBGL_CONTEXT_LOST: 'E303',
  THREE_JS_NOT_FOUND: 'E304',
  CSS3D_NOT_SUPPORTED: 'E305',
  TEXTURE_ERROR: 'E306',

  // Page errors (4xx)
  PAGE_NOT_FOUND: 'E401',
  PAGE_RENDER_FAILED: 'E402',
  INVALID_PAGE_NUMBER: 'E403',

  // Feature errors (5xx)
  FULLSCREEN_NOT_SUPPORTED: 'E501',
  SEARCH_NOT_AVAILABLE: 'E502',
  SOUND_LOAD_FAILED: 'E503',

  // General errors (9xx)
  UNKNOWN_ERROR: 'E999'
};

/**
 * Error messages
 */
export const ErrorMessages = {
  [ErrorCodes.INIT_FAILED]: 'Failed to initialize FlipBook',
  [ErrorCodes.CONTAINER_NOT_FOUND]: 'Container element not found',
  [ErrorCodes.INVALID_OPTIONS]: 'Invalid configuration options',
  [ErrorCodes.NO_SOURCE]: 'No source provided (pdfUrl, images, or optimizedImages required)',

  [ErrorCodes.SOURCE_LOAD_FAILED]: 'Failed to load source',
  [ErrorCodes.PDF_LOAD_FAILED]: 'Failed to load PDF file',
  [ErrorCodes.IMAGE_LOAD_FAILED]: 'Failed to load image',
  [ErrorCodes.JSON_LOAD_FAILED]: 'Failed to load JSON configuration',
  [ErrorCodes.PDF_JS_NOT_FOUND]: 'PDF.js library not found. Include pdfjs-dist or use image source.',
  [ErrorCodes.CORS_ERROR]: 'CORS error loading resource. Check server configuration.',
  [ErrorCodes.NETWORK_ERROR]: 'Network error loading resource',

  [ErrorCodes.RENDERER_INIT_FAILED]: 'Failed to initialize renderer',
  [ErrorCodes.WEBGL_NOT_SUPPORTED]: 'WebGL is not supported on this device',
  [ErrorCodes.WEBGL_CONTEXT_LOST]: 'WebGL context was lost',
  [ErrorCodes.THREE_JS_NOT_FOUND]: 'Three.js library not found for WebGL renderer',
  [ErrorCodes.CSS3D_NOT_SUPPORTED]: 'CSS 3D transforms not supported',
  [ErrorCodes.TEXTURE_ERROR]: 'Error creating texture',

  [ErrorCodes.PAGE_NOT_FOUND]: 'Page not found',
  [ErrorCodes.PAGE_RENDER_FAILED]: 'Failed to render page',
  [ErrorCodes.INVALID_PAGE_NUMBER]: 'Invalid page number',

  [ErrorCodes.FULLSCREEN_NOT_SUPPORTED]: 'Fullscreen not supported',
  [ErrorCodes.SEARCH_NOT_AVAILABLE]: 'Search not available for this source type',
  [ErrorCodes.SOUND_LOAD_FAILED]: 'Failed to load sound file',

  [ErrorCodes.UNKNOWN_ERROR]: 'An unknown error occurred'
};

/**
 * Custom error class for FlipBook errors
 */
export class FlipBookError extends Error {
  /**
   * Create a FlipBook error
   * @param {string} code - Error code from ErrorCodes
   * @param {string} [message] - Custom message (defaults to standard message)
   * @param {Error} [cause] - Original error that caused this
   * @param {Object} [context] - Additional context data
   */
  constructor(code, message, cause, context = {}) {
    const defaultMessage = ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR];
    super(message || defaultMessage);

    this.name = 'FlipBookError';
    this.code = code;
    this.cause = cause;
    this.context = context;
    this.timestamp = Date.now();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FlipBookError);
    }
  }

  /**
   * Get full error details
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : null
    };
  }

  /**
   * Get user-friendly error message
   * @returns {string}
   */
  getUserMessage() {
    // Return a sanitized message suitable for display to users
    const baseMessage = ErrorMessages[this.code] || this.message;
    return baseMessage;
  }

  /**
   * Check if error is recoverable
   * @returns {boolean}
   */
  isRecoverable() {
    // Some errors can be recovered from
    const recoverableCodes = [
      ErrorCodes.PAGE_RENDER_FAILED,
      ErrorCodes.IMAGE_LOAD_FAILED,
      ErrorCodes.WEBGL_CONTEXT_LOST,
      ErrorCodes.TEXTURE_ERROR
    ];
    return recoverableCodes.includes(this.code);
  }

  /**
   * Create error from code
   * @param {string} code - Error code
   * @param {Object} [context] - Context data
   * @returns {FlipBookError}
   */
  static fromCode(code, context) {
    return new FlipBookError(code, null, null, context);
  }

  /**
   * Wrap an existing error
   * @param {Error} error - Original error
   * @param {string} code - Error code
   * @param {Object} [context] - Context data
   * @returns {FlipBookError}
   */
  static wrap(error, code, context) {
    if (error instanceof FlipBookError) {
      return error;
    }
    return new FlipBookError(code, error.message, error, context);
  }
}

/**
 * Error handler class
 */
export class ErrorHandler {
  constructor(options = {}) {
    this.onError = options.onError || null;
    this.logErrors = options.logErrors !== false;
    this.throwErrors = options.throwErrors !== false;
    this.errors = [];
    this.maxErrors = options.maxErrors || 100;
  }

  /**
   * Handle an error
   * @param {Error|FlipBookError} error - Error to handle
   * @param {string} [code] - Error code if wrapping
   * @param {Object} [context] - Additional context
   */
  handle(error, code, context) {
    // Wrap if needed
    const flipbookError = error instanceof FlipBookError
      ? error
      : FlipBookError.wrap(error, code || ErrorCodes.UNKNOWN_ERROR, context);

    // Store error
    this.errors.push(flipbookError);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log error
    if (this.logErrors) {
      console.error(`[FlipBook ${flipbookError.code}]`, flipbookError.message, flipbookError.context);
      if (flipbookError.cause) {
        console.error('Caused by:', flipbookError.cause);
      }
    }

    // Callback
    if (this.onError) {
      try {
        this.onError(flipbookError);
      } catch (e) {
        console.error('Error in error handler callback:', e);
      }
    }

    // Throw if not recoverable and throwing is enabled
    if (this.throwErrors && !flipbookError.isRecoverable()) {
      throw flipbookError;
    }

    return flipbookError;
  }

  /**
   * Get all errors
   * @returns {FlipBookError[]}
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Get last error
   * @returns {FlipBookError|null}
   */
  getLastError() {
    return this.errors[this.errors.length - 1] || null;
  }

  /**
   * Clear errors
   */
  clear() {
    this.errors = [];
  }

  /**
   * Check if there are errors
   * @returns {boolean}
   */
  hasErrors() {
    return this.errors.length > 0;
  }
}

/**
 * Assert a condition, throw FlipBookError if false
 * @param {boolean} condition - Condition to check
 * @param {string} code - Error code if assertion fails
 * @param {string} [message] - Custom message
 * @param {Object} [context] - Context data
 */
export function assert(condition, code, message, context) {
  if (!condition) {
    throw new FlipBookError(code, message, null, context);
  }
}

/**
 * Check if error is a CORS error
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
export function isCORSError(error) {
  if (error instanceof TypeError && error.message.includes('CORS')) {
    return true;
  }
  if (error.name === 'SecurityError') {
    return true;
  }
  // Check for common CORS error patterns
  const corsPatterns = [
    'cross-origin',
    'Cross-Origin',
    'CORS',
    'Access-Control-Allow-Origin'
  ];
  return corsPatterns.some(pattern =>
    error.message?.includes(pattern) || error.toString().includes(pattern)
  );
}

/**
 * Check if error is a network error
 * @param {Error} error - Error to check
 * @returns {boolean}
 */
export function isNetworkError(error) {
  if (error.name === 'NetworkError') {
    return true;
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  const networkPatterns = [
    'network',
    'Network',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED',
    'Failed to fetch'
  ];
  return networkPatterns.some(pattern =>
    error.message?.includes(pattern) || error.toString().includes(pattern)
  );
}

/**
 * Browser detection and capability utilities
 */

/**
 * Browser detection results (cached)
 */
let browserInfo = null;

/**
 * Detect browser and capabilities
 * @returns {Object}
 */
export function detectBrowser() {
  if (browserInfo) return browserInfo;

  const ua = navigator.userAgent;
  const platform = navigator.platform || '';

  browserInfo = {
    // Browser detection
    isChrome: /Chrome/.test(ua) && !/Edge|Edg/.test(ua),
    isFirefox: /Firefox/.test(ua),
    isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
    isEdge: /Edge|Edg/.test(ua),
    isIE: /MSIE|Trident/.test(ua),
    isOpera: /Opera|OPR/.test(ua),

    // Platform detection
    isMac: /Mac/.test(platform),
    isWindows: /Win/.test(platform),
    isLinux: /Linux/.test(platform),
    isIOS: /iPad|iPhone|iPod/.test(ua),
    isAndroid: /Android/.test(ua),

    // Device detection
    isMobile: /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua),
    isTablet: /iPad|Android(?!.*Mobile)|Tablet/i.test(ua),
    isDesktop: !/Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua),

    // Touch support
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,

    // Capabilities
    supportsWebGL: checkWebGL(),
    supportsWebGL2: checkWebGL2(),
    supportsCSS3D: checkCSS3D(),
    supportsPassive: checkPassive(),
    supportsIntersectionObserver: 'IntersectionObserver' in window,
    supportsResizeObserver: 'ResizeObserver' in window,
    supportsFullscreen: checkFullscreen(),
    supportsPointerEvents: 'PointerEvent' in window,

    // Performance hints
    devicePixelRatio: window.devicePixelRatio || 1,
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    deviceMemory: navigator.deviceMemory || 4, // Default to 4GB

    // Connection info
    connection: getConnectionInfo()
  };

  // Compute recommended renderer
  browserInfo.recommendedRenderer = getRecommendedRenderer(browserInfo);

  return browserInfo;
}

/**
 * Check WebGL support
 * @returns {boolean}
 */
function checkWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

/**
 * Check WebGL2 support
 * @returns {boolean}
 */
function checkWebGL2() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch (e) {
    return false;
  }
}

/**
 * Check CSS 3D transforms support
 * @returns {boolean}
 */
function checkCSS3D() {
  const el = document.createElement('div');
  const transforms = [
    'perspectiveProperty',
    'WebkitPerspective',
    'MozPerspective',
    'OPerspective',
    'msPerspective'
  ];

  for (const transform of transforms) {
    if (el.style[transform] !== undefined) {
      return true;
    }
  }

  return false;
}

/**
 * Check passive event listener support
 * @returns {boolean}
 */
function checkPassive() {
  let passive = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get: function() {
        passive = true;
        return true;
      }
    });
    window.addEventListener('testPassive', null, opts);
    window.removeEventListener('testPassive', null, opts);
  } catch (e) {
    // Passive not supported
  }
  return passive;
}

/**
 * Check fullscreen API support
 * @returns {boolean}
 */
function checkFullscreen() {
  return !!(
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled
  );
}

/**
 * Get connection info
 * @returns {Object|null}
 */
function getConnectionInfo() {
  const conn = navigator.connection ||
               navigator.mozConnection ||
               navigator.webkitConnection;

  if (!conn) return null;

  return {
    effectiveType: conn.effectiveType, // 'slow-2g', '2g', '3g', '4g'
    downlink: conn.downlink, // Mbps
    rtt: conn.rtt, // Round trip time in ms
    saveData: conn.saveData
  };
}

/**
 * Get recommended renderer based on capabilities
 * @param {Object} info - Browser info
 * @returns {string} 'webgl', 'css', or 'swipe'
 */
function getRecommendedRenderer(info) {
  // Mobile devices: prefer swipe for performance
  if (info.isMobile && !info.isTablet) {
    return 'swipe';
  }

  // Low-end devices: prefer CSS
  if (info.deviceMemory < 2 || info.hardwareConcurrency < 2) {
    return info.supportsCSS3D ? 'css' : 'swipe';
  }

  // Slow connection: prefer simpler renderers
  if (info.connection?.effectiveType === 'slow-2g' || info.connection?.effectiveType === '2g') {
    return 'swipe';
  }

  // WebGL available and good hardware: use WebGL
  if (info.supportsWebGL && info.deviceMemory >= 4) {
    return 'webgl';
  }

  // CSS 3D available: use CSS
  if (info.supportsCSS3D) {
    return 'css';
  }

  // Fallback to swipe
  return 'swipe';
}

/**
 * Get passive event options
 * @param {boolean} [passive=true] - Use passive
 * @returns {Object|boolean}
 */
export function getPassiveOptions(passive = true) {
  const info = detectBrowser();
  return info.supportsPassive ? { passive } : false;
}

/**
 * Request fullscreen on element
 * @param {Element} el - Element
 * @returns {Promise}
 */
export function requestFullscreen(el) {
  if (el.requestFullscreen) {
    return el.requestFullscreen();
  } else if (el.webkitRequestFullscreen) {
    return el.webkitRequestFullscreen();
  } else if (el.mozRequestFullScreen) {
    return el.mozRequestFullScreen();
  } else if (el.msRequestFullscreen) {
    return el.msRequestFullscreen();
  }
  return Promise.reject(new Error('Fullscreen not supported'));
}

/**
 * Exit fullscreen
 * @returns {Promise}
 */
export function exitFullscreen() {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    return document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    return document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    return document.msExitFullscreen();
  }
  return Promise.reject(new Error('Fullscreen not supported'));
}

/**
 * Get current fullscreen element
 * @returns {Element|null}
 */
export function getFullscreenElement() {
  return document.fullscreenElement ||
         document.webkitFullscreenElement ||
         document.mozFullScreenElement ||
         document.msFullscreenElement ||
         null;
}

/**
 * Check if currently in fullscreen
 * @returns {boolean}
 */
export function isFullscreen() {
  return !!getFullscreenElement();
}

/**
 * Add fullscreen change listener
 * @param {Function} callback - Callback
 * @returns {Function} Remove listener function
 */
export function onFullscreenChange(callback) {
  const events = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange'
  ];

  events.forEach(event => document.addEventListener(event, callback));

  return () => {
    events.forEach(event => document.removeEventListener(event, callback));
  };
}

/**
 * Get max texture size for WebGL
 * @returns {number}
 */
export function getMaxTextureSize() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      return gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }
  } catch (e) {
    // WebGL not available
  }
  return 2048; // Default fallback
}

/**
 * Check if device prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if device prefers dark color scheme
 * @returns {boolean}
 */
export function prefersDarkMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get viewport dimensions
 * @returns {{width: number, height: number}}
 */
export function getViewportSize() {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight
  };
}

/**
 * Check if device is in portrait orientation
 * @returns {boolean}
 */
export function isPortrait() {
  const viewport = getViewportSize();
  return viewport.height > viewport.width;
}

/**
 * Check if device is in landscape orientation
 * @returns {boolean}
 */
export function isLandscape() {
  return !isPortrait();
}

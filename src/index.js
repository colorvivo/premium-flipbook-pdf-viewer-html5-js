/**
 * Premium FlipBook PDF Viewer
 * A complete flipbook PDF/image viewer library with WebGL 3D, CSS 3D/2D, and Swipe rendering modes
 *
 * @module premium-flipbook-pdf-viewer
 */

import PremiumFlipBook from './PremiumFlipBook.js';
import { defaultOptions } from './defaultOptions.js';
import { EventEmitter } from './core/EventEmitter.js';
import { StateManager } from './core/StateManager.js';
import { RendererManager } from './core/RendererManager.js';
import { SourceLoader } from './sources/SourceLoader.js';
import { UIManager } from './ui/UIManager.js';
import { ErrorCodes, FlipBookError } from './utils/errors.js';

// Import styles
import './styles/premium-flipbook.css';

// Named exports for advanced usage
export {
  PremiumFlipBook,
  defaultOptions,
  EventEmitter,
  StateManager,
  RendererManager,
  SourceLoader,
  UIManager,
  ErrorCodes,
  FlipBookError
};

// Default export
export default PremiumFlipBook;

// UMD/IIFE global export
if (typeof window !== 'undefined') {
  window.PremiumFlipBook = PremiumFlipBook;
}

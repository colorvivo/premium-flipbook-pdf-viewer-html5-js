/**
 * SourceLoader - Factory for creating source loaders
 */

import { PDFSource } from './PDFSource.js';
import { ImageSource } from './ImageSource.js';
import { OptimizedSource } from './OptimizedSource.js';
import { ErrorCodes, FlipBookError } from '../utils/errors.js';

/**
 * Source type enumeration
 */
export const SourceType = {
  PDF: 'pdf',
  IMAGES: 'images',
  OPTIMIZED: 'optimized'
};

/**
 * Factory for creating appropriate source loaders
 */
export class SourceLoader {
  /**
   * Create a source loader based on options
   * @param {Object} options - FlipBook options
   * @param {Object} callbacks - Callback functions
   * @returns {Promise<BaseSource>}
   */
  static async create(options, callbacks = {}) {
    const { pdfUrl, images, optimizedImages } = options;

    // Determine source type
    let source;

    if (optimizedImages) {
      // Optimized images source (JSON + images)
      source = new OptimizedSource(options);
    } else if (images && Array.isArray(images) && images.length > 0) {
      // Direct image array source
      source = new ImageSource(options);
    } else if (pdfUrl) {
      // PDF source
      source = new PDFSource(options);
    } else {
      throw new FlipBookError(ErrorCodes.NO_SOURCE);
    }

    // Initialize the source
    await source.init(callbacks);

    return source;
  }

  /**
   * Detect source type from options
   * @param {Object} options - FlipBook options
   * @returns {string|null}
   */
  static detectType(options) {
    if (options.optimizedImages) return SourceType.OPTIMIZED;
    if (options.images && Array.isArray(options.images)) return SourceType.IMAGES;
    if (options.pdfUrl) return SourceType.PDF;
    return null;
  }

  /**
   * Validate source options
   * @param {Object} options - FlipBook options
   * @returns {Object} Validation result
   */
  static validate(options) {
    const errors = [];
    const warnings = [];

    const type = SourceLoader.detectType(options);

    if (!type) {
      errors.push('No source provided. Specify pdfUrl, images, or optimizedImages.');
    }

    if (type === SourceType.PDF) {
      if (!options.pdfUrl || typeof options.pdfUrl !== 'string') {
        errors.push('pdfUrl must be a valid URL string');
      }
    }

    if (type === SourceType.IMAGES) {
      if (!Array.isArray(options.images)) {
        errors.push('images must be an array');
      } else if (options.images.length === 0) {
        errors.push('images array cannot be empty');
      } else {
        options.images.forEach((img, i) => {
          if (typeof img !== 'string') {
            errors.push(`images[${i}] must be a URL string`);
          }
        });
      }
    }

    if (type === SourceType.OPTIMIZED) {
      const opt = options.optimizedImages;
      if (typeof opt === 'object') {
        if (opt.jsonUrl && typeof opt.jsonUrl !== 'string') {
          errors.push('optimizedImages.jsonUrl must be a URL string');
        }
        if (opt.pages && !Array.isArray(opt.pages)) {
          errors.push('optimizedImages.pages must be an array');
        }
      } else {
        errors.push('optimizedImages must be an object with jsonUrl or pages');
      }
    }

    return {
      valid: errors.length === 0,
      type,
      errors,
      warnings
    };
  }
}

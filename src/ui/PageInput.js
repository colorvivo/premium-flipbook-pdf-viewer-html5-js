/**
 * PageInput - Page number input component
 */

import { createElement } from '../utils/dom.js';

/**
 * Page input component
 */
export class PageInput {
  /**
   * Create a page input
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.pageInputOptions = options.ui?.pageInput || {};
    this.i18n = options.i18n?.strings || {};

    this.element = null;
    this.input = null;
    this.totalSpan = null;
  }

  /**
   * Render the component
   * @returns {HTMLElement}
   */
  render() {
    const showTotal = this.pageInputOptions.showTotal !== false;

    this.element = createElement('div', {
      className: 'pfb-page-input'
    });

    // Input container
    const inputContainer = createElement('div', {
      className: 'pfb-page-input__container'
    });

    // Page input
    this.input = createElement('input', {
      type: 'text',
      className: 'pfb-page-input__field',
      inputmode: 'numeric',
      pattern: '[0-9]*',
      'aria-label': 'Page number',
      value: this.state.get('currentPage')
    });

    // Event listeners
    this.input.addEventListener('keydown', this._onKeyDown.bind(this));
    this.input.addEventListener('focus', this._onFocus.bind(this));
    this.input.addEventListener('blur', this._onBlur.bind(this));
    this.input.addEventListener('change', this._onChange.bind(this));

    inputContainer.appendChild(this.input);

    // Total pages
    if (showTotal) {
      const separator = createElement('span', {
        className: 'pfb-page-input__separator'
      }, this.i18n.pageOf || 'of');

      this.totalSpan = createElement('span', {
        className: 'pfb-page-input__total'
      }, String(this.state.get('totalPages')));

      inputContainer.appendChild(separator);
      inputContainer.appendChild(this.totalSpan);
    }

    this.element.appendChild(inputContainer);

    return this.element;
  }

  /**
   * Handle key down
   * @private
   */
  _onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._goToInputPage();
      this.input.blur();
    } else if (e.key === 'Escape') {
      this.input.value = this.state.get('currentPage');
      this.input.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._incrementPage(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._incrementPage(-1);
    }
  }

  /**
   * Handle focus
   * @private
   */
  _onFocus() {
    this.input.select();
    this.element.classList.add('pfb-page-input--focused');
  }

  /**
   * Handle blur
   * @private
   */
  _onBlur() {
    this.element.classList.remove('pfb-page-input--focused');
    // Reset to current page if invalid
    const value = parseInt(this.input.value, 10);
    if (isNaN(value) || value < 1 || value > this.state.get('totalPages')) {
      this.input.value = this.state.get('currentPage');
    }
  }

  /**
   * Handle change
   * @private
   */
  _onChange() {
    this._goToInputPage();
  }

  /**
   * Go to the page in the input
   * @private
   */
  _goToInputPage() {
    const value = parseInt(this.input.value, 10);
    if (!isNaN(value)) {
      this.flipbook.goToPage(value);
    }
  }

  /**
   * Increment page number
   * @private
   */
  _incrementPage(delta) {
    const current = parseInt(this.input.value, 10) || this.state.get('currentPage');
    const newPage = Math.max(1, Math.min(this.state.get('totalPages'), current + delta));
    this.input.value = newPage;
    this.flipbook.goToPage(newPage);
  }

  /**
   * Update display
   */
  update() {
    if (this.input && document.activeElement !== this.input) {
      this.input.value = this.state.get('currentPage');
    }

    if (this.totalSpan) {
      this.totalSpan.textContent = this.state.get('totalPages');
    }
  }

  /**
   * Set focus on input
   */
  focus() {
    if (this.input) {
      this.input.focus();
    }
  }

  /**
   * Destroy component
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.input = null;
    this.totalSpan = null;
  }
}

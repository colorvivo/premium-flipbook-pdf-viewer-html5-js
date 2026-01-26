/**
 * SearchPanel - Search interface panel
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { createElement } from '../utils/dom.js';
import { createIconElement } from './icons.js';

/**
 * Search panel component
 */
export class SearchPanel extends EventEmitter {
  /**
   * Create a search panel
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.searchOptions = options.ui?.search || {};
    this.i18n = options.i18n?.strings || {};

    this.element = null;
    this.inputElement = null;
    this.resultsElement = null;
    this.resultsCountElement = null;

    this._isOpen = false;
    this._results = [];
    this._currentIndex = -1;
    this._searchTimeout = null;
  }

  /**
   * Initialize the panel
   * @param {HTMLElement} container - Container element
   */
  init(container) {
    // Create panel element
    this.element = createElement('div', {
      className: 'pfb-search',
      role: 'search',
      'aria-label': this.i18n.search || 'Search'
    });

    // Header
    const header = createElement('div', {
      className: 'pfb-search__header'
    });

    const title = createElement('span', {
      className: 'pfb-search__title'
    }, this.i18n.search || 'Search');

    const closeBtn = createElement('button', {
      className: 'pfb-search__close',
      type: 'button',
      'aria-label': this.i18n.close || 'Close',
      onClick: () => this.close()
    });
    closeBtn.appendChild(createIconElement('close'));

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Search form
    const form = createElement('form', {
      className: 'pfb-search__form',
      onSubmit: (e) => {
        e.preventDefault();
        this._search();
      }
    });

    const inputWrapper = createElement('div', {
      className: 'pfb-search__input-wrapper'
    });

    this.inputElement = createElement('input', {
      type: 'search',
      className: 'pfb-search__input',
      placeholder: this.i18n.search || 'Search...',
      'aria-label': this.i18n.search || 'Search',
      onInput: () => this._onInput()
    });

    const searchIcon = createIconElement('search', 'pfb-search__icon');

    inputWrapper.appendChild(searchIcon);
    inputWrapper.appendChild(this.inputElement);

    // Navigation buttons
    const navButtons = createElement('div', {
      className: 'pfb-search__nav'
    });

    const prevBtn = createElement('button', {
      type: 'button',
      className: 'pfb-search__nav-btn',
      'aria-label': 'Previous result',
      onClick: () => this._goToResult(-1)
    });
    prevBtn.appendChild(createIconElement('chevronUp'));

    const nextBtn = createElement('button', {
      type: 'button',
      className: 'pfb-search__nav-btn',
      'aria-label': 'Next result',
      onClick: () => this._goToResult(1)
    });
    nextBtn.appendChild(createIconElement('chevronDown'));

    this.resultsCountElement = createElement('span', {
      className: 'pfb-search__count'
    });

    navButtons.appendChild(prevBtn);
    navButtons.appendChild(nextBtn);
    navButtons.appendChild(this.resultsCountElement);

    form.appendChild(inputWrapper);
    form.appendChild(navButtons);

    // Results list
    this.resultsElement = createElement('div', {
      className: 'pfb-search__results',
      role: 'listbox'
    });

    this.element.appendChild(header);
    this.element.appendChild(form);
    this.element.appendChild(this.resultsElement);
    container.appendChild(this.element);

    // Bind state events
    this._bindStateEvents();
  }

  /**
   * Handle input changes
   * @private
   */
  _onInput() {
    // Debounce search
    clearTimeout(this._searchTimeout);
    this._searchTimeout = setTimeout(() => {
      this._search();
    }, 300);
  }

  /**
   * Perform search
   * @private
   */
  async _search() {
    const query = this.inputElement.value.trim();

    if (!query) {
      this._clearResults();
      return;
    }

    this.element.classList.add('pfb-search--loading');

    try {
      this._results = await this.flipbook.search(query);
      this._currentIndex = -1;
      this._displayResults();

      if (this._results.length > 0) {
        this._goToResult(1); // Go to first result
      }

      this.state.set({
        searchQuery: query,
        searchResults: this._results,
        currentSearchIndex: this._currentIndex
      });

    } catch (error) {
      console.error('Search error:', error);
      this._displayError();
    } finally {
      this.element.classList.remove('pfb-search--loading');
    }
  }

  /**
   * Display search results
   * @private
   */
  _displayResults() {
    this.resultsElement.innerHTML = '';

    if (this._results.length === 0) {
      this.resultsElement.innerHTML = `
        <div class="pfb-search__no-results">
          ${this.i18n.noResults || 'No results found'}
        </div>
      `;
      this._updateCount();
      return;
    }

    this._results.forEach((result, index) => {
      const item = this._createResultItem(result, index);
      this.resultsElement.appendChild(item);
    });

    this._updateCount();
  }

  /**
   * Create a result item element
   * @private
   */
  _createResultItem(result, index) {
    const item = createElement('div', {
      className: 'pfb-search__result',
      role: 'option',
      tabindex: '0',
      dataset: { index },
      onClick: () => this._selectResult(index),
      onKeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._selectResult(index);
        }
      }
    });

    // Page number
    const page = createElement('span', {
      className: 'pfb-search__result-page'
    }, `Page ${result.page}`);

    // Context with highlight
    const context = createElement('span', {
      className: 'pfb-search__result-context'
    });

    // Highlight the match
    const { context: contextText, highlight } = result;
    const before = contextText.substring(0, highlight.start);
    const match = contextText.substring(highlight.start, highlight.end);
    const after = contextText.substring(highlight.end);

    context.innerHTML = `${this._escapeHtml(before)}<mark>${this._escapeHtml(match)}</mark>${this._escapeHtml(after)}`;

    item.appendChild(page);
    item.appendChild(context);

    return item;
  }

  /**
   * Select a result
   * @private
   */
  _selectResult(index) {
    this._currentIndex = index;
    this._updateActiveResult();

    const result = this._results[index];
    if (result) {
      this.flipbook.goToPage(result.page);
      this.emit('resultSelect', { result, index });
    }

    this._updateCount();
    this.state.set({ currentSearchIndex: index });
  }

  /**
   * Navigate results
   * @private
   */
  _goToResult(direction) {
    if (this._results.length === 0) return;

    let newIndex = this._currentIndex + direction;

    // Wrap around
    if (newIndex < 0) newIndex = this._results.length - 1;
    if (newIndex >= this._results.length) newIndex = 0;

    this._selectResult(newIndex);

    // Scroll result into view
    const resultItem = this.resultsElement.querySelector(`[data-index="${newIndex}"]`);
    if (resultItem) {
      resultItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Update active result highlight
   * @private
   */
  _updateActiveResult() {
    // Remove current active
    const currentActive = this.resultsElement.querySelector('.pfb-search__result--active');
    if (currentActive) {
      currentActive.classList.remove('pfb-search__result--active');
    }

    // Add new active
    const newActive = this.resultsElement.querySelector(`[data-index="${this._currentIndex}"]`);
    if (newActive) {
      newActive.classList.add('pfb-search__result--active');
    }
  }

  /**
   * Update results count display
   * @private
   */
  _updateCount() {
    if (this._results.length === 0) {
      this.resultsCountElement.textContent = '';
    } else {
      this.resultsCountElement.textContent = `${this._currentIndex + 1} / ${this._results.length}`;
    }
  }

  /**
   * Clear results
   * @private
   */
  _clearResults() {
    this._results = [];
    this._currentIndex = -1;
    this.resultsElement.innerHTML = '';
    this._updateCount();
    this.state.set({ searchQuery: '', searchResults: [], currentSearchIndex: -1 });
  }

  /**
   * Display error state
   * @private
   */
  _displayError() {
    this.resultsElement.innerHTML = `
      <div class="pfb-search__error">
        ${this.i18n.error || 'Error performing search'}
      </div>
    `;
  }

  /**
   * Escape HTML
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Bind state events
   * @private
   */
  _bindStateEvents() {
    this.state.on('searchToggle', ({ isOpen }) => {
      this._isOpen = isOpen;
      this.element.classList.toggle('pfb-search--open', isOpen);

      if (isOpen) {
        setTimeout(() => this.inputElement.focus(), 100);
      }
    });
  }

  /**
   * Open the panel
   */
  open() {
    this._isOpen = true;
    this.state.set({ isSearchOpen: true });
    setTimeout(() => this.inputElement.focus(), 100);
  }

  /**
   * Close the panel
   */
  close() {
    this._isOpen = false;
    this.state.set({ isSearchOpen: false });
  }

  /**
   * Toggle the panel
   * @param {boolean} [show] - Force show/hide
   */
  toggle(show) {
    if (show === undefined) {
      show = !this._isOpen;
    }

    if (show) {
      this.open();
    } else {
      this.close();
    }
  }

  /**
   * Clear search
   */
  clear() {
    this.inputElement.value = '';
    this._clearResults();
  }

  /**
   * Check if panel is open
   * @returns {boolean}
   */
  isOpen() {
    return this._isOpen;
  }

  /**
   * Destroy the panel
   */
  destroy() {
    clearTimeout(this._searchTimeout);

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this._results = [];
    this.element = null;
    this.inputElement = null;
    this.resultsElement = null;

    this.removeAllListeners();
  }
}

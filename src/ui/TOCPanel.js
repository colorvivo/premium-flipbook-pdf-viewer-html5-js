/**
 * TOCPanel - Table of Contents panel
 */

import { EventEmitter } from '../core/EventEmitter.js';
import { createElement } from '../utils/dom.js';
import { createIconElement } from './icons.js';

/**
 * Table of Contents panel component
 */
export class TOCPanel extends EventEmitter {
  /**
   * Create a TOC panel
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.source = flipbook.source;
    this.options = options;

    this.tocOptions = options.ui?.toc || {};
    this.i18n = options.i18n?.strings || {};

    this.element = null;
    this.listElement = null;

    this._isOpen = false;
  }

  /**
   * Initialize the panel
   * @param {HTMLElement} container - Container element
   */
  init(container) {
    const position = this.tocOptions.position || 'left';

    // Create panel element
    this.element = createElement('div', {
      className: `pfb-toc pfb-toc--${position}`,
      'aria-label': this.i18n.tableOfContents || 'Table of Contents',
      role: 'navigation'
    });

    // Header
    const header = createElement('div', {
      className: 'pfb-toc__header'
    });

    const title = createElement('span', {
      className: 'pfb-toc__title'
    }, this.i18n.tableOfContents || 'Table of Contents');

    const closeBtn = createElement('button', {
      className: 'pfb-toc__close',
      type: 'button',
      'aria-label': this.i18n.close || 'Close',
      onClick: () => this.close()
    });
    closeBtn.appendChild(createIconElement('close'));

    header.appendChild(title);
    header.appendChild(closeBtn);

    // TOC list
    this.listElement = createElement('nav', {
      className: 'pfb-toc__list',
      role: 'tree'
    });

    this.element.appendChild(header);
    this.element.appendChild(this.listElement);
    container.appendChild(this.element);

    // Populate TOC
    this._populateTOC();

    // Listen for state changes
    this._bindStateEvents();
  }

  /**
   * Populate TOC from source
   * @private
   */
  _populateTOC() {
    const toc = this.source.getTableOfContents();

    if (!toc || toc.length === 0) {
      this.listElement.innerHTML = `
        <div class="pfb-toc__empty">
          ${this.i18n.noResults || 'No table of contents available'}
        </div>
      `;
      return;
    }

    // Build TOC tree
    const tree = this._buildTOCTree(toc);
    this.listElement.appendChild(tree);
  }

  /**
   * Build TOC tree recursively
   * @private
   */
  _buildTOCTree(items, level = 0) {
    const ul = createElement('ul', {
      className: `pfb-toc__level pfb-toc__level--${level}`,
      role: 'group'
    });

    items.forEach(item => {
      const li = this._createTOCItem(item, level);
      ul.appendChild(li);
    });

    return ul;
  }

  /**
   * Create a TOC item
   * @private
   */
  _createTOCItem(item, level) {
    const hasChildren = item.children && item.children.length > 0;

    const li = createElement('li', {
      className: 'pfb-toc__item',
      role: 'treeitem',
      'aria-expanded': hasChildren ? 'true' : undefined,
      dataset: { page: item.page }
    });

    // Link
    const link = createElement('a', {
      href: `#page-${item.page}`,
      className: 'pfb-toc__link',
      style: { paddingLeft: `${level * 16 + 12}px` },
      onClick: (e) => {
        e.preventDefault();
        this._onItemClick(item.page);
      }
    });

    // Toggle button for items with children
    if (hasChildren) {
      const toggle = createElement('button', {
        className: 'pfb-toc__toggle',
        type: 'button',
        'aria-label': 'Toggle section',
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._toggleSection(li);
        }
      });
      toggle.appendChild(createIconElement('chevronDown'));
      link.appendChild(toggle);
    }

    // Title
    const titleSpan = createElement('span', {
      className: 'pfb-toc__text'
    }, item.title);

    // Page number
    const pageSpan = createElement('span', {
      className: 'pfb-toc__page'
    }, String(item.page));

    link.appendChild(titleSpan);
    link.appendChild(pageSpan);
    li.appendChild(link);

    // Children
    if (hasChildren) {
      const childrenTree = this._buildTOCTree(item.children, level + 1);
      li.appendChild(childrenTree);
    }

    return li;
  }

  /**
   * Handle item click
   * @private
   */
  _onItemClick(pageNumber) {
    this.flipbook.goToPage(pageNumber);
    this.emit('pageSelect', { page: pageNumber });

    // Close panel on mobile
    if (window.innerWidth < 768) {
      this.close();
    }
  }

  /**
   * Toggle a section's expanded state
   * @private
   */
  _toggleSection(li) {
    const isExpanded = li.getAttribute('aria-expanded') === 'true';
    li.setAttribute('aria-expanded', !isExpanded);
    li.classList.toggle('pfb-toc__item--collapsed', isExpanded);
  }

  /**
   * Bind state events
   * @private
   */
  _bindStateEvents() {
    this.state.on('pageChange', ({ page }) => {
      this._updateActiveItem(page);
    });

    this.state.on('tocToggle', ({ isOpen }) => {
      this._isOpen = isOpen;
      this.element.classList.toggle('pfb-toc--open', isOpen);
    });
  }

  /**
   * Update active item highlight
   * @private
   */
  _updateActiveItem(pageNumber) {
    // Remove current active
    const currentActive = this.listElement.querySelector('.pfb-toc__link--active');
    if (currentActive) {
      currentActive.classList.remove('pfb-toc__link--active');
    }

    // Find closest item to current page
    const items = this.listElement.querySelectorAll('[data-page]');
    let closestItem = null;
    let closestPage = 0;

    items.forEach(item => {
      const itemPage = parseInt(item.dataset.page, 10);
      if (itemPage <= pageNumber && itemPage > closestPage) {
        closestPage = itemPage;
        closestItem = item;
      }
    });

    if (closestItem) {
      const link = closestItem.querySelector('.pfb-toc__link');
      if (link) {
        link.classList.add('pfb-toc__link--active');
      }
    }
  }

  /**
   * Open the panel
   */
  open() {
    this._isOpen = true;
    this.state.set({ isTocOpen: true });
    this._updateActiveItem(this.state.get('currentPage'));
  }

  /**
   * Close the panel
   */
  close() {
    this._isOpen = false;
    this.state.set({ isTocOpen: false });
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
   * Check if panel is open
   * @returns {boolean}
   */
  isOpen() {
    return this._isOpen;
  }

  /**
   * Refresh TOC (e.g., after source change)
   */
  refresh() {
    this.listElement.innerHTML = '';
    this._populateTOC();
  }

  /**
   * Destroy the panel
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.listElement = null;

    this.removeAllListeners();
  }
}

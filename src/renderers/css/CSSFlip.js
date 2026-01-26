/**
 * CSSFlip - Simple CSS page transition
 */

import { setStyles } from '../../utils/dom.js';

/**
 * CSS flip/slide animation handler
 */
export class CSSFlip {
  constructor(renderer) {
    this.renderer = renderer;
    this.isAnimating = false;
  }

  /**
   * Animate page transition (simple crossfade + slide)
   */
  async animate(fromPage, toPage, direction) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const duration = this.renderer.flipDuration;

    try {
      // Pre-render the target page in the background
      const targetPageContent = await this.renderer.source.getPage(toPage);

      // Get the left page content element
      const contentEl = this.renderer.leftPage.querySelector('.pfb-css-page__content');

      // Create a temporary image for the new page
      let newImg;
      if (targetPageContent instanceof HTMLCanvasElement) {
        newImg = new Image();
        newImg.src = targetPageContent.toDataURL();
      } else if (targetPageContent instanceof HTMLImageElement) {
        newImg = targetPageContent.cloneNode();
      }

      if (newImg) {
        newImg.className = 'pfb-css-page__image';
        newImg.style.position = 'absolute';
        newImg.style.top = '0';
        newImg.style.left = '0';
        newImg.style.opacity = '0';
        newImg.style.transition = `opacity ${duration}ms ease-in-out`;

        contentEl.appendChild(newImg);

        // Force reflow
        void newImg.offsetHeight;

        // Fade in new image
        newImg.style.opacity = '1';

        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, duration));

        // Clean up - remove old image and fix new one
        const oldImg = contentEl.querySelector('.pfb-css-page__image:not(:last-child)');
        if (oldImg) {
          oldImg.remove();
        }
        newImg.style.position = '';
        newImg.style.transition = '';
      }

    } catch (error) {
      console.error('Flip animation error:', error);
    } finally {
      this.isAnimating = false;
    }
  }

  cancel() {
    this.isAnimating = false;
  }

  destroy() {
    this.cancel();
    this.renderer = null;
  }
}

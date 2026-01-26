/**
 * FlipAnimation - Simple 3D page flip animation for WebGL renderer
 */

/**
 * Easing functions
 */
const Easing = {
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
};

/**
 * WebGL flip animation handler
 */
export class FlipAnimation {
  constructor(renderer) {
    this.renderer = renderer;
    this.isAnimating = false;
    this.progress = 0;
    this._startTime = 0;
    this._duration = 600;
    this._resolve = null;
  }

  /**
   * Animate page flip - simplified version
   */
  async animate(fromPage, toPage, direction) {
    if (this.isAnimating) return;

    this._duration = this.renderer.flipDuration;
    this.isAnimating = true;
    this._startTime = performance.now();
    this.progress = 0;

    // Pre-load the target page texture
    const { source, state } = this.renderer;
    const totalPages = state.get('totalPages');

    if (toPage >= 1 && toPage <= totalPages) {
      try {
        const content = await source.getPage(toPage);
        // Store for later
        this._targetContent = content;
      } catch (e) {
        this._targetContent = null;
      }
    }

    return new Promise(resolve => {
      this._resolve = resolve;
    });
  }

  /**
   * Update animation frame
   */
  update() {
    if (!this.isAnimating) return;

    const elapsed = performance.now() - this._startTime;
    const rawProgress = Math.min(elapsed / this._duration, 1);
    this.progress = Easing.easeInOutCubic(rawProgress);

    // Simple fade effect on left page
    if (this.renderer.leftPageMesh && this.renderer.leftPageMesh.material) {
      // Fade out then fade in
      if (this.progress < 0.5) {
        this.renderer.leftPageMesh.material.opacity = 1 - (this.progress * 2);
      } else {
        // At halfway point, swap texture
        if (this.progress >= 0.5 && !this._textureSwapped) {
          this._textureSwapped = true;
          if (this._targetContent) {
            this.renderer.leftPageMesh.setTexture(this._targetContent);
          }
        }
        this.renderer.leftPageMesh.material.opacity = (this.progress - 0.5) * 2;
      }
      this.renderer.leftPageMesh.material.transparent = true;
      this.renderer.leftPageMesh.material.needsUpdate = true;
    }

    // Check if complete
    if (rawProgress >= 1) {
      this._complete();
    }
  }

  /**
   * Complete animation
   * @private
   */
  _complete() {
    this.isAnimating = false;
    this.progress = 1;
    this._textureSwapped = false;
    this._targetContent = null;

    // Restore opacity
    if (this.renderer.leftPageMesh && this.renderer.leftPageMesh.material) {
      this.renderer.leftPageMesh.material.opacity = 1;
      this.renderer.leftPageMesh.material.transparent = false;
    }

    if (this._resolve) {
      this._resolve();
      this._resolve = null;
    }
  }

  /**
   * Cancel animation
   */
  cancel() {
    if (!this.isAnimating) return;
    this._complete();
  }

  /**
   * Destroy
   */
  destroy() {
    this.cancel();
    this.renderer = null;
  }
}

/**
 * ZoomController - Handles zoom and pan functionality
 */

import { EventEmitter, Events } from '../core/EventEmitter.js';
import { getPassiveOptions } from '../utils/browser.js';

/**
 * Zoom controller
 */
export class ZoomController extends EventEmitter {
  /**
   * Create a zoom controller
   * @param {PremiumFlipBook} flipbook - FlipBook instance
   * @param {Object} options - Options
   */
  constructor(flipbook, options) {
    super();

    this.flipbook = flipbook;
    this.state = flipbook.state;
    this.options = options;

    this.zoomOptions = options.zoom || {};
    this.minZoom = this.zoomOptions.min || 1;
    this.maxZoom = this.zoomOptions.max || 4;
    this.step = this.zoomOptions.step || 0.25;
    this.doubleTapZoom = this.zoomOptions.doubleTapZoom || 2;

    // Pan state
    this._isPanning = false;
    this._startPanX = 0;
    this._startPanY = 0;
    this._lastPanX = 0;
    this._lastPanY = 0;

    // Pinch zoom state
    this._initialPinchDistance = 0;
    this._initialZoom = 1;

    // Double tap detection
    this._lastTapTime = 0;
    this._lastTapX = 0;
    this._lastTapY = 0;

    // Bound handlers
    this._onWheel = this._onWheel.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    this._init();
  }

  /**
   * Initialize zoom controller
   * @private
   */
  _init() {
    const container = this.flipbook.container;
    if (!container) return;

    // Wheel zoom
    if (this.zoomOptions.wheelZoom !== false) {
      container.addEventListener('wheel', this._onWheel, getPassiveOptions(false));
    }

    // Mouse pan
    if (this.zoomOptions.panEnabled !== false) {
      container.addEventListener('mousedown', this._onMouseDown);
      document.addEventListener('mousemove', this._onMouseMove);
      document.addEventListener('mouseup', this._onMouseUp);
    }

    // Touch pinch zoom
    if (this.zoomOptions.pinchZoom !== false) {
      container.addEventListener('touchstart', this._onTouchStart, getPassiveOptions(false));
      container.addEventListener('touchmove', this._onTouchMove, getPassiveOptions(false));
      container.addEventListener('touchend', this._onTouchEnd);
    }

    // Initialize state
    this.state.set({
      minZoom: this.minZoom,
      maxZoom: this.maxZoom
    });
  }

  /**
   * Handle wheel events
   * @private
   */
  _onWheel(e) {
    // Only zoom if Ctrl is held or if not in edit mode
    if (!e.ctrlKey && !e.metaKey) return;

    e.preventDefault();

    const delta = -Math.sign(e.deltaY) * this.step;
    const currentZoom = this.state.get('zoom');
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, currentZoom + delta));

    if (newZoom !== currentZoom) {
      // Zoom toward mouse position
      const rect = this.flipbook.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      this._zoomToPoint(newZoom, mouseX, mouseY);
    }
  }

  /**
   * Handle mouse down for panning
   * @private
   */
  _onMouseDown(e) {
    const zoom = this.state.get('zoom');
    if (zoom <= 1) return;

    // Middle mouse button or when zoomed in with left button
    if (e.button === 1 || (e.button === 0 && zoom > 1)) {
      e.preventDefault();
      this._startPan(e.clientX, e.clientY);
    }
  }

  /**
   * Handle mouse move
   * @private
   */
  _onMouseMove(e) {
    if (!this._isPanning) return;
    this._updatePan(e.clientX, e.clientY);
  }

  /**
   * Handle mouse up
   * @private
   */
  _onMouseUp(e) {
    if (this._isPanning) {
      this._endPan();
    }
  }

  /**
   * Handle touch start
   * @private
   */
  _onTouchStart(e) {
    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault();
      this._startPinch(e.touches);
    } else if (e.touches.length === 1) {
      // Check for double tap
      const touch = e.touches[0];
      const now = Date.now();
      const timeDiff = now - this._lastTapTime;
      const distX = Math.abs(touch.clientX - this._lastTapX);
      const distY = Math.abs(touch.clientY - this._lastTapY);

      if (timeDiff < 300 && distX < 30 && distY < 30) {
        // Double tap detected
        e.preventDefault();
        this._handleDoubleTap(touch.clientX, touch.clientY);
        this._lastTapTime = 0;
      } else {
        this._lastTapTime = now;
        this._lastTapX = touch.clientX;
        this._lastTapY = touch.clientY;

        // Start pan if zoomed in
        if (this.state.get('zoom') > 1) {
          this._startPan(touch.clientX, touch.clientY);
        }
      }
    }
  }

  /**
   * Handle touch move
   * @private
   */
  _onTouchMove(e) {
    if (e.touches.length === 2 && this._initialPinchDistance > 0) {
      // Pinch move
      e.preventDefault();
      this._updatePinch(e.touches);
    } else if (e.touches.length === 1 && this._isPanning) {
      const touch = e.touches[0];
      this._updatePan(touch.clientX, touch.clientY);
    }
  }

  /**
   * Handle touch end
   * @private
   */
  _onTouchEnd(e) {
    if (e.touches.length === 0) {
      this._endPinch();
      this._endPan();
    } else if (e.touches.length === 1) {
      // Switching from pinch to pan
      this._endPinch();
      if (this.state.get('zoom') > 1) {
        const touch = e.touches[0];
        this._startPan(touch.clientX, touch.clientY);
      }
    }
  }

  /**
   * Start panning
   * @private
   */
  _startPan(x, y) {
    this._isPanning = true;
    this._startPanX = x;
    this._startPanY = y;
    this._lastPanX = this.state.get('panX');
    this._lastPanY = this.state.get('panY');

    this.state.set({ isPanning: true });
    this.emit(Events.PAN_START, { x, y });
  }

  /**
   * Update pan position
   * @private
   */
  _updatePan(x, y) {
    if (!this._isPanning) return;

    const deltaX = x - this._startPanX;
    const deltaY = y - this._startPanY;

    const zoom = this.state.get('zoom');
    const newPanX = this._lastPanX + deltaX / zoom;
    const newPanY = this._lastPanY + deltaY / zoom;

    // Clamp pan to bounds
    const bounds = this._getPanBounds();
    const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, newPanX));
    const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, newPanY));

    this.state.setPan(clampedX, clampedY);
    this._applyTransform();

    this.emit(Events.PAN_MOVE, { x: clampedX, y: clampedY });
  }

  /**
   * End panning
   * @private
   */
  _endPan() {
    if (!this._isPanning) return;

    this._isPanning = false;
    this.state.set({ isPanning: false });

    this.emit(Events.PAN_END, {
      x: this.state.get('panX'),
      y: this.state.get('panY')
    });
  }

  /**
   * Start pinch zoom
   * @private
   */
  _startPinch(touches) {
    const dist = this._getDistance(touches[0], touches[1]);
    this._initialPinchDistance = dist;
    this._initialZoom = this.state.get('zoom');

    this.emit(Events.ZOOM_START, { zoom: this._initialZoom });
  }

  /**
   * Update pinch zoom
   * @private
   */
  _updatePinch(touches) {
    const dist = this._getDistance(touches[0], touches[1]);
    const scale = dist / this._initialPinchDistance;
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this._initialZoom * scale));

    if (newZoom !== this.state.get('zoom')) {
      this.state.setZoom(newZoom);
      this._applyTransform();
    }
  }

  /**
   * End pinch zoom
   * @private
   */
  _endPinch() {
    if (this._initialPinchDistance === 0) return;

    this._initialPinchDistance = 0;
    this.emit(Events.ZOOM_END, { zoom: this.state.get('zoom') });
  }

  /**
   * Handle double tap to toggle zoom
   * @private
   */
  _handleDoubleTap(x, y) {
    const currentZoom = this.state.get('zoom');
    const rect = this.flipbook.container.getBoundingClientRect();

    if (currentZoom > 1) {
      // Reset zoom
      this.reset();
    } else {
      // Zoom to double tap point
      const centerX = x - rect.left - rect.width / 2;
      const centerY = y - rect.top - rect.height / 2;
      this._zoomToPoint(this.doubleTapZoom, centerX, centerY);
    }
  }

  /**
   * Zoom to a specific point
   * @private
   */
  _zoomToPoint(newZoom, x, y) {
    const currentZoom = this.state.get('zoom');
    const currentPanX = this.state.get('panX');
    const currentPanY = this.state.get('panY');

    // Calculate new pan to keep point under cursor
    const zoomRatio = newZoom / currentZoom;
    const newPanX = currentPanX - x * (1 - 1 / zoomRatio);
    const newPanY = currentPanY - y * (1 - 1 / zoomRatio);

    this.state.set({ zoom: newZoom, panX: newPanX, panY: newPanY });
    this._applyTransform();
  }

  /**
   * Get distance between two touch points
   * @private
   */
  _getDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get pan bounds based on zoom level
   * @private
   */
  _getPanBounds() {
    const container = this.flipbook.container;
    const zoom = this.state.get('zoom');

    const maxPan = container.offsetWidth * (zoom - 1) / 2;
    const maxPanY = container.offsetHeight * (zoom - 1) / 2;

    return {
      minX: -maxPan,
      maxX: maxPan,
      minY: -maxPanY,
      maxY: maxPanY
    };
  }

  /**
   * Apply transform to renderer
   * @private
   */
  _applyTransform() {
    const zoom = this.state.get('zoom');
    const panX = this.state.get('panX');
    const panY = this.state.get('panY');

    if (this.flipbook.renderer) {
      this.flipbook.renderer.applyZoom(zoom, panX, panY);
    }
  }

  /**
   * Set zoom level
   * @param {number} zoom - Zoom level
   * @returns {boolean}
   */
  setZoom(zoom) {
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    if (newZoom !== this.state.get('zoom')) {
      this.state.setZoom(newZoom);
      this._applyTransform();
      return true;
    }
    return false;
  }

  /**
   * Zoom in
   * @param {number} [step] - Zoom step
   * @returns {boolean}
   */
  zoomIn(step = this.step) {
    return this.setZoom(this.state.get('zoom') + step);
  }

  /**
   * Zoom out
   * @param {number} [step] - Zoom step
   * @returns {boolean}
   */
  zoomOut(step = this.step) {
    return this.setZoom(this.state.get('zoom') - step);
  }

  /**
   * Reset zoom and pan
   * @returns {boolean}
   */
  reset() {
    const changed = this.state.get('zoom') !== 1 ||
                    this.state.get('panX') !== 0 ||
                    this.state.get('panY') !== 0;

    this.state.set({ zoom: 1, panX: 0, panY: 0 });
    this._applyTransform();

    return changed;
  }

  /**
   * Destroy zoom controller
   */
  destroy() {
    const container = this.flipbook.container;
    if (container) {
      container.removeEventListener('wheel', this._onWheel);
      container.removeEventListener('mousedown', this._onMouseDown);
      container.removeEventListener('touchstart', this._onTouchStart);
      container.removeEventListener('touchmove', this._onTouchMove);
      container.removeEventListener('touchend', this._onTouchEnd);
    }

    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);

    this.removeAllListeners();
  }
}

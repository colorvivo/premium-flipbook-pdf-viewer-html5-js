/**
 * WebGLRenderer - Three.js based 3D page flip renderer
 */

import { BaseRenderer, RendererType } from '../BaseRenderer.js';
import { PageMesh } from './PageMesh.js';
import { FlipAnimation } from './FlipAnimation.js';
import { Lighting } from './Lighting.js';
import { ErrorCodes, FlipBookError } from '../../utils/errors.js';

/**
 * WebGL 3D renderer using Three.js
 */
export class WebGLRenderer extends BaseRenderer {
  constructor(flipbook, options) {
    super(flipbook, options);

    this.type = RendererType.WEBGL;

    // WebGL specific options
    this.webglOptions = options.webgl || {};
    this.antialias = this.webglOptions.antialias !== false;
    this.alpha = this.webglOptions.alpha !== false;
    this.maxTextureSize = this.webglOptions.maxTextureSize || 2048;
    this.flipDuration = this.webglOptions.flipDuration || 800;
    this.bendIntensity = this.webglOptions.bendIntensity || 0.3;

    // Three.js components
    this.THREE = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Page meshes
    this.leftPageMesh = null;
    this.rightPageMesh = null;
    this.flippingMesh = null;

    // Helpers
    this.lighting = null;
    this.flipAnimation = null;
    this.textureLoader = null;

    // Animation frame
    this._animationFrame = null;
    this._isRendering = false;

    // Context lost handling
    this._contextLost = false;
  }

  /**
   * Initialize the WebGL renderer
   * @param {HTMLElement} container - Container element
   * @returns {Promise}
   */
  async init(container) {
    await super.init(container);

    // Load Three.js
    this.THREE = await this._loadThreeJS();

    // Create renderer
    this._createRenderer();

    // Create scene
    this._createScene();

    // Create camera
    this._createCamera();

    // Set up lighting
    this.lighting = new Lighting(this, this.webglOptions.lighting);
    this.lighting.setup(this.scene);

    // Create page meshes
    await this._createPageMeshes();

    // Set up flip animation
    this.flipAnimation = new FlipAnimation(this);

    // Start render loop
    this._startRenderLoop();

    // Initial render
    await this.render();

    return this;
  }

  /**
   * Load Three.js library
   * @private
   */
  async _loadThreeJS() {
    // Check if already loaded globally
    if (typeof window !== 'undefined' && window.THREE) {
      return window.THREE;
    }

    try {
      const THREE = await import('three');
      return THREE;
    } catch (error) {
      throw new FlipBookError(
        ErrorCodes.THREE_JS_NOT_FOUND,
        'Three.js library not found. Install three or use CSS renderer.',
        error
      );
    }
  }

  /**
   * Create WebGL renderer
   * @private
   */
  _createRenderer() {
    const { THREE } = this;

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.antialias,
      alpha: this.alpha,
      preserveDrawingBuffer: this.webglOptions.preserveDrawingBuffer || false,
      powerPreference: this.webglOptions.powerPreference || 'default'
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.viewportWidth, this.viewportHeight);
    this.renderer.setClearColor(0x000000, 0);

    // Add canvas to container
    this.renderer.domElement.className = 'pfb-webgl-canvas';
    this.container.appendChild(this.renderer.domElement);

    // Handle context loss
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this._contextLost = true;
      this.emit('contextLost');
    });

    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this._contextLost = false;
      this._createScene();
      this.render();
      this.emit('contextRestored');
    });

    // Create texture loader
    this.textureLoader = new THREE.TextureLoader();
  }

  /**
   * Create 3D scene
   * @private
   */
  _createScene() {
    const { THREE } = this;
    this.scene = new THREE.Scene();
  }

  /**
   * Create camera
   * @private
   */
  _createCamera() {
    const { THREE } = this;

    const fov = 45;
    const aspect = this.viewportWidth / this.viewportHeight;
    const near = 0.1;
    const far = 1000;

    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    // Position camera to see the book
    this._updateCameraPosition();
  }

  /**
   * Update camera position based on viewport and zoom
   * @private
   */
  _updateCameraPosition() {
    if (!this.camera) return;

    const displayMode = this.state.get('displayMode');
    const zoom = this.state.get('zoom');
    const panX = this.state.get('panX');
    const panY = this.state.get('panY');

    const isSingle = displayMode === 'single';
    const bookWidth = isSingle ? 1 : 2;
    const bookHeight = 1.414; // A4 ratio

    // Calculate distance to fit book in view (considering both width and height)
    const fov = this.camera.fov * (Math.PI / 180);
    const aspect = this.viewportWidth / this.viewportHeight;

    // Distance needed to fit width
    const distanceForWidth = (bookWidth / 2) / Math.tan(fov / 2) / aspect;
    // Distance needed to fit height
    const distanceForHeight = (bookHeight / 2) / Math.tan(fov / 2);

    // Use the larger distance to ensure book fits
    const distance = Math.max(distanceForWidth, distanceForHeight) / zoom;

    this.camera.position.set(panX * 0.01, panY * 0.01, distance + 0.5);
    this.camera.lookAt(0, 0, 0);

    // Update aspect ratio
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Create page meshes
   * @private
   */
  async _createPageMeshes() {
    const displayMode = this.state.get('displayMode');

    // Left page
    this.leftPageMesh = new PageMesh(this, 'left');
    await this.leftPageMesh.init();
    this.scene.add(this.leftPageMesh.mesh);

    // Right page (for double page mode)
    this.rightPageMesh = new PageMesh(this, 'right');
    await this.rightPageMesh.init();
    this.scene.add(this.rightPageMesh.mesh);

    // Update visibility
    this.rightPageMesh.mesh.visible = displayMode === 'double';
  }

  /**
   * Start render loop
   * @private
   */
  _startRenderLoop() {
    if (this._isRendering) return;
    this._isRendering = true;

    const animate = () => {
      if (!this._isRendering || this._contextLost) return;

      this._animationFrame = requestAnimationFrame(animate);

      // Update animations
      if (this.flipAnimation && this.flipAnimation.isAnimating) {
        this.flipAnimation.update();
      }

      // Render scene
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  /**
   * Stop render loop
   * @private
   */
  _stopRenderLoop() {
    this._isRendering = false;
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Render current pages
   * @returns {Promise}
   */
  async render() {
    if (!this.initialized || this._contextLost) return;

    const currentPage = this.state.get('currentPage');
    const totalPages = this.state.get('totalPages');
    const displayMode = this.state.get('displayMode');
    const isSingle = displayMode === 'single';

    this._updateCameraPosition();

    // Update page visibility
    this.rightPageMesh.mesh.visible = !isSingle;

    // Load textures for current pages
    await this._loadPageTexture(this.leftPageMesh, currentPage);

    if (!isSingle && currentPage < totalPages) {
      await this._loadPageTexture(this.rightPageMesh, currentPage + 1);
    }

    // Update mesh positions
    this._updateMeshPositions();
  }

  /**
   * Load texture for a page mesh
   * @private
   */
  async _loadPageTexture(pageMesh, pageNumber) {
    if (!pageNumber || pageNumber < 1 || pageNumber > this.state.get('totalPages')) {
      pageMesh.setBlankTexture();
      return;
    }

    try {
      const pageContent = await this.source.getPage(pageNumber);
      let textureSource;

      if (pageContent instanceof HTMLCanvasElement) {
        textureSource = pageContent;
      } else if (pageContent instanceof HTMLImageElement) {
        textureSource = pageContent;
      }

      if (textureSource) {
        pageMesh.setTexture(textureSource);
      }
    } catch (error) {
      console.error(`Failed to load texture for page ${pageNumber}:`, error);
      pageMesh.setErrorTexture();
    }
  }

  /**
   * Update mesh positions
   * @private
   */
  _updateMeshPositions() {
    const displayMode = this.state.get('displayMode');
    const isSingle = displayMode === 'single';

    if (isSingle) {
      this.leftPageMesh.mesh.position.set(0, 0, 0);
    } else {
      this.leftPageMesh.mesh.position.set(-0.5, 0, 0);
      this.rightPageMesh.mesh.position.set(0.5, 0, 0);
    }
  }

  /**
   * Set transition type
   * @param {string} type - 'fade', 'slide', 'flip', 'none'
   */
  setTransition(type) {
    console.log('WebGL Renderer: setTransition called with:', type);
    this.transitionType = type;
  }

  /**
   * Flip animation
   * @param {number} fromPage - Starting page
   * @param {number} toPage - Target page
   * @param {string} direction - 'forward' or 'backward'
   * @returns {Promise}
   */
  async flip(fromPage, toPage, direction) {
    if (this.isAnimating || this._contextLost) return;

    this.isAnimating = true;
    const duration = this.flipDuration;
    const type = this.transitionType || 'fade';

    try {
      switch (type) {
        case 'none':
          await this.render();
          break;

        case 'slide':
          await this._slideTransition(direction, duration);
          break;

        case 'flip':
          await this._flipTransition(direction, duration);
          break;

        case 'fade':
        default:
          await this._fadeTransition(duration);
          break;
      }
    } finally {
      this.isAnimating = false;
      const isSingle = this.state.get('displayMode') === 'single';
      // Reset mesh state for both pages
      if (this.leftPageMesh) {
        this.leftPageMesh.material.transparent = false;
        this.leftPageMesh.material.opacity = 1;
        this.leftPageMesh.mesh.position.x = isSingle ? 0 : -0.5;
        this.leftPageMesh.mesh.rotation.y = 0;
        this.leftPageMesh.mesh.scale.set(1, 1, 1);
      }
      if (!isSingle && this.rightPageMesh) {
        this.rightPageMesh.material.transparent = false;
        this.rightPageMesh.material.opacity = 1;
        this.rightPageMesh.mesh.position.x = 0.5;
        this.rightPageMesh.mesh.rotation.y = 0;
        this.rightPageMesh.mesh.scale.set(1, 1, 1);
      }
    }
  }

  /**
   * Fade transition - animates both pages in double mode
   * @private
   */
  async _fadeTransition(duration) {
    if (!this.leftPageMesh) return;

    const isSingle = this.state.get('displayMode') === 'single';
    this.leftPageMesh.material.transparent = true;
    if (!isSingle && this.rightPageMesh) {
      this.rightPageMesh.material.transparent = true;
    }

    // Fade out both pages
    await this._animateValue(1, 0, duration / 2, (v) => {
      this.leftPageMesh.material.opacity = v;
      if (!isSingle && this.rightPageMesh) {
        this.rightPageMesh.material.opacity = v;
      }
    });

    await this.render();

    // Fade in both pages
    await this._animateValue(0, 1, duration / 2, (v) => {
      this.leftPageMesh.material.opacity = v;
      if (!isSingle && this.rightPageMesh) {
        this.rightPageMesh.material.opacity = v;
      }
    });
  }

  /**
   * Slide transition - dramatic slide with rotation (both pages in double mode)
   * @private
   */
  async _slideTransition(direction, duration) {
    if (!this.leftPageMesh) return;

    const isSingle = this.state.get('displayMode') === 'single';
    const isForward = direction === 'forward';
    const leftMesh = this.leftPageMesh.mesh;
    const rightMesh = this.rightPageMesh?.mesh;
    const leftStartX = leftMesh.position.x;
    const rightStartX = rightMesh ? rightMesh.position.x : 0;
    const startZ = leftMesh.position.z;

    this.leftPageMesh.material.transparent = true;
    if (!isSingle && this.rightPageMesh) {
      this.rightPageMesh.material.transparent = true;
    }

    // Slide out: move, rotate, scale down, fade
    await this._animateValue(0, 1, duration / 2, (v) => {
      leftMesh.position.x = leftStartX + (isForward ? -1 : 1) * v;
      leftMesh.position.z = startZ - 0.5 * v;
      leftMesh.rotation.y = (isForward ? 0.3 : -0.3) * v;
      leftMesh.scale.set(1 - v * 0.3, 1 - v * 0.3, 1);
      this.leftPageMesh.material.opacity = 1 - v;

      if (!isSingle && rightMesh) {
        rightMesh.position.x = rightStartX + (isForward ? -1 : 1) * v;
        rightMesh.position.z = startZ - 0.5 * v;
        rightMesh.rotation.y = (isForward ? 0.3 : -0.3) * v;
        rightMesh.scale.set(1 - v * 0.3, 1 - v * 0.3, 1);
        this.rightPageMesh.material.opacity = 1 - v;
      }
    });

    await this.render();

    // Reset to other side
    leftMesh.position.x = leftStartX + (isForward ? 1 : -1);
    leftMesh.position.z = startZ - 0.5;
    leftMesh.rotation.y = isForward ? -0.3 : 0.3;
    leftMesh.scale.set(0.7, 0.7, 1);
    this.leftPageMesh.material.opacity = 0;

    if (!isSingle && rightMesh) {
      rightMesh.position.x = rightStartX + (isForward ? 1 : -1);
      rightMesh.position.z = startZ - 0.5;
      rightMesh.rotation.y = isForward ? -0.3 : 0.3;
      rightMesh.scale.set(0.7, 0.7, 1);
      this.rightPageMesh.material.opacity = 0;
    }

    // Slide in
    await this._animateValue(0, 1, duration / 2, (v) => {
      leftMesh.position.x = leftStartX + (isForward ? 1 : -1) * (1 - v);
      leftMesh.position.z = startZ - 0.5 * (1 - v);
      leftMesh.rotation.y = (isForward ? -0.3 : 0.3) * (1 - v);
      leftMesh.scale.set(0.7 + v * 0.3, 0.7 + v * 0.3, 1);
      this.leftPageMesh.material.opacity = v;

      if (!isSingle && rightMesh) {
        rightMesh.position.x = rightStartX + (isForward ? 1 : -1) * (1 - v);
        rightMesh.position.z = startZ - 0.5 * (1 - v);
        rightMesh.rotation.y = (isForward ? -0.3 : 0.3) * (1 - v);
        rightMesh.scale.set(0.7 + v * 0.3, 0.7 + v * 0.3, 1);
        this.rightPageMesh.material.opacity = v;
      }
    });

    // Reset
    leftMesh.position.set(leftStartX, 0, startZ);
    leftMesh.rotation.y = 0;
    leftMesh.scale.set(1, 1, 1);
    this.leftPageMesh.material.opacity = 1;

    if (!isSingle && rightMesh) {
      rightMesh.position.set(rightStartX, 0, startZ);
      rightMesh.rotation.y = 0;
      rightMesh.scale.set(1, 1, 1);
      this.rightPageMesh.material.opacity = 1;
    }
  }

  /**
   * 3D Flip transition - full page flip rotation (both pages in double mode)
   * @private
   */
  async _flipTransition(direction, duration) {
    if (!this.leftPageMesh) return;

    const isSingle = this.state.get('displayMode') === 'single';
    const isForward = direction === 'forward';
    const leftMesh = this.leftPageMesh.mesh;
    const rightMesh = this.rightPageMesh?.mesh;

    // Flip out: rotate 90 degrees
    await this._animateValue(0, 1, duration / 2, (v) => {
      leftMesh.rotation.y = (isForward ? -1 : 1) * v * (Math.PI / 2);
      leftMesh.position.z = Math.sin(v * Math.PI) * 0.3;

      if (!isSingle && rightMesh) {
        rightMesh.rotation.y = (isForward ? -1 : 1) * v * (Math.PI / 2);
        rightMesh.position.z = Math.sin(v * Math.PI) * 0.3;
      }
    });

    await this.render();

    // Set starting position for flip in (from opposite side)
    leftMesh.rotation.y = (isForward ? 1 : -1) * (Math.PI / 2);
    if (!isSingle && rightMesh) {
      rightMesh.rotation.y = (isForward ? 1 : -1) * (Math.PI / 2);
    }

    // Flip in: rotate back to 0
    await this._animateValue(0, 1, duration / 2, (v) => {
      leftMesh.rotation.y = (isForward ? 1 : -1) * (Math.PI / 2) * (1 - v);
      leftMesh.position.z = Math.sin((1 - v) * Math.PI) * 0.3;

      if (!isSingle && rightMesh) {
        rightMesh.rotation.y = (isForward ? 1 : -1) * (Math.PI / 2) * (1 - v);
        rightMesh.position.z = Math.sin((1 - v) * Math.PI) * 0.3;
      }
    });

    // Reset
    leftMesh.rotation.y = 0;
    leftMesh.position.z = 0;
    if (!isSingle && rightMesh) {
      rightMesh.rotation.y = 0;
      rightMesh.position.z = 0;
    }
  }

  /**
   * Animate a value over time
   * @private
   */
  _animateValue(from, to, duration, callback) {
    return new Promise(resolve => {
      const start = performance.now();
      const animate = () => {
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const value = from + (to - from) * eased;
        callback(value);
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      animate();
    });
  }

  /**
   * Apply zoom transformation
   * @param {number} zoom - Zoom level
   * @param {number} panX - Pan X
   * @param {number} panY - Pan Y
   */
  applyZoom(zoom, panX = 0, panY = 0) {
    this._updateCameraPosition();
  }

  /**
   * Handle resize
   */
  resize() {
    super.resize();

    if (this.camera) {
      this.camera.aspect = this.viewportWidth / this.viewportHeight;
      this.camera.updateProjectionMatrix();
    }

    if (this.renderer) {
      this.renderer.setSize(this.viewportWidth, this.viewportHeight);
    }

    this._updateCameraPosition();
  }

  /**
   * Get supported features
   * @returns {string[]}
   */
  getSupportedFeatures() {
    return ['flip', 'zoom', 'pan', 'webgl', '3d', 'lighting', 'bend'];
  }

  /**
   * Get capabilities
   * @returns {Object}
   */
  getCapabilities() {
    return {
      ...super.getCapabilities(),
      supports3D: true,
      supportsShaders: true,
      supportsRealisticFlip: true,
      maxTextureSize: this.maxTextureSize
    };
  }

  /**
   * Pause rendering
   */
  pause() {
    this._stopRenderLoop();
  }

  /**
   * Resume rendering
   */
  resume() {
    this._startRenderLoop();
  }

  /**
   * Destroy renderer
   */
  destroy() {
    this._stopRenderLoop();

    // Dispose meshes
    if (this.leftPageMesh) {
      this.leftPageMesh.dispose();
      this.leftPageMesh = null;
    }

    if (this.rightPageMesh) {
      this.rightPageMesh.dispose();
      this.rightPageMesh = null;
    }

    if (this.flippingMesh) {
      this.flippingMesh.dispose();
      this.flippingMesh = null;
    }

    // Dispose lighting
    if (this.lighting) {
      this.lighting.dispose();
      this.lighting = null;
    }

    // Dispose animation
    if (this.flipAnimation) {
      this.flipAnimation.destroy();
      this.flipAnimation = null;
    }

    // Dispose Three.js
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.THREE = null;

    super.destroy();
  }
}

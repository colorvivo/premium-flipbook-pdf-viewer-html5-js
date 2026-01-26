/**
 * Lighting - Three.js lighting setup for WebGL renderer
 */

/**
 * Lighting manager for WebGL scene
 */
export class Lighting {
  /**
   * Create lighting manager
   * @param {WebGLRenderer} renderer - Parent renderer
   * @param {Object} options - Lighting options
   */
  constructor(renderer, options = {}) {
    this.renderer = renderer;
    this.THREE = renderer.THREE;

    this.enabled = options.enabled !== false;
    this.ambientIntensity = options.ambient ?? 0.6;
    this.directionalIntensity = options.directional ?? 0.4;
    this.position = options.position || [0, 1, 1];

    this.ambientLight = null;
    this.directionalLight = null;
    this.lights = [];
  }

  /**
   * Set up lighting in scene
   * @param {THREE.Scene} scene - Three.js scene
   */
  setup(scene) {
    if (!this.enabled) return;

    const { THREE } = this;

    // Ambient light for overall illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, this.ambientIntensity);
    scene.add(this.ambientLight);
    this.lights.push(this.ambientLight);

    // Directional light for shadows and depth
    this.directionalLight = new THREE.DirectionalLight(0xffffff, this.directionalIntensity);
    this.directionalLight.position.set(
      this.position[0],
      this.position[1],
      this.position[2]
    );

    // Shadow settings
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.1;
    this.directionalLight.shadow.camera.far = 10;

    scene.add(this.directionalLight);
    this.lights.push(this.directionalLight);

    // Add a subtle fill light from below
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
    fillLight.position.set(0, -0.5, 1);
    scene.add(fillLight);
    this.lights.push(fillLight);
  }

  /**
   * Update ambient intensity
   * @param {number} intensity - New intensity (0-1)
   */
  setAmbientIntensity(intensity) {
    this.ambientIntensity = intensity;
    if (this.ambientLight) {
      this.ambientLight.intensity = intensity;
    }
  }

  /**
   * Update directional intensity
   * @param {number} intensity - New intensity (0-1)
   */
  setDirectionalIntensity(intensity) {
    this.directionalIntensity = intensity;
    if (this.directionalLight) {
      this.directionalLight.intensity = intensity;
    }
  }

  /**
   * Update directional light position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   */
  setPosition(x, y, z) {
    this.position = [x, y, z];
    if (this.directionalLight) {
      this.directionalLight.position.set(x, y, z);
    }
  }

  /**
   * Enable/disable lighting
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.lights.forEach(light => {
      light.visible = enabled;
    });
  }

  /**
   * Update lighting for flip animation
   * @param {number} progress - Animation progress (0-1)
   * @param {string} direction - 'forward' or 'backward'
   */
  updateForFlip(progress, direction) {
    if (!this.directionalLight) return;

    // Subtle light movement during flip for realism
    const offsetX = Math.sin(progress * Math.PI) * 0.3;
    const baseX = this.position[0];

    this.directionalLight.position.x = baseX + (direction === 'forward' ? -offsetX : offsetX);
  }

  /**
   * Reset lighting to default
   */
  reset() {
    if (this.directionalLight) {
      this.directionalLight.position.set(
        this.position[0],
        this.position[1],
        this.position[2]
      );
    }
  }

  /**
   * Dispose of lights
   */
  dispose() {
    this.lights.forEach(light => {
      if (light.parent) {
        light.parent.remove(light);
      }
      if (light.dispose) {
        light.dispose();
      }
    });

    this.lights = [];
    this.ambientLight = null;
    this.directionalLight = null;
  }
}

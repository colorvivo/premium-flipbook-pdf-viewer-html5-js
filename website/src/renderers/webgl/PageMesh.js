/**
 * PageMesh - Three.js mesh for a flipbook page
 */

/**
 * Page mesh for WebGL rendering
 */
export class PageMesh {
  /**
   * Create a page mesh
   * @param {WebGLRenderer} renderer - Parent renderer
   * @param {string} side - 'left' or 'right'
   */
  constructor(renderer, side) {
    this.renderer = renderer;
    this.THREE = renderer.THREE;
    this.side = side;

    this.mesh = null;
    this.geometry = null;
    this.material = null;
    this.texture = null;

    // Page dimensions (normalized)
    this.width = 1;
    this.height = 1.414; // A4 ratio

    // Bend deformation
    this.bendAmount = 0;
    this.bendDirection = 1;

    // Original positions for morphing
    this._originalPositions = null;
  }

  /**
   * Initialize the mesh
   * @returns {Promise}
   */
  async init() {
    const { THREE } = this;

    // Create geometry with subdivisions for bending
    const widthSegments = 20;
    const heightSegments = 30;

    this.geometry = new THREE.PlaneGeometry(
      this.width,
      this.height,
      widthSegments,
      heightSegments
    );

    // Store original positions
    this._originalPositions = this.geometry.attributes.position.array.slice();

    // Create material - use BasicMaterial to show colors exactly as in texture
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });

    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Set initial rotation based on side
    if (this.side === 'left') {
      this.mesh.rotation.y = 0;
    } else {
      this.mesh.rotation.y = 0;
    }

    return this;
  }

  /**
   * Set texture from canvas or image
   * @param {HTMLCanvasElement|HTMLImageElement} source - Texture source
   */
  setTexture(source) {
    const { THREE } = this;

    // Dispose old texture
    if (this.texture) {
      this.texture.dispose();
    }

    // Create new texture
    this.texture = new THREE.Texture(source);
    this.texture.needsUpdate = true;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBAFormat;

    // Apply to material
    this.material.map = this.texture;
    this.material.needsUpdate = true;
  }

  /**
   * Set blank white texture
   */
  setBlankTexture() {
    const { THREE } = this;

    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }

    this.material.map = null;
    this.material.color.setHex(0xffffff);
    this.material.needsUpdate = true;
  }

  /**
   * Set error texture (gray with X)
   */
  setErrorTexture() {
    const { THREE } = this;

    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }

    this.material.map = null;
    this.material.color.setHex(0xcccccc);
    this.material.needsUpdate = true;
  }

  /**
   * Apply bend deformation
   * @param {number} amount - Bend amount (0-1)
   * @param {number} [direction=1] - Bend direction (1 or -1)
   */
  applyBend(amount, direction = 1) {
    if (!this._originalPositions) return;

    this.bendAmount = amount;
    this.bendDirection = direction;

    const positions = this.geometry.attributes.position.array;
    const original = this._originalPositions;

    // Calculate bend curve
    const maxBend = Math.PI * 0.4; // Max bend angle
    const bendAngle = amount * maxBend * direction;

    for (let i = 0; i < positions.length; i += 3) {
      const x = original[i];
      const y = original[i + 1];
      const z = original[i + 2];

      // Calculate normalized position along width
      const t = (x + this.width / 2) / this.width;

      // Apply cylindrical bend
      const bendRadius = this.width / bendAngle;
      const theta = t * bendAngle;

      if (Math.abs(bendAngle) > 0.001) {
        positions[i] = (bendRadius - z) * Math.sin(theta) - this.width / 2;
        positions[i + 2] = bendRadius - (bendRadius - z) * Math.cos(theta);
      } else {
        positions[i] = x;
        positions[i + 2] = z;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  /**
   * Reset bend deformation
   */
  resetBend() {
    if (!this._originalPositions) return;

    const positions = this.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i++) {
      positions[i] = this._originalPositions[i];
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();

    this.bendAmount = 0;
  }

  /**
   * Set rotation for flip animation
   * @param {number} angle - Rotation angle in radians
   */
  setFlipRotation(angle) {
    this.mesh.rotation.y = angle;
  }

  /**
   * Get current flip rotation
   * @returns {number}
   */
  getFlipRotation() {
    return this.mesh.rotation.y;
  }

  /**
   * Set position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   */
  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
  }

  /**
   * Set visibility
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.mesh.visible = visible;
  }

  /**
   * Clone the mesh for animation
   * @returns {PageMesh}
   */
  clone() {
    const cloned = new PageMesh(this.renderer, this.side);

    cloned.geometry = this.geometry.clone();
    cloned.material = this.material.clone();
    cloned.mesh = new this.THREE.Mesh(cloned.geometry, cloned.material);

    cloned._originalPositions = this._originalPositions.slice();

    // Copy transform
    cloned.mesh.position.copy(this.mesh.position);
    cloned.mesh.rotation.copy(this.mesh.rotation);
    cloned.mesh.scale.copy(this.mesh.scale);

    return cloned;
  }

  /**
   * Dispose of resources
   */
  dispose() {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }

    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }

    if (this.material) {
      this.material.dispose();
      this.material = null;
    }

    if (this.mesh && this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }

    this.mesh = null;
    this._originalPositions = null;
  }
}

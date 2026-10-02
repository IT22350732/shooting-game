import * as THREE from 'three';

/**
 * Generates procedural high-resolution canvas textures on the fly.
 * No external asset loading required, ultra-fast and crisp at any resolution.
 */
export class TextureGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  private static finalizeTexture(
    texture: THREE.CanvasTexture,
    wrap: boolean = true,
    repeatX: number = 1,
    repeatY: number = 1
  ): THREE.CanvasTexture {
    if (wrap) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
    }
    texture.anisotropy = 16;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * High-tech white hexagonal ceramic tiles with subtle cyan illumination
   */
  public static createHexTileTexture(): THREE.CanvasTexture {
    const key = 'hex_tile';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Clean pearl white base
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, size, size);

    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;

    const hexRadius = 32;
    const h = hexRadius * Math.sin(Math.PI / 3);

    for (let y = -h; y < size + h * 2; y += h * 2) {
      for (let x = -hexRadius * 1.5; x < size + hexRadius * 3; x += hexRadius * 3) {
        this.drawHex(ctx, x, y, hexRadius);
        this.drawHex(ctx, x + hexRadius * 1.5, y + h, hexRadius);
      }
    }

    // Add subtle ambient occlusion gradient
    const grad = ctx.createRadialGradient(size / 2, size / 2, 50, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 12, 12);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * White sci-fi composite wall panel with mechanical seams and bevels
   */
  public static createPanelTexture(): THREE.CanvasTexture {
    const key = 'panel';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Clean white metallic background
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, size, size);

    // Beveled panels
    const panelSize = 128;
    for (let y = 0; y < size; y += panelSize) {
      for (let x = 0; x < size; x += panelSize) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 4, panelSize - 8, panelSize - 8);

        // Panel border bevel
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, panelSize - 8, panelSize - 8);

        // Corner rivets
        ctx.fillStyle = '#94a3b8';
        const rivet = (rx: number, ry: number) => {
          ctx.beginPath();
          ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
          ctx.fill();
        };
        rivet(x + 12, y + 12);
        rivet(x + panelSize - 12, y + 12);
        rivet(x + 12, y + panelSize - 12);
        rivet(x + panelSize - 12, y + panelSize - 12);
      }
    }

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 4, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * High-contrast carbon fiber weave texture for tactical gear & weapon bodies
   */
  public static createCarbonFiberTexture(): THREE.CanvasTexture {
    const key = 'carbon_fiber';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#334155';
    for (let i = 0; i < size; i += 8) {
      for (let j = 0; j < size; j += 8) {
        if ((i / 8 + j / 8) % 2 === 0) {
          ctx.fillRect(i, j, 8, 8);
        }
      }
    }

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 6, 6);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Glowing digital ammo counter texture for weapons
   */
  public static createAmmoDisplayTexture(ammo: number, maxAmmo: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Black display screen
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 128, 64);

    // Cyan glowing text
    ctx.fillStyle = ammo <= 5 ? '#ef4444' : '#06b6d4';
    ctx.shadowColor = ammo <= 5 ? '#ef4444' : '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 36px "Orbitron", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${ammo}`, 48, 32);

    ctx.font = 'bold 16px "Orbitron", monospace';
    ctx.fillStyle = '#64748b';
    ctx.shadowBlur = 0;
    ctx.fillText(`/${maxAmmo}`, 96, 36);

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), false);
    return texture;
  }

  /**
   * Realistic Red or Grey Brick Wall Texture
   */
  public static createBrickTexture(brickColor: string = '#8b3a2b', mortarColor: string = '#cbd5e1'): THREE.CanvasTexture {
    const key = `brick_${brickColor}_${mortarColor}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Mortar background
    ctx.fillStyle = mortarColor;
    ctx.fillRect(0, 0, size, size);

    const rows = 16;
    const rowHeight = size / rows;
    const brickWidth = size / 8;

    for (let r = 0; r < rows; r++) {
      const y = r * rowHeight;
      const offsetX = (r % 2 === 0) ? 0 : brickWidth / 2;

      for (let x = -brickWidth; x < size + brickWidth; x += brickWidth) {
        ctx.fillStyle = brickColor;
        ctx.fillRect(x + offsetX + 2, y + 2, brickWidth - 4, rowHeight - 4);

        // Highlight & shadow
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(x + offsetX + 2, y + 2, brickWidth - 4, 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(x + offsetX + 2, y + rowHeight - 4, brickWidth - 4, 2);
      }
    }

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 4, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Overlapping Roof Shingle / Tile Texture
   */
  public static createRoofShingleTexture(tileColor: string = '#334155'): THREE.CanvasTexture {
    const key = `roof_${tileColor}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, size, size);

    const rows = 20;
    const h = size / rows;
    const w = size / 10;

    for (let r = 0; r < rows; r++) {
      const y = r * h;
      const offset = (r % 2) * (w / 2);
      for (let x = -w; x < size + w; x += w) {
        ctx.fillStyle = tileColor;
        ctx.fillRect(x + offset + 1, y, w - 2, h + 2);

        // Bottom shadow bevel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(x + offset + 1, y + h - 3, w - 2, 4);

        // Top highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x + offset + 1, y, w - 2, 2);
      }
    }

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 4, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Real Asphalt Road Pavement Texture (Seamless, fine grain, micro-aggregate)
   */
  public static createAsphaltRoadTexture(): THREE.CanvasTexture {
    const key = 'asphalt_road';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Rich dark charcoal asphalt base
    ctx.fillStyle = '#212327';
    ctx.fillRect(0, 0, size, size);

    // Fine mineral aggregate grain & specks
    for (let i = 0; i < 6000; i++) {
      const shade = Math.floor(25 + Math.random() * 35);
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 3})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    // Light stone flecks
    ctx.fillStyle = 'rgba(200, 210, 225, 0.08)';
    for (let i = 0; i < 1200; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }

    // Subtle tar streaks & pavement patches
    ctx.fillStyle = 'rgba(15, 17, 20, 0.15)';
    for (let i = 0; i < 35; i++) {
      const rx = Math.random() * size;
      const ry = Math.random() * size;
      const rw = 20 + Math.random() * 40;
      const rh = 10 + Math.random() * 20;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 4, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Concrete Sidewalk with Slabs & Curb Lines
   */
  public static createSidewalkTexture(): THREE.CanvasTexture {
    const key = 'sidewalk';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, size, size);

    // Sidewalk slabs
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    const slab = 128;
    for (let x = 0; x < size; x += slab) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y < size; y += slab) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 6, 6);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Multi-story Building Window Grid Facade Texture
   */
  public static createWindowFacadeTexture(frameColor: string = '#334155'): THREE.CanvasTexture {
    const key = `window_facade_${frameColor}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Wall facade base
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, size, size);

    const cols = 4;
    const rows = 6;
    const cellW = size / cols;
    const cellH = size / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW + 12;
        const y = r * cellH + 12;
        const w = cellW - 24;
        const h = cellH - 24;

        // Window Frame
        ctx.fillStyle = frameColor;
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

        // Glass Pane with Blue Sky Reflection or Warm Light
        const isWarm = (r + c) % 3 === 0;
        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        if (isWarm) {
          grad.addColorStop(0, '#fef08a');
          grad.addColorStop(1, '#f59e0b');
        } else {
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(0.5, '#0284c7');
          grad.addColorStop(1, '#0f172a');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        // Window cross divider
        ctx.fillStyle = frameColor;
        ctx.fillRect(x + w / 2 - 1, y, 2, h);
        ctx.fillRect(x, y + h / 2 - 1, w, 2);

        // Window sill ledge
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x - 4, y + h, w + 8, 4);
      }
    }

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 1, 1);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Residential Wood Clapboard Siding
   */
  public static createWoodSidingTexture(color: string = '#f1f5f9'): THREE.CanvasTexture {
    const key = `wood_siding_${color}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    const slats = 24;
    const h = size / slats;
    for (let i = 0; i < slats; i++) {
      const y = i * h;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(0, y + h - 2, size, 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(0, y, size, 1.5);
    }

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 2, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Industrial Corrugated Metal Sheet Texture
   */
  public static createCorrugatedMetalTexture(color: string = '#64748b'): THREE.CanvasTexture {
    const key = `corrugated_${color}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    const ribs = 32;
    const w = size / ribs;
    for (let i = 0; i < ribs; i++) {
      const x = i * w;
      const grad = ctx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, w, size);
    }

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 4, 4);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Suburban Green Lawn Grass Texture
   */
  public static createGrassTexture(): THREE.CanvasTexture {
    const key = 'grass';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#16a34a';
    for (let i = 0; i < 4000; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
    }
    ctx.fillStyle = '#4ade80';
    for (let i = 0; i < 2000; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 12, 12);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Desert Sun-Dried Adobe Clay Texture
   */
  public static createAdobeTexture(): THREE.CanvasTexture {
    const key = 'adobe';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#d97706';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#b45309';
    for (let i = 0; i < 3000; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
    }
    ctx.fillStyle = '#fef3c7';
    for (let i = 0; i < 1500; i++) {
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }

    const texture = this.finalizeTexture(new THREE.CanvasTexture(canvas), true, 4, 4);
    this.cache.set(key, texture);
    return texture;
  }

  private static drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = x + r * Math.cos(angle);
      const hy = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
  }
}

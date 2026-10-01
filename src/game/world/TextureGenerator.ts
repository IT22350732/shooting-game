import * as THREE from 'three';

/**
 * Generates procedural high-resolution canvas textures on the fly.
 * No external asset loading required, ultra-fast and crisp at any resolution.
 */
export class TextureGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

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

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12);
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

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
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

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
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

    const texture = new THREE.CanvasTexture(canvas);
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

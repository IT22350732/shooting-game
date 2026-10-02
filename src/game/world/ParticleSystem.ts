import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  gravity: number;
  decay: number;
}

interface BulletTracer {
  start: THREE.Vector3;
  end: THREE.Vector3;
  current: THREE.Vector3;
  color: THREE.Color;
  speed: number;
  progress: number;
  active: boolean;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  
  // Point cloud for sparks, debris, explosion particles
  private maxParticles = 600;
  private particleList: Particle[] = [];
  private pointGeometry: THREE.BufferGeometry;
  private pointMaterial: THREE.PointsMaterial;
  private pointMesh: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  // Bullet Tracers
  private tracers: BulletTracer[] = [];
  private tracerLines: THREE.LineSegments;
  private tracerPositions: Float32Array;
  private tracerColors: Float32Array;
  private maxTracers = 40;

  // Atmospheric Particles (Rain / Dust / Ash / Stardust)
  private ambientMesh: THREE.Points | null = null;
  private ambientPositions: Float32Array | null = null;
  private ambientVelocity: THREE.Vector3 = new THREE.Vector3();
  private ambientCount = 350;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Initialize Particle Point Cloud
    this.pointGeometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.pointGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.pointGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.pointGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.pointMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.pointMesh = new THREE.Points(this.pointGeometry, this.pointMaterial);
    this.pointMesh.frustumCulled = false;
    this.scene.add(this.pointMesh);

    // Initialize Bullet Tracers
    this.tracerPositions = new Float32Array(this.maxTracers * 2 * 3);
    this.tracerColors = new Float32Array(this.maxTracers * 2 * 3);
    const tracerGeo = new THREE.BufferGeometry();
    tracerGeo.setAttribute('position', new THREE.BufferAttribute(this.tracerPositions, 3));
    tracerGeo.setAttribute('color', new THREE.BufferAttribute(this.tracerColors, 3));

    const tracerMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      linewidth: 2
    });

    this.tracerLines = new THREE.LineSegments(tracerGeo, tracerMat);
    this.tracerLines.frustumCulled = false;
    this.scene.add(this.tracerLines);
  }

  public initAtmosphere(arenaType: string) {
    if (this.ambientMesh) {
      this.scene.remove(this.ambientMesh);
      this.ambientMesh.geometry.dispose();
      (this.ambientMesh.material as THREE.Material).dispose();
      this.ambientMesh = null;
    }

    const geo = new THREE.BufferGeometry();
    this.ambientPositions = new Float32Array(this.ambientCount * 3);

    for (let i = 0; i < this.ambientCount; i++) {
      this.ambientPositions[i * 3 + 0] = (Math.random() - 0.5) * 80;
      this.ambientPositions[i * 3 + 1] = Math.random() * 25;
      this.ambientPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.ambientPositions, 3));

    let color = 0x0ea5e9;
    let size = 0.09;
    let opacity = 0.6;

    if (arenaType === 'desert') {
      color = 0xd97706; // Desert breeze & dust
      this.ambientVelocity.set(-1.5, -0.3, 0.6);
    } else if (arenaType === 'neon_city') {
      color = 0x38bdf8; // Light urban drizzle
      size = 0.10;
      opacity = 0.65;
      this.ambientVelocity.set(-0.5, -12, -0.5);
    } else if (arenaType === 'space_station') {
      color = 0x94a3b8; // Industrial depot air dust
      this.ambientVelocity.set(0.3, 0.4, 0.2);
    } else {
      // Suburban Town
      color = 0x22c55e; // Gentle outdoor breeze & pollen
      size = 0.08;
      opacity = 0.45;
      this.ambientVelocity.set(0.4, -0.2, 0.3);
    }

    const mat = new THREE.PointsMaterial({
      color: color,
      size: size,
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.ambientMesh = new THREE.Points(geo, mat);
    this.scene.add(this.ambientMesh);
  }

  public spawnSparks(origin: THREE.Vector3, normal: THREE.Vector3, colorHex: number = 0xf59e0b, count: number = 14) {
    const col = new THREE.Color(colorHex);
    for (let i = 0; i < count; i++) {
      if (this.particleList.length >= this.maxParticles) break;
      const spread = new THREE.Vector3(
        normal.x + (Math.random() - 0.5) * 1.5,
        normal.y + Math.random() * 1.5,
        normal.z + (Math.random() - 0.5) * 1.5
      ).normalize().multiplyScalar(4 + Math.random() * 8);

      this.particleList.push({
        position: origin.clone(),
        velocity: spread,
        color: col.clone(),
        size: 0.12 + Math.random() * 0.12,
        life: 0.35 + Math.random() * 0.3,
        maxLife: 0.65,
        gravity: 9.8,
        decay: 1.8
      });
    }
  }

  public spawnExplosion(center: THREE.Vector3, count: number = 60) {
    const fireColors = [0xef4444, 0xf97316, 0xfacc15, 0xffffff];
    for (let i = 0; i < count; i++) {
      if (this.particleList.length >= this.maxParticles) break;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.8 + 0.2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(6 + Math.random() * 14);

      const col = new THREE.Color(fireColors[Math.floor(Math.random() * fireColors.length)]);

      this.particleList.push({
        position: center.clone(),
        velocity: dir,
        color: col,
        size: 0.25 + Math.random() * 0.35,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        gravity: 6.0,
        decay: 1.2
      });
    }
  }

  public addTracer(start: THREE.Vector3, target: THREE.Vector3, colorHex: number = 0x38bdf8) {
    if (this.tracers.length >= this.maxTracers) {
      this.tracers.shift();
    }
    this.tracers.push({
      start: start.clone(),
      end: target.clone(),
      current: start.clone(),
      color: new THREE.Color(colorHex),
      speed: 160,
      progress: 0,
      active: true
    });
  }

  public update(delta: number) {
    // 1. Update Point Particles
    for (let i = this.particleList.length - 1; i >= 0; i--) {
      const p = this.particleList[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.particleList.splice(i, 1);
        continue;
      }

      p.velocity.y -= p.gravity * delta;
      p.position.addScaledVector(p.velocity, delta);

      // Bounce off floor
      if (p.position.y < 0.05) {
        p.position.y = 0.05;
        p.velocity.y *= -0.3;
        p.velocity.x *= 0.7;
        p.velocity.z *= 0.7;
      }
    }

    // Write to point buffer
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particleList.length) {
        const p = this.particleList[i];
        this.positions[i * 3 + 0] = p.position.x;
        this.positions[i * 3 + 1] = p.position.y;
        this.positions[i * 3 + 2] = p.position.z;

        const lifeRatio = p.life / p.maxLife;
        this.colors[i * 3 + 0] = p.color.r * lifeRatio;
        this.colors[i * 3 + 1] = p.color.g * lifeRatio;
        this.colors[i * 3 + 2] = p.color.b * lifeRatio;

        this.sizes[i] = p.size * lifeRatio;
      } else {
        this.positions[i * 3 + 0] = 0;
        this.positions[i * 3 + 1] = -9999;
        this.positions[i * 3 + 2] = 0;
        this.sizes[i] = 0;
      }
    }

    this.pointGeometry.attributes.position.needsUpdate = true;
    this.pointGeometry.attributes.color.needsUpdate = true;
    this.pointGeometry.attributes.size.needsUpdate = true;

    // 2. Update Tracers
    let tracerIdx = 0;
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      const dist = t.start.distanceTo(t.end);
      t.progress += (t.speed * delta) / Math.max(1, dist);

      if (t.progress >= 1) {
        this.tracers.splice(i, 1);
        continue;
      }

      const p1 = new THREE.Vector3().lerpVectors(t.start, t.end, Math.max(0, t.progress - 0.15));
      const p2 = new THREE.Vector3().lerpVectors(t.start, t.end, Math.min(1, t.progress));

      this.tracerPositions[tracerIdx * 6 + 0] = p1.x;
      this.tracerPositions[tracerIdx * 6 + 1] = p1.y;
      this.tracerPositions[tracerIdx * 6 + 2] = p1.z;
      this.tracerPositions[tracerIdx * 6 + 3] = p2.x;
      this.tracerPositions[tracerIdx * 6 + 4] = p2.y;
      this.tracerPositions[tracerIdx * 6 + 5] = p2.z;

      for (let c = 0; c < 2; c++) {
        this.tracerColors[tracerIdx * 6 + c * 3 + 0] = t.color.r;
        this.tracerColors[tracerIdx * 6 + c * 3 + 1] = t.color.g;
        this.tracerColors[tracerIdx * 6 + c * 3 + 2] = t.color.b;
      }

      tracerIdx++;
    }

    // Zero out unused tracer lines
    for (let i = tracerIdx; i < this.maxTracers; i++) {
      for (let k = 0; k < 6; k++) {
        this.tracerPositions[i * 6 + k] = 0;
        this.tracerColors[i * 6 + k] = 0;
      }
    }

    this.tracerLines.geometry.attributes.position.needsUpdate = true;
    this.tracerLines.geometry.attributes.color.needsUpdate = true;

    // 3. Update Atmosphere
    if (this.ambientMesh && this.ambientPositions) {
      for (let i = 0; i < this.ambientCount; i++) {
        this.ambientPositions[i * 3 + 0] += this.ambientVelocity.x * delta;
        this.ambientPositions[i * 3 + 1] += this.ambientVelocity.y * delta;
        this.ambientPositions[i * 3 + 2] += this.ambientVelocity.z * delta;

        // Wrap around boundaries
        if (this.ambientPositions[i * 3 + 1] < 0) this.ambientPositions[i * 3 + 1] = 25;
        if (this.ambientPositions[i * 3 + 1] > 25) this.ambientPositions[i * 3 + 1] = 0;
        if (Math.abs(this.ambientPositions[i * 3 + 0]) > 40) this.ambientPositions[i * 3 + 0] *= -0.98;
        if (Math.abs(this.ambientPositions[i * 3 + 2]) > 40) this.ambientPositions[i * 3 + 2] *= -0.98;
      }
      this.ambientMesh.geometry.attributes.position.needsUpdate = true;
    }
  }

  public dispose() {
    this.scene.remove(this.pointMesh);
    this.scene.remove(this.tracerLines);
    if (this.ambientMesh) this.scene.remove(this.ambientMesh);
  }
}

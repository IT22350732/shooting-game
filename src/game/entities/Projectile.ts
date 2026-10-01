import * as THREE from 'three';

export interface ProjectileHit {
  position: THREE.Vector3;
  damage: number;
  isSplash?: boolean;
  splashRadius?: number;
  isPlayerProjectile: boolean;
}

export class Projectile {
  public mesh: THREE.Mesh;
  public light: THREE.PointLight | null = null;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public damage: number;
  public isPlayerProjectile: boolean;
  public isPlasma: boolean;
  public lifeTime: number;
  public radius: number;
  public isDead: boolean = false;

  constructor(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    isPlayer: boolean,
    isPlasma: boolean = false
  ) {
    this.position = origin.clone();
    this.velocity = direction.clone().normalize().multiplyScalar(speed);
    this.damage = damage;
    this.isPlayerProjectile = isPlayer;
    this.isPlasma = isPlasma;
    this.lifeTime = 4.0;
    this.radius = isPlasma ? 0.4 : 0.25;

    const color = isPlayer ? (isPlasma ? 0x06b6d4 : 0x38bdf8) : 0xef4444;

    const geo = new THREE.SphereGeometry(this.radius, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);

    // Glowing point light
    this.light = new THREE.PointLight(color, 1.2, 5);
    this.mesh.add(this.light);
  }

  public update(delta: number): boolean {
    if (this.isDead) return true;

    this.lifeTime -= delta;
    if (this.lifeTime <= 0) {
      this.isDead = true;
      return true;
    }

    this.position.addScaledVector(this.velocity, delta);
    this.mesh.position.copy(this.position);
    return false;
  }

  public dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    if (this.light) this.mesh.remove(this.light);
  }
}

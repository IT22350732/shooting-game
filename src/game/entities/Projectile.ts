import * as THREE from 'three';

export interface ProjectileHit {
  position: THREE.Vector3;
  damage: number;
  isSplash?: boolean;
  splashRadius?: number;
  isPlayerProjectile: boolean;
}

export class Projectile {
  public mesh: THREE.Object3D;
  public light: THREE.PointLight | null = null;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public damage: number;
  public isPlayerProjectile: boolean;
  public isPlasma: boolean;
  public isBomb: boolean;
  public gravity: number = 14.0;
  public blastRadius: number = 7.5;
  public lifeTime: number;
  public radius: number;
  public isDead: boolean = false;

  constructor(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    isPlayer: boolean,
    isPlasma: boolean = false,
    enableLight: boolean = true,
    isBomb: boolean = false
  ) {
    this.position = origin.clone();
    this.velocity = direction.clone().normalize().multiplyScalar(speed);
    this.damage = damage;
    this.isPlayerProjectile = isPlayer;
    this.isPlasma = isPlasma;
    this.isBomb = isBomb;
    this.lifeTime = isBomb ? 5.0 : 4.0;
    this.radius = isBomb ? 0.35 : (isPlasma ? 0.4 : 0.25);

    if (isBomb) {
      // High-tech spherical cluster bomb / grenade projectile
      const bombGroup = new THREE.Group();

      const bodyGeo = new THREE.SphereGeometry(this.radius, 14, 14);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.9,
        roughness: 0.25,
        emissive: 0xea580c,
        emissiveIntensity: 0.4
      });
      const bombBody = new THREE.Mesh(bodyGeo, bodyMat);
      bombGroup.add(bombBody);

      // Warning hazard equatorial band
      const bandGeo = new THREE.CylinderGeometry(this.radius * 1.02, this.radius * 1.02, 0.12, 16);
      const bandMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.7
      });
      const band = new THREE.Mesh(bandGeo, bandMat);
      bombGroup.add(band);

      // 4 Stabilizing aerodynamic rear fins
      const finGeo = new THREE.BoxGeometry(0.04, 0.22, 0.26);
      const finMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.rotation.z = (Math.PI / 2) * i;
        fin.position.z = -this.radius * 0.8;
        bombGroup.add(fin);
      }

      // Blinking red proximity / fuse LED on nose
      const noseGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const noseMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const nose = new THREE.Mesh(noseGeo, noseMat);
      nose.position.z = this.radius * 0.9;
      bombGroup.add(nose);

      if (enableLight) {
        this.light = new THREE.PointLight(0xf97316, 2.0, 7.0);
        bombGroup.add(this.light);
      }

      this.mesh = bombGroup;
      this.mesh.position.copy(this.position);
    } else {
      const color = isPlayer ? (isPlasma ? 0x06b6d4 : 0x38bdf8) : 0xef4444;

      const geo = new THREE.SphereGeometry(this.radius, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      this.mesh = mesh;
      this.mesh.position.copy(this.position);

      // Glowing point light (disabled in low graphics mode to avoid fragment shader multi-light overhead)
      if (enableLight) {
        this.light = new THREE.PointLight(color, 1.2, 5);
        this.mesh.add(this.light);
      }
    }
  }

  public update(delta: number): boolean {
    if (this.isDead) return true;

    this.lifeTime -= delta;
    if (this.lifeTime <= 0) {
      this.isDead = true;
      return true;
    }

    if (this.isBomb) {
      // Ballistic gravity arc
      this.velocity.y -= this.gravity * delta;

      // Align bomb orientation with flight path
      if (this.velocity.lengthSq() > 0.1) {
        const dir = this.velocity.clone().normalize();
        this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      }
    }

    this.position.addScaledVector(this.velocity, delta);
    this.mesh.position.copy(this.position);
    return false;
  }

  public dispose() {
    this.mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      }
    });
    if (this.light && this.mesh.children.includes(this.light)) {
      this.mesh.remove(this.light);
    }
  }
}

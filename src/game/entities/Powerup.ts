import * as THREE from 'three';
import { PowerupType } from '../../types/game';
import { soundManager } from '../../audio/SoundManager';

export class Powerup {
  public id: string;
  public type: PowerupType;
  public position: THREE.Vector3;
  public mesh: THREE.Group;
  public isCollected: boolean = false;
  private lifeTime: number = 28; // Despawn after 28s
  private bobTime: number = Math.random() * Math.PI * 2;

  constructor(id: string, type: PowerupType, position: THREE.Vector3) {
    this.id = id;
    this.type = type;
    this.position = position.clone();
    this.position.y = 0.8;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.build3DModel();
  }

  private build3DModel() {
    let color = 0x06b6d4;
    switch (this.type) {
      case 'health': color = 0xef4444; break;
      case 'armor': color = 0x38bdf8; break;
      case 'rapid_fire': color = 0xf59e0b; break;
      case 'infinite_ammo': color = 0xa855f7; break;
      case 'damage_boost': color = 0xf43f5e; break;
      case 'slow_motion': color = 0x0284c7; break;
      case 'shield': color = 0xeab308; break;
    }

    // Floating Octahedron / Gem
    const gemGeo = new THREE.OctahedronGeometry(0.38, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.1,
      metalness: 0.9,
      emissive: color,
      emissiveIntensity: 0.7
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    this.mesh.add(gem);

    // Outer orbiting ring
    const ringGeo = new THREE.TorusGeometry(0.55, 0.03, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: color });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    this.mesh.add(ring);

    // Floor beacon circle
    const beaconGeo = new THREE.RingGeometry(0.6, 0.8, 16);
    beaconGeo.rotateX(-Math.PI / 2);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = -0.75;
    this.mesh.add(beacon);
  }

  public update(delta: number, playerPos: THREE.Vector3): boolean {
    if (this.isCollected) return true;

    this.lifeTime -= delta;
    if (this.lifeTime <= 0) {
      return true; // Despawn
    }

    // Rotation & Bobbing
    this.bobTime += delta * 3;
    this.mesh.rotation.y += delta * 2.2;
    this.mesh.position.y = this.position.y + Math.sin(this.bobTime) * 0.15;

    // Blink when expiring
    if (this.lifeTime < 5) {
      const blink = Math.sin(this.lifeTime * 15) > 0;
      this.mesh.visible = blink;
    }

    // Player Pickup Check (within 1.9 meters)
    const dist = this.mesh.position.distanceTo(playerPos);
    if (dist < 1.9) {
      this.isCollected = true;
      soundManager.playPowerup();
      return true;
    }

    return false;
  }

  public dispose() {
    this.mesh.traverse(child => {
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
      }
    });
  }
}

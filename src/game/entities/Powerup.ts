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

  private enableLight: boolean;

  constructor(id: string, type: PowerupType, position: THREE.Vector3, enableLight: boolean = true) {
    this.id = id;
    this.type = type;
    this.enableLight = enableLight;
    this.position = position.clone();
    this.position.y = 0.8;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.build3DModel();
  }

  private build3DModel() {
    if (this.type === 'health') {
      // DEDICATED TACTICAL MEDKIT HEALTH PACK
      const whiteMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.28,
        metalness: 0.12
      });
      const redCrossMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.7,
        roughness: 0.25
      });
      const greenCrossMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x22c55e,
        emissiveIntensity: 0.85,
        roughness: 0.2
      });

      // Medkit Briefcase Box
      const caseGeo = new THREE.BoxGeometry(0.52, 0.35, 0.28);
      const caseMesh = new THREE.Mesh(caseGeo, whiteMat);
      this.mesh.add(caseMesh);

      // Carry Handle on Top
      const handleGeo = new THREE.BoxGeometry(0.18, 0.05, 0.04);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const handleMesh = new THREE.Mesh(handleGeo, handleMat);
      handleMesh.position.y = 0.20;
      this.mesh.add(handleMesh);

      // Embossed Medical Cross on Front & Back
      const crossH = new THREE.BoxGeometry(0.24, 0.075, 0.29);
      const crossHMesh = new THREE.Mesh(crossH, redCrossMat);
      this.mesh.add(crossHMesh);

      const crossV = new THREE.BoxGeometry(0.075, 0.24, 0.29);
      const crossVMesh = new THREE.Mesh(crossV, redCrossMat);
      this.mesh.add(crossVMesh);

      // Hovering 3D Medical Cross spinning above the Medkit
      const hoverGroup = new THREE.Group();
      hoverGroup.position.y = 0.44;
      const hoverH = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.09), greenCrossMat);
      const hoverV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.32, 0.09), greenCrossMat);
      hoverGroup.add(hoverH);
      hoverGroup.add(hoverV);
      this.mesh.add(hoverGroup);

      // Pulsing floor beacon circle
      const beaconGeo = new THREE.RingGeometry(0.65, 0.90, 20);
      beaconGeo.rotateX(-Math.PI / 2);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = -0.75;
      this.mesh.add(beacon);

      // Glowing Point Light illuminating floor (disabled in low graphics)
      if (this.enableLight) {
        const light = new THREE.PointLight(0x22c55e, 1.6, 6.0);
        light.position.y = 0.2;
        this.mesh.add(light);
      }
      return;
    }

    let color = 0x06b6d4;
    switch (this.type) {
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

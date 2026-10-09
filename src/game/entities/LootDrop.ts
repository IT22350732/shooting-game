import * as THREE from 'three';
import { LootType } from './DestructibleProp';
import { soundManager } from '../../audio/SoundManager';
import { ParticleSystem } from '../world/ParticleSystem';
import { Player } from './Player';

export class LootDrop {
  public id: string;
  public type: LootType;
  public position: THREE.Vector3;
  public mesh: THREE.Group;
  public isCollected: boolean = false;
  private lifeTime: number = 45; // 45s despawn timer
  private bobTime: number = Math.random() * Math.PI * 2;
  private baseY: number;

  constructor(id: string, type: LootType, worldPos: THREE.Vector3) {
    this.id = id;
    this.type = type;
    this.position = worldPos.clone();
    this.baseY = worldPos.y + 0.65;
    this.position.y = this.baseY;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.build3DModel();
  }

  private build3DModel() {
    if (this.type === 'coin_pack') {
      // 3 Stacked Gleaming Gold Coins
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 0.95,
        roughness: 0.15,
        emissive: 0xd97706,
        emissiveIntensity: 0.35
      });

      const coinGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.07, 18);
      coinGeo.rotateX(0.2);

      const coin1 = new THREE.Mesh(coinGeo, goldMat);
      coin1.position.y = -0.06;
      this.mesh.add(coin1);

      const coin2 = new THREE.Mesh(coinGeo, goldMat);
      coin2.position.set(0.08, 0.04, 0.05);
      coin2.rotation.y = 0.5;
      this.mesh.add(coin2);

      const coin3 = new THREE.Mesh(coinGeo, goldMat);
      coin3.position.set(-0.06, 0.14, -0.04);
      coin3.rotation.y = -0.4;
      this.mesh.add(coin3);

      // Gold Sparkle Halo Ring
      const ringGeo = new THREE.RingGeometry(0.35, 0.45, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = -0.55;
      this.mesh.add(ring);
      return;
    }

    if (this.type === 'health_pack') {
      // Tactical Medkit
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const greenCrossMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x22c55e,
        emissiveIntensity: 0.8
      });

      const boxGeo = new THREE.BoxGeometry(0.42, 0.32, 0.24);
      const box = new THREE.Mesh(boxGeo, whiteMat);
      this.mesh.add(box);

      // Green Cross
      const crossH = new THREE.BoxGeometry(0.24, 0.08, 0.25);
      const crossMeshH = new THREE.Mesh(crossH, greenCrossMat);
      this.mesh.add(crossMeshH);

      const crossV = new THREE.BoxGeometry(0.08, 0.24, 0.25);
      const crossMeshV = new THREE.Mesh(crossV, greenCrossMat);
      this.mesh.add(crossMeshV);

      // Pulsing Green Floor Ring
      const ringGeo = new THREE.RingGeometry(0.38, 0.48, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
      ring.position.y = -0.55;
      this.mesh.add(ring);
      return;
    }

    if (this.type === 'armor_pack') {
      // Tactical Kevlar Shield / Armor Plate
      const armorMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        metalness: 0.85,
        roughness: 0.2
      });
      const trimMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1 });

      const vestGeo = new THREE.BoxGeometry(0.36, 0.42, 0.16);
      const vest = new THREE.Mesh(vestGeo, armorMat);
      this.mesh.add(vest);

      const plateGeo = new THREE.BoxGeometry(0.28, 0.32, 0.18);
      const plate = new THREE.Mesh(plateGeo, trimMat);
      this.mesh.add(plate);

      // Cyan Floor Ring
      const ringGeo = new THREE.RingGeometry(0.38, 0.48, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
      ring.position.y = -0.55;
      this.mesh.add(ring);
      return;
    }

    // Ammo Pack
    const ammoMat = new THREE.MeshStandardMaterial({
      color: 0x3f4f3a, // Military olive drab
      metalness: 0.7,
      roughness: 0.3
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2
    });

    const tinGeo = new THREE.BoxGeometry(0.40, 0.28, 0.24);
    const tin = new THREE.Mesh(tinGeo, ammoMat);
    this.mesh.add(tin);

    // Brass Cartridges in Tin
    const roundGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8);
    [-0.1, 0, 0.1].forEach((rx) => {
      const round = new THREE.Mesh(roundGeo, brassMat);
      round.position.set(rx, 0.16, 0);
      this.mesh.add(round);
    });

    // Amber Floor Ring
    const ringGeo = new THREE.RingGeometry(0.38, 0.48, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
    ring.position.y = -0.55;
    this.mesh.add(ring);
  }

  public update(delta: number, playerPos: THREE.Vector3): boolean {
    this.lifeTime -= delta;
    if (this.lifeTime <= 0) return true; // Expired

    this.bobTime += delta * 3.5;
    this.mesh.rotation.y += delta * 2.2;
    this.mesh.position.y = this.baseY + Math.sin(this.bobTime) * 0.08;

    // Magnetism towards player when nearby
    const dist = this.position.distanceTo(playerPos);
    if (dist <= 2.8) {
      const targetPos = playerPos.clone();
      targetPos.y += 0.8;
      this.position.lerp(targetPos, Math.min(1.0, delta * 7.5));
      this.mesh.position.copy(this.position);
    }

    return false;
  }

  public collect(player: Player, particles: ParticleSystem): string {
    this.isCollected = true;
    let label = '';

    if (this.type === 'coin_pack') {
      const amount = 45;
      player.stats.coins += amount;
      soundManager.playCoinPickup();
      particles.spawnSparks(this.position, new THREE.Vector3(0, 1, 0), 0xfbbf24, 20);
      label = `+${amount} COINS`;
    } else if (this.type === 'health_pack') {
      const amount = 35;
      player.heal(amount);
      soundManager.playHealthPack();
      particles.spawnSparks(this.position, new THREE.Vector3(0, 1, 0), 0x22c55e, 22);
      label = `+${amount} HP RESTORED`;
    } else if (this.type === 'armor_pack') {
      const amount = 40;
      player.addArmor(amount);
      soundManager.playArmorPack();
      particles.spawnSparks(this.position, new THREE.Vector3(0, 1, 0), 0x38bdf8, 22);
      label = `+${amount} ARMOR REPAIRED`;
    } else {
      soundManager.playReload();
      particles.spawnSparks(this.position, new THREE.Vector3(0, 1, 0), 0xf59e0b, 18);
      label = `+AMMO REFILL`;
    }

    return label;
  }

  public dispose() {
    this.mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      }
    });
  }
}

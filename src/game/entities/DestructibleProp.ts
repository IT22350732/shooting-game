import * as THREE from 'three';
import { ArenaObstacle } from '../world/ArenaManager';
import { soundManager } from '../../audio/SoundManager';
import { ParticleSystem } from '../world/ParticleSystem';

export type DestructibleType = 'clay_pot' | 'loot_crate' | 'tech_safe';
export type LootType = 'coin_pack' | 'health_pack' | 'armor_pack' | 'ammo_pack';

export interface DestructibleHitResult {
  hit: boolean;
  destroyed: boolean;
  damageDealt: number;
  lootType?: LootType;
  position?: THREE.Vector3;
}

export class DestructibleProp {
  public id: string;
  public type: DestructibleType;
  public position: THREE.Vector3;
  public mesh: THREE.Group;
  public health: number;
  public maxHealth: number;
  public isDestroyed: boolean = false;
  public obstacle: ArenaObstacle;
  public lootType: LootType;
  public buildingId: string;

  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private flashMat: THREE.MeshBasicMaterial;
  private flashTimer: number = 0;

  constructor(
    id: string,
    type: DestructibleType,
    worldPos: THREE.Vector3,
    rotY: number = 0,
    lootType?: LootType,
    buildingId: string = ''
  ) {
    this.id = id;
    this.type = type;
    this.position = worldPos.clone();
    this.buildingId = buildingId;

    // Determine loot type if not preset
    if (lootType) {
      this.lootType = lootType;
    } else {
      const lootPool: LootType[] = ['coin_pack', 'health_pack', 'armor_pack', 'ammo_pack'];
      this.lootType = lootPool[Math.floor(Math.random() * lootPool.length)];
    }

    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = rotY;

    let boxSize: THREE.Vector3;

    if (this.type === 'clay_pot') {
      this.maxHealth = 1;
      this.health = 1;
      this.buildClayPot();
      boxSize = new THREE.Vector3(0.75, 0.75, 0.75);
    } else if (this.type === 'tech_safe') {
      this.maxHealth = 3;
      this.health = 3;
      this.buildTechSafe();
      boxSize = new THREE.Vector3(0.85, 0.95, 0.75);
    } else {
      this.maxHealth = 2;
      this.health = 2;
      this.buildLootCrate();
      boxSize = new THREE.Vector3(0.9, 0.9, 0.9);
    }

    // Cache original materials for hit flash
    this.mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        this.originalMaterials.set(m, m.material);
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });

    // Box3 cover obstacle
    const box = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(this.position.x, this.position.y + boxSize.y / 2, this.position.z),
      boxSize
    );
    this.obstacle = {
      mesh: this.mesh,
      box,
      isCover: true
    };
  }

  private buildClayPot() {
    const potColor = '#c2410c'; // Terracotta clay
    const potMat = new THREE.MeshStandardMaterial({
      color: potColor,
      roughness: 0.65,
      metalness: 0.08
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.25
    });

    // Main Belly
    const bellyGeo = new THREE.CylinderGeometry(0.34, 0.22, 0.48, 14);
    const belly = new THREE.Mesh(bellyGeo, potMat);
    belly.position.y = 0.24;
    this.mesh.add(belly);

    // Pot Neck
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.32, 0.16, 14);
    const neck = new THREE.Mesh(neckGeo, potMat);
    neck.position.y = 0.54;
    this.mesh.add(neck);

    // Flared Ceramic Rim
    const rimGeo = new THREE.TorusGeometry(0.20, 0.045, 8, 16);
    rimGeo.rotateX(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, potMat);
    rim.position.y = 0.62;
    this.mesh.add(rim);

    // Decorative Gold Band
    const bandGeo = new THREE.TorusGeometry(0.345, 0.025, 8, 16);
    bandGeo.rotateX(Math.PI / 2);
    const band = new THREE.Mesh(bandGeo, goldMat);
    band.position.y = 0.28;
    this.mesh.add(band);

    // Dual Ceramic Handles
    [-0.32, 0.32].forEach((hx) => {
      const handleGeo = new THREE.TorusGeometry(0.09, 0.035, 6, 12);
      const handle = new THREE.Mesh(handleGeo, potMat);
      handle.position.set(hx, 0.42, 0);
      handle.rotation.z = hx > 0 ? 0.3 : -0.3;
      this.mesh.add(handle);
    });
  }

  private buildLootCrate() {
    // Wooden Crate Body
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xa16207,
      roughness: 0.75,
      metalness: 0.1
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.3
    });

    const bodyGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
    const body = new THREE.Mesh(bodyGeo, woodMat);
    body.position.y = 0.425;
    this.mesh.add(body);

    // Metal Corner Brackets & Straps
    const strapGeoH = new THREE.BoxGeometry(0.87, 0.12, 0.87);
    const strapH = new THREE.Mesh(strapGeoH, metalMat);
    strapH.position.y = 0.425;
    this.mesh.add(strapH);

    // Diagonal Cross Brace
    const braceGeo = new THREE.BoxGeometry(0.08, 0.92, 0.88);
    const brace1 = new THREE.Mesh(braceGeo, metalMat);
    brace1.position.y = 0.425;
    brace1.rotation.z = Math.PI / 4;
    this.mesh.add(brace1);

    // Stenciled Supply Emblem Plate
    const plateGeo = new THREE.PlaneGeometry(0.35, 0.35);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.4
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 0.425, 0.435);
    this.mesh.add(plate);
  }

  private buildTechSafe() {
    const safeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.25
    });
    const steelTrim = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.8,
      roughness: 0.3
    });
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

    // Safe Body
    const bodyGeo = new THREE.BoxGeometry(0.78, 0.88, 0.65);
    const body = new THREE.Mesh(bodyGeo, safeMat);
    body.position.y = 0.44;
    this.mesh.add(body);

    // Safe Door Bevel
    const doorGeo = new THREE.BoxGeometry(0.68, 0.78, 0.08);
    const door = new THREE.Mesh(doorGeo, steelTrim);
    door.position.set(0, 0.44, 0.33);
    this.mesh.add(door);

    // Spinning Vault Wheel Handle
    const wheelGeo = new THREE.TorusGeometry(0.12, 0.03, 8, 16);
    const wheel = new THREE.Mesh(wheelGeo, steelTrim);
    wheel.position.set(0, 0.44, 0.39);
    this.mesh.add(wheel);

    // Electronic LED Status Light
    const ledGeo = new THREE.BoxGeometry(0.08, 0.04, 0.03);
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(-0.2, 0.72, 0.38);
    this.mesh.add(led);
  }

  public takeDamage(amount: number, particles: ParticleSystem): DestructibleHitResult {
    if (this.isDestroyed) {
      return { hit: false, destroyed: false, damageDealt: 0 };
    }

    this.health -= amount;
    this.flashHit();

    if (this.health <= 0) {
      this.isDestroyed = true;
      this.obstacle.box.makeEmpty();
      this.mesh.visible = false;

      // Trigger destruction particles & audio
      const burstPos = this.position.clone();
      burstPos.y += 0.45;

      if (this.type === 'clay_pot') {
        particles.spawnSparks(burstPos, new THREE.Vector3(0, 1, 0), 0xc2410c, 26);
        soundManager.playPotBreak();
      } else if (this.type === 'tech_safe') {
        particles.spawnSparks(burstPos, new THREE.Vector3(0, 1, 0), 0x38bdf8, 30);
        soundManager.playCrateBreak();
      } else {
        particles.spawnSparks(burstPos, new THREE.Vector3(0, 1, 0), 0xa16207, 26);
        soundManager.playCrateBreak();
      }

      return {
        hit: true,
        destroyed: true,
        damageDealt: amount,
        lootType: this.lootType,
        position: this.position.clone()
      };
    }

    // Survives shot, spawn hit feedback
    const sparkColor = this.type === 'clay_pot' ? 0xc2410c : this.type === 'tech_safe' ? 0x38bdf8 : 0xa16207;
    particles.spawnSparks(this.position.clone().add(new THREE.Vector3(0, 0.4, 0)), new THREE.Vector3(0, 1, 0), sparkColor, 8);
    soundManager.playClick(undefined, 800, 0.2);

    return {
      hit: true,
      destroyed: false,
      damageDealt: amount
    };
  }

  private flashHit() {
    this.flashTimer = 0.08;
    this.mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = this.flashMat;
      }
    });
  }

  public update(delta: number) {
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.mesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            const orig = this.originalMaterials.get(m);
            if (orig) m.material = orig;
          }
        });
      }
    }
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

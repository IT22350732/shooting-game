import * as THREE from 'three';
import { soundManager } from '../../audio/SoundManager';
import { ArenaObstacle } from '../world/ArenaManager';

export interface BossAttackEvent {
  type: 'laser' | 'rocket' | 'stomp';
  origin: THREE.Vector3;
  target: THREE.Vector3;
  damage: number;
}

export class Boss {
  public id: string = 'boss_apex_colossus';
  public name: string = 'APEX CYBER-COLOSSUS MK-IV';
  public mesh: THREE.Group;
  public weakpointMesh: THREE.Mesh | null = null;
  public laserTelegraphLine: THREE.Line | null = null;

  public position: THREE.Vector3 = new THREE.Vector3(0, 0, -20);
  public health: number;
  public maxHealth: number = 3200;
  public phase: 1 | 2 | 3 | 4 = 1;
  public isDead: boolean = false;

  private speed: number = 4.0;
  private attackCooldown: number = 2.0;
  private stateTimer: number = 0;
  private laserChargeTimer: number = 0;
  private isChargingLaser: boolean = false;
  private targetPlayerPos: THREE.Vector3 = new THREE.Vector3();

  // Visuals
  private hitFlashTimer: number = 0;
  private originalMaterials: Map<THREE.Mesh, THREE.Material> = new Map();
  private flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  constructor(waveMultiplier: number = 1) {
    this.maxHealth = Math.round(2800 * waveMultiplier);
    this.health = this.maxHealth;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.build3DModel();
    soundManager.playBossAlarm();
  }

  private build3DModel() {
    // Sleek White Ceramic Armor + Polished Chrome Chassis
    const whiteArmor = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.5,
      roughness: 0.18
    });
    const chromeFrame = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.2
    });
    const redGlow = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const coreGlow = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });

    // Massive Torso
    const torsoGeo = new THREE.BoxGeometry(3.6, 4.2, 2.8);
    const torso = new THREE.Mesh(torsoGeo, whiteArmor);
    torso.position.y = 4.5;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.mesh.add(torso);
    this.originalMaterials.set(torso, whiteArmor);

    // Glowing Core Weakpoint (Center of Chest)
    const coreGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.45, 24);
    coreGeo.rotateX(Math.PI / 2);
    this.weakpointMesh = new THREE.Mesh(coreGeo, coreGlow);
    this.weakpointMesh.position.set(0, 4.8, 1.48);
    this.mesh.add(this.weakpointMesh);
    this.originalMaterials.set(this.weakpointMesh, coreGlow);

    // Head
    const headGeo = new THREE.BoxGeometry(1.4, 1.2, 1.4);
    const head = new THREE.Mesh(headGeo, chromeFrame);
    head.position.set(0, 7.0, 0.2);
    head.castShadow = true;
    this.mesh.add(head);
    this.originalMaterials.set(head, chromeFrame);

    // Red Cyclops Visor
    const eyeGeo = new THREE.BoxGeometry(0.9, 0.25, 0.2);
    const eye = new THREE.Mesh(eyeGeo, redGlow);
    eye.position.set(0, 7.0, 0.95);
    this.mesh.add(eye);

    // Giant Left Arm (Heavy Gatling Cannon)
    const armGeo = new THREE.CylinderGeometry(0.5, 0.6, 3.8, 16);
    armGeo.rotateX(Math.PI / 4);
    const leftArm = new THREE.Mesh(armGeo, whiteArmor);
    leftArm.position.set(-2.6, 4.5, 0.8);
    leftArm.castShadow = true;
    this.mesh.add(leftArm);

    // Giant Right Arm (Laser Emitter / Energy Cannon)
    const rightArm = new THREE.Mesh(armGeo, whiteArmor);
    rightArm.position.set(2.6, 4.5, 0.8);
    rightArm.castShadow = true;
    this.mesh.add(rightArm);

    // Massive Hydraulic Legs
    const legGeo = new THREE.BoxGeometry(1.1, 3.0, 1.3);
    const leftLeg = new THREE.Mesh(legGeo, chromeFrame);
    leftLeg.position.set(-1.2, 1.5, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    this.mesh.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, chromeFrame);
    rightLeg.position.set(1.2, 1.5, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    this.mesh.add(rightLeg);

    // Laser Telegraph Indicator (red guide line)
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -45)
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0,
      linewidth: 3
    });
    this.laserTelegraphLine = new THREE.Line(lineGeo, lineMat);
    this.laserTelegraphLine.position.set(2.6, 3.2, 1.8);
    this.mesh.add(this.laserTelegraphLine);
  }

  public takeDamage(amount: number, isWeakpoint: boolean): { killed: boolean; finalDamage: number } {
    if (this.isDead) return { killed: false, finalDamage: 0 };

    const multiplier = isWeakpoint ? (this.phase === 4 ? 3.5 : 2.0) : 1.0;
    const finalDamage = Math.round(amount * multiplier);
    this.health -= finalDamage;

    // Hit flash
    this.hitFlashTimer = 0.08;
    this.originalMaterials.forEach((origMat, mesh) => {
      mesh.material = this.flashMaterial;
    });

    soundManager.playEnemyHit();

    // Check phase transitions
    const ratio = this.health / this.maxHealth;
    if (ratio <= 0.25 && this.phase < 4) {
      this.phase = 4;
      this.speed = 7.2;
      if (this.weakpointMesh) {
        (this.weakpointMesh.material as THREE.MeshBasicMaterial).color.setHex(0xf43f5e);
      }
      soundManager.playBossAlarm();
    } else if (ratio <= 0.50 && this.phase < 3) {
      this.phase = 3;
      this.speed = 5.6;
    } else if (ratio <= 0.75 && this.phase < 2) {
      this.phase = 2;
    }

    if (this.health <= 0) {
      this.isDead = true;
      soundManager.playExplosion();
      return { killed: true, finalDamage };
    }

    return { killed: false, finalDamage };
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    _obstacles: ArenaObstacle[],
    onAttack?: (event: BossAttackEvent) => void,
    onSummonMinions?: () => void
  ) {
    if (this.isDead) {
      this.mesh.position.y -= delta * 1.5;
      this.mesh.scale.multiplyScalar(Math.max(0, 1 - delta * 0.8));
      return;
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0) {
        this.originalMaterials.forEach((origMat, mesh) => {
          mesh.material = origMat;
        });
      }
    }

    this.stateTimer += delta;
    this.targetPlayerPos.copy(playerPos);

    const targetAngle = Math.atan2(playerPos.x - this.position.x, playerPos.z - this.position.z);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, delta * 3.5);

    const distToPlayer = this.position.distanceTo(playerPos);

    if (this.isChargingLaser) {
      this.laserChargeTimer -= delta;
      if (this.laserTelegraphLine) {
        (this.laserTelegraphLine.material as THREE.LineBasicMaterial).opacity = Math.min(1, (1.5 - this.laserChargeTimer));
      }

      if (this.laserChargeTimer <= 0) {
        this.isChargingLaser = false;
        if (this.laserTelegraphLine) {
          (this.laserTelegraphLine.material as THREE.LineBasicMaterial).opacity = 0;
        }

        if (onAttack) {
          const origin = this.position.clone();
          origin.y += 3.5;
          onAttack({
            type: 'laser',
            origin,
            target: playerPos.clone(),
            damage: 45
          });
        }
      }
      return;
    }

    if (distToPlayer > 8.0) {
      const dir = new THREE.Vector3().subVectors(playerPos, this.position).normalize();
      dir.y = 0;
      this.position.addScaledVector(dir, this.speed * delta);
      this.mesh.position.copy(this.position);
    }

    this.attackCooldown -= delta;
    if (this.attackCooldown <= 0) {
      this.attackCooldown = Math.max(1.8, 3.8 - this.phase * 0.5);

      const roll = Math.random();

      if (this.phase >= 3 && roll < 0.45) {
        this.isChargingLaser = true;
        this.laserChargeTimer = 1.4;
        soundManager.playBossAlarm();
      } else if (this.phase >= 2 && roll < 0.75) {
        if (onSummonMinions) {
          onSummonMinions();
        }
      } else {
        if (onAttack) {
          const origin = this.position.clone();
          origin.y += 4.5;
          onAttack({
            type: distToPlayer < 9 ? 'stomp' : 'rocket',
            origin,
            target: playerPos.clone(),
            damage: 32
          });
        }
      }
    }
  }

  public dispose() {
    this.originalMaterials.clear();
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

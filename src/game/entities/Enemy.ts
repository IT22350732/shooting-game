import * as THREE from 'three';
import { EnemyType } from '../../types/game';
import { soundManager } from '../../audio/SoundManager';
import { ArenaObstacle } from '../world/ArenaManager';

export interface EnemyShootEvent {
  origin: THREE.Vector3;
  target: THREE.Vector3;
  damage: number;
}

export class Enemy {
  public id: string;
  public type: EnemyType;
  public mesh: THREE.Group;
  public headMesh: THREE.Mesh | null = null;
  public shieldMesh: THREE.Mesh | null = null;

  public position: THREE.Vector3 = new THREE.Vector3();
  public health: number;
  public maxHealth: number;
  public speed: number;
  public damage: number;
  public scoreValue: number;
  public coinValue: number;
  public isDead: boolean = false;

  // AI & Attack state
  private attackRange: number;
  private attackCooldown: number = 0;
  private attackInterval: number;
  private stateTimer: number = 0;
  private strafeDir: number = 1;

  // Exploder fuse
  public isFuseActive: boolean = false;
  public fuseTimer: number = 1.2;

  // Visual flash on damage
  private hitFlashTimer: number = 0;
  private originalMaterials: Map<THREE.Mesh, THREE.Material> = new Map();
  private flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Floating Health Bar
  private healthBarMesh: THREE.Mesh;
  private healthBarBg: THREE.Mesh;

  constructor(id: string, type: EnemyType, spawnPos: THREE.Vector3, waveMultiplier: number = 1) {
    this.id = id;
    this.type = type;
    this.position.copy(spawnPos);
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // Configure stats based on type
    switch (type) {
      case 'fast':
        this.maxHealth = Math.round(45 * waveMultiplier);
        this.speed = 9.8;
        this.damage = 14;
        this.attackRange = 1.8;
        this.attackInterval = 0.9;
        this.scoreValue = 120;
        this.coinValue = 2;
        break;

      case 'ranged':
        this.maxHealth = Math.round(70 * waveMultiplier);
        this.speed = 4.2;
        this.damage = 18;
        this.attackRange = 22.0;
        this.attackInterval = 2.2;
        this.scoreValue = 180;
        this.coinValue = 3;
        break;

      case 'tank':
        this.maxHealth = Math.round(360 * waveMultiplier);
        this.speed = 3.0;
        this.damage = 35;
        this.attackRange = 3.2;
        this.attackInterval = 2.0;
        this.scoreValue = 400;
        this.coinValue = 6;
        break;

      case 'exploder':
        this.maxHealth = Math.round(55 * waveMultiplier);
        this.speed = 7.5;
        this.damage = 65;
        this.attackRange = 3.5;
        this.attackInterval = 0.1;
        this.scoreValue = 220;
        this.coinValue = 3;
        break;

      case 'shield':
        this.maxHealth = Math.round(110 * waveMultiplier);
        this.speed = 4.8;
        this.damage = 22;
        this.attackRange = 2.2;
        this.attackInterval = 1.2;
        this.scoreValue = 260;
        this.coinValue = 4;
        break;

      case 'elite':
        this.maxHealth = Math.round(280 * waveMultiplier);
        this.speed = 6.4;
        this.damage = 28;
        this.attackRange = 18.0;
        this.attackInterval = 1.4;
        this.scoreValue = 600;
        this.coinValue = 12;
        break;

      case 'basic':
      default:
        this.maxHealth = Math.round(80 * waveMultiplier);
        this.speed = 5.6;
        this.damage = 18;
        this.attackRange = 2.0;
        this.attackInterval = 1.1;
        this.scoreValue = 100;
        this.coinValue = 2;
        break;
    }

    this.health = this.maxHealth;

    // Build Procedural 3D Mesh
    this.build3DModel();

    // Create Floating Health Bar billboard
    const bgGeo = new THREE.PlaneGeometry(1.0, 0.12);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    this.healthBarBg = new THREE.Mesh(bgGeo, bgMat);
    this.healthBarBg.position.y = this.getHeight() + 0.35;
    this.mesh.add(this.healthBarBg);

    const barGeo = new THREE.PlaneGeometry(0.96, 0.08);
    const barMat = new THREE.MeshBasicMaterial({
      color: type === 'elite' ? 0xd97706 : (type === 'tank' ? 0x0284c7 : 0xf43f5e),
      side: THREE.DoubleSide
    });
    this.healthBarMesh = new THREE.Mesh(barGeo, barMat);
    this.healthBarMesh.position.y = this.getHeight() + 0.35;
    this.healthBarMesh.position.z = 0.01;
    this.mesh.add(this.healthBarMesh);
  }

  public getHeight(): number {
    switch (this.type) {
      case 'tank': return 3.2;
      case 'fast': return 1.4;
      case 'exploder': return 1.3;
      case 'elite': return 2.6;
      default: return 2.2;
    }
  }

  private build3DModel() {
    const isElite = this.type === 'elite';

    // Sleek White Ceramic Armor with Chrome Joints
    const armorColor = isElite ? 0xfef08a : (this.type === 'tank' ? 0xe2e8f0 : (this.type === 'exploder' ? 0xffedd5 : 0xffffff));
    const eyeColor = isElite ? 0xd97706 : (this.type === 'exploder' ? 0xf43f5e : 0x0284c7);

    const armorMat = new THREE.MeshStandardMaterial({
      color: armorColor,
      roughness: 0.15,
      metalness: 0.4
    });

    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.9
    });

    const visorMat = new THREE.MeshBasicMaterial({ color: eyeColor });

    if (this.type === 'tank') {
      // High-Tech White & Chrome Heavy Mech
      const torsoGeo = new THREE.BoxGeometry(1.6, 1.8, 1.2);
      const torso = new THREE.Mesh(torsoGeo, armorMat);
      torso.position.y = 1.8;
      torso.castShadow = true;
      torso.receiveShadow = true;
      this.mesh.add(torso);
      this.originalMaterials.set(torso, armorMat);

      // Heavy shoulders
      const shoulderGeo = new THREE.BoxGeometry(0.65, 0.75, 0.75);
      const leftShoulder = new THREE.Mesh(shoulderGeo, armorMat);
      leftShoulder.position.set(-1.15, 2.2, 0);
      leftShoulder.castShadow = true;
      this.mesh.add(leftShoulder);
      this.originalMaterials.set(leftShoulder, armorMat);

      const rightShoulder = new THREE.Mesh(shoulderGeo, armorMat);
      rightShoulder.position.set(1.15, 2.2, 0);
      rightShoulder.castShadow = true;
      this.mesh.add(rightShoulder);
      this.originalMaterials.set(rightShoulder, armorMat);

      // Head (Critical Weakpoint)
      const headGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
      this.headMesh = new THREE.Mesh(headGeo, armorMat);
      this.headMesh.position.set(0, 2.85, 0.1);
      this.headMesh.castShadow = true;
      this.mesh.add(this.headMesh);
      this.originalMaterials.set(this.headMesh, armorMat);

      // Luminous Visor
      const visorGeo = new THREE.BoxGeometry(0.48, 0.16, 0.1);
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 2.85, 0.42);
      this.mesh.add(visor);

      // Articulated hydraulic legs
      const legGeo = new THREE.CylinderGeometry(0.24, 0.32, 1.2, 12);
      const leftLeg = new THREE.Mesh(legGeo, jointMat);
      leftLeg.position.set(-0.55, 0.6, 0);
      leftLeg.castShadow = true;
      this.mesh.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, jointMat);
      rightLeg.position.set(0.55, 0.6, 0);
      rightLeg.castShadow = true;
      this.mesh.add(rightLeg);

    } else if (this.type === 'exploder') {
      // Sleek spherical drone with pulsing core
      const sphereGeo = new THREE.SphereGeometry(0.65, 24, 24);
      const bombMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.6,
        emissive: 0xf43f5e,
        emissiveIntensity: 0.4
      });
      const bomb = new THREE.Mesh(sphereGeo, bombMat);
      bomb.position.y = 0.8;
      bomb.castShadow = true;
      this.mesh.add(bomb);
      this.originalMaterials.set(bomb, bombMat);

      // 4 chrome spider legs
      for (let i = 0; i < 4; i++) {
        const legGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.8, 8);
        const leg = new THREE.Mesh(legGeo, jointMat);
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        leg.position.set(Math.cos(angle) * 0.55, 0.4, Math.sin(angle) * 0.55);
        leg.rotation.z = Math.cos(angle) * 0.4;
        leg.rotation.x = Math.sin(angle) * 0.4;
        leg.castShadow = true;
        this.mesh.add(leg);
      }

      this.headMesh = bomb;

    } else if (this.type === 'shield') {
      // White & Cyan Shield Vanguard
      const torsoGeo = new THREE.BoxGeometry(0.8, 1.3, 0.5);
      const torso = new THREE.Mesh(torsoGeo, armorMat);
      torso.position.y = 1.3;
      torso.castShadow = true;
      this.mesh.add(torso);
      this.originalMaterials.set(torso, armorMat);

      // Head
      const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
      this.headMesh = new THREE.Mesh(headGeo, armorMat);
      this.headMesh.position.set(0, 2.1, 0);
      this.headMesh.castShadow = true;
      this.mesh.add(this.headMesh);
      this.originalMaterials.set(this.headMesh, armorMat);

      // Luminous Hex Energy Shield
      const shieldGeo = new THREE.PlaneGeometry(1.5, 1.9);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.8,
        roughness: 0.1,
        metalness: 0.9,
        side: THREE.DoubleSide,
        emissive: 0x0284c7,
        emissiveIntensity: 0.9
      });
      this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      this.shieldMesh.position.set(0, 1.25, 0.65);
      this.mesh.add(this.shieldMesh);

    } else {
      // Standard Humanoid Android (Basic, Fast, Ranged, Elite)
      const scaleY = this.type === 'fast' ? 0.75 : (isElite ? 1.2 : 1.0);

      const torsoGeo = new THREE.BoxGeometry(0.8, 1.1 * scaleY, 0.45);
      const torso = new THREE.Mesh(torsoGeo, armorMat);
      torso.position.y = 1.25 * scaleY;
      torso.castShadow = true;
      this.mesh.add(torso);
      this.originalMaterials.set(torso, armorMat);

      // Head (Weak Point)
      const headGeo = new THREE.BoxGeometry(0.44, 0.45, 0.44);
      this.headMesh = new THREE.Mesh(headGeo, armorMat);
      this.headMesh.position.set(0, 2.0 * scaleY, 0);
      this.headMesh.castShadow = true;
      this.mesh.add(this.headMesh);
      this.originalMaterials.set(this.headMesh, armorMat);

      // Glowing Optical Visor
      const visorGeo = new THREE.BoxGeometry(0.32, 0.1, 0.08);
      const eyes = new THREE.Mesh(visorGeo, visorMat);
      eyes.position.set(0, 2.0 * scaleY, 0.23);
      this.mesh.add(eyes);

      // Ranged Weapon on arm
      if (this.type === 'ranged' || this.type === 'elite') {
        const gunGeo = new THREE.BoxGeometry(0.18, 0.18, 0.75);
        const gun = new THREE.Mesh(gunGeo, jointMat);
        gun.position.set(0.55, 1.25 * scaleY, 0.35);
        gun.castShadow = true;
        this.mesh.add(gun);
      }
    }
  }

  public takeDamage(
    amount: number,
    isHeadshot: boolean,
    hitNormal?: THREE.Vector3
  ): { killed: boolean; finalDamage: number; blocked: boolean } {
    if (this.isDead) return { killed: false, finalDamage: 0, blocked: false };

    // Shield Enemy front deflection check
    if (this.type === 'shield' && hitNormal) {
      const enemyForward = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation);
      const dot = hitNormal.dot(enemyForward);
      if (dot < -0.3) {
        soundManager.playHitmark(false);
        return { killed: false, finalDamage: 0, blocked: true };
      }
    }

    const finalDamage = Math.round(amount * (isHeadshot ? 2.5 : 1.0));
    this.health -= finalDamage;

    // Trigger visual hit flash
    this.hitFlashTimer = 0.08;
    this.applyHitFlash(true);

    soundManager.playEnemyHit();

    // Update health bar scale
    const healthRatio = Math.max(0, this.health / this.maxHealth);
    this.healthBarMesh.scale.x = healthRatio;
    this.healthBarMesh.position.x = -(1 - healthRatio) * 0.48;

    if (this.health <= 0) {
      this.isDead = true;
      soundManager.playEnemyDeath(this.type);
      return { killed: true, finalDamage, blocked: false };
    }

    return { killed: false, finalDamage, blocked: false };
  }

  private applyHitFlash(flash: boolean) {
    this.originalMaterials.forEach((origMat, mesh) => {
      mesh.material = flash ? this.flashMaterial : origMat;
    });
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    obstacles: ArenaObstacle[],
    onShoot?: (event: EnemyShootEvent) => void,
    onPlayerHit?: (damage: number) => void
  ) {
    if (this.isDead) {
      this.mesh.scale.multiplyScalar(Math.max(0, 1 - delta * 4));
      return;
    }

    // Hit flash decay
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      if (this.hitFlashTimer <= 0) {
        this.applyHitFlash(false);
      }
    }

    // Billboards face camera
    this.healthBarBg.lookAt(playerPos.x, this.healthBarBg.position.y + this.position.y, playerPos.z);
    this.healthBarMesh.lookAt(playerPos.x, this.healthBarMesh.position.y + this.position.y, playerPos.z);

    const distToPlayer = this.position.distanceTo(playerPos);
    this.stateTimer += delta;

    // Turn toward player
    const targetAngle = Math.atan2(playerPos.x - this.position.x, playerPos.z - this.position.z);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, delta * 8);

    // Exploder fuse logic
    if (this.type === 'exploder') {
      if (distToPlayer < 4.5) {
        this.isFuseActive = true;
      }
      if (this.isFuseActive) {
        this.fuseTimer -= delta;
        const pulse = Math.sin(this.stateTimer * 25) * 0.5 + 0.5;
        this.mesh.scale.setScalar(1 + pulse * 0.25);

        if (this.fuseTimer <= 0) {
          this.isDead = true;
          soundManager.playExplosion();
          if (distToPlayer < 6.0 && onPlayerHit) {
            const factor = 1 - (distToPlayer / 6.0);
            onPlayerHit(Math.round(this.damage * factor));
          }
          return;
        }
      }
    }

    // Attack Cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    // Movement & Combat Behavior
    let moveDir = new THREE.Vector3();

    if (this.type === 'ranged' || this.type === 'elite') {
      if (distToPlayer > 18) {
        moveDir.subVectors(playerPos, this.position).normalize();
      } else if (distToPlayer < 9) {
        moveDir.subVectors(this.position, playerPos).normalize();
      } else {
        if (this.stateTimer > 3.0) {
          this.strafeDir *= -1;
          this.stateTimer = 0;
        }
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        moveDir.copy(right).multiplyScalar(this.strafeDir);
      }

      if (this.attackCooldown <= 0 && distToPlayer < this.attackRange) {
        this.attackCooldown = this.attackInterval;
        if (onShoot) {
          const shootOrigin = this.position.clone();
          shootOrigin.y += this.getHeight() * 0.65;
          onShoot({
            origin: shootOrigin,
            target: playerPos.clone().add(new THREE.Vector3(0, -0.2, 0)),
            damage: this.damage
          });
        }
      }

    } else {
      if (distToPlayer > this.attackRange) {
        moveDir.subVectors(playerPos, this.position).normalize();
      } else {
        if (this.attackCooldown <= 0) {
          this.attackCooldown = this.attackInterval;
          if (onPlayerHit) {
            onPlayerHit(this.damage);
          }
        }
      }
    }

    // Move enemy and avoid obstacles
    if (moveDir.lengthSq() > 0.01) {
      moveDir.y = 0;
      moveDir.normalize();

      const nextPos = this.position.clone().addScaledVector(moveDir, this.speed * delta);

      for (const obs of obstacles) {
        if (obs.box.distanceToPoint(nextPos) < 1.0) {
          moveDir.reflect(new THREE.Vector3(1, 0, 0)).normalize();
          nextPos.copy(this.position).addScaledVector(moveDir, this.speed * 0.5 * delta);
          break;
        }
      }

      this.position.x = nextPos.x;
      this.position.z = nextPos.z;
      this.mesh.position.copy(this.position);
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

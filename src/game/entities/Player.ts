import * as THREE from 'three';
import { PlayerStats, PowerupActiveState, PowerupType, UpgradeLevels } from '../../types/game';
import { soundManager } from '../../audio/SoundManager';
import { ArenaObstacle } from '../world/ArenaManager';

export class Player {
  public camera: THREE.PerspectiveCamera;
  public stats: PlayerStats;
  public activePowerups: Map<PowerupType, PowerupActiveState> = new Map();

  // Movement & Physics
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.8, 12);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = true;
  private readonly playerRadius = 0.6;
  private readonly eyeHeight = 1.75;
  private walkTime: number = 0;

  // Camera angles
  public pitch: number = 0; // vertical (radians)
  public yaw: number = 0;   // horizontal (radians)

  // Screen shake
  public trauma: number = 0;
  public shakeOffset: THREE.Vector3 = new THREE.Vector3();
  public shakeEuler: THREE.Euler = new THREE.Euler();

  // Damage direction indicator (for HUD)
  public lastDamageAngle: number | null = null;
  public damageFlashTimer: number = 0;

  // Invulnerability window after hurt
  private hurtCooldown: number = 0;

  constructor(camera: THREE.PerspectiveCamera, upgrades?: UpgradeLevels) {
    this.camera = camera;

    const maxHp = 100 + (upgrades?.health ?? 0) * 25;
    const maxArm = 50 + (upgrades?.armor ?? 0) * 20;

    this.stats = {
      health: maxHp,
      maxHealth: maxHp,
      armor: maxArm,
      maxArmor: maxArm,
      score: 0,
      coins: 0,
      wave: 1,
      kills: 0,
      headshots: 0,
      highestCombo: 0,
      combo: 0,
      comboTimer: 0
    };

    this.camera.position.copy(this.position);
  }

  public applyUpgrades(upgrades: UpgradeLevels) {
    const extraHp = upgrades.health * 25;
    const extraArm = upgrades.armor * 20;
    this.stats.maxHealth = 100 + extraHp;
    this.stats.maxArmor = 50 + extraArm;
  }

  public reset(upgrades?: UpgradeLevels) {
    const maxHp = 100 + (upgrades?.health ?? 0) * 25;
    const maxArm = 50 + (upgrades?.armor ?? 0) * 20;
    this.stats.health = maxHp;
    this.stats.maxHealth = maxHp;
    this.stats.armor = maxArm;
    this.stats.maxArmor = maxArm;
    this.stats.score = 0;
    this.stats.coins = 0;
    this.stats.wave = 1;
    this.stats.kills = 0;
    this.stats.headshots = 0;
    this.stats.highestCombo = 0;
    this.stats.combo = 0;
    this.stats.comboTimer = 0;
    this.activePowerups.clear();
    this.position.set(0, 1.8, 12);
    this.velocity.set(0, 0, 0);
    this.pitch = 0;
    this.yaw = 0;
    this.trauma = 0;
  }

  public takeDamage(amount: number, sourcePosition?: THREE.Vector3): boolean {
    if (this.hurtCooldown > 0) return false;
    if (this.hasPowerup('shield')) return false; // Shield invulnerability

    this.hurtCooldown = 0.25;
    this.damageFlashTimer = 0.45;
    this.addTrauma(0.45);
    soundManager.playPlayerHurt();

    // Reset combo streak upon taking damage
    this.stats.combo = 0;
    this.stats.comboTimer = 0;

    // Calculate relative damage angle for HUD indicator
    if (sourcePosition) {
      const toSource = new THREE.Vector3().subVectors(sourcePosition, this.position);
      const angleToSource = Math.atan2(toSource.x, toSource.z);
      // Relative to current yaw
      let diff = angleToSource - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.lastDamageAngle = diff;
    }

    // Armor absorption (armor absorbs 65% of damage)
    if (this.stats.armor > 0) {
      const armorAbsorb = amount * 0.65;
      const actualArmorDmg = Math.min(this.stats.armor, armorAbsorb);
      this.stats.armor -= actualArmorDmg;
      const healthDmg = amount - actualArmorDmg;
      this.stats.health -= healthDmg;
    } else {
      this.stats.health -= amount;
    }

    this.stats.health = Math.max(0, Math.round(this.stats.health));
    this.stats.armor = Math.max(0, Math.round(this.stats.armor));

    return this.stats.health <= 0;
  }

  public heal(amount: number) {
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
  }

  public addArmor(amount: number) {
    this.stats.armor = Math.min(this.stats.maxArmor, this.stats.armor + amount);
  }

  public activatePowerup(type: PowerupType, duration: number = 10) {
    if (type === 'health') {
      this.heal(40);
      return;
    }
    if (type === 'armor') {
      this.addArmor(50);
      return;
    }

    this.activePowerups.set(type, {
      type,
      remainingTime: duration,
      duration
    });
  }

  public hasPowerup(type: PowerupType): boolean {
    return this.activePowerups.has(type) && (this.activePowerups.get(type)!.remainingTime > 0);
  }

  public addTrauma(amount: number) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  public rotateCamera(movementX: number, movementY: number, sensitivity: number, isAiming: boolean = false) {
    const adsDamp = isAiming ? 0.55 : 1.0;
    const sensFactor = 0.002 * (sensitivity / 50) * adsDamp;
    this.yaw -= movementX * sensFactor;
    this.pitch -= movementY * sensFactor;

    // Clamp pitch to avoid neck snapping (-89 to +89 degrees)
    const maxPitch = (Math.PI / 2) - 0.05;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  public update(
    delta: number,
    keys: { forward: boolean; backward: boolean; left: boolean; right: boolean; jump: boolean; sprint: boolean },
    obstacles: ArenaObstacle[],
    arenaSize: number,
    screenShakeEnabled: boolean = true,
    analogMove?: { x: number; y: number; sprint?: boolean }
  ): { isMoving: boolean; walkTime: number } {
    // Hurt cooldown & damage flash
    if (this.hurtCooldown > 0) this.hurtCooldown -= delta;
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= delta;
      if (this.damageFlashTimer <= 0) this.lastDamageAngle = null;
    }

    // Update active powerup timers
    for (const [key, state] of this.activePowerups.entries()) {
      state.remainingTime -= delta;
      if (state.remainingTime <= 0) {
        this.activePowerups.delete(key);
      }
    }

    // Combo timer decay
    if (this.stats.combo > 0) {
      this.stats.comboTimer -= delta;
      if (this.stats.comboTimer <= 0) {
        this.stats.combo = 0;
      }
    }

    // Calculate move direction relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const moveDir = new THREE.Vector3();
    const hasAnalog = analogMove && (Math.abs(analogMove.x) > 0.05 || Math.abs(analogMove.y) > 0.05);

    if (hasAnalog) {
      // y > 0 is forward, y < 0 is backward; x > 0 is right, x < 0 is left
      moveDir.addScaledVector(forward, analogMove.y);
      moveDir.addScaledVector(right, analogMove.x);
    } else {
      if (keys.forward) moveDir.add(forward);
      if (keys.backward) moveDir.sub(forward);
      if (keys.right) moveDir.add(right);
      if (keys.left) moveDir.sub(right);
    }

    const isMoving = moveDir.lengthSq() > 0.01;
    if (isMoving) moveDir.normalize();

    // Speed calculation
    const isSprinting = keys.sprint || !!analogMove?.sprint;
    const baseSpeed = isSprinting ? 14.0 : 8.5;
    const accel = this.isGrounded ? 45.0 : 18.0;
    const friction = this.isGrounded ? 14.0 : 2.5;

    // Horizontal acceleration
    if (isMoving) {
      this.velocity.x += moveDir.x * accel * delta;
      this.velocity.z += moveDir.z * accel * delta;

      // Cap max horizontal speed
      const hSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
      if (hSpeed > baseSpeed) {
        const factor = baseSpeed / hSpeed;
        this.velocity.x *= factor;
        this.velocity.z *= factor;
      }

      this.walkTime += delta * (keys.sprint ? 14 : 9);
    } else {
      // Apply friction
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, friction, delta);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, friction, delta);
    }

    // Jump & Gravity
    if (keys.jump && this.isGrounded) {
      this.velocity.y = 8.5;
      this.isGrounded = false;
    }

    // Gravity
    this.velocity.y -= 22.0 * delta;

    // Proposed new position
    const newPos = this.position.clone();
    newPos.x += this.velocity.x * delta;
    newPos.z += this.velocity.z * delta;
    newPos.y += this.velocity.y * delta;

    // Check landing on top of waist-high cover obstacles (crates, fences, cars)
    let groundY = this.eyeHeight;
    for (const obs of obstacles) {
      if (obs.isCover && obs.box.max.y <= 2.2) {
        if (
          newPos.x >= obs.box.min.x - this.playerRadius * 0.6 &&
          newPos.x <= obs.box.max.x + this.playerRadius * 0.6 &&
          newPos.z >= obs.box.min.z - this.playerRadius * 0.6 &&
          newPos.z <= obs.box.max.z + this.playerRadius * 0.6
        ) {
          const topY = obs.box.max.y + this.eyeHeight;
          if (this.position.y >= topY - 0.35 && newPos.y <= topY + 0.1) {
            if (topY > groundY) groundY = topY;
          }
        }
      }
    }

    // Floor / Obstacle-top collision
    if (newPos.y <= groundY) {
      newPos.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Perimeter boundary clamp
    const halfArena = (arenaSize / 2) - 1.5;
    newPos.x = Math.max(-halfArena, Math.min(halfArena, newPos.x));
    newPos.z = Math.max(-halfArena, Math.min(halfArena, newPos.z));

    // Obstacle AABB Collision resolution with smooth wall sliding
    const boxSize = new THREE.Vector3(this.playerRadius * 2, this.eyeHeight, this.playerRadius * 2);

    for (const obs of obstacles) {
      // Skip horizontal blocking if standing safely on top
      if (newPos.y > obs.box.max.y + this.eyeHeight - 0.05) continue;

      const playerBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(newPos.x, newPos.y - this.eyeHeight / 2, newPos.z),
        boxSize
      );

      if (obs.box.intersectsBox(playerBox)) {
        // Resolve collision along X
        const testBoxX = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(newPos.x, this.position.y - this.eyeHeight / 2, this.position.z),
          boxSize
        );
        if (obs.box.intersectsBox(testBoxX)) {
          newPos.x = this.position.x;
          this.velocity.x = 0;
        }

        // Resolve collision along Z using the resolved newPos.x (allows smooth wall sliding!)
        const testBoxZ = new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(newPos.x, this.position.y - this.eyeHeight / 2, newPos.z),
          boxSize
        );
        if (obs.box.intersectsBox(testBoxZ)) {
          newPos.z = this.position.z;
          this.velocity.z = 0;
        }
      }
    }

    this.position.copy(newPos);

    // Apply Screen Shake
    let shakePitch = 0;
    let shakeYaw = 0;
    let shakeRoll = 0;

    if (screenShakeEnabled && this.trauma > 0) {
      const shakePower = Math.pow(this.trauma, 2);
      const shakeSpeed = 35;
      const time = performance.now() * 0.001 * shakeSpeed;
      shakePitch = (Math.sin(time * 1.3) * 0.05) * shakePower;
      shakeYaw = (Math.cos(time * 1.1) * 0.05) * shakePower;
      shakeRoll = (Math.sin(time * 1.5) * 0.03) * shakePower;

      this.trauma = Math.max(0, this.trauma - delta * 1.5);
    }

    // Smooth camera position without view bobbing or weapon vibration
    this.camera.position.set(
      this.position.x,
      this.position.y,
      this.position.z
    );

    // Euler rotation: order YXZ (first Yaw around world Y, then Pitch around local X)
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + shakeYaw;
    this.camera.rotation.x = this.pitch + shakePitch;
    this.camera.rotation.z = shakeRoll;

    return { isMoving, walkTime: this.walkTime };
  }

  public getShootRay(): { origin: THREE.Vector3; direction: THREE.Vector3 } {
    const origin = this.camera.position.clone();
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    return { origin, direction };
  }
}

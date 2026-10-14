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
  public onStairRamp: boolean = false;
  private readonly playerRadius = 0.38;
  public stance: 'stand' | 'crouch' | 'prone' = 'stand';
  public targetEyeHeight: number = 1.75;
  public eyeHeight: number = 1.75;
  private walkTime: number = 0;

  private static _newPos = new THREE.Vector3();
  private static _nearbyObstacles: ArenaObstacle[] = [];

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
  public isSheltered: boolean = false;

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
    this.stance = 'stand';
    this.targetEyeHeight = 1.75;
    this.eyeHeight = 1.75;
    this.onStairRamp = false;
  }

  public setStance(newStance: 'stand' | 'crouch' | 'prone') {
    this.stance = newStance;
    if (newStance === 'crouch') {
      this.targetEyeHeight = 1.15;
    } else if (newStance === 'prone') {
      this.targetEyeHeight = 0.55;
    } else {
      this.targetEyeHeight = 1.75;
    }
  }

  public toggleCrouch() {
    this.setStance(this.stance === 'crouch' ? 'stand' : 'crouch');
  }

  public toggleProne() {
    this.setStance(this.stance === 'prone' ? 'stand' : 'prone');
  }

  public takeDamage(amount: number, sourcePosition?: THREE.Vector3): boolean {
    if (this.isSheltered) return false;
    if (this.hurtCooldown > 0) return false;
    if (this.hasPowerup('shield')) return false; // Shield invulnerability

    this.hurtCooldown = 0.05;
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
      this.heal(65);
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

  public rotateCamera(
    movementX: number,
    movementY: number,
    sensitivity: number,
    isAiming: boolean = false,
    zoomLevel: number = 0
  ) {
    let adsDamp = 1.0;
    if (isAiming || zoomLevel >= 1) {
      adsDamp = 0.52; // Tactical ADS Zoom
    }
    const sensFactor = 0.002 * (sensitivity / 50) * adsDamp;
    this.yaw -= movementX * sensFactor;
    this.pitch -= movementY * sensFactor;

    // Clamp pitch to avoid neck snapping (-89 to +89 degrees)
    const maxPitch = (Math.PI / 2) - 0.05;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  public applyTargetAssist(targetPos: THREE.Vector3, strength: number = 0.035) {
    const toTarget = targetPos.clone().sub(this.camera.position).normalize();
    const targetYaw = Math.atan2(-toTarget.x, -toTarget.z);
    const targetPitch = Math.asin(Math.max(-0.99, Math.min(0.99, toTarget.y)));

    let diffYaw = targetYaw - this.yaw;
    while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
    while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;

    this.yaw += diffYaw * strength;
    this.pitch += (targetPitch - this.pitch) * strength;
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

    // Smoothly transition eye height between stand, crouch, and prone
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, this.targetEyeHeight, 14, delta);

    // Speed calculation based on stance
    const isSprinting = (keys.sprint || !!analogMove?.sprint) && this.stance === 'stand';
    let baseSpeed = isSprinting ? 14.0 : 8.5;
    if (this.stance === 'crouch') {
      baseSpeed *= 0.6;
    } else if (this.stance === 'prone') {
      baseSpeed *= 0.32;
    }
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

      this.walkTime += delta * (isSprinting ? 14 : 9);
    } else {
      // Apply friction
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, friction, delta);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, friction, delta);
    }

    // Jump & Gravity (jumping while crouched or prone stands the player up)
    if (keys.jump && this.isGrounded) {
      if (this.stance !== 'stand') {
        this.setStance('stand');
      }
      this.velocity.y = 8.5;
      this.isGrounded = false;
    }

    // Gravity
    this.velocity.y -= 22.0 * delta;

    // Proposed new position
    const newPos = Player._newPos.copy(this.position);
    newPos.x += this.velocity.x * delta;
    newPos.z += this.velocity.z * delta;
    newPos.y += this.velocity.y * delta;

    // Check landing on top of waist-high cover obstacles, stair ramps, or elevated upfloor slabs
    let groundY = this.eyeHeight;
    let onActiveStair = false;
    const searchDist = 7.0;

    const nearby = Player._nearbyObstacles;
    nearby.length = 0;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (obs.box.isEmpty()) continue;
      // Fast spatial pre-filter: skip obstacles beyond local radius
      if (
        newPos.x < obs.box.min.x - searchDist ||
        newPos.x > obs.box.max.x + searchDist ||
        newPos.z < obs.box.min.z - searchDist ||
        newPos.z > obs.box.max.z + searchDist
      ) {
        continue;
      }
      nearby.push(obs);

      // A. Smooth Stair Ramp Traversal (butter-smooth ascending & descending stairs)
      if (obs.stairRamp) {
        const sr = obs.stairRamp;
        const dx = sr.p2.x - sr.p1.x;
        const dz = sr.p2.z - sr.p1.z;
        const lenSq = dx * dx + dz * dz;
        if (lenSq > 0.0001) {
          const len = Math.sqrt(lenSq);
          const uX = dx / len;
          const uZ = dz / len;
          const perpX = -uZ;
          const perpZ = uX;

          // Proposed position in stair-aligned coordinates
          const px = newPos.x - sr.p1.x;
          const pz = newPos.z - sr.p1.z;
          const along = px * uX + pz * uZ;
          let across = px * perpX + pz * perpZ;

          // Previous position in stair-aligned coordinates
          const prevPx = this.position.x - sr.p1.x;
          const prevPz = this.position.z - sr.p1.z;
          const prevAlong = prevPx * uX + prevPz * uZ;
          const prevAcross = prevPx * perpX + prevPz * perpZ;

          const prevFeetY = this.position.y - this.eyeHeight;
          const proposedFeetY = newPos.y - this.eyeHeight;

          // Authentic geometric stair boundaries
          const stairHalfW = Math.max(0.60, (sr.width - 0.2) / 2);
          const maxFenceAcross = Math.max(0.50, stairHalfW - 0.04);

          // Step height at player's previous and current location along ramp
          const prevT = Math.max(0, Math.min(1, prevAlong / len));
          const prevStepY = sr.bottomY + prevT * (sr.topY - sr.bottomY);
          const t = Math.max(0, Math.min(1, along / len));
          const stepY = sr.bottomY + t * (sr.topY - sr.bottomY);

          // Did the player start this frame already walking/standing on this staircase?
          // Generous tolerance ensures turning left or right never breaks stair tracking
          const wasAtStairHeight = Math.abs(prevFeetY - prevStepY) <= 0.65;
          const wasInsideStairs =
            this.onStairRamp &&
            wasAtStairHeight &&
            Math.abs(prevAcross) <= maxFenceAcross + 0.35 &&
            prevAlong >= -0.45 &&
            prevAlong <= len + 0.55;

          // Legitimate entry conditions:
          // 1. Walking into bottom entrance from ground level
          const entersBottom =
            Math.abs(prevFeetY - sr.bottomY) <= 0.55 &&
            along >= -0.45 && along <= 0.50 &&
            Math.abs(across) <= maxFenceAcross + 0.15;

          // 2. Walking into top entrance from elevated deck level
          const entersTop =
            Math.abs(prevFeetY - sr.topY) <= 0.55 &&
            along >= len - 0.50 && along <= len + 0.55 &&
            Math.abs(across) <= maxFenceAcross + 0.15;

          // 3. Falling / landing from above directly onto the stair treads
          const landsFromAbove =
            this.velocity.y <= 0 &&
            along >= -0.10 && along <= len + 0.10 &&
            Math.abs(across) <= maxFenceAcross + 0.15 &&
            prevFeetY >= stepY - 0.25 && proposedFeetY <= stepY + 0.35;

          if (wasInsideStairs || entersBottom || entersTop || landsFromAbove) {
            // Player is legitimately navigating the staircase!
            // Firmly retain player between handrails so turning left or right NEVER drops the user:
            if (Math.abs(across) > maxFenceAcross) {
              across = Math.sign(across) * maxFenceAcross;
              newPos.x = sr.p1.x + along * uX + across * perpX;
              newPos.z = sr.p1.z + along * uZ + across * perpZ;

              // Cancel velocity component moving outward through the handrails so player slides smoothly
              const vAcross = this.velocity.x * perpX + this.velocity.z * perpZ;
              if ((across >= maxFenceAcross && vAcross > 0) || (across <= -maxFenceAcross && vAcross < 0)) {
                this.velocity.x -= vAcross * perpX;
                this.velocity.z -= vAcross * perpZ;
              }
            }

            if (along >= -0.45 && along <= len + 0.55) {
              const stairEyeY = stepY + this.eyeHeight;
              if (stairEyeY > groundY) {
                groundY = stairEyeY;
                onActiveStair = true;
              }
            }
          } else {
            // Player is OUTSIDE the staircase:
            // Physically block player from penetrating through side handrails/stringers
            if (along > 0.15 && along < len - 0.15) {
              const sideBarrierAcross = stairHalfW + this.playerRadius * 0.75;
              if (Math.abs(across) < sideBarrierAcross && Math.abs(prevAcross) >= maxFenceAcross) {
                across = Math.sign(across) * sideBarrierAcross;
                newPos.x = sr.p1.x + along * uX + across * perpX;
                newPos.z = sr.p1.z + along * uZ + across * perpZ;
              }
            }
          }
        }
      }

      // B. Elevated Mezzanine / Upfloor Slabs & Building Roofs
      if (obs.isFloor) {
        let inside = false;
        let floorTop = obs.box.max.y;

        if (obs.floorPlane) {
          const fp = obs.floorPlane;
          floorTop = fp.topY;
          const lx = newPos.x - fp.center.x;
          const lz = newPos.z - fp.center.z;
          const rx = lx * Math.cos(-fp.rotY) - lz * Math.sin(-fp.rotY);
          const rz = lx * Math.sin(-fp.rotY) + lz * Math.cos(-fp.rotY);
          // Floor boundary tolerance (+0.25m): supports deck edges and allows fluid rooftop landing
          if (
            Math.abs(rx) <= fp.halfW + 0.25 &&
            Math.abs(rz) <= fp.halfD + 0.25
          ) {
            inside = true;
            // Pitched / Gable roof support: height rises toward central ridge along rx = 0
            if (fp.pitchHeight && fp.halfW > 0) {
              const slope = Math.max(0, 1 - Math.abs(rx) / fp.halfW);
              floorTop = fp.topY + slope * fp.pitchHeight;
            }
          }
        } else {
          if (
            newPos.x >= obs.box.min.x - 0.55 &&
            newPos.x <= obs.box.max.x + 0.55 &&
            newPos.z >= obs.box.min.z - 0.55 &&
            newPos.z <= obs.box.max.z + 0.55
          ) {
            inside = true;
          }
        }

        if (inside) {
          const topY = floorTop + this.eyeHeight;
          // Player landing on floor/roof from above or leaping from upfloor
          if (this.position.y >= floorTop + this.eyeHeight - 1.25) {
            if (topY > groundY) groundY = topY;
          }
        }
      }

      // C. Standing on top of waist-high cover (crates, fences, cars)
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

    this.onStairRamp = onActiveStair;

    // Floor / Obstacle-top collision
    if (newPos.y <= groundY) {
      newPos.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Overhead ceiling collision when jumping
    if (this.velocity.y > 0) {
      for (let i = 0; i < nearby.length; i++) {
        const obs = nearby[i];
        if (obs.ceilingY !== undefined) {
          let insideCeiling = false;
          if (obs.floorPlane) {
            const fp = obs.floorPlane;
            const lx = newPos.x - fp.center.x;
            const lz = newPos.z - fp.center.z;
            const rx = lx * Math.cos(-fp.rotY) - lz * Math.sin(-fp.rotY);
            const rz = lx * Math.sin(-fp.rotY) + lz * Math.cos(-fp.rotY);
            if (Math.abs(rx) <= fp.halfW && Math.abs(rz) <= fp.halfD) insideCeiling = true;
          } else if (
            newPos.x >= obs.box.min.x && newPos.x <= obs.box.max.x &&
            newPos.z >= obs.box.min.z && newPos.z <= obs.box.max.z
          ) {
            insideCeiling = true;
          }

          if (insideCeiling) {
            const headY = newPos.y + 0.15;
            if (headY >= obs.ceilingY && this.position.y - this.eyeHeight < obs.ceilingY) {
              newPos.y = obs.ceilingY - 0.15;
              this.velocity.y = 0;
            }
          }
        }
      }
    }

    // Perimeter boundary clamp
    const halfArena = (arenaSize / 2) - 1.5;
    newPos.x = Math.max(-halfArena, Math.min(halfArena, newPos.x));
    newPos.z = Math.max(-halfArena, Math.min(halfArena, newPos.z));

    // Smooth cylinder-to-AABB collision resolution with sliding (Zero sticking, zero micro-stutter)
    const feetY = newPos.y - this.eyeHeight;
    const r = this.playerRadius;
    const passes = 2;

    for (let pass = 0; pass < passes; pass++) {
      let collided = false;
      for (let i = 0; i < nearby.length; i++) {
        const obs = nearby[i];
        // Skip horizontal blocking for stair ramps and elevated floor slabs:
        // Stairs guide player smoothly via stairRamp, and floor slabs are walkable decks (never lateral walls!)
        if (obs.stairRamp || obs.isFloor) continue;

        // When climbing stairs, bypass ground obstacles situated underneath the staircase footprint
        if (onActiveStair && obs.box.max.y < groundY - this.eyeHeight + 0.35) continue;

        // Skip horizontal blocking if player is vertically outside the obstacle:
        // A. Entirely above the obstacle, or vaulting/leaping over low waist-high barrier/railing/parapet during jump
        const barrierH = obs.box.max.y - obs.box.min.y;
        const isAirborneOrJumping = !this.isGrounded || this.velocity.y > 0;
        const isWaistBarrier = barrierH <= 1.45 && (feetY >= obs.box.min.y - 0.40);
        const jumpClearance = (isAirborneOrJumping && isWaistBarrier)
          ? 1.40
          : (isAirborneOrJumping ? 0.35 : 0.05);

        if (obs.box.max.y <= feetY + jumpClearance) continue; // Obstacle is beneath player feet or vaulted during jump
        // B. Entirely below the obstacle (underneath arch/ceiling)
        if (obs.box.min.y >= newPos.y + 0.15) continue; // Obstacle is above player head (underneath arch/ceiling)

        const clampX = THREE.MathUtils.clamp(newPos.x, obs.box.min.x, obs.box.max.x);
        const clampZ = THREE.MathUtils.clamp(newPos.z, obs.box.min.z, obs.box.max.z);
        const dx = newPos.x - clampX;
        const dz = newPos.z - clampZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < r * r) {
          collided = true;
          if (distSq > 0.000001) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const nz = dz / dist;
            const penetration = r - dist;

            newPos.x += nx * penetration;
            newPos.z += nz * penetration;

            // Remove only inward velocity component: tangential sliding velocity is fully preserved!
            const vDot = this.velocity.x * nx + this.velocity.z * nz;
            if (vDot < 0) {
              this.velocity.x -= vDot * nx;
              this.velocity.z -= vDot * nz;
            }
          } else {
            // Player center strictly inside box: push out along shallowest face
            const dLeft = newPos.x - obs.box.min.x;
            const dRight = obs.box.max.x - newPos.x;
            const dBack = newPos.z - obs.box.min.z;
            const dFront = obs.box.max.z - newPos.z;
            const minD = Math.min(dLeft, dRight, dBack, dFront);

            if (minD === dLeft) { newPos.x = obs.box.min.x - r; if (this.velocity.x > 0) this.velocity.x = 0; }
            else if (minD === dRight) { newPos.x = obs.box.max.x + r; if (this.velocity.x < 0) this.velocity.x = 0; }
            else if (minD === dBack) { newPos.z = obs.box.min.z - r; if (this.velocity.z > 0) this.velocity.z = 0; }
            else { newPos.z = obs.box.max.z + r; if (this.velocity.z < 0) this.velocity.z = 0; }
          }
        }
      }
      if (!collided) break;
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

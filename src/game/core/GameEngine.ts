import * as THREE from 'three';
import {
  GameMode,
  GameState,
  ArenaId,
  WeaponId,
  EnemyType,
  PowerupType,
  FloatingDamageNumber,
  HitMarkerInfo,
  PowerupActiveState,
  GameSettings
} from '../../types/game';
import { Player } from '../entities/Player';
import { WeaponInstance, BASE_WEAPONS } from '../entities/Weapon';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { Projectile } from '../entities/Projectile';
import { Powerup } from '../entities/Powerup';
import { ArenaManager } from '../world/ArenaManager';
import { ParticleSystem } from '../world/ParticleSystem';
import { WaveManager } from '../managers/WaveManager';
import { saveManager } from '../managers/SaveManager';
import { soundManager } from '../../audio/SoundManager';

export interface HUDStats {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  score: number;
  combo: number;
  comboTimer: number;
  coins: number;
  wave: number;
  enemiesRemaining: number;
  timeRemaining?: number;
  activeWeaponId: WeaponId;
  isAiming: boolean;
}

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: HUDStats) => void;
  onHitMarker: (info: HitMarkerInfo) => void;
  onDamageNumber: (dmg: FloatingDamageNumber) => void;
  onBossUpdate: (boss: { name: string; health: number; maxHealth: number; phase: number; isAlive: boolean } | null) => void;
  onPowerupChange: (powerups: PowerupActiveState[]) => void;
  onGameStateChange: (state: GameState) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  public player: Player;
  public arena: ArenaManager;
  public particles: ParticleSystem;
  public waveManager: WaveManager;

  // Weapons
  public weapons: Map<WeaponId, WeaponInstance> = new Map();
  public currentWeaponId: WeaponId = 'assault_rifle';
  public currentWeapon: WeaponInstance;

  // Entities
  public enemies: Enemy[] = [];
  public boss: Boss | null = null;
  public projectiles: Projectile[] = [];
  public powerups: Powerup[] = [];

  // State
  public state: GameState = 'MENU';
  public mode: GameMode = 'survival';
  public currentArenaId: ArenaId = 'industrial';
  private callbacks: GameEngineCallbacks;

  // Input
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false
  };
  private isPointerLocked: boolean = false;
  private isLeftMouseDown: boolean = false;
  private isRightMouseDown: boolean = false;
  private mouseSensitivity: number = 50;
  private touchSensitivity: number = 50;
  public isTouchDevice: boolean = false;
  private analogMove: { x: number; y: number; sprint: boolean } = { x: 0, y: 0, sprint: false };
  private isTouchShooting: boolean = false;
  private isTouchAiming: boolean = false;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;

  // Raycaster
  private raycaster = new THREE.Raycaster();

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // Three.js Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
    this.clock = new THREE.Clock();

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Managers & Systems
    const savedData = saveManager.getData();
    this.mouseSensitivity = savedData.settings.mouseSensitivity;
    this.touchSensitivity = savedData.settings.touchSensitivity ?? 50;
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;

    this.player = new Player(this.camera, savedData.upgrades);
    this.arena = new ArenaManager(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.waveManager = new WaveManager(this.mode);

    // Initialize Unlocked Weapons
    this.initWeapons();
    this.currentWeapon = this.weapons.get('assault_rifle')!;
    this.camera.add(this.currentWeapon.meshGroup);
    this.scene.add(this.camera);

    // Setup Event Listeners
    this.setupInputs();
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('orientationchange', this.onWindowResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.onWindowResize);
    }

    // Start render loop
    this.startLoop();
  }

  private initWeapons() {
    const saved = saveManager.getData();
    (Object.keys(BASE_WEAPONS) as WeaponId[]).forEach(id => {
      const weapon = new WeaponInstance(id, saved.upgrades);
      this.weapons.set(id, weapon);
    });
  }

  public switchWeapon(id: WeaponId) {
    if (this.currentWeaponId === id) return;
    const targetWeapon = this.weapons.get(id);
    if (!targetWeapon) return;

    // Check if player has unlocked it
    const saved = saveManager.getData();
    if (!saved.unlockedWeapons.includes(id)) return;

    // Remove old weapon from camera
    this.camera.remove(this.currentWeapon.meshGroup);

    // Switch
    this.currentWeaponId = id;
    this.currentWeapon = targetWeapon;
    this.currentWeapon.isAiming = this.isRightMouseDown;
    this.camera.add(this.currentWeapon.meshGroup);
    soundManager.playReload();
  }

  public startNewGame(mode: GameMode, arenaId: ArenaId) {
    this.mode = mode;
    this.currentArenaId = arenaId;
    this.state = 'PLAYING';

    const saved = saveManager.getData();
    this.mouseSensitivity = saved.settings.mouseSensitivity;

    // Refresh upgrades on player and weapons
    this.player.reset(saved.upgrades);
    this.weapons.forEach(w => w.applyUpgrades(saved.upgrades));

    // Clear entities
    this.clearAllEntities();

    // Load Arena & Weather
    this.arena.loadArena(arenaId);
    this.particles.initAtmosphere(arenaId);

    // Wave Manager
    this.waveManager.reset(mode);

    // Start music
    soundManager.startMusic();

    this.callbacks.onGameStateChange('PLAYING');
    if (!this.isTouchDevice) {
      this.requestPointerLock();
    }
  }

  private clearAllEntities() {
    this.enemies.forEach(e => {
      this.scene.remove(e.mesh);
      e.dispose();
    });
    this.enemies = [];

    if (this.boss) {
      this.scene.remove(this.boss.mesh);
      this.boss.dispose();
      this.boss = null;
    }

    this.projectiles.forEach(p => {
      this.scene.remove(p.mesh);
      p.dispose();
    });
    this.projectiles = [];

    this.powerups.forEach(p => {
      this.scene.remove(p.mesh);
      p.dispose();
    });
    this.powerups = [];
  }

  // --- INPUT HANDLING ---
  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      if (this.state !== 'PLAYING') return;

      switch (e.code) {
        case 'KeyW': this.keys.forward = true; break;
        case 'KeyS': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'Space': this.keys.jump = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.sprint = true; break;
        case 'KeyR': this.currentWeapon.startReload(); break;
        case 'Digit1': this.switchWeapon('assault_rifle'); break;
        case 'Digit2': this.switchWeapon('shotgun'); break;
        case 'Digit3': this.switchWeapon('smg'); break;
        case 'Digit4': this.switchWeapon('sniper'); break;
        case 'Digit5': this.switchWeapon('plasma_rifle'); break;
        case 'Escape':
          this.togglePause();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': this.keys.forward = false; break;
        case 'KeyS': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'Space': this.keys.jump = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.sprint = false; break;
      }
    });

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (this.state !== 'PLAYING') return;
      if (this.isTouchDevice) return;
      if (!this.isPointerLocked) {
        this.requestPointerLock();
        return;
      }

      if (e.button === 0) {
        this.isLeftMouseDown = true;
      } else if (e.button === 2) {
        this.isRightMouseDown = true;
        this.currentWeapon.isAiming = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isLeftMouseDown = false;
      } else if (e.button === 2) {
        this.isRightMouseDown = false;
        this.currentWeapon.isAiming = false;
      }
    });

    // Disable context menu on right click
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse movement
    window.addEventListener('mousemove', (e) => {
      if (this.state !== 'PLAYING' || !this.isPointerLocked) return;
      this.player.rotateCamera(e.movementX, e.movementY, this.mouseSensitivity);
    });

    // Pointer Lock events - only pause if pointer lock was actively engaged and then lost
    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.isPointerLocked;
      this.isPointerLocked = (document.pointerLockElement === this.renderer.domElement);
      if (wasLocked && !this.isPointerLocked && this.state === 'PLAYING') {
        this.pauseGame();
      }
    });
  }

  public requestPointerLock() {
    this.renderer.domElement.requestPointerLock();
  }

  public exitPointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  public togglePause() {
    if (this.state === 'PLAYING') {
      this.pauseGame();
    } else if (this.state === 'PAUSED') {
      this.resumeGame();
    }
  }

  public pauseGame() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.exitPointerLock();
      this.callbacks.onGameStateChange('PAUSED');
    }
  }

  public resumeGame() {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      if (!this.isTouchDevice) {
        this.requestPointerLock();
      }
      this.callbacks.onGameStateChange('PLAYING');
    }
  }

  public updateSettings(settings: Partial<GameSettings> | number) {
    if (typeof settings === 'number') {
      this.mouseSensitivity = settings;
    } else {
      if (settings.mouseSensitivity !== undefined) this.mouseSensitivity = settings.mouseSensitivity;
      if (settings.touchSensitivity !== undefined) this.touchSensitivity = settings.touchSensitivity;
    }
  }

  // --- MOBILE TOUCH CONTROLS API ---
  public setAnalogMove(x: number, y: number, sprint: boolean = false) {
    this.analogMove.x = x;
    this.analogMove.y = y;
    this.analogMove.sprint = sprint;
  }

  public setFiring(firing: boolean) {
    this.isTouchShooting = firing;
  }

  public setAiming(aiming: boolean) {
    this.isTouchAiming = aiming;
    if (this.currentWeapon) {
      this.currentWeapon.isAiming = this.isRightMouseDown || this.isTouchAiming;
    }
  }

  public toggleAiming(): boolean {
    this.setAiming(!this.isTouchAiming);
    return this.isTouchAiming;
  }

  public isAimingActive(): boolean {
    return this.isRightMouseDown || this.isTouchAiming;
  }

  public setJump(jumping: boolean) {
    this.keys.jump = jumping;
  }

  public reload() {
    if (this.currentWeapon) {
      this.currentWeapon.startReload();
    }
  }

  public rotateCameraTouch(deltaX: number, deltaY: number) {
    const sensFactor = 0.0035 * (this.touchSensitivity / 50);
    this.player.yaw -= deltaX * sensFactor;
    this.player.pitch -= deltaY * sensFactor;

    const maxPitch = (Math.PI / 2) - 0.05;
    this.player.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.player.pitch));
  }

  public cycleWeapon(direction: 1 | -1 = 1) {
    const saved = saveManager.getData();
    const unlocked = saved.unlockedWeapons;
    if (!unlocked || unlocked.length <= 1) return;
    const currentIdx = unlocked.indexOf(this.currentWeaponId);
    let nextIdx = (currentIdx + direction) % unlocked.length;
    if (nextIdx < 0) nextIdx += unlocked.length;
    this.switchWeapon(unlocked[nextIdx]);
  }

  // --- SHOOTING LOGIC ---
  private handlePlayerShooting(time: number) {
    const shouldShoot = this.isLeftMouseDown || this.isTouchShooting;
    if (!shouldShoot) return;

    const hasInfiniteAmmo = this.player.hasPowerup('infinite_ammo');
    const hasRapidFire = this.player.hasPowerup('rapid_fire');
    const hasDamageBoost = this.player.hasPowerup('damage_boost');

    // If rapid fire is active, double effective rate
    if (hasRapidFire) {
      this.currentWeapon.config.fireRate = BASE_WEAPONS[this.currentWeapon.config.id].fireRate * 1.8;
    }

    if (this.currentWeapon.shoot(time, hasInfiniteAmmo)) {
      // Trigger camera recoil punch
      this.player.addTrauma(this.currentWeapon.config.recoilKick * 0.85);

      const shootData = this.player.getShootRay();

      if (this.currentWeapon.config.id === 'plasma_rifle') {
        // Spawn Plasma Projectile
        const proj = new Projectile(
          shootData.origin,
          shootData.direction,
          this.currentWeapon.config.bulletSpeed,
          this.currentWeapon.config.damage * (hasDamageBoost ? 2.0 : 1.0),
          true,
          true
        );
        this.projectiles.push(proj);
        this.scene.add(proj.mesh);
      } else {
        // Hitscan raycast (AR, Shotgun, SMG, Sniper)
        const pellets = this.currentWeapon.config.pellets;
        for (let p = 0; p < pellets; p++) {
          const spreadDir = shootData.direction.clone();
          if (this.currentWeapon.config.spread > 0 && !this.currentWeapon.isAiming) {
            spreadDir.x += (Math.random() - 0.5) * this.currentWeapon.config.spread;
            spreadDir.y += (Math.random() - 0.5) * this.currentWeapon.config.spread;
            spreadDir.z += (Math.random() - 0.5) * this.currentWeapon.config.spread;
            spreadDir.normalize();
          }

          this.performHitscanShot(shootData.origin, spreadDir, hasDamageBoost);
        }
      }
    }
  }

  private performHitscanShot(origin: THREE.Vector3, direction: THREE.Vector3, hasDamageBoost: boolean) {
    this.raycaster.set(origin, direction);
    this.raycaster.far = this.currentWeapon.config.range;

    // Collect all shootable objects
    const targets: THREE.Object3D[] = [];
    this.enemies.forEach(e => targets.push(e.mesh));
    if (this.boss) targets.push(this.boss.mesh);
    this.arena.obstacles.forEach(o => targets.push(o.mesh));
    this.arena.explosiveBarrels.forEach(b => {
      if (!b.exploded) targets.push(b.mesh);
    });

    const hits = this.raycaster.intersectObjects(targets, true);

    if (hits.length > 0) {
      const hit = hits[0];
      const hitPoint = hit.point;
      const hitNormal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);

      // Add Bullet Tracer
      this.particles.addTracer(origin, hitPoint, parseInt(this.currentWeapon.config.projectileColor.replace('#', '0x')));

      // Check Explosive Barrel
      for (const barrel of this.arena.explosiveBarrels) {
        if (!barrel.exploded && (barrel.mesh === hit.object || barrel.mesh.children.includes(hit.object as THREE.Mesh))) {
          this.detonateBarrel(barrel);
          return;
        }
      }

      // Check Boss Hit
      if (this.boss && (this.boss.mesh === hit.object || this.boss.mesh.children.includes(hit.object as THREE.Mesh))) {
        const isWeakpoint = (this.boss.weakpointMesh === hit.object);
        const baseDmg = this.currentWeapon.config.damage * (hasDamageBoost ? 2.0 : 1.0);
        const res = this.boss.takeDamage(baseDmg, isWeakpoint);

        this.particles.spawnSparks(hitPoint, hitNormal, 0xef4444, 18);
        this.triggerHitFeedback(hitPoint, res.finalDamage, isWeakpoint);

        if (res.killed) {
          this.handleBossDefeat();
        }
        return;
      }

      // Check Enemy Hit
      for (const enemy of this.enemies) {
        if (enemy.isDead) continue;
        let isPartOfEnemy = false;
        let isHeadshot = false;

        hit.object.traverseAncestors(ancestor => {
          if (ancestor === enemy.mesh) isPartOfEnemy = true;
        });
        if (hit.object === enemy.mesh) isPartOfEnemy = true;

        if (isPartOfEnemy) {
          // Check Headshot
          if (enemy.headMesh && (hit.object === enemy.headMesh || hit.object.parent === enemy.headMesh)) {
            isHeadshot = true;
          }

          const baseDmg = this.currentWeapon.config.damage * (hasDamageBoost ? 2.0 : 1.0);
          const res = enemy.takeDamage(baseDmg, isHeadshot, hitNormal);

          if (res.blocked) {
            // Deflected by shield
            this.particles.spawnSparks(hitPoint, hitNormal, 0x06b6d4, 12);
            return;
          }

          this.particles.spawnSparks(hitPoint, hitNormal, isHeadshot ? 0xfef08a : 0xf97316, 14);
          this.triggerHitFeedback(hitPoint, res.finalDamage, isHeadshot);

          if (res.killed) {
            this.handleEnemyKill(enemy, isHeadshot);
          }
          return;
        }
      }

      // Hit Obstacle / Wall
      this.particles.spawnSparks(hitPoint, hitNormal, 0xfacc15, 10);

    } else {
      // Hit nothing (fly off into distance)
      const distantPoint = origin.clone().addScaledVector(direction, this.currentWeapon.config.range);
      this.particles.addTracer(origin, distantPoint, parseInt(this.currentWeapon.config.projectileColor.replace('#', '0x')));
    }
  }

  private detonateBarrel(barrel: { mesh: THREE.Group; position: THREE.Vector3; radius: number; damage: number; exploded: boolean }) {
    barrel.exploded = true;
    barrel.mesh.visible = false;
    soundManager.playExplosion();
    this.particles.spawnExplosion(barrel.position, 80);

    // Damage all nearby enemies
    this.enemies.forEach(enemy => {
      if (!enemy.isDead) {
        const dist = enemy.position.distanceTo(barrel.position);
        if (dist <= barrel.radius) {
          const factor = 1 - (dist / barrel.radius);
          const res = enemy.takeDamage(Math.round(barrel.damage * factor), false);
          this.triggerHitFeedback(enemy.position, res.finalDamage, false);
          if (res.killed) {
            this.handleEnemyKill(enemy, false);
          }
        }
      }
    });

    // Damage Boss if in radius
    if (this.boss && !this.boss.isDead) {
      const dist = this.boss.position.distanceTo(barrel.position);
      if (dist <= barrel.radius + 3) {
        const factor = 1 - (dist / (barrel.radius + 3));
        const res = this.boss.takeDamage(Math.round(barrel.damage * factor * 1.5), true);
        this.triggerHitFeedback(this.boss.position, res.finalDamage, true);
        if (res.killed) this.handleBossDefeat();
      }
    }
  }

  private triggerHitFeedback(worldPos: THREE.Vector3, damage: number, isCrit: boolean) {
    soundManager.playHitmark(isCrit);
    this.callbacks.onHitMarker({ isCrit, timestamp: Date.now() });

    // Project world coordinates to screen space for floating numbers
    const screenCoord = worldPos.clone().project(this.camera);
    const x = (screenCoord.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(screenCoord.y * 0.5) + 0.5) * window.innerHeight;

    this.callbacks.onDamageNumber({
      id: Math.random().toString(),
      damage,
      isCrit,
      screenX: x + (Math.random() - 0.5) * 20,
      screenY: y + (Math.random() - 0.5) * 20,
      opacity: 1
    });
  }

  private handleEnemyKill(enemy: Enemy, isHeadshot: boolean) {
    // Score & Combos
    this.player.stats.kills++;
    if (isHeadshot) this.player.stats.headshots++;

    // Increment combo
    this.player.stats.combo++;
    this.player.stats.comboTimer = 4.5;
    if (this.player.stats.combo > this.player.stats.highestCombo) {
      this.player.stats.highestCombo = this.player.stats.combo;
    }

    const comboMult = Math.min(5, 1 + Math.floor(this.player.stats.combo / 3) * 0.5);
    const points = Math.round((enemy.scoreValue + (isHeadshot ? 150 : 0)) * comboMult);
    this.player.stats.score += points;

    // Coins
    this.player.stats.coins += enemy.coinValue;
    saveManager.addCoins(enemy.coinValue);

    // Chance to drop powerup (18% chance)
    if (Math.random() < 0.18) {
      this.spawnRandomPowerup(enemy.position);
    }

    // Notify wave manager
    this.waveManager.onEnemyKilled(false);
  }

  private handleBossDefeat() {
    this.player.stats.score += 5000;
    this.player.stats.coins += 100;
    saveManager.addCoins(100);
    this.waveManager.onEnemyKilled(true);

    if (this.mode === 'boss_arena') {
      this.state = 'VICTORY';
      this.exitPointerLock();
      this.callbacks.onGameStateChange('VICTORY');
    }
  }

  private spawnRandomPowerup(pos: THREE.Vector3) {
    const types: PowerupType[] = ['health', 'armor', 'rapid_fire', 'infinite_ammo', 'damage_boost', 'slow_motion', 'shield'];
    const selected = types[Math.floor(Math.random() * types.length)];
    const p = new Powerup(Math.random().toString(), selected, pos);
    this.powerups.push(p);
    this.scene.add(p.mesh);
  }

  // --- GAME LOOP ---
  private startLoop() {
    this.isRunning = true;
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);
      const delta = Math.min(0.1, this.clock.getDelta());
      const now = performance.now() * 0.001;

      if (this.state === 'PLAYING') {
        this.updateGame(delta, now);
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  private updateGame(delta: number, now: number) {
    // 1. Slow Motion Powerup check
    const hasSlowMotion = this.player.hasPowerup('slow_motion');
    const enemyDelta = hasSlowMotion ? delta * 0.35 : delta;

    // 2. Player Update
    const saved = saveManager.getData();
    const { isMoving, walkTime } = this.player.update(
      delta,
      this.keys,
      this.arena.obstacles,
      this.arena.arenaSize,
      saved.settings.screenShake,
      this.analogMove
    );

    // 3. Weapon Update
    this.currentWeapon.update(delta, walkTime, isMoving);
    this.handlePlayerShooting(now);

    // 4. Wave Manager Update
    const isGameOver = this.waveManager.update(
      delta,
      (type: EnemyType) => {
        const spawnPos = this.arena.getValidSpawnPoint(this.player.position);
        const waveMultiplier = 1 + (this.waveManager.currentWave - 1) * 0.18;
        const enemy = new Enemy(Math.random().toString(), type, spawnPos, waveMultiplier);
        this.enemies.push(enemy);
        this.scene.add(enemy.mesh);
      },
      () => {
        // Spawn Boss
        if (!this.boss) {
          const waveMultiplier = 1 + (this.waveManager.currentWave - 1) * 0.25;
          this.boss = new Boss(waveMultiplier);
          this.scene.add(this.boss.mesh);
        }
      }
    );

    if (isGameOver) {
      this.triggerGameOver();
      return;
    }

    // 5. Enemies Update
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.isDead && enemy.mesh.scale.x <= 0.05) {
        this.scene.remove(enemy.mesh);
        enemy.dispose();
        this.enemies.splice(i, 1);
        continue;
      }

      enemy.update(
        enemyDelta,
        this.player.position,
        this.arena.obstacles,
        // on enemy ranged shoot
        (evt) => {
          const dir = new THREE.Vector3().subVectors(evt.target, evt.origin).normalize();
          const proj = new Projectile(evt.origin, dir, 24, evt.damage, false);
          this.projectiles.push(proj);
          this.scene.add(proj.mesh);
        },
        // on enemy melee hit
        (damage) => {
          const dead = this.player.takeDamage(damage, enemy.position);
          if (dead) this.triggerGameOver();
        }
      );
    }

    // 6. Boss Update
    if (this.boss) {
      if (this.boss.isDead && this.boss.mesh.scale.x <= 0.05) {
        this.scene.remove(this.boss.mesh);
        this.boss.dispose();
        this.boss = null;
        this.callbacks.onBossUpdate(null);
      } else {
        this.boss.update(
          enemyDelta,
          this.player.position,
          this.arena.obstacles,
          // on boss attack
          (evt) => {
            if (evt.type === 'laser') {
              // Direct laser beam hit check
              const dist = this.player.position.distanceTo(evt.target);
              if (dist < 4.0) {
                const dead = this.player.takeDamage(evt.damage, evt.origin);
                if (dead) this.triggerGameOver();
              }
            } else {
              // Rocket Projectile
              const dir = new THREE.Vector3().subVectors(evt.target, evt.origin).normalize();
              const proj = new Projectile(evt.origin, dir, 18, evt.damage, false);
              this.projectiles.push(proj);
              this.scene.add(proj.mesh);
            }
          },
          // on summon minions
          () => {
            for (let k = 0; k < 3; k++) {
              const spawnPos = this.boss!.position.clone();
              spawnPos.x += (Math.random() - 0.5) * 8;
              spawnPos.z += (Math.random() - 0.5) * 8;
              const enemy = new Enemy(Math.random().toString(), 'fast', spawnPos, 1.2);
              this.enemies.push(enemy);
              this.scene.add(enemy.mesh);
            }
          }
        );

        this.callbacks.onBossUpdate({
          name: this.boss.name,
          health: this.boss.health,
          maxHealth: this.boss.maxHealth,
          phase: this.boss.phase,
          isAlive: !this.boss.isDead
        });
      }
    } else {
      this.callbacks.onBossUpdate(null);
    }

    // 7. Projectiles Update & Collision
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const expired = proj.update(delta);

      if (expired) {
        this.scene.remove(proj.mesh);
        proj.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision
      if (proj.isPlayerProjectile) {
        // Player Plasma Projectile hits enemy
        for (const enemy of this.enemies) {
          if (!enemy.isDead && enemy.position.distanceTo(proj.position) < (enemy.getHeight() * 0.7 + proj.radius)) {
            const res = enemy.takeDamage(proj.damage, false);
            this.particles.spawnExplosion(proj.position, 20);
            this.triggerHitFeedback(proj.position, res.finalDamage, false);
            if (res.killed) this.handleEnemyKill(enemy, false);
            proj.isDead = true;
            break;
          }
        }
      } else {
        // Enemy Projectile hits player
        if (proj.position.distanceTo(this.player.position) < (0.8 + proj.radius)) {
          const dead = this.player.takeDamage(proj.damage, proj.position);
          this.particles.spawnSparks(proj.position, new THREE.Vector3(0, 1, 0), 0xef4444, 12);
          proj.isDead = true;
          if (dead) this.triggerGameOver();
        }
      }
    }

    // 8. Powerups Update
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      const finished = p.update(delta, this.player.position);
      if (finished) {
        if (p.isCollected) {
          this.player.activatePowerup(p.type);
        }
        this.scene.remove(p.mesh);
        p.dispose();
        this.powerups.splice(i, 1);
      }
    }

    // 9. Particle System Update
    this.particles.update(delta);

    // 10. Update UI Callbacks
    this.callbacks.onStatsUpdate({
      health: this.player.stats.health,
      maxHealth: this.player.stats.maxHealth,
      armor: this.player.stats.armor,
      maxArmor: this.player.stats.maxArmor,
      ammo: this.currentWeapon.currentAmmo,
      maxAmmo: this.currentWeapon.maxAmmo,
      isReloading: this.currentWeapon.isReloading,
      reloadProgress: this.currentWeapon.reloadProgress,
      score: this.player.stats.score,
      combo: this.player.stats.combo,
      comboTimer: this.player.stats.comboTimer,
      coins: this.player.stats.coins,
      wave: this.waveManager.currentWave,
      enemiesRemaining: this.waveManager.enemiesRemaining,
      timeRemaining: this.mode === 'time_attack' ? Math.max(0, Math.round(this.waveManager.timeAttackRemaining)) : undefined,
      activeWeaponId: this.currentWeaponId,
      isAiming: this.currentWeapon.isAiming
    });

    const activeList: PowerupActiveState[] = [];
    this.player.activePowerups.forEach(p => activeList.push(p));
    this.callbacks.onPowerupChange(activeList);
  }

  private triggerGameOver() {
    this.state = 'GAME_OVER';
    this.exitPointerLock();
    soundManager.stopMusic();

    saveManager.recordGameEnd(
      this.player.stats.score,
      this.waveManager.currentWave,
      this.player.stats.kills,
      this.player.stats.headshots,
      this.player.stats.highestCombo,
      this.boss ? (this.boss.isDead ? 1 : 0) : 0
    );

    this.callbacks.onGameStateChange('GAME_OVER');
  }

  private onWindowResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  public destroy() {
    this.isRunning = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('orientationchange', this.onWindowResize);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.onWindowResize);
    }
    this.clearAllEntities();
    this.particles.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

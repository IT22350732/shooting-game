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
  GameSettings,
  TargetLockInfo,
  MissionConfig,
  MissionId,
  MissionObjectiveInfo,
  GraphicsQuality,
  FrameRateLimit
} from '../../types/game';
import { Player } from '../entities/Player';
import { WeaponInstance, BASE_WEAPONS } from '../entities/Weapon';
import { Enemy, HUMAN_THEMES } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { Projectile } from '../entities/Projectile';
import { Powerup } from '../entities/Powerup';
import { PracticeTarget } from '../entities/PracticeTarget';
import { ArenaManager } from '../world/ArenaManager';
import { ParticleSystem } from '../world/ParticleSystem';
import { WaveManager } from '../managers/WaveManager';
import { saveManager } from '../managers/SaveManager';
import { soundManager } from '../../audio/SoundManager';
import { MISSIONS, getMissionById } from '../missions/MissionData';
import { multiplayerService } from '../multiplayer/MultiplayerService';
import { RemotePlayer } from '../entities/RemotePlayer';
import { NetworkPlayerState } from '../multiplayer/MultiplayerTypes';

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
  kills: number;
  enemiesRemaining: number;
  timeRemaining?: number;
  activeWeaponId: WeaponId;
  isAiming: boolean;
  isZooming: boolean;
  zoomLevel: number;
  zoomMagnification: number;
  targetLock: TargetLockInfo | null;
  mode?: GameMode;
  missionObjective?: MissionObjectiveInfo | null;
  activeMission?: MissionConfig | null;
  isMultiplayer?: boolean;
  isRespawning?: boolean;
  respawnCountdown?: number;
  killerName?: string;
  multiplayerAlphaScore?: number;
  multiplayerBravoScore?: number;
  multiplayerScoreLimit?: number;
  multiplayerPing?: number;
  fps?: number;
  graphicsQuality?: GraphicsQuality;
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
  public practiceTargets: PracticeTarget[] = [];
  public boss: Boss | null = null;
  public projectiles: Projectile[] = [];
  public powerups: Powerup[] = [];

  // Multiplayer State
  public isMultiplayer: boolean = false;
  public remotePlayers: Map<string, RemotePlayer> = new Map();
  public isRespawning: boolean = false;
  public respawnCountdown: number = 0;
  public killerName: string = '';
  private multiplayerBroadcastTimer: number = 0;

  // State
  public state: GameState = 'MENU';
  public mode: GameMode = 'medium';
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
  private isQDown: boolean = false;
  private qPressedTime: number = 0;
  private zoomLevel: number = 0; // 0 = normal, 1 = tactical ADS, 2 = precision target zoom
  private baseFov: number = 75;
  private currentZoomFovKick: number = 0;
  private targetLock: TargetLockInfo | null = null;
  private targetLockWorldPos: THREE.Vector3 | null = null;
  private lastLockTargetId: string | null = null;
  private mouseSensitivity: number = 50;
  private touchSensitivity: number = 50;
  public isTouchDevice: boolean = false;
  private analogMove: { x: number; y: number; sprint: boolean } = { x: 0, y: 0, sprint: false };
  private isTouchShooting: boolean = false;
  private isTouchAiming: boolean = false;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private killsSinceHealthPack: number = 0;

  // Mission Tracking
  public currentMission: MissionConfig | null = null;
  public missionKills: number = 0;
  public missionHeadshots: number = 0;
  public missionBarrelsDestroyed: number = 0;
  public missionCompletedTriggered: boolean = false;

  // Graphics & Performance
  public graphicsQuality: GraphicsQuality = 'high';
  public frameRateLimit: FrameRateLimit = 60;
  private lastFrameTimestamp: number = 0;
  private calculatedFps: number = 60;
  private fpsFrameCount: number = 0;
  private lastFpsSampleTime: number = 0;

  // Raycaster
  private raycaster = new THREE.Raycaster();

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // Managers & Systems
    const savedData = saveManager.getData();
    this.baseFov = savedData.settings.fov || 75;
    this.mouseSensitivity = savedData.settings.mouseSensitivity;
    this.touchSensitivity = savedData.settings.touchSensitivity ?? 50;
    this.graphicsQuality = savedData.settings.graphicsQuality || 'high';
    this.frameRateLimit = savedData.settings.frameRateLimit || 60;
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;

    // Three.js Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.baseFov, window.innerWidth / window.innerHeight, 0.1, 300);
    this.clock = new THREE.Clock();

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.applyGraphicsQuality(this.graphicsQuality, false);
    this.container.appendChild(this.renderer.domElement);

    this.player = new Player(this.camera, savedData.upgrades);
    this.arena = new ArenaManager(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.particles.setQuality(this.graphicsQuality);
    this.waveManager = new WaveManager(this.mode);

    // Load default arena immediately so it's visible in 3D in the menu!
    this.arena.loadArena(this.currentArenaId);
    this.particles.initAtmosphere(this.currentArenaId);

    // Initialize Unlocked Weapons
    this.initWeapons();
    this.currentWeapon = this.weapons.get('assault_rifle')!;
    this.currentWeapon.meshGroup.visible = false; // Hidden in cinematic menu
    this.camera.add(this.currentWeapon.meshGroup);
    this.scene.add(this.camera);

    // Setup Event Listeners
    this.setupInputs();
    this.setupMultiplayerListeners();
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

  public startMultiplayerGame(arenaId: ArenaId, mode: GameMode) {
    this.isMultiplayer = true;
    this.isRespawning = false;
    this.respawnCountdown = 0;
    this.currentMission = null;
    this.mode = mode;
    this.currentArenaId = arenaId;
    this.state = 'PLAYING';
    this.setZoomLevel(0);
    this.missionCompletedTriggered = false;

    const saved = saveManager.getData();
    this.mouseSensitivity = saved.settings.mouseSensitivity;
    this.player.reset(saved.upgrades);
    this.weapons.forEach(w => w.applyUpgrades(saved.upgrades));

    this.clearAllEntities();

    // Load arena
    this.arena.loadArena(arenaId);
    this.particles.initAtmosphere(arenaId);

    // Spawn player at valid spawn point
    const spawn = this.arena.getValidSpawnPoint(new THREE.Vector3(0, 0, 0));
    this.player.position.copy(spawn);
    this.player.activatePowerup('shield', 3.5);

    soundManager.startMusic();
    soundManager.playMatchStartCountdown(0);

    this.callbacks.onGameStateChange('PLAYING');
    this.currentWeapon.meshGroup.visible = true;
    this.camera.position.copy(this.player.position);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';

    this.syncMultiplayerPeers();

    if (!this.isTouchDevice) {
      this.requestPointerLock();
    }
  }

  public syncMultiplayerPeers() {
    this.remotePlayers.forEach(r => {
      this.scene.remove(r.mesh);
      r.dispose();
    });
    this.remotePlayers.clear();

    multiplayerService.players.forEach(p => {
      if (p.id !== multiplayerService.localPlayerId) {
        const remote = new RemotePlayer(p);
        this.remotePlayers.set(p.id, remote);
        this.scene.add(remote.mesh);
      }
    });
  }

  private setupMultiplayerListeners() {
    multiplayerService.setEvents({
      onRemotePlayerSnapshot: (state) => {
        if (!this.isMultiplayer) return;
        let remote = this.remotePlayers.get(state.id);
        if (!remote) {
          remote = new RemotePlayer(state);
          this.remotePlayers.set(state.id, remote);
          this.scene.add(remote.mesh);
        }
        remote.updateState(state);
      },
      onPlayerJoined: (player) => {
        if (!this.isMultiplayer) return;
        if (!this.remotePlayers.has(player.id)) {
          const remote = new RemotePlayer(player);
          this.remotePlayers.set(player.id, remote);
          this.scene.add(remote.mesh);
        }
      },
      onPlayerLeft: (playerId) => {
        const remote = this.remotePlayers.get(playerId);
        if (remote) {
          this.scene.remove(remote.mesh);
          remote.dispose();
          this.remotePlayers.delete(playerId);
        }
      },
      onRemotePlayerShoot: (shooterId, origin, direction, weaponId) => {
        if (!this.isMultiplayer) return;
        const originVec = new THREE.Vector3(origin.x, origin.y, origin.z);
        const dirVec = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
        const targetPoint = originVec.clone().addScaledVector(dirVec, 70);

        this.particles.addTracer(originVec, targetPoint, weaponId === 'plasma_rifle' ? 0x06b6d4 : 0xf59e0b);
        this.particles.spawnSparks(originVec, dirVec, 0xf59e0b, 8);

        const dist = this.player.position.distanceTo(originVec);
        if (dist < 80) {
          soundManager.playGunshot(weaponId === 'plasma_rifle' ? 'plasma' : weaponId === 'sniper' ? 'sniper' : weaponId === 'shotgun' ? 'shotgun' : 'rifle');
        }
      },
      onRemotePlayerHit: (shooterId, targetId, damage, isHeadshot, hitPoint) => {
        if (!this.isMultiplayer) return;
        if (targetId === multiplayerService.localPlayerId) {
          const hitVec = new THREE.Vector3(hitPoint.x, hitPoint.y, hitPoint.z);
          const dead = this.player.takeDamage(damage, hitVec);
          if (dead) {
            const killer = multiplayerService.players.get(shooterId);
            this.handleMultiplayerDeath(killer ? killer.name : 'Rival Operative');
          }
        }
      },
      onRemotePlayerRespawn: (playerId, position) => {
        if (!this.isMultiplayer) return;
        const remote = this.remotePlayers.get(playerId);
        if (remote) {
          remote.respawn(position);
        }
      },
      onMatchStart: (arena, mode) => {
        this.startMultiplayerGame(arena, mode);
      },
      onMatchEnd: (winnerTeam) => {
        if (!this.isMultiplayer) return;
        this.state = (winnerTeam === multiplayerService.localPlayer?.team || (winnerTeam !== 'draw' && multiplayerService.room?.mode === 'multiplayer_ffa')) ? 'VICTORY' : 'GAME_OVER';
        this.exitPointerLock();
        soundManager.stopMusic();
        if (this.state === 'VICTORY') {
          soundManager.playMatchWon();
        } else {
          soundManager.playMatchLost();
        }
        this.callbacks.onGameStateChange(this.state);
      }
    });
  }

  private handleMultiplayerDeath(killerName: string) {
    this.isRespawning = true;
    this.respawnCountdown = 3.0;
    this.killerName = killerName;
  }

  public startNewGame(mode: GameMode, arenaId: ArenaId) {
    this.isMultiplayer = false;
    if (mode !== 'mission') {
      this.currentMission = null;
    }
    this.mode = mode;
    this.currentArenaId = arenaId;
    this.state = 'PLAYING';
    this.setZoomLevel(0);
    this.missionCompletedTriggered = false;

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
    this.waveManager.reset(mode, this.currentMission);

    // Start music
    soundManager.startMusic();

    this.callbacks.onGameStateChange('PLAYING');
    this.currentWeapon.meshGroup.visible = true;
    this.camera.position.copy(this.player.position);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';

    if (this.mode === 'free_mode') {
      this.initFreeModeTargets();
    }

    if (!this.isTouchDevice) {
      this.requestPointerLock();
    }
  }

  public startMission(mission: MissionConfig) {
    this.currentMission = mission;
    this.missionKills = 0;
    this.missionHeadshots = 0;
    this.missionBarrelsDestroyed = 0;
    this.missionCompletedTriggered = false;
    this.startNewGame('mission', mission.arena);
  }

  private initFreeModeTargets() {
    this.practiceTargets = [];
    for (let i = 0; i < 10; i++) {
      this.spawnPracticeTarget(i < 3); // 3 moving targets for aim tracking practice
    }
  }

  private spawnPracticeTarget(isMoving: boolean = false) {
    const spawnPos = this.arena.getValidSpawnPoint(this.player.position);
    const target = new PracticeTarget(Math.random().toString(), spawnPos, isMoving);
    this.practiceTargets.push(target);
    this.scene.add(target.mesh);
  }

  private handlePracticeTargetDestroyed(target: PracticeTarget, isBullseye: boolean) {
    this.player.stats.kills++;
    if (isBullseye) {
      this.player.stats.headshots++;
    }

    this.player.stats.combo++;
    this.player.stats.comboTimer = 5.0;
    if (this.player.stats.combo > this.player.stats.highestCombo) {
      this.player.stats.highestCombo = this.player.stats.combo;
    }

    const comboMult = Math.min(5, 1 + Math.floor(this.player.stats.combo / 3) * 0.5);
    const points = Math.round((isBullseye ? 250 : 100) * comboMult);
    this.player.stats.score += points;

    const coinsEarned = isBullseye ? 2 : 1;
    this.player.stats.coins += coinsEarned;
    saveManager.addCoins(coinsEarned);

    this.particles.spawnExplosion(target.position.clone().setY(target.position.y + 1.2), 22);
    soundManager.playEnemyHit();

    // Occasional powerup drop (25% chance) so players can test powerups in free mode
    if (Math.random() < 0.25) {
      this.spawnRandomPowerup(target.position);
    }

    // Automatically respawn replacement target after 0.5s so shooting is endless
    setTimeout(() => {
      if (this.state === 'PLAYING' && this.mode === 'free_mode') {
        this.spawnPracticeTarget(Math.random() < 0.35);
      }
    }, 500);
  }

  private clearAllEntities() {
    this.enemies.forEach(e => {
      this.scene.remove(e.mesh);
      e.dispose();
    });
    this.enemies = [];

    this.practiceTargets.forEach(t => {
      this.scene.remove(t.mesh);
      t.dispose();
    });
    this.practiceTargets = [];

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
    this.killsSinceHealthPack = 0;

    this.remotePlayers.forEach(r => {
      this.scene.remove(r.mesh);
      r.dispose();
    });
    this.remotePlayers.clear();
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
        case 'ShiftRight':
        case 'KeyC':
        case 'ControlLeft':
        case 'ControlRight': {
          this.keys.sprint = true;
          if (this.zoomLevel > 0) {
            this.setZoomLevel(0);
          }
          break;
        }
        case 'KeyQ': {
          if (!this.isQDown) {
            this.isQDown = true;
            this.qPressedTime = performance.now();
            this.cycleZoomLevel();
          }
          break;
        }
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
        case 'ShiftRight':
        case 'KeyC':
        case 'ControlLeft':
        case 'ControlRight': {
          this.keys.sprint = false;
          break;
        }
        case 'KeyQ': {
          if (this.isQDown) {
            this.isQDown = false;
            const heldDuration = performance.now() - this.qPressedTime;
            // If held for longer than 260ms, release zoom on key up (hold to zoom)
            // If quick tap (< 260ms), leave zoom active (tap to toggle/cycle zoom)!
            if (heldDuration > 260) {
              this.setZoomLevel(0);
            }
          }
          break;
        }
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
        if (this.zoomLevel === 0) {
          this.setZoomLevel(1);
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isLeftMouseDown = false;
      } else if (e.button === 2) {
        this.isRightMouseDown = false;
        if (!this.isQDown) {
          this.setZoomLevel(0);
        }
      }
    });

    // Disable context menu on right click
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse movement
    window.addEventListener('mousemove', (e) => {
      if (this.state !== 'PLAYING' || !this.isPointerLocked) return;
      this.player.rotateCamera(
        e.movementX,
        e.movementY,
        this.mouseSensitivity,
        this.currentWeapon?.isAiming,
        this.zoomLevel
      );
    });

    // Mouse wheel: zoom level control when aiming, or weapon cycle when not aiming
    window.addEventListener('wheel', (e) => {
      if (this.state !== 'PLAYING' || !this.isPointerLocked) return;
      if (this.isZoomingActive()) {
        if (e.deltaY < 0) {
          this.setZoomLevel(2); // Zoom in closer
        } else if (e.deltaY > 0) {
          this.setZoomLevel(this.zoomLevel > 1 ? 1 : 0); // Zoom out
        }
        return;
      }
      if (e.deltaY > 0) {
        this.cycleWeapon(1);
      } else if (e.deltaY < 0) {
        this.cycleWeapon(-1);
      }
    }, { passive: true });

    // Window blur - release input state
    window.addEventListener('blur', () => {
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;
      this.keys.jump = false;
      this.keys.sprint = false;
      this.isLeftMouseDown = false;
      this.isRightMouseDown = false;
      this.isQDown = false;
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
      this.keys.forward = false;
      this.keys.backward = false;
      this.keys.left = false;
      this.keys.right = false;
      this.keys.jump = false;
      this.keys.sprint = false;
      this.isLeftMouseDown = false;
      this.isRightMouseDown = false;
      this.isQDown = false;
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

  public getTargetPixelRatio(): number {
    if (this.graphicsQuality === 'normal') {
      return Math.min(window.devicePixelRatio, 1.0);
    } else if (this.graphicsQuality === 'high') {
      return Math.min(window.devicePixelRatio, 1.25);
    } else {
      return Math.min(window.devicePixelRatio, 2.0);
    }
  }

  public applyGraphicsQuality(quality: GraphicsQuality, updateMaterials: boolean = true) {
    this.graphicsQuality = quality;
    const dpr = this.getTargetPixelRatio();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (quality === 'normal') {
      this.renderer.shadowMap.enabled = false;
    } else if (quality === 'high') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    } else {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.renderer.shadowMap.needsUpdate = true;

    if (this.particles) {
      this.particles.setQuality(quality);
    }

    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.DirectionalLight) {
          if (quality === 'normal') {
            obj.castShadow = false;
          } else if (quality === 'high') {
            obj.castShadow = true;
            obj.shadow.mapSize.set(1024, 1024);
            if (obj.shadow.map) {
              obj.shadow.map.dispose();
              obj.shadow.map = null as any;
            }
          } else {
            obj.castShadow = true;
            obj.shadow.mapSize.set(2048, 2048);
            if (obj.shadow.map) {
              obj.shadow.map.dispose();
              obj.shadow.map = null as any;
            }
          }
        }
        if (updateMaterials && (obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => (m.needsUpdate = true));
            } else {
              mesh.material.needsUpdate = true;
            }
          }
        }
      });
    }
  }

  public updateSettings(settings: Partial<GameSettings> | number) {
    if (typeof settings === 'number') {
      this.mouseSensitivity = settings;
    } else {
      if (settings.mouseSensitivity !== undefined) this.mouseSensitivity = settings.mouseSensitivity;
      if (settings.touchSensitivity !== undefined) this.touchSensitivity = settings.touchSensitivity;
      if (settings.fov !== undefined && settings.fov !== this.baseFov) {
        this.baseFov = settings.fov;
        this.camera.fov = settings.fov;
        this.camera.updateProjectionMatrix();
      }
      if (settings.frameRateLimit !== undefined) {
        this.frameRateLimit = settings.frameRateLimit;
      }
      if (settings.graphicsQuality !== undefined && settings.graphicsQuality !== this.graphicsQuality) {
        this.applyGraphicsQuality(settings.graphicsQuality, true);
      }
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
    if (firing && this.state === 'PLAYING') {
      // Immediate shot trigger on tap for zero touch latency
      this.handlePlayerShooting(this.clock.getElapsedTime());
    }
  }

  public setAiming(aiming: boolean) {
    this.isTouchAiming = aiming;
    if (aiming) {
      if (this.zoomLevel === 0) this.setZoomLevel(1);
    } else {
      this.setZoomLevel(0);
    }
  }

  public toggleAiming(): boolean {
    return this.cycleZoomLevel() > 0;
  }

  public isZoomingActive(): boolean {
    return this.zoomLevel > 0 || this.isRightMouseDown || this.isTouchAiming;
  }

  public isAimingActive(): boolean {
    return this.isZoomingActive();
  }

  public getZoomLevel(): number {
    return this.zoomLevel;
  }

  public setZoomLevel(level: number) {
    const prev = this.zoomLevel;
    this.zoomLevel = Math.max(0, Math.min(2, level));
    if (this.currentWeapon) {
      this.currentWeapon.isAiming = this.isZoomingActive();
    }
    if (this.zoomLevel > 0 && prev === 0) {
      soundManager.playZoomIn(this.zoomLevel >= 2);
    } else if (this.zoomLevel >= 2 && prev < 2) {
      soundManager.playZoomIn(true);
    } else if (this.zoomLevel === 0 && prev > 0) {
      soundManager.playZoomOut();
      this.targetLock = null;
      this.targetLockWorldPos = null;
      this.lastLockTargetId = null;
    }
  }

  public cycleZoomLevel(): number {
    if (this.zoomLevel === 0) {
      this.setZoomLevel(1);
    } else if (this.zoomLevel === 1) {
      this.setZoomLevel(2);
    } else {
      this.setZoomLevel(0);
    }
    return this.zoomLevel;
  }

  public calculateTargetFov(): number {
    this.baseFov = saveManager.getData().settings.fov || 75;
    if (!this.isZoomingActive()) {
      return this.baseFov;
    }
    const weaponId = this.currentWeaponId;
    if (this.zoomLevel >= 2) {
      // Precision Scope Focus
      if (weaponId === 'sniper') return 16;
      if (weaponId === 'plasma_rifle') return 24;
      if (weaponId === 'shotgun') return 36;
      return 26;
    } else {
      // Tactical ADS Zoom
      if (weaponId === 'sniper') return 30;
      if (weaponId === 'plasma_rifle') return 40;
      if (weaponId === 'shotgun') return 50;
      return 42;
    }
  }

  public getZoomMagnification(): number {
    const base = saveManager.getData().settings.fov || 75;
    const fov = this.calculateTargetFov();
    return Number((base / fov).toFixed(1));
  }

  public updateTargetAcquisition(): TargetLockInfo | null {
    if (!this.isZoomingActive()) {
      this.targetLockWorldPos = null;
      return null;
    }

    const camPos = this.camera.position;
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();

    interface TargetCandidate {
      name: string;
      dist: number;
      health: number;
      maxHealth: number;
      screenX: number;
      screenY: number;
      isCritical: boolean;
      worldPos: THREE.Vector3;
      dot: number;
    }

    // Collect all candidate entities
    const candidateList: {
      name: string;
      center: THREE.Vector3;
      head: THREE.Vector3 | null;
      health: number;
      maxHealth: number;
    }[] = [];

    // 1. Enemies
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const center = enemy.position.clone().add(new THREE.Vector3(0, 1.0, 0));
      const head = enemy.headMesh
        ? enemy.headMesh.getWorldPosition(new THREE.Vector3())
        : enemy.position.clone().add(new THREE.Vector3(0, 1.7, 0));
      const theme = HUMAN_THEMES[enemy.type];
      candidateList.push({
        name: theme ? theme.name.toUpperCase() : 'HOSTILE INFANTRY',
        center,
        head,
        health: enemy.health,
        maxHealth: enemy.maxHealth
      });
    }

    // 2. Boss
    if (this.boss && !this.boss.isDead) {
      candidateList.push({
        name: 'GOLIATH MECH TITAN',
        center: this.boss.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
        head: this.boss.position.clone().add(new THREE.Vector3(0, 4.6, 0)),
        health: this.boss.health,
        maxHealth: this.boss.maxHealth
      });
    }

    // 3. Practice Targets
    for (const pt of this.practiceTargets) {
      if (pt.isDead) continue;
      candidateList.push({
        name: 'TARGET DRONE',
        center: pt.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
        head: pt.position.clone().add(new THREE.Vector3(0, 2.1, 0)),
        health: pt.health,
        maxHealth: pt.maxHealth
      });
    }

    let bestCandidate: TargetCandidate | null = null;
    const threshold = this.zoomLevel >= 2 ? 0.97 : 0.92;

    for (const item of candidateList) {
      const toCenter = item.center.clone().sub(camPos);
      const dist = toCenter.length();
      if (dist < 1.0 || dist > 200) continue;

      const dirToTarget = toCenter.clone().normalize();
      const dot = camDir.dot(dirToTarget);

      if (dot > threshold) {
        if (!bestCandidate || dot > bestCandidate.dot) {
          let isCritical = false;
          let aimTargetPos = item.center;
          if (item.head) {
            const toHead = item.head.clone().sub(camPos).normalize();
            const headDot = camDir.dot(toHead);
            if (headDot > 0.988) {
              isCritical = true;
              aimTargetPos = item.head;
            }
          }

          const proj = aimTargetPos.clone().project(this.camera);
          if (proj.z < 1.0 && proj.z > -1.0) {
            const screenX = (proj.x * 0.5 + 0.5) * window.innerWidth;
            const screenY = (-(proj.y * 0.5) + 0.5) * window.innerHeight;

            bestCandidate = {
              name: item.name,
              dist: Number(dist.toFixed(1)),
              health: Math.max(0, item.health),
              maxHealth: item.maxHealth,
              screenX,
              screenY,
              isCritical,
              worldPos: aimTargetPos,
              dot
            };
          }
        }
      }
    }

    if (bestCandidate !== null) {
      const chosen: TargetCandidate = bestCandidate;
      this.targetLockWorldPos = chosen.worldPos;
      return {
        name: chosen.name,
        distance: chosen.dist,
        health: chosen.health,
        maxHealth: chosen.maxHealth,
        screenX: chosen.screenX,
        screenY: chosen.screenY,
        isCritical: chosen.isCritical
      };
    } else {
      this.targetLockWorldPos = null;
      return null;
    }
  }

  public setJump(jumping: boolean) {
    this.keys.jump = jumping;
  }

  public reload() {
    if (this.currentWeapon) {
      this.currentWeapon.startReload();
    }
  }

  public rotateCameraTouch(deltaX: number, deltaY: number, customSens?: { cameraSens?: number; adsSens?: number }) {
    const isAiming = this.isAimingActive();
    let adsDamp = 1.0;
    if (this.zoomLevel >= 2) {
      adsDamp = 0.32;
    } else if (isAiming || this.zoomLevel === 1) {
      adsDamp = 0.52;
    }

    let multiplier = 1.0;
    if (customSens) {
      if (isAiming && customSens.adsSens !== undefined) {
        multiplier = customSens.adsSens / 100;
      } else if (customSens.cameraSens !== undefined) {
        multiplier = customSens.cameraSens / 100;
      }
    }

    const sensFactor = 0.0034 * (this.touchSensitivity / 50) * adsDamp * multiplier;
    this.player.yaw -= deltaX * sensFactor;
    this.player.pitch -= deltaY * sensFactor;

    const maxPitch = (Math.PI / 2) - 0.05;
    this.player.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.player.pitch));
  }

  public setStance(stance: 'stand' | 'crouch' | 'prone') {
    this.player.setStance(stance);
  }

  public toggleCrouch() {
    this.player.toggleCrouch();
  }

  public toggleProne() {
    this.player.toggleProne();
  }

  public getStance(): 'stand' | 'crouch' | 'prone' {
    return this.player.stance;
  }

  public performMelee() {
    if (this.state !== 'PLAYING') return;
    soundManager.playGunshot('shotgun');
    this.player.addTrauma(0.15);

    const { origin, direction } = this.player.getShootRay();
    const hitPoint = origin.clone().addScaledVector(direction, 2.0);
    this.particles.spawnSparks(hitPoint, direction, 0x38bdf8, 16);

    let hitAny = false;
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const dist = enemy.position.distanceTo(origin);
      if (dist <= 3.2) {
        const toEnemy = enemy.position.clone().sub(origin).normalize();
        const dot = direction.dot(toEnemy);
        if (dot > 0.4) {
          const res = enemy.takeDamage(95, true);
          this.triggerHitFeedback(enemy.position.clone().setY(origin.y), res.finalDamage, true);
          if (res.killed) {
            this.handleEnemyKill(enemy, true);
          }
          hitAny = true;
          break;
        }
      }
    }

    if (!hitAny && this.boss && !this.boss.isDead) {
      const dist = this.boss.position.distanceTo(origin);
      if (dist <= 4.0) {
        const res = this.boss.takeDamage(80, false);
        this.triggerHitFeedback(this.boss.position, res.finalDamage, false);
      }
    }
  }

  public throwGrenade() {
    if (this.state !== 'PLAYING') return;
    this.player.addTrauma(0.18);

    const { origin, direction } = this.player.getShootRay();
    const throwDist = 14;
    const targetPos = origin.clone().addScaledVector(direction, throwDist);
    targetPos.y = Math.max(0.5, targetPos.y);

    setTimeout(() => {
      soundManager.playExplosion();
      this.particles.spawnExplosion(targetPos, 85);
      this.player.addTrauma(0.4);

      this.enemies.forEach(enemy => {
        if (!enemy.isDead) {
          const dist = enemy.position.distanceTo(targetPos);
          if (dist <= 8.0) {
            const factor = 1 - dist / 8.0;
            const dmg = Math.round(180 * factor);
            const res = enemy.takeDamage(dmg, false);
            this.triggerHitFeedback(enemy.position, res.finalDamage, false);
            if (res.killed) {
              this.handleEnemyKill(enemy, false);
            }
          }
        }
      });

      if (this.boss && !this.boss.isDead) {
        const dist = this.boss.position.distanceTo(targetPos);
        if (dist <= 9.0) {
          const factor = 1 - dist / 9.0;
          const dmg = Math.round(200 * factor);
          const res = this.boss.takeDamage(dmg, false);
          this.triggerHitFeedback(this.boss.position, res.finalDamage, false);
        }
      }
    }, 350);
  }

  public interact(): string | null {
    if (this.state !== 'PLAYING') return null;

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      const dist = this.player.position.distanceTo(p.position);
      if (dist <= 4.5) {
        soundManager.playPowerup();
        this.player.activatePowerup(p.type);
        this.particles.spawnSparks(p.position, new THREE.Vector3(0, 1, 0), 0x38bdf8, 25);
        this.scene.remove(p.mesh);
        p.dispose();
        this.powerups.splice(i, 1);
        return `Collected ${p.type.replace('_', ' ').toUpperCase()}`;
      }
    }

    if (this.currentWeapon && this.currentWeapon.currentAmmo < this.currentWeapon.maxAmmo) {
      this.reload();
      return 'Reloading';
    }

    return null;
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

  public previewArena(arenaId: ArenaId) {
    if (this.currentArenaId === arenaId) return;
    this.currentArenaId = arenaId;
    this.arena.loadArena(arenaId);
    this.particles.initAtmosphere(arenaId);
  }

  public showMenu() {
    this.state = 'MENU';
    this.isMultiplayer = false;
    multiplayerService.leaveRoom();
    this.setZoomLevel(0);
    if (this.currentWeapon) {
      this.currentWeapon.meshGroup.visible = false;
    }
    this.clearAllEntities();
    this.exitPointerLock();
    this.callbacks.onGameStateChange('MENU');
  }

  private updateMenuCinematic(delta: number, now: number) {
    this.particles.update(delta);
    // Smooth cinematic orbit around the arena center
    const radius = 22;
    const speed = 0.12;
    const angle = now * speed;
    this.camera.position.set(
      Math.sin(angle) * radius,
      7 + Math.sin(now * 0.3) * 1.5,
      Math.cos(angle) * radius
    );
    this.camera.lookAt(0, 2.5, 0);
  }

  // --- SHOOTING LOGIC ---
  private handlePlayerShooting(time: number) {
    const shouldShoot = this.isLeftMouseDown || this.isTouchShooting;
    if (!shouldShoot) return;

    const isFreeMode = this.mode === 'free_mode';
    const hasInfiniteAmmo = isFreeMode || this.player.hasPowerup('infinite_ammo');
    const hasRapidFire = this.player.hasPowerup('rapid_fire');
    const hasDamageBoost = this.player.hasPowerup('damage_boost');

    // If rapid fire is active, double effective rate
    if (hasRapidFire) {
      this.currentWeapon.config.fireRate = BASE_WEAPONS[this.currentWeapon.config.id].fireRate * 1.8;
    }

    if (this.currentWeapon.shoot(time, hasInfiniteAmmo)) {
      if (isFreeMode) {
        // Keep ammo full in free mode for infinite shooting
        this.currentWeapon.currentAmmo = this.currentWeapon.maxAmmo;
      }
      // Trigger camera recoil punch
      this.player.addTrauma(this.currentWeapon.config.recoilKick * 0.85);

      if (this.isZoomingActive()) {
        this.currentZoomFovKick = this.currentWeapon.config.recoilKick * 2.2;
      }

      const shootData = this.player.getShootRay();

      if (this.isMultiplayer) {
        multiplayerService.broadcastShoot(
          { x: shootData.origin.x, y: shootData.origin.y, z: shootData.origin.z },
          { x: shootData.direction.x, y: shootData.direction.y, z: shootData.direction.z },
          this.currentWeapon.config.id
        );
      }

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
          if (this.currentWeapon.config.spread > 0 && !this.isZoomingActive()) {
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
    let finalDirection = direction;
    if (this.isZoomingActive() && this.targetLockWorldPos) {
      const dirToTarget = this.targetLockWorldPos.clone().sub(origin).normalize();
      if (direction.dot(dirToTarget) > 0.98) {
        finalDirection = dirToTarget;
      }
    }

    this.raycaster.set(origin, finalDirection);
    this.raycaster.far = this.currentWeapon.config.range;

    // Collect all shootable objects
    const targets: THREE.Object3D[] = [];
    if (this.isMultiplayer) {
      this.remotePlayers.forEach(r => {
        if (r.isAlive) targets.push(r.mesh);
      });
    }
    this.enemies.forEach(e => targets.push(e.mesh));
    this.practiceTargets.forEach(t => {
      if (!t.isDead) targets.push(t.mesh);
    });
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

      // Check Remote Player Hit (Multiplayer)
      if (this.isMultiplayer) {
        for (const [, remote] of this.remotePlayers) {
          if (!remote.isAlive) continue;
          if (this.mode === 'multiplayer_tdm' && remote.team === multiplayerService.localPlayer?.team) {
            continue; // No friendly fire
          }

          let isPartOfRemote = false;
          let isHeadshot = false;

          hit.object.traverseAncestors(ancestor => {
            if (ancestor === remote.mesh) isPartOfRemote = true;
          });
          if (hit.object === remote.mesh) isPartOfRemote = true;

          if (isPartOfRemote) {
            if (hit.object === remote.headMesh || hit.object.parent === remote.headMesh) {
              isHeadshot = true;
            }

            const baseDmg = this.currentWeapon.config.damage * (hasDamageBoost ? 2.0 : 1.0);
            const res = remote.takeDamage(baseDmg, isHeadshot);

            this.particles.spawnSparks(hitPoint, hitNormal, isHeadshot ? 0xfef08a : 0xef4444, 16);
            this.triggerHitFeedback(hitPoint, res.finalDamage, isHeadshot);

            multiplayerService.reportHit(
              remote.id,
              res.finalDamage,
              isHeadshot,
              { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }
            );

            if (res.killed) {
              if (isHeadshot) {
                soundManager.playHeadshotKill();
                this.player.stats.headshots++;
              } else {
                soundManager.playKillConfirmed();
              }
              this.player.stats.kills++;
              this.player.stats.score += isHeadshot ? 150 : 100;
              multiplayerService.reportKill(remote.id, this.currentWeapon.config.id, isHeadshot);
            }
            return;
          }
        }
      }

      // Check Explosive Barrel
      for (const barrel of this.arena.explosiveBarrels) {
        if (!barrel.exploded && (barrel.mesh === hit.object || barrel.mesh.children.includes(hit.object as THREE.Mesh))) {
          this.detonateBarrel(barrel);
          return;
        }
      }

      // Check Practice Target Hit (Free Mode / Target Practice)
      for (const pt of this.practiceTargets) {
        if (pt.isDead) continue;
        let isPartOfTarget = false;
        hit.object.traverseAncestors(ancestor => {
          if (ancestor === pt.mesh) isPartOfTarget = true;
        });
        if (hit.object === pt.mesh) isPartOfTarget = true;

        if (isPartOfTarget) {
          const isBullseye = pt.isBullseyeMesh(hit.object);
          const baseDmg = this.currentWeapon.config.damage * (hasDamageBoost ? 2.0 : 1.0);
          const res = pt.takeDamage(baseDmg, isBullseye);

          this.particles.spawnSparks(hitPoint, hitNormal, isBullseye ? 0xfef08a : 0x0284c7, 16);
          this.triggerHitFeedback(hitPoint, res.finalDamage, res.isCrit);

          if (res.killed) {
            this.handlePracticeTargetDestroyed(pt, isBullseye);
          }
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

    if (this.currentMission) {
      this.missionBarrelsDestroyed++;
      this.checkMissionObjectives();
    }

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

    // Health pack drop every 3 kills guarantee
    this.killsSinceHealthPack++;
    if (this.killsSinceHealthPack % 3 === 0) {
      this.spawnHealthPack(enemy.position);
    } else if (Math.random() < 0.16) {
      this.spawnRandomPowerup(enemy.position);
    }

    // Notify wave manager
    this.waveManager.onEnemyKilled(false);

    if (this.currentMission) {
      this.missionKills++;
      if (isHeadshot) {
        this.missionHeadshots++;
      }
      this.checkMissionObjectives();
    }
  }

  private handleBossDefeat() {
    this.player.stats.score += 5000;
    this.player.stats.coins += 100;
    saveManager.addCoins(100);
    this.waveManager.onEnemyKilled(true);

    if (this.currentMission) {
      this.checkMissionObjectives();
    } else if (this.mode === 'boss_arena') {
      this.state = 'VICTORY';
      this.exitPointerLock();
      this.callbacks.onGameStateChange('VICTORY');
    }
  }

  public getMissionObjectiveInfo(): MissionObjectiveInfo | null {
    if (!this.currentMission) return null;

    const m = this.currentMission;
    let progress = '';

    if (m.targetBarrels && m.targetBarrels > 0) {
      progress = `Hostiles: ${Math.min(m.targetKills, this.missionKills)}/${m.targetKills} • Supply Barrels: ${Math.min(m.targetBarrels, this.missionBarrelsDestroyed)}/${m.targetBarrels}`;
    } else if (m.targetHeadshots && m.targetHeadshots > 0) {
      progress = `Hostiles: ${Math.min(m.targetKills, this.missionKills)}/${m.targetKills} • Headshots: ${Math.min(m.targetHeadshots, this.missionHeadshots)}/${m.targetHeadshots}`;
    } else if (m.hasBoss) {
      const bossStatus = this.boss ? (this.boss.isDead ? 'ELIMINATED' : `${Math.max(0, Math.round(this.boss.health))}/${this.boss.maxHealth} HP`) : 'SPAWNING...';
      progress = `Hostiles: ${Math.min(m.targetKills, this.missionKills)}/${m.targetKills} • Goliath Boss: ${bossStatus}`;
    } else if (m.targetWaves) {
      progress = `Wave: ${Math.min(m.targetWaves, this.waveManager.currentWave)}/${m.targetWaves} • Hostiles: ${Math.min(m.targetKills, this.missionKills)}/${m.targetKills}`;
    } else {
      progress = `Hostiles Eliminated: ${Math.min(m.targetKills, this.missionKills)}/${m.targetKills}`;
    }

    return {
      missionId: m.id,
      title: m.title,
      objectiveText: m.primaryObjective,
      progressText: progress,
      isCompleted: this.missionCompletedTriggered,
      timeRemaining: m.timeLimit ? Math.max(0, Math.round(this.waveManager.timeAttackRemaining)) : undefined
    };
  }

  private checkMissionObjectives() {
    if (!this.currentMission || this.missionCompletedTriggered) return;
    const m = this.currentMission;

    const killsMet = this.missionKills >= m.targetKills;
    const barrelsMet = !m.targetBarrels || this.missionBarrelsDestroyed >= m.targetBarrels;
    const headshotsMet = !m.targetHeadshots || this.missionHeadshots >= m.targetHeadshots;
    const wavesMet = !m.targetWaves || this.waveManager.currentWave >= m.targetWaves;
    const bossMet = !m.hasBoss || (this.boss !== null && this.boss.isDead);
    const timeMet = !m.timeLimit || this.waveManager.timeAttackRemaining > 0;

    if (killsMet && barrelsMet && headshotsMet && wavesMet && bossMet && timeMet) {
      this.handleMissionVictory();
    }
  }

  private handleMissionVictory() {
    if (this.missionCompletedTriggered) return;
    this.missionCompletedTriggered = true;

    if (!this.currentMission) return;
    const mission = this.currentMission;

    const currentIdx = MISSIONS.findIndex(m => m.id === mission.id);
    const nextMission = currentIdx >= 0 && currentIdx < MISSIONS.length - 1 ? MISSIONS[currentIdx + 1] : null;

    saveManager.completeMission(mission.id, nextMission ? nextMission.id : undefined, mission.rewardCoins);
    soundManager.playMissionComplete();

    this.player.stats.coins += mission.rewardCoins;
    this.player.stats.score += mission.rewardScore;

    saveManager.recordGameEnd(
      this.player.stats.score,
      this.waveManager.currentWave,
      this.player.stats.kills,
      this.player.stats.headshots,
      this.player.stats.highestCombo,
      this.boss ? (this.boss.isDead ? 1 : 0) : 0
    );

    this.state = 'VICTORY';
    this.exitPointerLock();
    soundManager.stopMusic();

    this.callbacks.onGameStateChange('VICTORY');
  }

  public spawnHealthPack(pos: THREE.Vector3) {
    const p = new Powerup(Math.random().toString(), 'health', pos.clone());
    this.powerups.push(p);
    this.scene.add(p.mesh);
    // Green sparkle beacon effect on spawn
    this.particles.spawnSparks(pos, new THREE.Vector3(0, 1, 0), 0x22c55e, 16);
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
    this.lastFrameTimestamp = performance.now();
    this.lastFpsSampleTime = performance.now();
    this.fpsFrameCount = 0;

    const animate = (timestamp: number) => {
      this.animFrameId = requestAnimationFrame(animate);

      const targetFps = this.frameRateLimit || 60;
      const frameInterval = 1000 / targetFps;

      const elapsed = timestamp - this.lastFrameTimestamp;
      // Allow a 1.5ms margin for browser display vsync fluctuations
      if (elapsed < frameInterval - 1.5) {
        return;
      }

      this.lastFrameTimestamp = timestamp - (elapsed % frameInterval);

      // Smooth FPS calculation
      this.fpsFrameCount++;
      const timeSinceSample = timestamp - this.lastFpsSampleTime;
      if (timeSinceSample >= 500) {
        this.calculatedFps = Math.max(1, Math.round((this.fpsFrameCount * 1000) / timeSinceSample));
        this.fpsFrameCount = 0;
        this.lastFpsSampleTime = timestamp;
      }

      const delta = Math.min(0.1, this.clock.getDelta());
      const now = performance.now() * 0.001;

      if (this.state === 'PLAYING') {
        this.updateGame(delta, now);
      } else if (this.state === 'MENU') {
        this.updateMenuCinematic(delta, now);
      }

      this.renderer.render(this.scene, this.camera);
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  private updateGame(delta: number, now: number) {
    // 0. Dynamic Camera Zoom FOV interpolation
    const targetFov = this.calculateTargetFov();
    this.currentZoomFovKick = THREE.MathUtils.lerp(this.currentZoomFovKick, 0, delta * 15);
    const finalTargetFov = Math.max(12, Math.min(100, targetFov + this.currentZoomFovKick));
    if (Math.abs(this.camera.fov - finalTargetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, finalTargetFov, delta * 18);
      this.camera.updateProjectionMatrix();
    }

    // 0.1 Target Acquisition & Tactical Assist
    this.targetLock = this.updateTargetAcquisition();
    if (this.targetLock && this.targetLockWorldPos) {
      this.player.applyTargetAssist(this.targetLockWorldPos, 0.035);
      if (this.targetLock.name !== this.lastLockTargetId) {
        this.lastLockTargetId = this.targetLock.name;
        soundManager.playTargetLock(this.targetLock.isCritical);
      }
    } else {
      this.lastLockTargetId = null;
    }

    // 1. Slow Motion Powerup check
    const hasSlowMotion = this.player.hasPowerup('slow_motion');
    const enemyDelta = hasSlowMotion ? delta * 0.35 : delta;

    // 2. Player Update (tactical steady pace when zoomed)
    const saved = saveManager.getData();
    const effectiveKeys = {
      ...this.keys,
      sprint: this.isZoomingActive() ? false : this.keys.sprint
    };
    const effectiveAnalogMove = {
      ...this.analogMove,
      sprint: this.isZoomingActive() ? false : this.analogMove.sprint
    };
    const { isMoving, walkTime } = this.player.update(
      delta,
      effectiveKeys,
      this.arena.obstacles,
      this.arena.arenaSize,
      saved.settings.screenShake,
      effectiveAnalogMove
    );

    // 3. Weapon Update
    this.currentWeapon.update(delta, walkTime, isMoving);
    this.handlePlayerShooting(now);

    // 4. Wave Manager Update (Singleplayer only)
    if (!this.isMultiplayer) {
      const isGameOver = this.waveManager.update(
        delta,
        (type: EnemyType) => {
          const spawnPos = this.arena.getValidSpawnPoint(this.player.position);
          const waveMultiplier = 1 + (this.waveManager.currentWave - 1) * 0.18;
          const savedDiff = saveManager.getData().settings.difficulty || 'medium';
          const effectiveDiff = (this.mode === 'easy' || this.mode === 'medium' || this.mode === 'hard')
            ? this.mode
            : (this.mode === 'free_mode' ? 'free_mode' : savedDiff);
          const diffMultipliers: Record<string, { hp: number; dmg: number; speed: number }> = {
            easy: { hp: 0.65, dmg: 0.5, speed: 0.75 },
            medium: { hp: 1.0, dmg: 1.0, speed: 1.0 },
            hard: { hp: 1.4, dmg: 1.5, speed: 1.25 },
            survival: { hp: 1.0, dmg: 1.0, speed: 1.0 },
            time_attack: { hp: 0.9, dmg: 0.9, speed: 1.0 },
            boss_arena: { hp: 1.0, dmg: 1.0, speed: 1.0 },
            free_mode: { hp: 1.0, dmg: 0, speed: 0 }
          };
          const diff = diffMultipliers[effectiveDiff] || diffMultipliers.medium;
          const enemy = new Enemy(Math.random().toString(), type, spawnPos, waveMultiplier, diff);
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
    } else {
      // Multiplayer Update Loop
      // 1. Respawn handling
      if (this.isRespawning) {
        this.respawnCountdown -= delta;
        if (this.respawnCountdown <= 0) {
          this.isRespawning = false;
          const spawn = this.arena.getValidSpawnPoint(new THREE.Vector3(0, 0, 0));
          this.player.position.copy(spawn);
          this.player.velocity.set(0, 0, 0);
          this.player.stats.health = this.player.stats.maxHealth;
          this.player.stats.armor = this.player.stats.maxArmor;
          this.player.activatePowerup('shield', 3.5);
          multiplayerService.broadcastRespawn({ x: spawn.x, y: spawn.y, z: spawn.z });
        }
      }

      // 2. Update Remote Players
      for (const [, remote] of this.remotePlayers) {
        remote.update(delta);
      }

      // 3. Broadcast snapshot at ~30Hz (every 33ms)
      this.multiplayerBroadcastTimer += delta;
      if (this.multiplayerBroadcastTimer >= 0.033) {
        this.multiplayerBroadcastTimer = 0;
        multiplayerService.broadcastSnapshot({
          position: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
          yaw: this.player.yaw,
          pitch: this.player.pitch,
          stance: this.player.stance,
          velocity: { x: this.player.velocity.x, y: this.player.velocity.y, z: this.player.velocity.z },
          isMoving,
          health: this.player.stats.health,
          armor: this.player.stats.armor,
          activeWeapon: this.currentWeaponId,
          isFiring: this.isLeftMouseDown || this.isTouchShooting
        });
      }
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
          if (this.mode === 'free_mode') return;

          // Spread calculation so player can dodge with movement and use cover
          const spread = evt.spread ?? 0.05;
          const targetWithSpread = evt.target.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * spread * 4,
            (Math.random() - 0.5) * spread * 2,
            (Math.random() - 0.5) * spread * 4
          ));
          const dir = new THREE.Vector3().subVectors(targetWithSpread, evt.origin).normalize();
          const speed = evt.speed ?? 26;
          const proj = new Projectile(evt.origin, dir, speed, evt.damage, false, evt.isPlasma);
          this.projectiles.push(proj);
          this.scene.add(proj.mesh);

          // Muzzle flash sparks at enemy gun barrel
          this.particles.spawnSparks(evt.origin, dir, 0xf59e0b, 6);

          // Gunshot sound
          soundManager.playGunshot(evt.soundType ?? 'rifle');
        },
        // on enemy melee hit
        (damage) => {
          if (this.mode !== 'free_mode') {
            const dead = this.player.takeDamage(damage, enemy.position);
            if (dead) this.triggerGameOver();
          }
        }
      );
    }

    // 5b. Practice Targets Update (Free Mode)
    for (let i = this.practiceTargets.length - 1; i >= 0; i--) {
      const pt = this.practiceTargets[i];
      if (pt.isDead && pt.mesh.scale.x <= 0.05) {
        this.scene.remove(pt.mesh);
        pt.dispose();
        this.practiceTargets.splice(i, 1);
        continue;
      }
      pt.update(delta, this.player.position);
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
        // Player Plasma Projectile hits Practice Target (Free Mode)
        for (const pt of this.practiceTargets) {
          if (!pt.isDead && pt.position.distanceTo(proj.position) < 1.4) {
            const res = pt.takeDamage(proj.damage, false);
            this.particles.spawnExplosion(proj.position, 18);
            this.triggerHitFeedback(proj.position, res.finalDamage, false);
            if (res.killed) this.handlePracticeTargetDestroyed(pt, false);
            proj.isDead = true;
            break;
          }
        }

        // Player Plasma Projectile hits remote player (Multiplayer)
        if (!proj.isDead && this.isMultiplayer) {
          for (const [, remote] of this.remotePlayers) {
            if (!remote.isAlive) continue;
            if (this.mode === 'multiplayer_tdm' && remote.team === multiplayerService.localPlayer?.team) continue;
            if (remote.position.distanceTo(proj.position) < (1.2 + proj.radius)) {
              const res = remote.takeDamage(proj.damage, false);
              this.particles.spawnExplosion(proj.position, 20);
              this.triggerHitFeedback(proj.position, res.finalDamage, false);
              multiplayerService.reportHit(remote.id, res.finalDamage, false, { x: proj.position.x, y: proj.position.y, z: proj.position.z });
              if (res.killed) {
                soundManager.playKillConfirmed();
                this.player.stats.kills++;
                this.player.stats.score += 100;
                multiplayerService.reportKill(remote.id, 'plasma_rifle', false);
              }
              proj.isDead = true;
              break;
            }
          }
        }

        // Player Plasma Projectile hits enemy
        if (!proj.isDead) {
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
        }
      } else {
        // Enemy Projectile hits player
        if (proj.position.distanceTo(this.player.position) < (0.8 + proj.radius)) {
          if (this.mode !== 'free_mode') {
            const dead = this.player.takeDamage(proj.damage, proj.position);
            if (dead) this.triggerGameOver();
          }
          this.particles.spawnSparks(proj.position, new THREE.Vector3(0, 1, 0), 0xef4444, 12);
          proj.isDead = true;
        }
      }

      // Check bullet impact against cover obstacles (cars, fences, walls)
      if (!proj.isDead) {
        for (const obs of this.arena.obstacles) {
          if (obs.box.containsPoint(proj.position)) {
            proj.isDead = true;
            this.particles.spawnSparks(proj.position, new THREE.Vector3(0, 1, 0), proj.isPlayerProjectile ? 0x06b6d4 : 0xef4444, 8);
            break;
          }
        }
        // Check bullet impact on ground
        if (proj.position.y <= 0.05) {
          proj.isDead = true;
          this.particles.spawnSparks(proj.position, new THREE.Vector3(0, 1, 0), 0xf59e0b, 6);
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
          if (p.type === 'health') {
            soundManager.playHealthPack();
            this.particles.spawnSparks(this.player.position, new THREE.Vector3(0, 1, 0), 0x22c55e, 24);
          }
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
      kills: this.player.stats.kills,
      enemiesRemaining: this.mode === 'free_mode' ? this.practiceTargets.length : this.waveManager.enemiesRemaining,
      timeRemaining: (this.mode === 'time_attack' || (this.mode === 'mission' && this.currentMission?.timeLimit)) ? Math.max(0, Math.round(this.waveManager.timeAttackRemaining)) : undefined,
      activeWeaponId: this.currentWeaponId,
      isAiming: this.isZoomingActive(),
      isZooming: this.isZoomingActive(),
      zoomLevel: this.zoomLevel,
      zoomMagnification: this.getZoomMagnification(),
      targetLock: this.targetLock,
      mode: this.mode,
      missionObjective: this.getMissionObjectiveInfo(),
      activeMission: this.currentMission,
      isMultiplayer: this.isMultiplayer,
      isRespawning: this.isRespawning,
      respawnCountdown: Math.ceil(this.respawnCountdown),
      killerName: this.killerName,
      multiplayerAlphaScore: multiplayerService.room?.teamAlphaScore,
      multiplayerBravoScore: multiplayerService.room?.teamBravoScore,
      multiplayerScoreLimit: multiplayerService.room?.scoreLimit,
      multiplayerPing: multiplayerService.currentPing,
      fps: this.calculatedFps,
      graphicsQuality: this.graphicsQuality
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
    this.renderer.setPixelRatio(this.getTargetPixelRatio());
  };

  public destroy() {
    this.isRunning = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('orientationchange', this.onWindowResize);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.onWindowResize);
    }
    multiplayerService.destroy();
    this.clearAllEntities();
    this.particles.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

export type GameMode = 'easy' | 'medium' | 'hard' | 'free_mode' | 'survival' | 'time_attack' | 'boss_arena' | 'mission' | 'multiplayer_tdm' | 'multiplayer_ffa' | 'multiplayer_coop';

export type MissionId = 
  | 'mission_1_suburb_recon'
  | 'mission_2_neon_lockdown'
  | 'mission_3_desert_mirage'
  | 'mission_4_titan_protocol'
  | 'mission_5_chrono_surge';

export interface MissionConfig {
  id: MissionId;
  number: number;
  title: string;
  codename: string;
  tagline: string;
  arena: ArenaId;
  arenaName: string;
  briefing: string;
  primaryObjective: string;
  targetKills: number;
  targetBarrels?: number;
  targetHeadshots?: number;
  targetWaves?: number;
  timeLimit?: number; // seconds
  hasBoss?: boolean;
  rewardCoins: number;
  rewardScore: number;
  difficulty: 'RECON' | 'TACTICAL' | 'VETERAN' | 'EXTREME' | 'APEX';
  badge: string;
  badgeColor: string;
  accentColor: string;
}

export interface MissionObjectiveInfo {
  missionId: MissionId;
  title: string;
  objectiveText: string;
  progressText: string;
  isCompleted: boolean;
  timeRemaining?: number;
}

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';

export type ArenaId = 'industrial' | 'desert' | 'neon_city' | 'space_station';

export type WeaponId = 'assault_rifle' | 'shotgun' | 'smg' | 'sniper' | 'plasma_rifle';

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  category: string;
  damage: number;
  fireRate: number; // rounds per second
  magSize: number;
  reloadTime: number; // seconds
  spread: number; // in radians
  range: number;
  critMultiplier: number;
  pellets: number;
  bulletSpeed: number; // 0 means hitscan/instant raycast
  projectileColor: string;
  recoilKick: number;
  soundType: 'rifle' | 'shotgun' | 'smg' | 'sniper' | 'plasma';
  description: string;
  unlocked: boolean;
  unlockCost: number;
}

export type EnemyType = 
  | 'basic'      // Melee rusher
  | 'ranged'     // Shoots laser balls
  | 'fast'       // Agile stalker
  | 'tank'       // Heavy mech with ground stomp
  | 'exploder'   // Suicide drone with area explosion
  | 'shield'     // Shielded vanguard
  | 'elite';     // Golden variant with buffed HP & speed

export type PowerupType = 
  | 'health' 
  | 'armor' 
  | 'rapid_fire' 
  | 'infinite_ammo' 
  | 'damage_boost' 
  | 'slow_motion' 
  | 'shield';

export interface PowerupActiveState {
  type: PowerupType;
  remainingTime: number;
  duration: number;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  score: number;
  coins: number;
  wave: number;
  kills: number;
  headshots: number;
  highestCombo: number;
  combo: number;
  comboTimer: number;
  timeRemaining?: number; // For time attack
}

export interface UpgradeLevels {
  damage: number;
  fireRate: number;
  magazine: number;
  reload: number;
  health: number;
  armor: number;
  critChance: number;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type GraphicsQuality = 'low' | 'normal' | 'high' | 'ultra';
export type FrameRateLimit = 30 | 60 | 120;

export interface GameSettings {
  mouseSensitivity: number;
  touchSensitivity: number;
  soundVolume: number;
  musicVolume: number;
  screenShake: boolean;
  crosshairStyle: 'classic' | 'dot' | 'circle' | 'tech';
  fov: number;
  difficulty?: DifficultyLevel;
  graphicsQuality?: GraphicsQuality;
  frameRateLimit?: FrameRateLimit;
}

export interface GameStatsRecord {
  totalKills: number;
  headshots: number;
  gamesPlayed: number;
  bossesDefeated: number;
  highestScore: number;
  highestWave: number;
  highestCombo: number;
  totalCoinsEarned: number;
}

export interface FloatingDamageNumber {
  id: string;
  damage: number;
  isCrit: boolean;
  screenX: number;
  screenY: number;
  opacity: number;
}

export interface HitMarkerInfo {
  isCrit: boolean;
  timestamp: number;
}

export interface TargetLockInfo {
  name: string;
  distance: number;
  health: number;
  maxHealth: number;
  screenX: number;
  screenY: number;
  isCritical: boolean;
}


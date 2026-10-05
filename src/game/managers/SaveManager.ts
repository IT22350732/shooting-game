import { UpgradeLevels, GameSettings, GameStatsRecord, ArenaId, WeaponId } from '../../types/game';

const SAVE_KEY = 'CYBERSTRIKE_SAVE_DATA_V1';

export interface SaveData {
  coins: number;
  highestScore: number;
  highestWave: number;
  unlockedWeapons: WeaponId[];
  unlockedArenas: ArenaId[];
  completedMissions: string[];
  unlockedMissions: string[];
  upgrades: UpgradeLevels;
  settings: GameSettings;
  stats: GameStatsRecord;
}

const DEFAULT_SAVE: SaveData = {
  coins: 50, // Starting bonus
  highestScore: 0,
  highestWave: 1,
  unlockedWeapons: ['assault_rifle', 'shotgun', 'smg', 'sniper', 'plasma_rifle'],
  unlockedArenas: ['industrial', 'desert', 'neon_city', 'space_station'],
  completedMissions: [],
  unlockedMissions: ['mission_1_suburb_recon'],
  upgrades: {
    damage: 0,
    fireRate: 0,
    magazine: 0,
    reload: 0,
    health: 0,
    armor: 0,
    critChance: 0
  },
  settings: {
    mouseSensitivity: 50,
    touchSensitivity: 50,
    soundVolume: 80,
    musicVolume: 40,
    screenShake: true,
    crosshairStyle: 'classic',
    fov: 75,
    difficulty: 'medium'
  },
  stats: {
    totalKills: 0,
    headshots: 0,
    gamesPlayed: 0,
    bossesDefeated: 0,
    highestScore: 0,
    highestWave: 1,
    highestCombo: 0,
    totalCoinsEarned: 50
  }
};

export class SaveManager {
  private data: SaveData;
  private onSaveCallback: ((data: SaveData) => void) | null = null;

  constructor() {
    this.data = this.load();
  }

  public setOnSaveCallback(cb: (data: SaveData) => void) {
    this.onSaveCallback = cb;
  }

  public getDefaultSaveData(): SaveData {
    return JSON.parse(JSON.stringify(DEFAULT_SAVE));
  }

  public loadFromUserData(userData: SaveData) {
    this.data = JSON.parse(JSON.stringify(userData));
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage quota or disabled
    }
  }

  public getData(): SaveData {
    return this.data;
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const unlockedWeapons = Array.from(new Set([
          ...DEFAULT_SAVE.unlockedWeapons,
          ...(parsed.unlockedWeapons || [])
        ]));
        return {
          ...DEFAULT_SAVE,
          ...parsed,
          unlockedWeapons,
          upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades || {}) },
          settings: { ...DEFAULT_SAVE.settings, ...(parsed.settings || {}) },
          stats: { ...DEFAULT_SAVE.stats, ...(parsed.stats || {}) }
        };
      }
    } catch {
      // Fallback
    }
    return JSON.parse(JSON.stringify(DEFAULT_SAVE));
  }

  public save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage quota or disabled
    }
    if (this.onSaveCallback) {
      this.onSaveCallback(this.data);
    }
  }

  public addCoins(amount: number) {
    this.data.coins += amount;
    this.data.stats.totalCoinsEarned += amount;
    this.save();
  }

  public spendCoins(amount: number): boolean {
    if (this.data.coins >= amount) {
      this.data.coins -= amount;
      this.save();
      return true;
    }
    return false;
  }

  public unlockWeapon(id: WeaponId, cost: number): boolean {
    if (this.data.unlockedWeapons.includes(id)) return true;
    if (this.spendCoins(cost)) {
      this.data.unlockedWeapons.push(id);
      this.save();
      return true;
    }
    return false;
  }

  public getUpgradeCost(stat: keyof UpgradeLevels): number {
    const currentLvl = this.data.upgrades[stat];
    if (currentLvl >= 5) return 0; // Maxed out
    return 60 + currentLvl * 65;
  }

  public buyUpgrade(stat: keyof UpgradeLevels): boolean {
    const cost = this.getUpgradeCost(stat);
    if (cost > 0 && this.data.upgrades[stat] < 5) {
      if (this.spendCoins(cost)) {
        this.data.upgrades[stat]++;
        this.save();
        return true;
      }
    }
    return false;
  }

  public updateSettings(newSettings: Partial<GameSettings>) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
  }

  public recordGameEnd(
    score: number,
    wave: number,
    kills: number,
    headshots: number,
    highestCombo: number,
    bossesDefeated: number
  ) {
    this.data.stats.gamesPlayed++;
    this.data.stats.totalKills += kills;
    this.data.stats.headshots += headshots;
    this.data.stats.bossesDefeated += bossesDefeated;

    if (score > this.data.highestScore) {
      this.data.highestScore = score;
      this.data.stats.highestScore = score;
    }

    if (wave > this.data.highestWave) {
      this.data.highestWave = wave;
      this.data.stats.highestWave = wave;
    }

    if (highestCombo > this.data.stats.highestCombo) {
      this.data.stats.highestCombo = highestCombo;
    }

    this.save();
  }

  public isMissionCompleted(id: string): boolean {
    return (this.data.completedMissions || []).includes(id);
  }

  public isMissionUnlocked(id: string): boolean {
    if (id === 'mission_1_suburb_recon') return true;
    return (this.data.unlockedMissions || ['mission_1_suburb_recon']).includes(id);
  }

  public completeMission(id: string, nextMissionId?: string, rewardCoins: number = 0) {
    if (!this.data.completedMissions) this.data.completedMissions = [];
    if (!this.data.unlockedMissions) this.data.unlockedMissions = ['mission_1_suburb_recon'];

    if (!this.data.completedMissions.includes(id)) {
      this.data.completedMissions.push(id);
    }

    if (nextMissionId && !this.data.unlockedMissions.includes(nextMissionId)) {
      this.data.unlockedMissions.push(nextMissionId);
    }

    if (rewardCoins > 0) {
      this.addCoins(rewardCoins);
    } else {
      this.save();
    }
  }
}

export const saveManager = new SaveManager();

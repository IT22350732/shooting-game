import { UpgradeLevels, GameSettings, GameStatsRecord, ArenaId, WeaponId } from '../../types/game';

const SAVE_KEY = 'CYBERSTRIKE_SAVE_DATA_V1';

export interface SaveData {
  coins: number;
  highestScore: number;
  highestWave: number;
  unlockedWeapons: WeaponId[];
  unlockedArenas: ArenaId[];
  upgrades: UpgradeLevels;
  settings: GameSettings;
  stats: GameStatsRecord;
}

const DEFAULT_SAVE: SaveData = {
  coins: 50, // Starting bonus
  highestScore: 0,
  highestWave: 1,
  unlockedWeapons: ['assault_rifle', 'shotgun', 'smg'],
  unlockedArenas: ['industrial', 'desert', 'neon_city', 'space_station'],
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
    soundVolume: 80,
    musicVolume: 40,
    screenShake: true,
    crosshairStyle: 'classic',
    fov: 75
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

  constructor() {
    this.data = this.load();
  }

  public getData(): SaveData {
    return this.data;
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_SAVE,
          ...parsed,
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
}

export const saveManager = new SaveManager();

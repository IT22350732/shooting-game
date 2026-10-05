import { GameMode, EnemyType, MissionConfig } from '../../types/game';
import { soundManager } from '../../audio/SoundManager';
import { saveManager } from './SaveManager';

export interface WaveConfig {
  waveNumber: number;
  totalEnemies: number;
  enemyComposition: { type: EnemyType; weight: number }[];
  isBossWave: boolean;
  spawnInterval: number;
}

export class WaveManager {
  public mode: GameMode;
  public missionConfig: MissionConfig | null = null;
  public currentWave: number = 1;
  public enemiesRemaining: number = 0;
  public totalEnemiesInWave: number = 0;
  public enemiesSpawned: number = 0;
  public isIntermission: boolean = false;
  public intermissionTimer: number = 0;
  public isBossAlive: boolean = false;

  private spawnCooldown: number = 0;
  public timeAttackRemaining: number = 120; // 2 minutes starting

  constructor(mode: GameMode = 'survival', mission: MissionConfig | null = null) {
    this.mode = mode;
    this.missionConfig = mission;
    this.reset(mode, mission);
  }

  public reset(mode: GameMode = 'survival', mission: MissionConfig | null = null) {
    this.mode = mode;
    this.missionConfig = mission;
    this.currentWave = 1;
    this.isIntermission = false;
    this.intermissionTimer = 0;
    this.isBossAlive = false;
    this.spawnCooldown = 1.0;
    this.timeAttackRemaining = mission?.timeLimit || 120;
    this.startWave(1);
  }

  public startWave(waveNumber: number) {
    this.currentWave = waveNumber;
    this.isIntermission = false;

    if (this.mode === 'free_mode') {
      this.totalEnemiesInWave = 0;
      this.enemiesRemaining = 0;
      this.enemiesSpawned = 0;
      this.isBossAlive = false;
      return;
    }

    if (this.mode === 'boss_arena') {
      this.totalEnemiesInWave = 1;
      this.enemiesRemaining = 1;
      this.enemiesSpawned = 0;
      this.isBossAlive = true;
      return;
    }

    const isBossWave = (this.currentWave % 5 === 0) ||
      (this.mode === 'mission' && !!this.missionConfig?.hasBoss && this.currentWave >= (this.missionConfig.targetWaves || 3));
    this.isBossAlive = isBossWave;

    const savedDifficulty = saveManager.getData().settings.difficulty || 'medium';
    const effectiveDifficulty = (this.mode === 'easy' || this.mode === 'medium' || this.mode === 'hard')
      ? this.mode
      : savedDifficulty;

    // Scaling enemy count according to difficulty mode
    let baseCount = 6 + this.currentWave * 3;
    if (effectiveDifficulty === 'easy') {
      baseCount = Math.max(4, 4 + this.currentWave * 2);
    } else if (effectiveDifficulty === 'hard') {
      baseCount = Math.max(8, 8 + this.currentWave * 5);
    }

    this.totalEnemiesInWave = isBossWave ? Math.round(baseCount * 0.8) : baseCount;
    this.enemiesRemaining = this.totalEnemiesInWave + (isBossWave ? 1 : 0);
    this.enemiesSpawned = 0;
    this.spawnCooldown = effectiveDifficulty === 'easy' ? 1.5 : (effectiveDifficulty === 'hard' ? 0.4 : 0.8);

    soundManager.playWaveComplete();
  }

  public onEnemyKilled(isBoss: boolean = false) {
    this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);

    if (isBoss) {
      this.isBossAlive = false;
    }

    if (this.mode === 'time_attack' || (this.mode === 'mission' && this.missionConfig?.timeLimit)) {
      // Bonus time reward per kill
      this.timeAttackRemaining = Math.min(180, this.timeAttackRemaining + (isBoss ? 25 : 4.0));
    }

    // Check if wave is completed
    if (this.enemiesRemaining <= 0 && !this.isBossAlive) {
      this.isIntermission = true;
      this.intermissionTimer = 4.0;
      soundManager.playWaveComplete();
    }
  }

  public getNextEnemyToSpawn(): EnemyType | null {
    if (this.enemiesSpawned >= this.totalEnemiesInWave) {
      return null;
    }

    this.enemiesSpawned++;

    // Composition based on wave
    const wave = this.currentWave;
    const types: { type: EnemyType; weight: number }[] = [
      { type: 'basic', weight: Math.max(15, 60 - wave * 5) }
    ];

    if (wave >= 2) types.push({ type: 'fast', weight: 20 });
    if (wave >= 3) types.push({ type: 'ranged', weight: 25 });
    if (wave >= 4) types.push({ type: 'exploder', weight: 15 });
    if (wave >= 5) types.push({ type: 'shield', weight: 18 });
    if (wave >= 6) types.push({ type: 'tank', weight: 12 });
    if (wave >= 7) types.push({ type: 'elite', weight: 10 + wave });

    // Weighted random selection
    const totalWeight = types.reduce((acc, t) => acc + t.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const t of types) {
      rand -= t.weight;
      if (rand <= 0) return t.type;
    }

    return 'basic';
  }

  public update(delta: number, onSpawnSquad: (enemyType: EnemyType) => void, onSpawnBoss: () => void): boolean {
    if (this.mode === 'free_mode') {
      return false;
    }

    if (this.mode === 'time_attack' || (this.mode === 'mission' && this.missionConfig?.timeLimit)) {
      this.timeAttackRemaining -= delta;
      if (this.timeAttackRemaining <= 0) {
        return true; // Time over
      }
    }

    // Intermission handling
    if (this.isIntermission) {
      this.intermissionTimer -= delta;
      if (this.intermissionTimer <= 0) {
        this.startWave(this.currentWave + 1);
      }
      return false;
    }

    // Boss spawn at start of boss wave
    if (this.isBossAlive && this.enemiesSpawned === 0) {
      onSpawnBoss();
    }

    // Regular enemy squad spawn
    this.spawnCooldown -= delta;
    if (this.spawnCooldown <= 0 && this.enemiesSpawned < this.totalEnemiesInWave) {
      if (this.mode === 'easy') {
        this.spawnCooldown = Math.max(1.6, 3.0 - this.currentWave * 0.08);
      } else if (this.mode === 'hard') {
        this.spawnCooldown = Math.max(0.45, 1.5 - this.currentWave * 0.1);
      } else {
        this.spawnCooldown = Math.max(0.8, 2.3 - this.currentWave * 0.1);
      }

      // Spawn 1 to 2 enemies per tick
      const count = Math.min(2, this.totalEnemiesInWave - this.enemiesSpawned);
      for (let i = 0; i < count; i++) {
        const nextType = this.getNextEnemyToSpawn();
        if (nextType) {
          onSpawnSquad(nextType);
        }
      }
    }

    return false;
  }
}

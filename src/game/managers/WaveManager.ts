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
  public bossSpawned: boolean = false;

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
    this.bossSpawned = false;
    this.spawnCooldown = 0; // Spawn first assault squad immediately
    this.timeAttackRemaining = mission?.timeLimit || 120;
    this.startWave(1);
  }

  public startWave(waveNumber: number) {
    this.currentWave = waveNumber;
    this.isIntermission = false;
    this.bossSpawned = false;

    if (this.mode === 'free_mode') {
      this.totalEnemiesInWave = 0;
      this.enemiesRemaining = 0;
      this.enemiesSpawned = 0;
      this.isBossAlive = false;
      return;
    }

    if (this.mode === 'boss_arena') {
      this.totalEnemiesInWave = 0; // Pure 1v1 boss encounter
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
    } else if (this.mode === 'time_attack') {
      baseCount = Math.max(12, 10 + this.currentWave * 4);
    }

    this.totalEnemiesInWave = isBossWave ? Math.round(baseCount * 0.8) : baseCount;
    this.enemiesRemaining = this.totalEnemiesInWave + (isBossWave ? 1 : 0);
    this.enemiesSpawned = 0;
    // Spawn immediately upon wave start so player never waits
    this.spawnCooldown = 0;
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
      this.intermissionTimer = 1.8;
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

  public update(
    delta: number,
    onSpawnSquad: (enemyType: EnemyType) => void,
    onSpawnBoss: () => void,
    aliveEnemiesCount: number = 0
  ): boolean {
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
    if (this.isBossAlive && !this.bossSpawned) {
      this.bossSpawned = true;
      onSpawnBoss();
    }

    // Deadlock / Out-of-sync Failsafe:
    // If all wave enemies have already entered combat, and zero active hostiles remain
    // on the battlefield (and boss is not alive), the wave is complete!
    if (this.enemiesSpawned >= this.totalEnemiesInWave && aliveEnemiesCount <= 0 && !this.isBossAlive) {
      this.enemiesRemaining = 0;
      this.isIntermission = true;
      this.intermissionTimer = 1.8;
      soundManager.playWaveComplete();
      return false;
    }

    // Synchronize enemiesRemaining with reality (unspawned + alive on field + boss)
    const unspawned = Math.max(0, this.totalEnemiesInWave - this.enemiesSpawned);
    this.enemiesRemaining = unspawned + aliveEnemiesCount + (this.isBossAlive ? 1 : 0);

    // Target active combat density on battlefield
    let targetDensity = 4;
    if (this.mode === 'easy') {
      targetDensity = Math.min(4, Math.max(3, 2 + Math.floor(this.currentWave * 0.3)));
    } else if (this.mode === 'hard') {
      targetDensity = Math.min(8, Math.max(4, 4 + Math.floor(this.currentWave * 0.5)));
    } else if (this.mode === 'time_attack') {
      targetDensity = Math.min(7, Math.max(5, 4 + Math.floor(this.currentWave * 0.5)));
    } else {
      // Medium / Survival / Missions
      targetDensity = Math.min(6, Math.max(3, 3 + Math.floor(this.currentWave * 0.4)));
    }

    // If battlefield is empty but more wave enemies remain, spawn next squad instantly!
    if (aliveEnemiesCount <= 0 && this.enemiesSpawned < this.totalEnemiesInWave) {
      this.spawnCooldown = Math.min(this.spawnCooldown, 0.15);
    }

    // Dynamic tactical squad spawning
    this.spawnCooldown -= delta;
    if (this.spawnCooldown <= 0 && this.enemiesSpawned < this.totalEnemiesInWave) {
      const needed = Math.max(1, targetDensity - aliveEnemiesCount);
      const remainingUnspawned = this.totalEnemiesInWave - this.enemiesSpawned;
      // Spawn tactical squads of 1 to 3 enemies
      const count = Math.min(needed, remainingUnspawned, 3);

      for (let i = 0; i < count; i++) {
        const nextType = this.getNextEnemyToSpawn();
        if (nextType) {
          onSpawnSquad(nextType);
        }
      }

      // Reinforcement interval: fast if field is underpopulated, steady otherwise
      const currentActive = aliveEnemiesCount + count;
      if (currentActive < targetDensity) {
        this.spawnCooldown = (this.mode === 'hard' || this.mode === 'time_attack') ? 0.5 : 0.8;
      } else {
        if (this.mode === 'easy') {
          this.spawnCooldown = 1.4;
        } else if (this.mode === 'hard') {
          this.spawnCooldown = 0.85;
        } else if (this.mode === 'time_attack') {
          this.spawnCooldown = 0.75;
        } else {
          this.spawnCooldown = 1.1;
        }
      }
    }

    return false;
  }
}

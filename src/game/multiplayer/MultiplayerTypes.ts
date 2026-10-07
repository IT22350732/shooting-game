import { ArenaId, WeaponId } from '../../types/game';

export type MultiplayerMode = 'multiplayer_tdm' | 'multiplayer_ffa' | 'multiplayer_coop';

export type TeamId = 'alpha' | 'bravo' | 'ffa';

export interface NetworkVector3 {
  x: number;
  y: number;
  z: number;
}

export interface NetworkPlayerState {
  id: string;
  peerId?: string;
  name: string;
  avatarId: string;
  team: TeamId;
  isHost: boolean;
  isReady: boolean;
  ping: number;
  kills: number;
  deaths: number;
  score: number;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  activeWeapon: WeaponId;
  isAlive: boolean;
  isBot?: boolean;
  voiceState?: {
    isSpeaking: boolean;
    isMuted: boolean;
    isDeafened: boolean;
  };
  // Position & Movement
  position: NetworkVector3;
  yaw: number;
  pitch: number;
  stance: 'stand' | 'crouch' | 'prone';
  velocity: NetworkVector3;
  isMoving: boolean;
  isFiring: boolean;
  timestamp: number;
}

export interface NetworkEnemyState {
  id: string;
  type: string;
  position: NetworkVector3;
  yaw: number;
  health: number;
  maxHealth: number;
  isDead: boolean;
  targetPlayerId?: string;
}

export interface RoomConfig {
  roomId: string;
  roomName: string;
  hostId: string;
  hostName: string;
  mode: MultiplayerMode;
  arena: ArenaId;
  scoreLimit: number;
  timeLimit: number; // in seconds
  maxPlayers: number;
  status: 'lobby' | 'starting' | 'in_game' | 'ended';
  teamAlphaScore: number;
  teamBravoScore: number;
  timeRemaining: number;
  enableBots?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  currentWave?: number;
}

export interface KillFeedEntry {
  id: string;
  killerId: string;
  killerName: string;
  killerTeam: TeamId;
  victimId: string;
  victimName: string;
  victimTeam: TeamId;
  weaponId: WeaponId;
  isHeadshot: boolean;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderTeam: TeamId;
  text: string;
  isQuickPing?: boolean;
  timestamp: number;
}

export type NetworkPacket =
  | { type: 'ROOM_STATE'; room: RoomConfig; players: NetworkPlayerState[] }
  | { type: 'PLAYER_JOIN'; player: NetworkPlayerState; roomId?: string }
  | { type: 'PLAYER_LEAVE'; playerId: string; roomId?: string }
  | { type: 'PLAYER_READY'; playerId: string; isReady: boolean }
  | { type: 'PLAYER_TEAM_SWITCH'; playerId: string; team: TeamId }
  | { type: 'ROOM_CONFIG_UPDATE'; config: Partial<RoomConfig> }
  | { type: 'MATCH_START_COUNTDOWN'; countdown: number }
  | { type: 'MATCH_START'; arena: ArenaId; mode: MultiplayerMode }
  | { type: 'PLAYER_SNAPSHOT'; state: NetworkPlayerState }
  | {
      type: 'PLAYER_SHOOT';
      shooterId: string;
      origin: NetworkVector3;
      direction: NetworkVector3;
      weaponId: WeaponId;
      isCrit?: boolean;
    }
  | {
      type: 'PLAYER_HIT';
      shooterId: string;
      targetId: string;
      damage: number;
      isHeadshot: boolean;
      hitPoint: NetworkVector3;
    }
  | {
      type: 'PLAYER_KILLED';
      killerId: string;
      victimId: string;
      weaponId: WeaponId;
      isHeadshot: boolean;
    }
  | {
      type: 'PLAYER_RESPAWN';
      playerId: string;
      position: NetworkVector3;
    }
  | {
      type: 'MULTIPLAYER_ENEMIES_SYNC';
      wave: number;
      enemies: NetworkEnemyState[];
    }
  | {
      type: 'MULTIPLAYER_ENEMY_HIT';
      shooterId: string;
      enemyId: string;
      damage: number;
      isHeadshot: boolean;
      hitPoint: NetworkVector3;
    }
  | {
      type: 'MULTIPLAYER_ENEMY_KILLED';
      enemyId: string;
      killerId: string;
      isHeadshot: boolean;
      rewardScore: number;
    }
  | {
      type: 'MULTIPLAYER_WAVE_COMPLETED';
      wave: number;
      rewardCoins: number;
    }
  | { type: 'CHAT'; message: ChatMessage }
  | { type: 'PING'; timestamp: number; senderId: string }
  | { type: 'PONG'; originalTimestamp: number; senderId: string }
  | {
      type: 'VOICE_STATE';
      playerId: string;
      isSpeaking: boolean;
      isMuted: boolean;
      isDeafened: boolean;
    }
  | {
      type: 'MATCH_END';
      winnerTeam: TeamId | 'draw';
      mvpPlayerId: string;
      finalScores: { [playerId: string]: { kills: number; deaths: number; score: number } };
    };

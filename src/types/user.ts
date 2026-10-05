import { SaveData } from '../game/managers/SaveManager';

export type UserTier = 'RECRUIT' | 'OPERATIVE' | 'SPECIALIST' | 'VETERAN' | 'ELITE' | 'APEX_LEGEND';

export interface UserAvatar {
  id: string;
  name: string;
  tag: string;
  color: string;
  accentColor: string;
  description: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  avatarId: string;
  avatarColor: string;
  tier: UserTier;
  createdAt: number;
  lastLoginAt: number;
  highScore: number;
  highestWave: number;
  totalKills: number;
  headshots: number;
  gamesPlayed: number;
  saveData: SaveData;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarId: string;
  avatarColor: string;
  tier: UserTier;
  highScore: number;
  highestWave: number;
  totalKills: number;
  headshots: number;
  gamesPlayed: number;
  isCurrentUser: boolean;
  isRival?: boolean;
  dateAchieved: number;
}

export type LeaderboardCategory = 'score' | 'wave' | 'kills';

export const AVATAR_OPTIONS: UserAvatar[] = [
  {
    id: 'soldier_apex',
    name: 'Apex Vanguard',
    tag: 'ASSAULT',
    color: '#0284c7',
    accentColor: '#38bdf8',
    description: 'Frontline cyber combat operative engineered for tactical precision.'
  },
  {
    id: 'ghost_infiltrator',
    name: 'Ghost Phantom',
    tag: 'STEALTH',
    color: '#10b981',
    accentColor: '#34d399',
    description: 'Special reconnaissance operative specialized in high-cadence ambushes.'
  },
  {
    id: 'valkyrie_sniper',
    name: 'Valkyrie Solar',
    tag: 'SNIPER',
    color: '#f59e0b',
    accentColor: '#fbbf24',
    description: 'Apex marksperson equipped with high-yield thermal optics.'
  },
  {
    id: 'cyber_titan',
    name: 'Titan Vanguard',
    tag: 'HEAVY',
    color: '#e11d48',
    accentColor: '#fb7185',
    description: 'Heavy kinetic shocktrooper engineered to absorb intense ballistic fire.'
  },
  {
    id: 'neon_recon',
    name: 'Neon Stryker',
    tag: 'SPEC-OPS',
    color: '#8b5cf6',
    accentColor: '#a78bfa',
    description: 'Electronic warfare operative skilled in high-speed maneuvers.'
  }
];

export function computeUserTier(score: number, kills: number): UserTier {
  if (score >= 20000 || kills >= 150) return 'APEX_LEGEND';
  if (score >= 12000 || kills >= 90) return 'ELITE';
  if (score >= 6500 || kills >= 50) return 'VETERAN';
  if (score >= 3000 || kills >= 25) return 'SPECIALIST';
  if (score >= 1000 || kills >= 10) return 'OPERATIVE';
  return 'RECRUIT';
}

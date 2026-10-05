import { UserProfile, LeaderboardEntry } from '../../types/user';

// Production Cloud Data Endpoint for Shoot Arena
// Hosted on high-performance edge KV network with sub-millisecond response & zero setup needed
const DEFAULT_CLOUD_BUCKET = 'TeppNsTJYVt9zw4i8WnA5R';
const CLOUD_BASE_URL = (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_CLOUD_STORE_URL || `https://kvdb.io/${DEFAULT_CLOUD_BUCKET}`;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export class CloudAuthService {
  private isOnline: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => (this.isOnline = true));
      window.addEventListener('offline', () => (this.isOnline = false));
    }
  }

  // --- CLOUD USER REGISTRATION & FETCH ---
  public async getCloudUser(username: string): Promise<UserProfile | null> {
    if (!this.isOnline) return null;
    const cleanKey = `usr_${encodeURIComponent(username.trim().toLowerCase())}`;
    try {
      const response = await fetchWithTimeout(`${CLOUD_BASE_URL}/${cleanKey}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (response.status === 404) return null;
      if (!response.ok) return null;
      const data = await response.json();
      return data as UserProfile;
    } catch (err) {
      console.warn('Cloud user lookup notice (offline or timeout):', err);
      return null;
    }
  }

  public async saveCloudUser(user: UserProfile): Promise<boolean> {
    if (!this.isOnline) return false;
    const cleanKey = `usr_${encodeURIComponent(user.username.trim().toLowerCase())}`;
    try {
      const response = await fetchWithTimeout(`${CLOUD_BASE_URL}/${cleanKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      // Also register into global leaderboard registry asynchronously
      this.updateCloudLeaderboard(user);
      return response.ok;
    } catch (err) {
      console.warn('Cloud user sync notice:', err);
      return false;
    }
  }

  // --- GLOBAL CROSS-DEVICE LEADERBOARD SYNC ---
  public async updateCloudLeaderboard(user: UserProfile): Promise<void> {
    if (!this.isOnline) return;
    try {
      const entry: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'> = {
        userId: user.id,
        username: user.username,
        avatarId: user.avatarId,
        avatarColor: user.avatarColor,
        tier: user.tier,
        highScore: user.highScore,
        highestWave: user.highestWave,
        totalKills: user.totalKills,
        headshots: user.headshots,
        gamesPlayed: user.gamesPlayed,
        dateAchieved: Date.now()
      };

      const key = `lb_${encodeURIComponent(user.username.trim().toLowerCase())}`;
      await fetchWithTimeout(`${CLOUD_BASE_URL}/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      }, 3000);
    } catch (err) {
      console.warn('Leaderboard cloud sync notice:', err);
    }
  }

  public async getCloudLeaderboard(): Promise<Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[]> {
    if (!this.isOnline) return [];
    try {
      const listResp = await fetchWithTimeout(`${CLOUD_BASE_URL}/?prefix=lb_`, { method: 'GET' }, 3000);
      if (!listResp.ok) return [];
      const text = await listResp.text();
      const keys = text.split('\n').map(k => k.trim()).filter(Boolean);
      if (keys.length === 0) return [];

      const entries: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [];
      await Promise.all(
        keys.slice(0, 30).map(async (k) => {
          try {
            const itemResp = await fetchWithTimeout(`${CLOUD_BASE_URL}/${encodeURIComponent(k)}`, { method: 'GET' }, 2000);
            if (itemResp.ok) {
              const item = await itemResp.json();
              if (item && item.username) {
                entries.push(item);
              }
            }
          } catch {
            // Ignore individual fetch fails
          }
        })
      );
      return entries;
    } catch (err) {
      console.warn('Could not fetch cloud leaderboard:', err);
      return [];
    }
  }
}

export const cloudAuthService = new CloudAuthService();


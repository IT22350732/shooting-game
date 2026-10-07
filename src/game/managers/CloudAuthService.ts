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
  private cachedCloudEntries: Map<string, Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>> = new Map();

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
      }, 3500);
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
      }, 4000);

      // Also register into global leaderboard registry asynchronously
      this.updateCloudLeaderboard(user);
      return response.ok;
    } catch (err) {
      console.warn('Cloud user sync notice:', err);
      return false;
    }
  }

  // --- GLOBAL REAL-TIME CROSS-DEVICE LEADERBOARD SYNC ---
  public async updateCloudLeaderboard(user: UserProfile): Promise<void> {
    if (!this.isOnline) return;
    try {
      const usernameLower = user.username.trim().toLowerCase();
      const existing = this.cachedCloudEntries.get(usernameLower);

      // Keep the best lifetime metrics so lower local sessions never regress cloud records
      const highScore = Math.max(existing?.highScore || 0, user.highScore || 0);
      const highestWave = Math.max(existing?.highestWave || 1, user.highestWave || 1);
      const totalKills = Math.max(existing?.totalKills || 0, user.totalKills || 0);
      const headshots = Math.max(existing?.headshots || 0, user.headshots || 0);
      const gamesPlayed = Math.max(existing?.gamesPlayed || 0, user.gamesPlayed || 0);

      const entry: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'> = {
        userId: user.id || existing?.userId || `usr_${Date.now()}`,
        username: user.username,
        avatarId: user.avatarId || existing?.avatarId || 'soldier_apex',
        avatarColor: user.avatarColor || existing?.avatarColor || '#0284c7',
        tier: user.tier || existing?.tier || 'RECRUIT',
        highScore,
        highestWave,
        totalKills,
        headshots,
        gamesPlayed,
        dateAchieved: Date.now()
      };

      this.cachedCloudEntries.set(usernameLower, entry);

      const key = `lb_${encodeURIComponent(usernameLower)}`;
      await fetchWithTimeout(`${CLOUD_BASE_URL}/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      }, 4000);
    } catch (err) {
      console.warn('Leaderboard cloud sync notice:', err);
    }
  }

  public async getCloudLeaderboard(): Promise<Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[]> {
    if (!this.isOnline) {
      return Array.from(this.cachedCloudEntries.values());
    }

    // 1. High-speed single-request batch fetch with JSON format (sub-200ms)
    try {
      const batchUrl = `${CLOUD_BASE_URL}/?prefix=lb_&values=true&format=json&limit=100`;
      const batchResp = await fetchWithTimeout(batchUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }, 4500);

      if (batchResp.ok) {
        const raw = await batchResp.json();
        if (Array.isArray(raw) && raw.length > 0) {
          const entries: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [];
          for (const item of raw) {
            let val = null;
            if (Array.isArray(item) && item.length >= 2) {
              val = item[1];
            } else if (item && typeof item === 'object') {
              val = item;
            }
            if (typeof val === 'string') {
              try { val = JSON.parse(val); } catch {}
            }
            if (val && typeof val === 'object' && val.username) {
              entries.push(val);
              this.cachedCloudEntries.set(val.username.trim().toLowerCase(), val);
            }
          }
          if (entries.length > 0) {
            return entries;
          }
        }
      }
    } catch (batchErr) {
      console.warn('Primary batch leaderboard fetch failed, trying text fallback:', batchErr);
    }

    // 2. Fallback: single-request line-by-line text values (key=value)
    try {
      const textUrl = `${CLOUD_BASE_URL}/?prefix=lb_&values=true&limit=100`;
      const textResp = await fetchWithTimeout(textUrl, { method: 'GET' }, 4500);
      if (textResp.ok) {
        const text = await textResp.text();
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const entries: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [];

        for (const line of lines) {
          const eqIdx = line.indexOf('=');
          if (eqIdx !== -1) {
            const jsonPart = line.substring(eqIdx + 1).trim();
            if (jsonPart) {
              try {
                const parsed = JSON.parse(jsonPart);
                if (parsed && parsed.username) {
                  entries.push(parsed);
                  this.cachedCloudEntries.set(parsed.username.trim().toLowerCase(), parsed);
                }
              } catch {}
            }
          }
        }
        if (entries.length > 0) {
          return entries;
        }
      }
    } catch (textErr) {
      console.warn('Text fallback leaderboard fetch failed:', textErr);
    }

    // 3. Fallback: key listing + individual key fetch if server does not support values=true
    try {
      const listResp = await fetchWithTimeout(`${CLOUD_BASE_URL}/?prefix=lb_&limit=100`, { method: 'GET' }, 4000);
      if (listResp.ok) {
        const text = await listResp.text();
        const keys = text.split('\n').map(k => k.trim()).filter(Boolean);
        if (keys.length > 0) {
          const entries: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [];
          await Promise.all(
            keys.slice(0, 50).map(async (k) => {
              try {
                const itemResp = await fetchWithTimeout(`${CLOUD_BASE_URL}/${encodeURIComponent(k)}`, { method: 'GET' }, 3000);
                if (itemResp.ok) {
                  const item = await itemResp.json();
                  if (item && item.username) {
                    entries.push(item);
                    this.cachedCloudEntries.set(item.username.trim().toLowerCase(), item);
                  }
                }
              } catch {}
            })
          );
          if (entries.length > 0) {
            return entries;
          }
        }
      }
    } catch (listErr) {
      console.warn('Key-list fallback leaderboard fetch failed:', listErr);
    }

    return Array.from(this.cachedCloudEntries.values());
  }
}

export const cloudAuthService = new CloudAuthService();


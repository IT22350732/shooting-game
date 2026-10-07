import { UserProfile, LeaderboardEntry, LeaderboardCategory, computeUserTier, AVATAR_OPTIONS } from '../../types/user';
import { SaveData, saveManager } from './SaveManager';
import { cloudAuthService } from './CloudAuthService';

const USERS_STORAGE_KEY = 'CYBERSTRIKE_USERS_V2';
const ACTIVE_USER_ID_KEY = 'CYBERSTRIKE_ACTIVE_USER_ID_V2';
const CLOUD_CACHE_KEY = 'CYBERSTRIKE_CLOUD_LEADERBOARD_V2';

type LeaderboardListener = (entries: LeaderboardEntry[]) => void;

// Simple, fast client-side string hasher
function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'CYBER_' + Math.abs(hash).toString(16) + '_' + input.length;
}

export class UserManager {
  private users: Map<string, UserProfile> = new Map();
  private currentUserId: string = '';

  private cloudEntries: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [];
  private leaderboardListeners: Set<LeaderboardListener> = new Set();

  constructor() {
    this.loadFromStorage();
    saveManager.setOnSaveCallback((data) => this.syncCurrentUserData(data));
    this.refreshCloudLeaderboard();
  }

  public onLeaderboardChange(cb: LeaderboardListener): () => void {
    this.leaderboardListeners.add(cb);
    return () => this.leaderboardListeners.delete(cb);
  }

  public notifyLeaderboardChange() {
    const entries = this.getLeaderboard('score');
    this.leaderboardListeners.forEach(cb => {
      try { cb(entries); } catch (e) { console.error('Leaderboard listener error:', e); }
    });
  }

  public async refreshCloudLeaderboard(): Promise<Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[]> {
    try {
      const entries = await cloudAuthService.getCloudLeaderboard();
      if (entries && entries.length > 0) {
        this.cloudEntries = entries;
        try {
          localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(entries));
        } catch {}

        // If the current user has higher stats in cloud than locally, sync local user up
        const current = this.getCurrentUser();
        const cloudUserMatch = entries.find(e => e.username.toLowerCase() === current.username.toLowerCase());
        if (cloudUserMatch) {
          let modified = false;
          if (cloudUserMatch.highScore > current.highScore) {
            current.highScore = cloudUserMatch.highScore;
            modified = true;
          }
          if (cloudUserMatch.highestWave > current.highestWave) {
            current.highestWave = cloudUserMatch.highestWave;
            modified = true;
          }
          if (cloudUserMatch.totalKills > current.totalKills) {
            current.totalKills = cloudUserMatch.totalKills;
            modified = true;
          }
          if (cloudUserMatch.headshots > current.headshots) {
            current.headshots = cloudUserMatch.headshots;
            modified = true;
          }
          if (cloudUserMatch.gamesPlayed > current.gamesPlayed) {
            current.gamesPlayed = cloudUserMatch.gamesPlayed;
            modified = true;
          }
          if (modified) {
            current.tier = computeUserTier(current.highScore, current.totalKills);
            this.saveToStorage();
          }
        }

        this.notifyLeaderboardChange();
        return entries;
      }
    } catch (err) {
      console.warn('Leaderboard refresh error:', err);
    }
    return this.cloudEntries;
  }

  private loadFromStorage() {
    try {
      // Load cached cloud leaderboard entries for immediate sub-millisecond render
      const cachedCloud = localStorage.getItem(CLOUD_CACHE_KEY);
      if (cachedCloud) {
        const parsed: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = JSON.parse(cachedCloud);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cloudEntries = parsed;
        }
      }

      const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (rawUsers) {
        const parsed: UserProfile[] = JSON.parse(rawUsers);
        parsed.forEach(u => this.users.set(u.id, u));
      }

      const activeId = localStorage.getItem(ACTIVE_USER_ID_KEY);
      if (activeId && this.users.has(activeId)) {
        this.currentUserId = activeId;
      }
    } catch (err) {
      console.warn('Failed to load user accounts:', err);
    }

    // If no users exist, migrate or initialize default operative
    if (this.users.size === 0) {
      const initialSave = saveManager.getData();
      const defaultUser: UserProfile = {
        id: 'usr_default_01',
        username: 'Operative-01',
        displayName: 'Operative-01',
        passwordHash: hashString('1234'),
        avatarId: 'soldier_apex',
        avatarColor: '#0284c7',
        tier: computeUserTier(initialSave.highestScore, initialSave.stats.totalKills),
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
        highScore: initialSave.highestScore,
        highestWave: initialSave.highestWave,
        totalKills: initialSave.stats.totalKills,
        headshots: initialSave.stats.headshots,
        gamesPlayed: initialSave.stats.gamesPlayed,
        saveData: initialSave
      };

      this.users.set(defaultUser.id, defaultUser);
      this.currentUserId = defaultUser.id;
      this.saveToStorage();
    } else if (!this.currentUserId || !this.users.has(this.currentUserId)) {
      this.currentUserId = Array.from(this.users.keys())[0];
      this.saveToStorage();
    }
  }

  private saveToStorage() {
    try {
      const usersList = Array.from(this.users.values());
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
      if (this.currentUserId) {
        localStorage.setItem(ACTIVE_USER_ID_KEY, this.currentUserId);
      }
    } catch (err) {
      console.warn('Failed to save user accounts to localStorage:', err);
    }
  }

  public getCurrentUser(): UserProfile {
    const user = this.users.get(this.currentUserId);
    if (!user) {
      return Array.from(this.users.values())[0];
    }
    return user;
  }

  public getAllUsers(): UserProfile[] {
    return Array.from(this.users.values()).sort((a, b) => b.lastLoginAt - a.lastLoginAt);
  }

  public async register(
    username: string,
    password: string,
    avatarId: string = 'soldier_apex',
    avatarColor?: string
  ): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 16) {
      return { success: false, message: 'Username must be 3-16 characters long.' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return { success: false, message: 'Username may only contain letters, numbers, and dashes.' };
    }

    if (password.length < 3) {
      return { success: false, message: 'PIN/Password must be at least 3 characters.' };
    }

    // Check if username already exists locally
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === trimmed.toLowerCase()) {
        return { success: false, message: `Operative "${trimmed}" already exists on this device.` };
      }
    }

    // Check if username already exists in cloud
    try {
      const existingCloudUser = await cloudAuthService.getCloudUser(trimmed);
      if (existingCloudUser) {
        return {
          success: false,
          message: `Operative "${trimmed}" already exists on the cloud network. Please switch to LOGIN.`
        };
      }
    } catch {
      // Offline fallback: continue
    }

    const selectedAvatar = AVATAR_OPTIONS.find(a => a.id === avatarId) || AVATAR_OPTIONS[0];
    const color = avatarColor || selectedAvatar.color;

    const newUser: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: trimmed,
      displayName: trimmed,
      passwordHash: hashString(password),
      avatarId: selectedAvatar.id,
      avatarColor: color,
      tier: 'RECRUIT',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      highScore: 0,
      highestWave: 1,
      totalKills: 0,
      headshots: 0,
      gamesPlayed: 0,
      saveData: JSON.parse(JSON.stringify(saveManager.getDefaultSaveData()))
    };

    this.users.set(newUser.id, newUser);
    this.currentUserId = newUser.id;
    this.saveToStorage();

    // Sync save manager with new user's fresh save
    saveManager.loadFromUserData(newUser.saveData);

    // Save to global cloud KV store so it is immediately accessible from phone / other devices
    cloudAuthService.saveCloudUser(newUser).catch(err => console.warn('Cloud sync error on register:', err));

    return {
      success: true,
      message: `Operative "${trimmed}" registered & cloud-synced!`,
      user: newUser
    };
  }

  public async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    const trimmed = username.trim().toLowerCase();
    const inputHash = hashString(password);
    let targetUser: UserProfile | null = null;

    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === trimmed) {
        targetUser = u;
        break;
      }
    }

    // Found locally in this browser
    if (targetUser) {
      if (targetUser.passwordHash === inputHash) {
        targetUser.lastLoginAt = Date.now();
        this.currentUserId = targetUser.id;
        this.saveToStorage();

        // Load target user's save data into the active save manager
        saveManager.loadFromUserData(targetUser.saveData);

        // Keep cloud backup updated in background
        cloudAuthService.saveCloudUser(targetUser).catch(() => {});
        this.notifyLeaderboardChange();
        this.refreshCloudLeaderboard().catch(() => {});

        return {
          success: true,
          message: `Welcome back, ${targetUser.username}!`,
          user: targetUser
        };
      }

      // Password mismatch locally: check cloud in case user updated credentials on another device
      try {
        const cloudUser = await cloudAuthService.getCloudUser(trimmed);
        if (cloudUser && cloudUser.passwordHash === inputHash) {
          this.users.set(cloudUser.id, cloudUser);
          this.currentUserId = cloudUser.id;
          this.saveToStorage();
          saveManager.loadFromUserData(cloudUser.saveData);
          this.notifyLeaderboardChange();
          this.refreshCloudLeaderboard().catch(() => {});
          return {
            success: true,
            message: `Cloud credentials verified! Welcome back, ${cloudUser.username}!`,
            user: cloudUser
          };
        }
      } catch {}

      return { success: false, message: 'Incorrect PIN or Password.' };
    }

    // Operative NOT found locally on this device (e.g. registered on MacBook, logging in on Phone!)
    try {
      const cloudUser = await cloudAuthService.getCloudUser(trimmed);
      if (!cloudUser) {
        return { success: false, message: `Operative "${username.trim()}" not found locally or in cloud registry.` };
      }

      if (cloudUser.passwordHash !== inputHash) {
        return { success: false, message: 'Incorrect PIN or Password for cloud operative.' };
      }

      // Successful cloud verification & cross-device download!
      cloudUser.lastLoginAt = Date.now();
      this.users.set(cloudUser.id, cloudUser);
      this.currentUserId = cloudUser.id;
      this.saveToStorage();
      saveManager.loadFromUserData(cloudUser.saveData);
      this.notifyLeaderboardChange();
      this.refreshCloudLeaderboard().catch(() => {});

      return {
        success: true,
        message: `Cloud profile synchronized to this device! Welcome, ${cloudUser.username}!`,
        user: cloudUser
      };
    } catch (err) {
      return {
        success: false,
        message: 'Could not connect to cloud registry. Please verify connection or use Operative Key.'
      };
    }
  }

  public switchUser(userId: string): boolean {
    const target = this.users.get(userId);
    if (!target) return false;

    target.lastLoginAt = Date.now();
    this.currentUserId = target.id;
    this.saveToStorage();

    saveManager.loadFromUserData(target.saveData);
    this.notifyLeaderboardChange();
    this.refreshCloudLeaderboard().catch(() => {});
    return true;
  }

  public deleteUser(userId: string): { success: boolean; message: string } {
    if (this.users.size <= 1) {
      return { success: false, message: 'Cannot delete the only registered operative.' };
    }

    if (!this.users.has(userId)) {
      return { success: false, message: 'User not found.' };
    }

    this.users.delete(userId);
    if (this.currentUserId === userId) {
      this.currentUserId = Array.from(this.users.keys())[0];
      const nextUser = this.users.get(this.currentUserId)!;
      saveManager.loadFromUserData(nextUser.saveData);
    }

    this.saveToStorage();
    return { success: true, message: 'Operative profile deleted.' };
  }

  public syncCurrentUserData(saveData: SaveData) {
    const current = this.users.get(this.currentUserId);
    if (!current) return;

    current.saveData = JSON.parse(JSON.stringify(saveData));
    current.highScore = Math.max(current.highScore, saveData.highestScore);
    current.highestWave = Math.max(current.highestWave, saveData.highestWave);
    current.totalKills = saveData.stats.totalKills;
    current.headshots = saveData.stats.headshots;
    current.gamesPlayed = saveData.stats.gamesPlayed;
    current.tier = computeUserTier(current.highScore, current.totalKills);

    this.saveToStorage();

    // Sync to cloud network in background
    cloudAuthService.saveCloudUser(current).catch(() => {});
  }

  public recordGameResult(
    score: number,
    wave: number,
    kills: number,
    headshots: number
  ): {
    rank: number;
    isNewHighScore: boolean;
    previousRank: number;
    previousScore: number;
    newScore: number;
  } {
    const current = this.getCurrentUser();
    const previousScore = current.highScore;
    const isNewHighScore = score > previousScore;

    // Determine previous rank before update
    const previousLeaderboard = this.getLeaderboard('score');
    const prevRankEntry = previousLeaderboard.find(
      e => e.isCurrentUser || e.username.toLowerCase() === current.username.toLowerCase() || e.userId === current.id
    );
    const previousRank = prevRankEntry ? prevRankEntry.rank : previousLeaderboard.length;

    // Apply updates
    current.gamesPlayed++;
    current.totalKills += kills;
    current.headshots += headshots;

    if (score > current.highScore) {
      current.highScore = score;
    }
    if (wave > current.highestWave) {
      current.highestWave = wave;
    }
    current.tier = computeUserTier(current.highScore, current.totalKills);
    current.lastLoginAt = Date.now();

    this.saveToStorage();

    // Immediately update local cloudEntries cache so ranking is instant and accurate
    const currentKey = current.username.trim().toLowerCase();
    const cloudIdx = this.cloudEntries.findIndex(e => e.username.trim().toLowerCase() === currentKey);
    const updatedCloudItem: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'> = {
      userId: current.id,
      username: current.username,
      avatarId: current.avatarId,
      avatarColor: current.avatarColor,
      tier: current.tier,
      highScore: current.highScore,
      highestWave: current.highestWave,
      totalKills: current.totalKills,
      headshots: current.headshots,
      gamesPlayed: current.gamesPlayed,
      dateAchieved: Date.now()
    };

    if (cloudIdx !== -1) {
      this.cloudEntries[cloudIdx] = updatedCloudItem;
    } else {
      this.cloudEntries.push(updatedCloudItem);
    }
    try {
      localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(this.cloudEntries));
    } catch {}

    // Push high score update to cloud edge store in background
    cloudAuthService.saveCloudUser(current).catch(() => {});
    cloudAuthService.updateCloudLeaderboard(current).catch(() => {});

    // Determine new rank
    const newLeaderboard = this.getLeaderboard('score');
    const newRankEntry = newLeaderboard.find(
      e => e.isCurrentUser || e.username.toLowerCase() === current.username.toLowerCase() || e.userId === current.id
    );
    const rank = newRankEntry ? newRankEntry.rank : 1;

    this.notifyLeaderboardChange();

    return {
      rank,
      isNewHighScore,
      previousRank,
      previousScore,
      newScore: current.highScore
    };
  }

  // --- ONE-CLICK OPERATIVE KEY EXPORT / IMPORT ---
  public exportAccountKey(): string {
    const current = this.getCurrentUser();
    const payload = {
      u: current.username,
      h: current.passwordHash,
      a: current.avatarId,
      c: current.avatarColor,
      s: current.saveData,
      hs: current.highScore,
      hw: current.highestWave,
      tk: current.totalKills,
      hs_cnt: current.headshots,
      gp: current.gamesPlayed
    };
    try {
      const jsonStr = JSON.stringify(payload);
      return 'CYBER_KEY_' + btoa(encodeURIComponent(jsonStr));
    } catch (err) {
      console.error('Failed to export key:', err);
      return '';
    }
  }

  public importAccountKey(rawKey: string): { success: boolean; message: string; user?: UserProfile } {
    const clean = rawKey.trim();
    if (!clean.startsWith('CYBER_KEY_')) {
      return { success: false, message: 'Invalid Operative Key format. Must start with CYBER_KEY_' };
    }
    try {
      const base64 = clean.replace('CYBER_KEY_', '');
      const jsonStr = decodeURIComponent(atob(base64));
      const p = JSON.parse(jsonStr);

      if (!p.u || !p.h) {
        return { success: false, message: 'Corrupted Operative Key data.' };
      }

      // Check if operative already exists locally
      let user = Array.from(this.users.values()).find(u => u.username.toLowerCase() === p.u.toLowerCase());
      if (!user) {
        user = {
          id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          username: p.u,
          displayName: p.u,
          passwordHash: p.h,
          avatarId: p.a || 'soldier_apex',
          avatarColor: p.c || '#0284c7',
          tier: computeUserTier(p.hs || 0, p.tk || 0),
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          highScore: p.hs || 0,
          highestWave: p.hw || 1,
          totalKills: p.tk || 0,
          headshots: p.hs_cnt || 0,
          gamesPlayed: p.gp || 0,
          saveData: p.s || JSON.parse(JSON.stringify(saveManager.getDefaultSaveData()))
        };
        this.users.set(user.id, user);
      } else {
        user.passwordHash = p.h;
        user.highScore = Math.max(user.highScore, p.hs || 0);
        user.highestWave = Math.max(user.highestWave, p.hw || 1);
        user.totalKills = Math.max(user.totalKills, p.tk || 0);
        user.saveData = p.s || user.saveData;
      }

      this.currentUserId = user.id;
      this.saveToStorage();
      saveManager.loadFromUserData(user.saveData);
      cloudAuthService.saveCloudUser(user).catch(() => {});

      return { success: true, message: `Operative "${user.username}" imported successfully!`, user };
    } catch (err) {
      return { success: false, message: 'Failed to decode operative key: ' + (err as Error).message };
    }
  }

  public getLeaderboard(category: LeaderboardCategory = 'score'): LeaderboardEntry[] {
    const current = this.getCurrentUser();
    const entryMap = new Map<string, LeaderboardEntry>();

    // 1. Populate map with real cloud operatives across all deployed devices
    for (const cr of this.cloudEntries) {
      const uLower = cr.username.trim().toLowerCase();
      if (!uLower) continue;
      const isCurrent = (uLower === current.username.trim().toLowerCase() || cr.userId === current.id);
      entryMap.set(uLower, {
        rank: 0,
        userId: cr.userId,
        username: cr.username,
        avatarId: cr.avatarId || 'soldier_apex',
        avatarColor: cr.avatarColor || '#0284c7',
        tier: cr.tier || 'RECRUIT',
        highScore: cr.highScore || 0,
        highestWave: cr.highestWave || 1,
        totalKills: cr.totalKills || 0,
        headshots: cr.headshots || 0,
        gamesPlayed: cr.gamesPlayed || 0,
        isCurrentUser: isCurrent,
        isRival: false,
        dateAchieved: cr.dateAchieved || Date.now()
      });
    }

    // 2. Merge local accounts, preserving the highest metrics achieved across local & cloud
    for (const u of this.users.values()) {
      const uLower = u.username.trim().toLowerCase();
      if (!uLower) continue;
      const isCurrent = (u.id === current.id || uLower === current.username.trim().toLowerCase());
      const existing = entryMap.get(uLower);

      if (existing) {
        existing.highScore = Math.max(existing.highScore, u.highScore || 0);
        existing.highestWave = Math.max(existing.highestWave, u.highestWave || 1);
        existing.totalKills = Math.max(existing.totalKills, u.totalKills || 0);
        existing.headshots = Math.max(existing.headshots, u.headshots || 0);
        existing.gamesPlayed = Math.max(existing.gamesPlayed, u.gamesPlayed || 0);
        existing.tier = computeUserTier(existing.highScore, existing.totalKills);
        if (isCurrent) {
          existing.isCurrentUser = true;
          // Synchronize local profile if cloud had recorded a higher achievement
          if (existing.highScore > u.highScore || existing.highestWave > u.highestWave) {
            u.highScore = existing.highScore;
            u.highestWave = existing.highestWave;
            u.totalKills = existing.totalKills;
            u.headshots = existing.headshots;
            u.tier = existing.tier;
            this.saveToStorage();
          }
        }
      } else {
        // Only include local account if it has real game activity or is the active player
        if (isCurrent || (u.highScore || 0) > 0 || (u.totalKills || 0) > 0) {
          entryMap.set(uLower, {
            rank: 0,
            userId: u.id,
            username: u.username,
            avatarId: u.avatarId || 'soldier_apex',
            avatarColor: u.avatarColor || '#0284c7',
            tier: u.tier || 'RECRUIT',
            highScore: u.highScore || 0,
            highestWave: u.highestWave || 1,
            totalKills: u.totalKills || 0,
            headshots: u.headshots || 0,
            gamesPlayed: u.gamesPlayed || 0,
            isCurrentUser: isCurrent,
            isRival: false,
            dateAchieved: u.lastLoginAt || Date.now()
          });
        }
      }
    }

    // 3. Ensure the current active player is ALWAYS on the board
    const currentKey = current.username.trim().toLowerCase();
    if (!entryMap.has(currentKey)) {
      entryMap.set(currentKey, {
        rank: 0,
        userId: current.id,
        username: current.username,
        avatarId: current.avatarId,
        avatarColor: current.avatarColor,
        tier: current.tier,
        highScore: current.highScore,
        highestWave: current.highestWave,
        totalKills: current.totalKills,
        headshots: current.headshots,
        gamesPlayed: current.gamesPlayed,
        isCurrentUser: true,
        isRival: false,
        dateAchieved: current.lastLoginAt || Date.now()
      });
    }

    const entries = Array.from(entryMap.values());

    // 4. Sort by chosen category with deterministic tie-breaking
    entries.sort((a, b) => {
      if (category === 'score') {
        if (b.highScore !== a.highScore) return b.highScore - a.highScore;
        if (b.highestWave !== a.highestWave) return b.highestWave - a.highestWave;
        if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
        return (b.dateAchieved || 0) - (a.dateAchieved || 0);
      }
      if (category === 'wave') {
        if (b.highestWave !== a.highestWave) return b.highestWave - a.highestWave;
        if (b.highScore !== a.highScore) return b.highScore - a.highScore;
        if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
        return (b.dateAchieved || 0) - (a.dateAchieved || 0);
      }
      // 'kills'
      if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
      if (b.highScore !== a.highScore) return b.highScore - a.highScore;
      if (b.highestWave !== a.highestWave) return b.highestWave - a.highestWave;
      return (b.dateAchieved || 0) - (a.dateAchieved || 0);
    });

    // 5. Assign 1-indexed ranks
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    // 6. Designate direct rival (the operative immediately 1 position ahead of the current user)
    const currentIdx = entries.findIndex(e => e.isCurrentUser);
    if (currentIdx > 0) {
      entries[currentIdx - 1].isRival = true;
    }

    return entries;
  }
}

export const userManager = new UserManager();

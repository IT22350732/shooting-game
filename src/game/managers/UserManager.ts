import { UserProfile, LeaderboardEntry, LeaderboardCategory, computeUserTier, AVATAR_OPTIONS } from '../../types/user';
import { SaveData, saveManager } from './SaveManager';
import { cloudAuthService } from './CloudAuthService';

const USERS_STORAGE_KEY = 'CYBERSTRIKE_USERS_V2';
const ACTIVE_USER_ID_KEY = 'CYBERSTRIKE_ACTIVE_USER_ID_V2';

// Built-in rival operatives to create a competitive, active leaderboard ladder
const INITIAL_RIVALS: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [
  {
    userId: 'rival_1',
    username: 'Kaelen_Apex',
    avatarId: 'soldier_apex',
    avatarColor: '#0284c7',
    tier: 'APEX_LEGEND',
    highScore: 24850,
    highestWave: 18,
    totalKills: 184,
    headshots: 62,
    gamesPlayed: 54,
    isRival: true,
    dateAchieved: Date.now() - 86400000 * 2
  },
  {
    userId: 'rival_2',
    username: 'Viper-9',
    avatarId: 'ghost_infiltrator',
    avatarColor: '#10b981',
    tier: 'APEX_LEGEND',
    highScore: 19420,
    highestWave: 15,
    totalKills: 142,
    headshots: 48,
    gamesPlayed: 41,
    isRival: true,
    dateAchieved: Date.now() - 86400000 * 3
  },
  {
    userId: 'rival_3',
    username: 'ShadowSniper',
    avatarId: 'valkyrie_sniper',
    avatarColor: '#f59e0b',
    tier: 'ELITE',
    highScore: 14800,
    highestWave: 12,
    totalKills: 108,
    headshots: 55,
    gamesPlayed: 32,
    isRival: true,
    dateAchieved: Date.now() - 86400000 * 5
  },
  {
    userId: 'rival_4',
    username: 'CyberValkyrie',
    avatarId: 'neon_recon',
    avatarColor: '#8b5cf6',
    tier: 'ELITE',
    highScore: 11250,
    highestWave: 10,
    totalKills: 89,
    headshots: 31,
    gamesPlayed: 25,
    isRival: true,
    dateAchieved: Date.now() - 86400000 * 6
  },
  {
    userId: 'rival_5',
    username: 'TitanPulse',
    avatarId: 'cyber_titan',
    avatarColor: '#e11d48',
    tier: 'VETERAN',
    highScore: 8400,
    highestWave: 8,
    totalKills: 67,
    headshots: 18,
    gamesPlayed: 19,
    isRival: true,
    dateAchieved: Date.now() - 86400000 * 8
  },
  {
    userId: 'rival_6',
    username: 'NeoGhost',
    avatarId: 'ghost_infiltrator',
    avatarColor: '#10b981',
    tier: 'VETERAN',
    highScore: 5900,
    highestWave: 6,
    totalKills: 45,
    headshots: 14,
    gamesPlayed: 15,
    isRival: true,
    dateAchieved: Date.now() - 86400000 * 10
  },
  {
    userId: 'rival_7',
    username: 'ReconEcho',
    avatarId: 'neon_recon',
    avatarColor: '#8b5cf6',
    tier: 'SPECIALIST',
    highScore: 3250,
    highestWave: 4,
    totalKills: 28,
    headshots: 9,
    gamesPlayed: 11,
    isRival: true,
    dateAchieved: Date.now() - 86400000 * 12
  },
  {
    userId: 'rival_8',
    username: 'NovaRookie',
    avatarId: 'soldier_apex',
    avatarColor: '#0284c7',
    tier: 'OPERATIVE',
    highScore: 1450,
    highestWave: 2,
    totalKills: 14,
    headshots: 4,
    gamesPlayed: 6,
    isRival: true,
    dateAchieved: Date.now() - 86400000 * 15
  }
];

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

  private cloudRivals: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [];

  constructor() {
    this.loadFromStorage();
    saveManager.setOnSaveCallback((data) => this.syncCurrentUserData(data));
    this.refreshCloudLeaderboard();
  }

  public async refreshCloudLeaderboard(): Promise<void> {
    try {
      const entries = await cloudAuthService.getCloudLeaderboard();
      if (entries && entries.length > 0) {
        this.cloudRivals = entries;
      }
    } catch {}
  }

  private loadFromStorage() {
    try {
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
    const prevRankEntry = previousLeaderboard.find(e => e.userId === current.id);
    const previousRank = prevRankEntry ? prevRankEntry.rank : previousLeaderboard.length + 1;

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

    this.saveToStorage();

    // Push high score update to cloud edge store
    cloudAuthService.saveCloudUser(current).catch(() => {});

    // Determine new rank
    const newLeaderboard = this.getLeaderboard('score');
    const newRankEntry = newLeaderboard.find(e => e.userId === current.id);
    const rank = newRankEntry ? newRankEntry.rank : 1;

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
    const entries: LeaderboardEntry[] = [];
    const seenUsernames = new Set<string>();

    // 1. Add all registered users
    for (const u of this.users.values()) {
      entries.push({
        rank: 0,
        userId: u.id,
        username: u.username,
        avatarId: u.avatarId,
        avatarColor: u.avatarColor,
        tier: u.tier,
        highScore: u.highScore,
        highestWave: u.highestWave,
        totalKills: u.totalKills,
        headshots: u.headshots,
        gamesPlayed: u.gamesPlayed,
        isCurrentUser: u.id === current.id,
        isRival: false,
        dateAchieved: u.lastLoginAt
      });
      seenUsernames.add(u.username.toLowerCase());
    }

    // 2. Add real players from cloud sync
    for (const cr of this.cloudRivals) {
      if (!seenUsernames.has(cr.username.toLowerCase())) {
        entries.push({
          ...cr,
          rank: 0,
          isCurrentUser: false,
          isRival: false
        });
        seenUsernames.add(cr.username.toLowerCase());
      }
    }

    // 3. Add rivals (skipping any if user or cloud took same username)
    for (const r of INITIAL_RIVALS) {
      if (!seenUsernames.has(r.username.toLowerCase())) {
        entries.push({
          ...r,
          rank: 0,
          isCurrentUser: false
        });
        seenUsernames.add(r.username.toLowerCase());
      }
    }

    // 4. Sort by chosen category
    entries.sort((a, b) => {
      if (category === 'score') {
        if (b.highScore !== a.highScore) return b.highScore - a.highScore;
        return b.highestWave - a.highestWave;
      }
      if (category === 'wave') {
        if (b.highestWave !== a.highestWave) return b.highestWave - a.highestWave;
        return b.highScore - a.highScore;
      }
      // 'kills'
      if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
      return b.highScore - a.highScore;
    });

    // 5. Assign 1-indexed ranks
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return entries;
  }
}

export const userManager = new UserManager();

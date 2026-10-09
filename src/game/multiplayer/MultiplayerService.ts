import { Peer, DataConnection } from 'peerjs';
import {
  NetworkPacket,
  NetworkPlayerState,
  NetworkEnemyState,
  RoomConfig,
  MultiplayerMode,
  TeamId,
  ChatMessage,
  KillFeedEntry
} from './MultiplayerTypes';
import { ArenaId, WeaponId } from '../../types/game';
import { userManager } from '../managers/UserManager';

export interface MultiplayerServiceEvents {
  onRoomUpdate?: (room: RoomConfig, players: NetworkPlayerState[]) => void;
  onPlayerJoined?: (player: NetworkPlayerState) => void;
  onPlayerLeft?: (playerId: string) => void;
  onMatchCountdown?: (countdown: number) => void;
  onMatchStart?: (arena: ArenaId, mode: MultiplayerMode) => void;
  onRemotePlayerSnapshot?: (state: NetworkPlayerState) => void;
  onRemotePlayerShoot?: (
    shooterId: string,
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    weaponId: WeaponId
  ) => void;
  onRemotePlayerHit?: (
    shooterId: string,
    targetId: string,
    damage: number,
    isHeadshot: boolean,
    hitPoint: { x: number; y: number; z: number }
  ) => void;
  onKillFeed?: (entry: KillFeedEntry) => void;
  onRemotePlayerRespawn?: (playerId: string, position: { x: number; y: number; z: number }) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onMatchEnd?: (winnerTeam: TeamId | 'draw', mvpId: string, finalScores: Record<string, { kills: number; deaths: number; score: number }>) => void;
  onConnectionStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'error', message?: string) => void;
  onPingUpdate?: (ping: number) => void;
  onVoiceStateUpdate?: (playerId: string, voiceState: { isSpeaking: boolean; isMuted: boolean; isDeafened: boolean }) => void;
  onEnemiesSync?: (wave: number, enemies: NetworkEnemyState[]) => void;
  onEnemyHit?: (shooterId: string, enemyId: string, damage: number, isHeadshot: boolean, hitPoint: { x: number; y: number; z: number }) => void;
  onEnemyKilled?: (enemyId: string, killerId: string, isHeadshot: boolean, rewardScore: number) => void;
  onWaveCompleted?: (wave: number, rewardCoins: number) => void;
  onDoorToggle?: (doorId: string, isOpen: boolean) => void;
}

const PEER_PREFIX = 'shoot-arena-v1-';

export class MultiplayerService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  public wsConnected: boolean = false;

  public isHost: boolean = false;
  public localPlayerId: string = '';
  public localPlayer: NetworkPlayerState | null = null;
  public room: RoomConfig | null = null;
  public players: Map<string, NetworkPlayerState> = new Map();

  private events: MultiplayerServiceEvents = {};
  private listeners: Set<Partial<MultiplayerServiceEvents>> = new Set();
  private pingInterval: number | null = null;
  private matchTimerInterval: number | null = null;
  private isDestroyed: boolean = false;
  public currentPing: number = 20;

  constructor() {
    this.localPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);
  }

  public getPeer(): Peer | null {
    return this.peer;
  }

  public setEvents(events: MultiplayerServiceEvents) {
    this.events = { ...this.events, ...events };
  }

  public addListener(listener: Partial<MultiplayerServiceEvents>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private trigger<K extends keyof MultiplayerServiceEvents>(
    key: K,
    ...args: Parameters<NonNullable<MultiplayerServiceEvents[K]>>
  ) {
    const fn = this.events[key] as any;
    if (typeof fn === 'function') {
      try { fn(...args); } catch (e) { console.warn(`Error in event ${key}:`, e); }
    }
    this.listeners.forEach((listener) => {
      const listenerFn = listener[key] as any;
      if (typeof listenerFn === 'function') {
        try { listenerFn(...args); } catch (e) { console.warn(`Error in listener ${key}:`, e); }
      }
    });
  }

  public createInitialLocalPlayer(team: TeamId = 'alpha'): NetworkPlayerState {
    const user = userManager.getCurrentUser();
    const name = user ? user.username : 'Operative_' + this.localPlayerId.substring(2, 6);
    const avatarId = user ? user.avatarId : 'soldier_apex';

    this.localPlayer = {
      id: this.localPlayerId,
      peerId: this.isHost ? (this.room ? PEER_PREFIX + this.room.roomId : undefined) : PEER_PREFIX + this.localPlayerId,
      name,
      avatarId,
      team,
      isHost: this.isHost,
      isReady: true,
      ping: this.currentPing,
      kills: 0,
      deaths: 0,
      score: 0,
      health: 100,
      maxHealth: 100,
      armor: 50,
      maxArmor: 50,
      activeWeapon: 'assault_rifle',
      isAlive: true,
      position: { x: 0, y: 1.75, z: 12 },
      yaw: 0,
      pitch: 0,
      stance: 'stand',
      velocity: { x: 0, y: 0, z: 0 },
      isMoving: false,
      isFiring: false,
      timestamp: Date.now()
    };

    return this.localPlayer;
  }

  // --- WEBSOCKET RELAY INITIALIZATION ---
  private initWebSocket(roomCode: string) {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
      this.wsConnected = false;
    }
    try {
      if (typeof window === 'undefined') return;
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${wsProtocol}//${host}/api/multiplayer-ws`;

      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.wsConnected = true;
        if (this.localPlayer) {
          const packet: NetworkPacket = {
            type: 'PLAYER_JOIN',
            player: this.localPlayer,
            roomId: roomCode
          };
          try {
            socket.send(JSON.stringify(packet));
          } catch (_) {}
        }
      };

      socket.onmessage = (evt) => {
        try {
          const packet = JSON.parse(evt.data);
          this.handleIncomingPacket(packet, 'ws');
        } catch (e) {
          console.warn('[WS message error]', e);
        }
      };

      socket.onerror = () => {
        this.wsConnected = false;
      };

      socket.onclose = () => {
        this.wsConnected = false;
      };
    } catch (e) {
      console.warn('WebSocket relay initialization fallback to WebRTC/local channel:', e);
    }
  }

  // --- HOSTING A ROOM ---
  public async createRoom(
    roomName: string,
    mode: MultiplayerMode,
    arena: ArenaId,
    scoreLimit: number = 15,
    timeLimit: number = 300,
    customRoomCode?: string,
    enableBots: boolean = true
  ): Promise<string> {
    this.leaveRoom();
    this.isHost = true;
    this.events.onConnectionStatusChange?.('connecting', 'Creating tactical combat sector...');

    const code = customRoomCode ? customRoomCode.trim().toUpperCase() : Math.random().toString(36).substring(2, 7).toUpperCase();
    const peerId = PEER_PREFIX + code;

    this.room = {
      roomId: code,
      roomName: roomName || `Combat Sector ${code}`,
      hostId: this.localPlayerId,
      hostName: userManager.getCurrentUser()?.username || 'Host Operative',
      mode,
      arena,
      scoreLimit,
      timeLimit,
      maxPlayers: 8,
      status: 'lobby',
      teamAlphaScore: 0,
      teamBravoScore: 0,
      timeRemaining: timeLimit,
      enableBots,
      currentWave: 1
    };

    this.createInitialLocalPlayer(mode === 'multiplayer_ffa' ? 'ffa' : 'alpha');
    this.localPlayer!.peerId = peerId;
    this.players.clear();
    this.players.set(this.localPlayerId, this.localPlayer!);

    // Initialize all transports: WebSocket relay + Local BroadcastChannel + WebRTC PeerJS
    this.initWebSocket(code);
    this.initBroadcastChannel(code);

    try {
      await this.initPeer(peerId);
      this.trigger('onConnectionStatusChange', 'connected', `Lobby Ready: ${code}`);
      this.notifyRoomUpdate();
      this.startPingLoop();
      return code;
    } catch (err) {
      console.warn('PeerJS server connection warning, using WebSocket relay & local signaling', err);
      this.trigger('onConnectionStatusChange', 'connected', `Lobby Ready: ${code}`);
      this.notifyRoomUpdate();
      this.startPingLoop();
      return code;
    }
  }

  // --- JOINING A ROOM ---
  public async joinRoom(roomCode: string): Promise<boolean> {
    this.leaveRoom();
    this.isHost = false;
    const cleanCode = roomCode.trim().toUpperCase();
    this.trigger('onConnectionStatusChange', 'connecting', `Locating lobby ${cleanCode}...`);

    this.createInitialLocalPlayer('bravo');
    const clientPeerId = PEER_PREFIX + this.localPlayerId;
    this.localPlayer!.peerId = clientPeerId;

    // Connect to WebSocket Relay and Local BroadcastChannel immediately
    this.initWebSocket(cleanCode);
    this.initBroadcastChannel(cleanCode);

    const targetPeerId = PEER_PREFIX + cleanCode;

    return new Promise(async (resolve) => {
      let resolved = false;

      // Listen for room update from Host via any transport
      const removeListener = this.addListener({
        onRoomUpdate: (_r: RoomConfig) => {
          if (!resolved) {
            resolved = true;
            this.trigger('onConnectionStatusChange', 'connected', `Connected to Room ${cleanCode}`);
            this.startPingLoop();
            removeListener();
            resolve(true);
          }
        }
      });

      // Send join packet over WebSocket & BroadcastChannel immediately
      this.sendPacket({
        type: 'PLAYER_JOIN',
        player: this.localPlayer!,
        roomId: cleanCode
      });

      // Also attempt WebRTC PeerJS connection
      try {
        await this.initPeer(clientPeerId);

        const conn = this.peer!.connect(targetPeerId, {
          reliable: true,
          serialization: 'json'
        });

        conn.on('open', () => {
          this.connections.set(targetPeerId, conn);
          this.setupConnectionListeners(conn);

          conn.send({
            type: 'PLAYER_JOIN',
            player: this.localPlayer!,
            roomId: cleanCode
          });

          if (!resolved) {
            resolved = true;
            this.trigger('onConnectionStatusChange', 'connected', `Connected to Room ${cleanCode} (P2P)`);
            this.startPingLoop();
            removeListener();
            resolve(true);
          }
        });

        conn.on('error', (e) => {
          console.warn('Peer connection error', e);
        });
      } catch (err) {
        console.warn('Direct peer connection fallback to local channel/relay', err);
      }

      // Timeout fallback if already receiving room state or connected
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          removeListener();
          this.sendPacket({
            type: 'PLAYER_JOIN',
            player: this.localPlayer!,
            roomId: cleanCode
          });
          this.trigger('onConnectionStatusChange', 'connected', `Joined Lobby ${cleanCode}`);
          this.startPingLoop();
          resolve(true);
        }
      }, 3500);
    });
  }

  // --- PEER & WEBRTC SETUP ---
  private initPeer(peerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.peer && !this.peer.destroyed) {
        this.peer.destroy();
      }

      try {
        this.peer = new Peer(peerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          },
          debug: 1
        });

        this.peer.on('open', () => {
          resolve();
        });

        this.peer.on('connection', (conn) => {
          this.connections.set(conn.peer, conn);
          this.setupConnectionListeners(conn);
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS error:', err.type, err.message);
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  private setupConnectionListeners(conn: DataConnection) {
    conn.on('data', (data) => {
      this.handleIncomingPacket(data as NetworkPacket, conn.peer);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      for (const [id] of this.players.entries()) {
        if (conn.peer.includes(id)) {
          this.players.delete(id);
          this.events.onPlayerLeft?.(id);
          this.notifyRoomUpdate();
          break;
        }
      }
    });
  }

  // --- BROADCAST CHANNEL FALLBACK ---
  private initBroadcastChannel(roomCode: string) {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    const channelName = `SHOOT_ARENA_MP_${roomCode}`;
    this.broadcastChannel = new BroadcastChannel(channelName);
    this.broadcastChannel.onmessage = (event) => {
      this.handleIncomingPacket(event.data as NetworkPacket, 'broadcast');
    };
  }

  // --- PACKET DISPATCHING ---
  public sendPacket(packet: NetworkPacket) {
    if (this.isDestroyed) return;

    const enriched = (this.room && !('roomId' in packet)) ? { ...packet, roomId: this.room.roomId } : packet;

    // 1. Send via WebSocket Relay if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(enriched));
      } catch (e) {
        console.warn('WS send packet failed', e);
      }
    }

    // 2. Send through all active WebRTC connections
    for (const [, conn] of this.connections) {
      if (conn.open) {
        try {
          conn.send(enriched);
        } catch (e) {
          console.warn('Failed to send packet to peer', e);
        }
      }
    }

    // 3. Mirror to local BroadcastChannel for local peers / same-machine tabs
    this.sendBroadcastPacket(enriched);
  }

  private sendBroadcastPacket(packet: NetworkPacket) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch (e) {
        console.warn('Broadcast channel post message error', e);
      }
    }
  }

  // --- PACKET HANDLING ---
  private handleIncomingPacket(packet: NetworkPacket, _fromPeer: string) {
    if (!packet || typeof packet !== 'object') return;

    switch (packet.type) {
      case 'ROOM_STATE': {
        this.room = packet.room;
        this.players.clear();
        packet.players.forEach((p) => this.players.set(p.id, p));
        // Keep our own local updated reference
        if (this.localPlayer && this.players.has(this.localPlayerId)) {
          this.localPlayer = this.players.get(this.localPlayerId)!;
        }
        this.trigger('onRoomUpdate', this.room, Array.from(this.players.values()));
        break;
      }

      case 'PLAYER_JOIN': {
        if (packet.player.id === this.localPlayerId) return;
        this.players.set(packet.player.id, packet.player);
        this.trigger('onPlayerJoined', packet.player);

        if (this.isHost && this.room) {
          if (this.room.mode === 'multiplayer_coop') {
            packet.player.team = 'alpha';
            this.players.set(packet.player.id, packet.player);
          } else if (this.room.mode === 'multiplayer_tdm') {
            const alphaCount = Array.from(this.players.values()).filter((p) => p.team === 'alpha').length;
            const bravoCount = Array.from(this.players.values()).filter((p) => p.team === 'bravo').length;
            packet.player.team = alphaCount <= bravoCount ? 'alpha' : 'bravo';
            this.players.set(packet.player.id, packet.player);
          }
          // Broadcast full room state to all
          this.broadcastRoomState();
        }
        this.notifyRoomUpdate();
        break;
      }

      case 'PLAYER_LEAVE': {
        if (packet.playerId === this.localPlayerId) return;
        this.players.delete(packet.playerId);
        this.trigger('onPlayerLeft', packet.playerId);
        if (this.isHost) {
          this.broadcastRoomState();
        }
        this.notifyRoomUpdate();
        break;
      }

      case 'PLAYER_READY': {
        const player = this.players.get(packet.playerId);
        if (player) {
          player.isReady = packet.isReady;
          if (this.isHost) this.broadcastRoomState();
          this.notifyRoomUpdate();
        }
        break;
      }

      case 'PLAYER_TEAM_SWITCH': {
        const player = this.players.get(packet.playerId);
        if (player) {
          player.team = packet.team;
          if (this.isHost) this.broadcastRoomState();
          this.notifyRoomUpdate();
        }
        break;
      }

      case 'ROOM_CONFIG_UPDATE': {
        if (this.room) {
          Object.assign(this.room, packet.config);
          this.notifyRoomUpdate();
        }
        break;
      }

      case 'MATCH_START_COUNTDOWN': {
        this.trigger('onMatchCountdown', packet.countdown);
        break;
      }

      case 'MATCH_START': {
        if (this.room) {
          this.room.status = 'in_game';
          this.room.arena = packet.arena;
          this.room.mode = packet.mode;
        }
        this.trigger('onMatchStart', packet.arena, packet.mode);
        break;
      }

      case 'PLAYER_SNAPSHOT': {
        if (packet.state.id === this.localPlayerId) return;
        this.players.set(packet.state.id, packet.state);
        this.trigger('onRemotePlayerSnapshot', packet.state);
        break;
      }

      case 'PLAYER_SHOOT': {
        if (packet.shooterId === this.localPlayerId) return;
        this.trigger('onRemotePlayerShoot', packet.shooterId, packet.origin, packet.direction, packet.weaponId);
        break;
      }

      case 'PLAYER_HIT': {
        // Did we get hit?
        if (packet.targetId === this.localPlayerId && this.localPlayer) {
          this.trigger(
            'onRemotePlayerHit',
            packet.shooterId,
            packet.targetId,
            packet.damage,
            packet.isHeadshot,
            packet.hitPoint
          );
        }
        break;
      }

      case 'PLAYER_KILLED': {
        const killer = this.players.get(packet.killerId);
        const victim = this.players.get(packet.victimId);

        if (killer) {
          killer.kills++;
          killer.score += packet.isHeadshot ? 150 : 100;
        }
        if (victim) {
          victim.deaths++;
          victim.isAlive = false;
        }

        const killEntry: KillFeedEntry = {
          id: Math.random().toString(),
          killerId: packet.killerId,
          killerName: killer ? killer.name : 'Unknown Operative',
          killerTeam: killer ? killer.team : 'alpha',
          victimId: packet.victimId,
          victimName: victim ? victim.name : 'Unknown Operative',
          victimTeam: victim ? victim.team : 'bravo',
          weaponId: packet.weaponId,
          isHeadshot: packet.isHeadshot,
          timestamp: Date.now()
        };

        this.trigger('onKillFeed', killEntry);

        // Host updates scores and checks win conditions
        if (this.isHost && this.room) {
          if (killer?.team === 'alpha') this.room.teamAlphaScore++;
          if (killer?.team === 'bravo') this.room.teamBravoScore++;

          this.checkMatchEndCondition();
          this.broadcastRoomState();
        }
        break;
      }

      case 'PLAYER_RESPAWN': {
        const player = this.players.get(packet.playerId);
        if (player) {
          player.isAlive = true;
          player.health = player.maxHealth;
          player.armor = player.maxArmor;
          player.position = packet.position;
        }
        this.trigger('onRemotePlayerRespawn', packet.playerId, packet.position);
        break;
      }

      case 'VOICE_STATE': {
        const player = this.players.get(packet.playerId);
        if (player) {
          player.voiceState = {
            isSpeaking: packet.isSpeaking,
            isMuted: packet.isMuted,
            isDeafened: packet.isDeafened
          };
        }
        this.trigger('onVoiceStateUpdate', packet.playerId, {
          isSpeaking: packet.isSpeaking,
          isMuted: packet.isMuted,
          isDeafened: packet.isDeafened
        });
        break;
      }

      case 'CHAT': {
        this.trigger('onChatMessage', packet.message);
        break;
      }

      case 'PING': {
        if (packet.senderId !== this.localPlayerId) {
          this.sendPacket({
            type: 'PONG',
            originalTimestamp: packet.timestamp,
            senderId: this.localPlayerId
          });
        }
        break;
      }

      case 'PONG': {
        if (packet.senderId !== this.localPlayerId) {
          const rtt = Math.round(Date.now() - packet.originalTimestamp);
          this.currentPing = Math.max(5, Math.min(999, rtt));
          if (this.localPlayer) {
            this.localPlayer.ping = this.currentPing;
          }
          this.trigger('onPingUpdate', this.currentPing);
        }
        break;
      }

      case 'MULTIPLAYER_ENEMIES_SYNC': {
        this.trigger('onEnemiesSync', packet.wave, packet.enemies);
        break;
      }

      case 'MULTIPLAYER_ENEMY_HIT': {
        this.trigger('onEnemyHit', packet.shooterId, packet.enemyId, packet.damage, packet.isHeadshot, packet.hitPoint);
        break;
      }

      case 'MULTIPLAYER_ENEMY_KILLED': {
        this.trigger('onEnemyKilled', packet.enemyId, packet.killerId, packet.isHeadshot, packet.rewardScore);
        break;
      }

      case 'MULTIPLAYER_WAVE_COMPLETED': {
        this.trigger('onWaveCompleted', packet.wave, packet.rewardCoins);
        break;
      }

      case 'DOOR_TOGGLE': {
        this.trigger('onDoorToggle', packet.doorId, packet.isOpen);
        break;
      }

      case 'MATCH_END': {
        if (this.room) {
          this.room.status = 'ended';
        }
        this.trigger('onMatchEnd', packet.winnerTeam, packet.mvpPlayerId, packet.finalScores);
        break;
      }
    }
  }

  // --- HOST CONTROLS ---
  public setRoomConfig(partial: Partial<RoomConfig>) {
    if (!this.isHost || !this.room) return;
    Object.assign(this.room, partial);
    this.sendPacket({
      type: 'ROOM_CONFIG_UPDATE',
      config: partial
    });
    this.notifyRoomUpdate();
  }

  public switchTeam(team: TeamId) {
    if (this.localPlayer) {
      this.localPlayer.team = team;
      this.sendPacket({
        type: 'PLAYER_TEAM_SWITCH',
        playerId: this.localPlayerId,
        team
      });
      this.notifyRoomUpdate();
    }
  }

  public toggleReady() {
    if (this.localPlayer) {
      this.localPlayer.isReady = !this.localPlayer.isReady;
      this.sendPacket({
        type: 'PLAYER_READY',
        playerId: this.localPlayerId,
        isReady: this.localPlayer.isReady
      });
      this.notifyRoomUpdate();
    }
  }

  public startMatchCountdown() {
    if (!this.isHost || !this.room) return;

    let countdown = 3;
    this.room.status = 'starting';
    this.notifyRoomUpdate();

    const interval = window.setInterval(() => {
      this.sendPacket({
        type: 'MATCH_START_COUNTDOWN',
        countdown
      });
      this.events.onMatchCountdown?.(countdown);

      if (countdown <= 0) {
        clearInterval(interval);
        this.launchMatch();
      }
      countdown--;
    }, 1000);
  }

  private launchMatch() {
    if (!this.isHost || !this.room) return;

    this.room.status = 'in_game';
    this.room.timeRemaining = this.room.timeLimit;
    this.room.teamAlphaScore = 0;
    this.room.teamBravoScore = 0;

    // Reset player in-match stats
    this.players.forEach((p) => {
      p.kills = 0;
      p.deaths = 0;
      p.score = 0;
      p.health = p.maxHealth;
      p.armor = p.maxArmor;
      p.isAlive = true;
    });

    this.sendPacket({
      type: 'MATCH_START',
      arena: this.room.arena,
      mode: this.room.mode
    });

    this.events.onMatchStart?.(this.room.arena, this.room.mode);
    this.broadcastRoomState();

    // Start match authoritative countdown clock
    this.startMatchTimer();
  }

  private startMatchTimer() {
    if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);

    this.matchTimerInterval = window.setInterval(() => {
      if (!this.room || this.room.status !== 'in_game') return;

      this.room.timeRemaining = Math.max(0, this.room.timeRemaining - 1);
      if (this.room.timeRemaining % 5 === 0) {
        this.setRoomConfig({ timeRemaining: this.room.timeRemaining });
      }

      if (this.room.timeRemaining <= 0) {
        this.checkMatchEndCondition(true);
      }
    }, 1000);
  }

  private checkMatchEndCondition(timeExpired: boolean = false) {
    if (!this.isHost || !this.room || this.room.status !== 'in_game') return;

    let shouldEnd = timeExpired;
    let winnerTeam: TeamId | 'draw' = 'draw';

    if (this.room.mode === 'multiplayer_tdm') {
      if (this.room.teamAlphaScore >= this.room.scoreLimit) {
        shouldEnd = true;
        winnerTeam = 'alpha';
      } else if (this.room.teamBravoScore >= this.room.scoreLimit) {
        shouldEnd = true;
        winnerTeam = 'bravo';
      } else if (timeExpired) {
        if (this.room.teamAlphaScore > this.room.teamBravoScore) winnerTeam = 'alpha';
        else if (this.room.teamBravoScore > this.room.teamAlphaScore) winnerTeam = 'bravo';
        else winnerTeam = 'draw';
      }
    } else {
      // FFA
      let highestKills = 0;
      let leaderId = '';
      this.players.forEach((p) => {
        if (p.kills > highestKills) {
          highestKills = p.kills;
          leaderId = p.id;
        }
      });

      if (highestKills >= this.room.scoreLimit || timeExpired) {
        shouldEnd = true;
        winnerTeam = (leaderId === this.localPlayerId ? this.localPlayer?.team : 'ffa') as TeamId;
      }
    }

    if (shouldEnd) {
      this.endMatch(winnerTeam);
    }
  }

  private endMatch(winnerTeam: TeamId | 'draw') {
    if (!this.room) return;
    if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);

    this.room.status = 'ended';

    // Find MVP (highest score)
    let highestScore = -1;
    let mvpId = this.localPlayerId;
    const finalScores: Record<string, { kills: number; deaths: number; score: number }> = {};

    this.players.forEach((p) => {
      finalScores[p.id] = { kills: p.kills, deaths: p.deaths, score: p.score };
      if (p.score > highestScore) {
        highestScore = p.score;
        mvpId = p.id;
      }
    });

    const endPacket: NetworkPacket = {
      type: 'MATCH_END',
      winnerTeam,
      mvpPlayerId: mvpId,
      finalScores
    };

    this.sendPacket(endPacket);
    this.trigger('onMatchEnd', winnerTeam, mvpId, finalScores);
  }

  private broadcastRoomState() {
    if (!this.isHost || !this.room) return;
    this.sendPacket({
      type: 'ROOM_STATE',
      room: this.room,
      players: Array.from(this.players.values())
    });
  }

  private notifyRoomUpdate() {
    if (this.room) {
      this.trigger('onRoomUpdate', this.room, Array.from(this.players.values()));
    }
  }

  // --- RUNTIME IN-GAME ACTIONS ---
  public broadcastSnapshot(snapshot: Partial<NetworkPlayerState>) {
    if (!this.localPlayer) return;
    Object.assign(this.localPlayer, snapshot, { timestamp: Date.now() });

    this.sendPacket({
      type: 'PLAYER_SNAPSHOT',
      state: this.localPlayer
    });
  }

  public broadcastShoot(
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    weaponId: WeaponId,
    isCrit?: boolean
  ) {
    this.sendPacket({
      type: 'PLAYER_SHOOT',
      shooterId: this.localPlayerId,
      origin,
      direction,
      weaponId,
      isCrit
    });
  }

  public reportHit(
    targetId: string,
    damage: number,
    isHeadshot: boolean,
    hitPoint: { x: number; y: number; z: number }
  ) {
    this.sendPacket({
      type: 'PLAYER_HIT',
      shooterId: this.localPlayerId,
      targetId,
      damage,
      isHeadshot,
      hitPoint
    });
  }

  public reportKill(victimId: string, weaponId: WeaponId, isHeadshot: boolean) {
    this.sendPacket({
      type: 'PLAYER_KILLED',
      killerId: this.localPlayerId,
      victimId,
      weaponId,
      isHeadshot
    });
  }

  public broadcastRespawn(position: { x: number; y: number; z: number }) {
    if (this.localPlayer) {
      this.localPlayer.isAlive = true;
      this.localPlayer.health = this.localPlayer.maxHealth;
      this.localPlayer.armor = this.localPlayer.maxArmor;
      this.localPlayer.position = position;
    }
    this.sendPacket({
      type: 'PLAYER_RESPAWN',
      playerId: this.localPlayerId,
      position
    });
  }

  public sendChatMessage(text: string, isQuickPing: boolean = false) {
    if (!this.localPlayer) return;
    const msg: ChatMessage = {
      id: Math.random().toString(),
      senderId: this.localPlayerId,
      senderName: this.localPlayer.name,
      senderTeam: this.localPlayer.team,
      text,
      isQuickPing,
      timestamp: Date.now()
    };
    this.sendPacket({
      type: 'CHAT',
      message: msg
    });
    this.trigger('onChatMessage', msg);
  }

  public broadcastVoiceState(isSpeaking: boolean, isMuted: boolean, isDeafened: boolean) {
    if (!this.localPlayer) return;
    this.localPlayer.voiceState = { isSpeaking, isMuted, isDeafened };
    this.sendPacket({
      type: 'VOICE_STATE',
      playerId: this.localPlayerId,
      isSpeaking,
      isMuted,
      isDeafened
    });
  }

  // --- PING LOOP ---
  private startPingLoop() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = window.setInterval(() => {
      this.sendPacket({
        type: 'PING',
        timestamp: Date.now(),
        senderId: this.localPlayerId
      });
    }, 2500);
  }

  public broadcastEnemiesSync(wave: number, enemies: NetworkEnemyState[]) {
    this.sendPacket({
      type: 'MULTIPLAYER_ENEMIES_SYNC',
      wave,
      enemies
    });
  }

  public reportEnemyHit(
    enemyId: string,
    damage: number,
    isHeadshot: boolean,
    hitPoint: { x: number; y: number; z: number }
  ) {
    this.sendPacket({
      type: 'MULTIPLAYER_ENEMY_HIT',
      shooterId: this.localPlayerId,
      enemyId,
      damage,
      isHeadshot,
      hitPoint
    });
  }

  public broadcastEnemyKilled(
    enemyId: string,
    isHeadshot: boolean,
    rewardScore: number = 100
  ) {
    this.sendPacket({
      type: 'MULTIPLAYER_ENEMY_KILLED',
      enemyId,
      killerId: this.localPlayerId,
      isHeadshot,
      rewardScore
    });
  }

  public broadcastWaveCompleted(wave: number, rewardCoins: number = 50) {
    this.sendPacket({
      type: 'MULTIPLAYER_WAVE_COMPLETED',
      wave,
      rewardCoins
    });
  }

  public broadcastDoorToggle(doorId: string, isOpen: boolean) {
    this.sendPacket({
      type: 'DOOR_TOGGLE',
      doorId,
      isOpen
    });
  }

  // --- CLEANUP ---
  public leaveRoom() {
    if (this.room && this.localPlayerId) {
      this.sendPacket({
        type: 'PLAYER_LEAVE',
        playerId: this.localPlayerId
      });
    }

    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);

    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
      this.wsConnected = false;
    }

    for (const [, conn] of this.connections) {
      try {
        conn.close();
      } catch (e) {
        console.warn('Error closing connection', e);
      }
    }
    this.connections.clear();

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    if (this.peer && !this.peer.destroyed) {
      this.peer.destroy();
      this.peer = null;
    }

    this.isHost = false;
    this.room = null;
    this.players.clear();
    this.trigger('onConnectionStatusChange', 'disconnected');
  }

  public destroy() {
    this.isDestroyed = true;
    this.leaveRoom();
  }
}

export const multiplayerService = new MultiplayerService();

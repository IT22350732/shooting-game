// Tactical WebRTC Voice Chat Engine for SHOOT ARENA
// Professional Team-Isolated Comms with Push-To-Talk, Open Mic VAD, 
// Live Audio Analyser Visualizers, Procedural Radio SFX, and Per-Player Mixing.

import { multiplayerService } from './MultiplayerService';
import { soundManager } from '../../audio/SoundManager';
import { TeamId } from './MultiplayerTypes';

export type VoiceMode = 'ptt' | 'open_mic';
export type VoiceChannel = 'team' | 'all';
export type VoiceStatus =
  | 'disconnected'
  | 'requesting_permission'
  | 'permission_denied'
  | 'connecting'
  | 'connected'
  | 'error';

export interface VoicePeerInfo {
  playerId: string;
  peerId: string;
  name: string;
  team: TeamId;
  call: any | null; // PeerJS MediaConnection
  stream: MediaStream | null;
  audioElement: HTMLAudioElement | null;
  gainNode: GainNode | null;
  analyserNode: AnalyserNode | null;
  isSpeaking: boolean;
  volume: number; // 0.0 to 1.5, default 1.0
  isLocallyMuted: boolean;
  audioLevel: number; // 0.0 to 1.0 for dynamic EQ visualizers
}

export interface VoiceSettingsConfig {
  isEnabled: boolean;
  mode: VoiceMode;
  channel: VoiceChannel;
  pttKey: string;
  vadThreshold: number; // 0.02 to 0.40
  inputGain: number; // 0.0 to 2.0
  masterVolume: number; // 0.0 to 1.0
  radioSoundEffects: boolean;
  selectedDeviceId: string;
}

export type VoiceStateListener = (state: VoiceChatServiceState) => void;

export interface VoiceChatServiceState {
  status: VoiceStatus;
  isEnabled: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isTransmitting: boolean;
  mode: VoiceMode;
  channel: VoiceChannel;
  pttKey: string;
  vadThreshold: number;
  inputGain: number;
  masterVolume: number;
  radioSoundEffects: boolean;
  selectedDeviceId: string;
  availableDevices: MediaDeviceInfo[];
  localAudioLevel: number;
  isLocalSpeaking: boolean;
  errorMessage?: string;
  peers: VoicePeerInfo[];
}

const PEER_PREFIX = 'shoot-arena-v1-';
const STORAGE_KEY = 'shoot_arena_voice_settings_v1';

export class VoiceChatService {
  private status: VoiceStatus = 'disconnected';
  private isEnabled: boolean = true;
  private isMuted: boolean = false;
  private isDeafened: boolean = false;
  private isTransmitting: boolean = false;
  private isPttKeyDown: boolean = false;
  private isLocalSpeaking: boolean = false;
  private localAudioLevel: number = 0;
  private errorMessage: string = '';

  // Config
  private mode: VoiceMode = 'ptt';
  private channel: VoiceChannel = 'team';
  private pttKey: string = 'KeyV';
  private vadThreshold: number = 0.12;
  private inputGainValue: number = 1.0;
  private masterVolume: number = 0.85;
  private radioSoundEffects: boolean = true;
  private selectedDeviceId: string = 'default';
  private availableDevices: MediaDeviceInfo[] = [];

  // Web Audio & Media
  private audioContext: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private localSourceNode: MediaStreamAudioSourceNode | null = null;
  private localGainNode: GainNode | null = null;
  private localAnalyserNode: AnalyserNode | null = null;
  private testLoopbackGain: GainNode | null = null;
  private isTestLoopbackActive: boolean = false;

  // Peers & Calls
  private peers: Map<string, VoicePeerInfo> = new Map();
  private pendingCalls: Set<string> = new Set();
  private listeners: Set<VoiceStateListener> = new Set();

  // Animation & Metering Loops
  private meterRafId: number | null = null;
  private vadSilenceTimer: number | null = null;
  private unsubscribeMultiplayer: (() => void) | null = null;

  constructor() {
    this.loadSettings();
    this.setupKeyboardListeners();
    this.setupMultiplayerSync();
  }

  // --- SETTINGS PERSISTENCE ---
  private loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.mode) this.mode = parsed.mode;
        if (parsed.pttKey) this.pttKey = parsed.pttKey;
        if (typeof parsed.vadThreshold === 'number') this.vadThreshold = parsed.vadThreshold;
        if (typeof parsed.inputGain === 'number') this.inputGainValue = parsed.inputGain;
        if (typeof parsed.masterVolume === 'number') this.masterVolume = parsed.masterVolume;
        if (typeof parsed.radioSoundEffects === 'boolean') this.radioSoundEffects = parsed.radioSoundEffects;
        if (typeof parsed.isEnabled === 'boolean') this.isEnabled = parsed.isEnabled;
        if (parsed.selectedDeviceId) this.selectedDeviceId = parsed.selectedDeviceId;
      }
    } catch (e) {
      console.warn('[VoiceChat] Failed to load settings from storage', e);
    }
  }

  public saveSettings() {
    try {
      const data: VoiceSettingsConfig = {
        isEnabled: this.isEnabled,
        mode: this.mode,
        channel: this.channel,
        pttKey: this.pttKey,
        vadThreshold: this.vadThreshold,
        inputGain: this.inputGainValue,
        masterVolume: this.masterVolume,
        radioSoundEffects: this.radioSoundEffects,
        selectedDeviceId: this.selectedDeviceId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[VoiceChat] Failed to save settings to storage', e);
    }
    this.notifyState();
  }

  // --- STATE SUBSCRIPTION ---
  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): VoiceChatServiceState {
    return {
      status: this.status,
      isEnabled: this.isEnabled,
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      isTransmitting: this.isTransmitting,
      mode: this.mode,
      channel: this.channel,
      pttKey: this.pttKey,
      vadThreshold: this.vadThreshold,
      inputGain: this.inputGainValue,
      masterVolume: this.masterVolume,
      radioSoundEffects: this.radioSoundEffects,
      selectedDeviceId: this.selectedDeviceId,
      availableDevices: [...this.availableDevices],
      localAudioLevel: this.localAudioLevel,
      isLocalSpeaking: this.isLocalSpeaking,
      errorMessage: this.errorMessage,
      peers: Array.from(this.peers.values()).map((p) => ({ ...p }))
    };
  }

  private notifyState() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[VoiceChat] Error in state listener', err);
      }
    });
  }

  // --- INITIALIZATION & MICROPHONE ACCESS ---
  public async initMicrophone(): Promise<boolean> {
    if (!this.isEnabled) return false;

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.status = 'error';
      this.errorMessage = 'Voice chat is not supported on this browser or platform.';
      this.notifyState();
      return false;
    }

    try {
      this.status = 'requesting_permission';
      this.notifyState();

      // Enumerate audio devices
      await this.refreshAudioDevices();

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: this.selectedDeviceId && this.selectedDeviceId !== 'default'
            ? { exact: this.selectedDeviceId }
            : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;

      // Ensure initial transmission state (default muted unless open mic)
      this.updateTrackState();

      // Initialize Web Audio graph
      this.initAudioContext();

      this.status = 'connected';
      this.errorMessage = '';
      this.refreshAudioDevices();
      this.startMeteringLoop();
      this.notifyState();

      // Synchronize with any active peers in our room
      this.syncTeamConnections();
      return true;
    } catch (err: any) {
      console.warn('[VoiceChat] Failed to acquire microphone access:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.status = 'permission_denied';
        this.errorMessage = 'Microphone permission was denied. Allow microphone access in your browser.';
      } else {
        this.status = 'error';
        this.errorMessage = err.message || 'Could not initialize microphone.';
      }
      this.notifyState();
      return false;
    }
  }

  public async refreshAudioDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter((d) => d.kind === 'audioinput');
      this.notifyState();
    } catch (e) {
      console.warn('[VoiceChat] Error enumerating devices', e);
    }
  }

  private initAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.localStream && this.audioContext) {
      try {
        // Disconnect old nodes if any
        this.localSourceNode?.disconnect();
        this.localGainNode?.disconnect();
        this.localAnalyserNode?.disconnect();

        this.localSourceNode = this.audioContext.createMediaStreamSource(this.localStream);
        this.localGainNode = this.audioContext.createGain();
        this.localGainNode.gain.value = this.inputGainValue;

        this.localAnalyserNode = this.audioContext.createAnalyser();
        this.localAnalyserNode.fftSize = 256;
        this.localAnalyserNode.smoothingTimeConstant = 0.35;

        // Route: Source -> Gain -> Analyser (do not connect analyser to destination to avoid self-echo!)
        this.localSourceNode.connect(this.localGainNode);
        this.localGainNode.connect(this.localAnalyserNode);
      } catch (e) {
        console.warn('[VoiceChat] Web Audio graph setup error', e);
      }
    }
  }

  // --- AUDIO METERING & VAD LOOP ---
  private startMeteringLoop() {
    if (this.meterRafId) cancelAnimationFrame(this.meterRafId);

    const dataArray = new Uint8Array(128);

    const updateLoop = () => {
      // 1. Process Local Audio Analyser
      if (this.localAnalyserNode && this.audioContext?.state === 'running') {
        this.localAnalyserNode.getByteFrequencyData(dataArray);

        // Compute RMS volume level (0.0 to 1.0)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i] / 255;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        this.localAudioLevel = Math.min(1.0, rms * 2.2);

        // Voice Activity Detection (VAD) for Open Mic mode
        if (this.mode === 'open_mic' && !this.isMuted) {
          if (this.localAudioLevel >= this.vadThreshold) {
            if (this.vadSilenceTimer) {
              window.clearTimeout(this.vadSilenceTimer);
              this.vadSilenceTimer = null;
            }
            if (!this.isTransmitting) {
              this.setTransmitting(true);
            }
          } else if (this.isTransmitting && !this.vadSilenceTimer) {
            // Squelch hangover time (350ms buffer to preserve sentence endings)
            this.vadSilenceTimer = window.setTimeout(() => {
              this.setTransmitting(false);
              this.vadSilenceTimer = null;
            }, 350);
          }
        }

        const currentlySpeaking = this.isTransmitting && this.localAudioLevel > 0.05;
        if (currentlySpeaking !== this.isLocalSpeaking) {
          this.isLocalSpeaking = currentlySpeaking;
          multiplayerService.broadcastVoiceState(this.isLocalSpeaking, this.isMuted, this.isDeafened);
        }
      }

      // 2. Process Remote Peer Analysers for Speaking Waves
      let peerSpeakingChanged = false;
      this.peers.forEach((peer) => {
        if (peer.analyserNode && !this.isDeafened && !peer.isLocallyMuted) {
          peer.analyserNode.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const val = dataArray[i] / 255;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          peer.audioLevel = Math.min(1.0, rms * 2.5);
          const wasSpeaking = peer.isSpeaking;
          peer.isSpeaking = peer.audioLevel > 0.06;
          if (wasSpeaking !== peer.isSpeaking) {
            peerSpeakingChanged = true;
          }
        } else {
          peer.audioLevel = 0;
          peer.isSpeaking = false;
        }
      });

      if (peerSpeakingChanged || this.isTransmitting || this.localAudioLevel > 0.02) {
        this.notifyState();
      }

      this.meterRafId = requestAnimationFrame(updateLoop);
    };

    this.meterRafId = requestAnimationFrame(updateLoop);
  }

  // --- TRANSMISSION & PUSH-TO-TALK ---
  public setTransmitting(active: boolean) {
    if (this.isMuted) active = false;
    if (this.isTransmitting === active) return;

    this.isTransmitting = active;
    this.updateTrackState();

    // Procedural tactical radio sound effects
    if (this.radioSoundEffects && this.mode === 'ptt') {
      soundManager.playRadioBeep(active ? 'on' : 'off');
    }

    // Broadcast voice state over data channel for instant visual reaction
    multiplayerService.broadcastVoiceState(this.isTransmitting, this.isMuted, this.isDeafened);
    this.notifyState();
  }

  private updateTrackState() {
    if (!this.localStream) return;
    const shouldEnable = this.isTransmitting && !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = shouldEnable;
    });
  }

  // --- KEYBOARD CONTROLS (DESKTOP PTT) ---
  private setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in a chat or text input
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      // Push-to-Talk Key
      if (e.code === this.pttKey && this.mode === 'ptt') {
        if (!this.isPttKeyDown) {
          this.isPttKeyDown = true;
          // Ensure mic is initialized
          if (!this.localStream && this.isEnabled && this.status !== 'permission_denied') {
            this.initMicrophone().then((ok) => {
              if (ok) this.setTransmitting(true);
            });
          } else {
            this.setTransmitting(true);
          }
        }
      }

      // Quick Mute Toggle (KeyM)
      if (e.code === 'KeyM') {
        this.toggleMute();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === this.pttKey && this.mode === 'ptt') {
        this.isPttKeyDown = false;
        this.setTransmitting(false);
      }
    });

    // Window blur safety: release PTT if user switches window while holding key
    window.addEventListener('blur', () => {
      if (this.isPttKeyDown) {
        this.isPttKeyDown = false;
        this.setTransmitting(false);
      }
    });
  }

  // --- MULTIPLAYER ROOM INTEGRATION & TEAM ISOLATION ---
  private setupMultiplayerSync() {
    // Listen for room updates, player join/leaves, and incoming voice states
    this.unsubscribeMultiplayer = multiplayerService.addListener({
      onRoomUpdate: () => {
        this.syncTeamConnections();
      },
      onPlayerJoined: () => {
        this.syncTeamConnections();
      },
      onPlayerLeft: (playerId) => {
        this.removePeer(playerId);
        this.syncTeamConnections();
      },
      onVoiceStateUpdate: (playerId, vState) => {
        const peer = this.peers.get(playerId);
        if (peer) {
          peer.isSpeaking = vState.isSpeaking;
          this.notifyState();
        }
      }
    });
  }

  /**
   * Evaluates team members in the current match / room.
   * STRICT TEAM ISOLATION in TDM:
   * Only players on the exact same team as localPlayer can talk and listen to each other!
   */
  public syncTeamConnections() {
    if (!this.isEnabled) return;
    const localPlayer = multiplayerService.localPlayer;
    const room = multiplayerService.room;
    if (!localPlayer || !room) return;

    const isTDM = room.mode === 'multiplayer_tdm';
    const currentPeer = multiplayerService.getPeer();

    // Hook incoming calls on the PeerJS instance if not already hooked
    if (currentPeer && !(currentPeer as any)._hasVoiceChatHandler) {
      (currentPeer as any)._hasVoiceChatHandler = true;
      currentPeer.on('call', (incomingCall: any) => {
        this.handleIncomingCall(incomingCall);
      });
    }

    // Determine current eligible squad mates
    const eligiblePlayers = Array.from(multiplayerService.players.values()).filter((p) => {
      if (p.id === localPlayer.id) return false;
      if (isTDM && this.channel === 'team') {
        return p.team === localPlayer.team;
      }
      return true; // FFA or All-Channel
    });

    const eligibleIds = new Set(eligiblePlayers.map((p) => p.id));

    // 1. Remove peers that are no longer eligible (e.g., switched teams, left)
    for (const [peerPlayerId] of this.peers.entries()) {
      if (!eligibleIds.has(peerPlayerId)) {
        this.removePeer(peerPlayerId);
      }
    }

    // 2. Add or connect to eligible squad mates
    eligiblePlayers.forEach((player) => {
      let peer = this.peers.get(player.id);
      if (!peer) {
        // Resolve target peerId
        const peerId = player.peerId || (player.isHost ? PEER_PREFIX + room.roomId : PEER_PREFIX + player.id);
        peer = {
          playerId: player.id,
          peerId,
          name: player.name,
          team: player.team,
          call: null,
          stream: null,
          audioElement: null,
          gainNode: null,
          analyserNode: null,
          isSpeaking: false,
          volume: 1.0,
          isLocallyMuted: false,
          audioLevel: 0
        };
        this.peers.set(player.id, peer);
      } else {
        peer.name = player.name;
        peer.team = player.team;
      }

      // WebRTC Polite Peer Protocol:
      // Deterministically initiate call if localPlayerId > player.id to prevent collision
      if (
        this.localStream &&
        currentPeer &&
        !peer.call &&
        !this.pendingCalls.has(player.id) &&
        localPlayer.id > player.id
      ) {
        this.initiateCallToPeer(peer);
      }
    });

    this.notifyState();
  }

  // --- WEBRTC CALLING ---
  private initiateCallToPeer(peer: VoicePeerInfo) {
    const currentPeer = multiplayerService.getPeer();
    if (!currentPeer || !this.localStream) return;

    try {
      this.pendingCalls.add(peer.playerId);
      const call = currentPeer.call(peer.peerId, this.localStream);
      peer.call = call;

      call.on('stream', (remoteStream: MediaStream) => {
        this.pendingCalls.delete(peer.playerId);
        this.attachRemoteStream(peer, remoteStream);
      });

      call.on('close', () => {
        this.pendingCalls.delete(peer.playerId);
        this.detachPeerAudio(peer);
      });

      call.on('error', (err: any) => {
        console.warn(`[VoiceChat] Call error with ${peer.name}:`, err);
        this.pendingCalls.delete(peer.playerId);
      });

      // Timeout safety for call establishment
      setTimeout(() => {
        this.pendingCalls.delete(peer.playerId);
      }, 5000);
    } catch (e) {
      console.warn(`[VoiceChat] Failed to initiate call to ${peer.name}:`, e);
      this.pendingCalls.delete(peer.playerId);
    }
  }

  private handleIncomingCall(incomingCall: any) {
    const localPlayer = multiplayerService.localPlayer;
    const room = multiplayerService.room;
    if (!localPlayer || !room) {
      incomingCall.close();
      return;
    }

    const isTDM = room.mode === 'multiplayer_tdm';

    // Find the caller by peerId or playerId
    const caller = Array.from(multiplayerService.players.values()).find(
      (p) => p.peerId === incomingCall.peer || incomingCall.peer.includes(p.id) || (p.isHost && incomingCall.peer === PEER_PREFIX + room.roomId)
    );

    if (!caller) {
      console.warn('[VoiceChat] Unknown caller attempting connection:', incomingCall.peer);
      incomingCall.close();
      return;
    }

    // STRICT TEAM ISOLATION:
    // Reject call if enemy team tries to connect in Team Deathmatch
    if (isTDM && this.channel === 'team' && caller.team !== localPlayer.team) {
      incomingCall.close();
      return;
    }

    let peer = this.peers.get(caller.id);
    if (!peer) {
      peer = {
        playerId: caller.id,
        peerId: incomingCall.peer,
        name: caller.name,
        team: caller.team,
        call: incomingCall,
        stream: null,
        audioElement: null,
        gainNode: null,
        analyserNode: null,
        isSpeaking: false,
        volume: 1.0,
        isLocallyMuted: false,
        audioLevel: 0
      };
      this.peers.set(caller.id, peer);
    } else {
      peer.call = incomingCall;
    }

    // Answer call with local stream (or create audio element on stream event)
    if (this.localStream) {
      incomingCall.answer(this.localStream);
    } else {
      // If mic not granted yet, answer anyway to receive audio
      incomingCall.answer();
    }

    incomingCall.on('stream', (remoteStream: MediaStream) => {
      this.attachRemoteStream(peer!, remoteStream);
    });

    incomingCall.on('close', () => {
      this.detachPeerAudio(peer!);
    });

    incomingCall.on('error', (err: any) => {
      console.warn(`[VoiceChat] Incoming call error from ${caller.name}:`, err);
    });
  }

  private attachRemoteStream(peer: VoicePeerInfo, stream: MediaStream) {
    peer.stream = stream;

    // 1. Create or update hidden HTML5 Audio Element for playback
    if (!peer.audioElement) {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', 'true');
      peer.audioElement = audio;
    }
    peer.audioElement.srcObject = stream;
    peer.audioElement.play().catch((e) => console.warn('[VoiceChat] Autoplay prevented:', e));

    // 2. Connect into Web Audio Graph for Mixing & EQ metering
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.initAudioContext();
    }

    if (this.audioContext) {
      try {
        const sourceNode = this.audioContext.createMediaStreamSource(stream);
        const gainNode = this.audioContext.createGain();
        const analyserNode = this.audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.35;

        // Route: Stream -> Gain -> Analyser -> Speakers
        sourceNode.connect(gainNode);
        gainNode.connect(analyserNode);
        gainNode.connect(this.audioContext.destination);

        peer.gainNode = gainNode;
        peer.analyserNode = analyserNode;
        this.updatePeerAudioGain(peer);
      } catch (e) {
        console.warn(`[VoiceChat] Error routing audio graph for ${peer.name}:`, e);
      }
    }

    this.notifyState();
  }

  private detachPeerAudio(peer: VoicePeerInfo) {
    if (peer.audioElement) {
      peer.audioElement.srcObject = null;
      peer.audioElement.remove();
      peer.audioElement = null;
    }
    if (peer.gainNode) {
      peer.gainNode.disconnect();
      peer.gainNode = null;
    }
    if (peer.analyserNode) {
      peer.analyserNode.disconnect();
      peer.analyserNode = null;
    }
    peer.stream = null;
    peer.call = null;
    peer.isSpeaking = false;
    peer.audioLevel = 0;
    this.notifyState();
  }

  private removePeer(playerId: string) {
    const peer = this.peers.get(playerId);
    if (peer) {
      if (peer.call) {
        try {
          peer.call.close();
        } catch (e) {
          console.warn('[VoiceChat] Error closing call', e);
        }
      }
      this.detachPeerAudio(peer);
      this.peers.delete(playerId);
      this.notifyState();
    }
  }

  // --- VOLUME & MIXING CONTROLS ---
  private updatePeerAudioGain(peer: VoicePeerInfo) {
    if (!peer.gainNode) return;
    const finalGain = this.isDeafened || peer.isLocallyMuted
      ? 0
      : peer.volume * this.masterVolume;
    peer.gainNode.gain.setValueAtTime(finalGain, this.audioContext ? this.audioContext.currentTime : 0);
  }

  public setPeerVolume(playerId: string, volume: number) {
    const peer = this.peers.get(playerId);
    if (peer) {
      peer.volume = Math.max(0, Math.min(1.5, volume));
      this.updatePeerAudioGain(peer);
      this.notifyState();
    }
  }

  public toggleMutePeer(playerId: string): boolean {
    const peer = this.peers.get(playerId);
    if (peer) {
      peer.isLocallyMuted = !peer.isLocallyMuted;
      this.updatePeerAudioGain(peer);
      this.notifyState();
      return peer.isLocallyMuted;
    }
    return false;
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1.0, vol));
    this.peers.forEach((peer) => this.updatePeerAudioGain(peer));
    this.saveSettings();
  }

  public setInputGain(gain: number) {
    this.inputGainValue = Math.max(0, Math.min(2.0, gain));
    if (this.localGainNode && this.audioContext) {
      this.localGainNode.gain.setValueAtTime(this.inputGainValue, this.audioContext.currentTime);
    }
    this.saveSettings();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isTransmitting) {
      this.setTransmitting(false);
    } else {
      this.updateTrackState();
    }
    multiplayerService.broadcastVoiceState(this.isTransmitting, this.isMuted, this.isDeafened);
    this.notifyState();
    return this.isMuted;
  }

  public toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    this.peers.forEach((peer) => this.updatePeerAudioGain(peer));
    multiplayerService.broadcastVoiceState(this.isTransmitting, this.isMuted, this.isDeafened);
    this.notifyState();
    return this.isDeafened;
  }

  public setVoiceMode(mode: VoiceMode) {
    this.mode = mode;
    if (mode === 'open_mic') {
      // In open mic, auto-initialize if enabled
      if (!this.localStream && this.isEnabled) {
        this.initMicrophone();
      }
    } else {
      // Switched to PTT: stop transmission until key is pressed
      this.setTransmitting(false);
    }
    this.saveSettings();
  }

  public setVoiceChannel(channel: VoiceChannel) {
    this.channel = channel;
    this.syncTeamConnections();
    this.saveSettings();
  }

  public setPttKey(key: string) {
    this.pttKey = key;
    this.saveSettings();
  }

  public setVadThreshold(threshold: number) {
    this.vadThreshold = Math.max(0.02, Math.min(0.40, threshold));
    this.saveSettings();
  }

  public setRadioSoundEffects(enabled: boolean) {
    this.radioSoundEffects = enabled;
    this.saveSettings();
  }

  public async setSelectedDevice(deviceId: string) {
    this.selectedDeviceId = deviceId;
    this.saveSettings();
    if (this.localStream) {
      // Reinitialize with new device
      await this.initMicrophone();
    }
  }

  // --- MIC LOOPBACK TEST ---
  public toggleTestLoopback(): boolean {
    if (!this.audioContext || !this.localGainNode) {
      this.initMicrophone().then(() => this.toggleTestLoopback());
      return true;
    }

    if (this.isTestLoopbackActive) {
      // Disconnect loopback
      this.testLoopbackGain?.disconnect();
      this.testLoopbackGain = null;
      this.isTestLoopbackActive = false;
    } else {
      // Connect loopback to local speakers so user can hear their own mic
      this.testLoopbackGain = this.audioContext.createGain();
      this.testLoopbackGain.gain.value = 0.8;
      this.localGainNode.connect(this.testLoopbackGain);
      this.testLoopbackGain.connect(this.audioContext.destination);
      this.isTestLoopbackActive = true;
    }

    this.notifyState();
    return this.isTestLoopbackActive;
  }

  // --- CLEANUP ---
  public destroy() {
    if (this.meterRafId) cancelAnimationFrame(this.meterRafId);
    if (this.vadSilenceTimer) clearTimeout(this.vadSilenceTimer);
    if (this.unsubscribeMultiplayer) this.unsubscribeMultiplayer();

    this.peers.forEach((peer) => {
      this.detachPeerAudio(peer);
      peer.call?.close();
    });
    this.peers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.status = 'disconnected';
    this.isTransmitting = false;
  }
}

export const voiceChatService = new VoiceChatService();

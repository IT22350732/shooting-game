import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Shield,
  Skull,
  Play,
  Copy,
  Check,
  Send,
  Radio,
  Wifi,
  Crown,
  CheckCircle2,
  X,
  Plus,
  RefreshCw,
  Zap,
  Globe,
  User,
  Mic,
  MicOff,
  Settings,
  HelpCircle,
  Info,
  Bot,
  Sparkles,
  BookOpen,
  Crosshair
} from 'lucide-react';
import {
  multiplayerService
} from '../../game/multiplayer/MultiplayerService';
import {
  MultiplayerMode,
  RoomConfig,
  NetworkPlayerState,
  TeamId,
  ChatMessage
} from '../../game/multiplayer/MultiplayerTypes';
import { ArenaId } from '../../types/game';
import { userManager } from '../../game/managers/UserManager';
import { AVATAR_OPTIONS } from '../../types/user';
import { soundManager } from '../../audio/SoundManager';
import { voiceChatService, VoiceChatServiceState } from '../../game/multiplayer/VoiceChatService';
import { VoiceSettingsModal } from './VoiceSettingsModal';
import { MultiplayerBriefing } from './MultiplayerBriefing';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchMatch: (arena: ArenaId, mode: MultiplayerMode) => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  onLaunchMatch
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'create' | 'join' | 'info'>('quick');
  const [room, setRoom] = useState<RoomConfig | null>(() => multiplayerService.room);
  const [players, setPlayers] = useState<NetworkPlayerState[]>(() => Array.from(multiplayerService.players.values()));
  const [connectionStatus, setConnectionStatus] = useState<string>('Ready to Connect');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Create room form state
  const [createRoomName, setCreateRoomName] = useState('');
  const [createMode, setCreateMode] = useState<MultiplayerMode>('multiplayer_coop');
  const [createArena, setCreateArena] = useState<ArenaId>('industrial');
  const [createScoreLimit, setCreateScoreLimit] = useState<number>(15);
  const [createCustomCode, setCreateCustomCode] = useState('');
  const [createEnableBots, setCreateEnableBots] = useState(true);

  // Join room form state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Voice Chat State
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceChatServiceState>(() => voiceChatService.getState());

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const currentUser = userManager.getCurrentUser();
  const currentAvatar = AVATAR_OPTIONS.find((a) => a.id === currentUser?.avatarId) || AVATAR_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) return;
    const unsub = voiceChatService.subscribe((s) => setVoiceState(s));
    return () => unsub();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    multiplayerService.setEvents({
      onRoomUpdate: (updatedRoom, updatedPlayers) => {
        setRoom({ ...updatedRoom });
        setPlayers([...updatedPlayers]);
      },
      onConnectionStatusChange: (status, msg) => {
        setConnectionStatus(msg || status);
        if (status === 'connected') {
          setIsJoining(false);
        }
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev.slice(-30), msg]);
        soundManager.playTacticalPing();
      },
      onMatchCountdown: (count) => {
        setCountdown(count);
        soundManager.playMatchStartCountdown(count);
      },
      onMatchStart: (arena, mode) => {
        setCountdown(null);
        onLaunchMatch(arena, mode);
        onClose();
      }
    });

    if (multiplayerService.room) {
      setRoom({ ...multiplayerService.room });
      setPlayers(Array.from(multiplayerService.players.values()));
    }
  }, [isOpen, onLaunchMatch, onClose]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  if (!isOpen) return null;

  // --- ACTIONS ---
  const handleQuickMatch = async (mode: MultiplayerMode = 'multiplayer_coop') => {
    setIsJoining(true);
    soundManager.playClick();
    // Default room name
    const defaultName = mode === 'multiplayer_coop' 
      ? `${currentUser?.username || 'Operative'}'s Co-Op Strike`
      : `${currentUser?.username || 'Operative'}'s Combat Sector`;
    await multiplayerService.createRoom(defaultName, mode, 'industrial', 15, 300, undefined, true);
    setRoom(multiplayerService.room ? { ...multiplayerService.room } : null);
    setPlayers(Array.from(multiplayerService.players.values()));
    setIsJoining(false);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    soundManager.playClick();
    const finalName = createRoomName.trim() || `${currentUser?.username || 'Operative'}'s Arena`;
    await multiplayerService.createRoom(
      finalName,
      createMode,
      createArena,
      createScoreLimit,
      300,
      createCustomCode.trim() || undefined,
      createEnableBots
    );
    setRoom(multiplayerService.room ? { ...multiplayerService.room } : null);
    setPlayers(Array.from(multiplayerService.players.values()));
    setIsJoining(false);
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    setIsJoining(true);
    soundManager.playClick();
    await multiplayerService.joinRoom(joinCodeInput.trim());
    setRoom(multiplayerService.room ? { ...multiplayerService.room } : null);
    setPlayers(Array.from(multiplayerService.players.values()));
    setIsJoining(false);
  };

  const handleLeaveLobby = () => {
    soundManager.playClick();
    multiplayerService.leaveRoom();
    setRoom(null);
    setPlayers([]);
    setChatMessages([]);
  };

  const handleSendChat = (text: string, isQuickPing: boolean = false) => {
    if (!text.trim()) return;
    multiplayerService.sendChatMessage(text.trim(), isQuickPing);
    setChatInput('');
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.roomId);
    setCopiedCode(true);
    soundManager.playTacticalPing();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLaunchMatch = () => {
    if (!multiplayerService.isHost || !room) return;
    soundManager.playClick();
    multiplayerService.startMatchCountdown();
  };

  const ARENAS: { id: ArenaId; name: string }[] = [
    { id: 'industrial', name: 'Suburban Residential Town' },
    { id: 'neon_city', name: 'Downtown Metropolis' },
    { id: 'desert', name: 'Desert Oasis Settlement' },
    { id: 'space_station', name: 'Freight Logistics & Warehouses' }
  ];

  const QUICK_CALLOUTS = [
    'Ready for combat!',
    'Alpha team push!',
    'Bravo team advance!',
    'Covering sniper lane!',
    'Need backup here!',
    'Good luck, operatives!'
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 10, 20, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 920,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1.5px solid rgba(2, 132, 199, 0.55)',
          borderRadius: 16,
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85)',
          color: '#f8fafc',
          overflow: 'hidden'
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(2, 132, 199, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(2, 132, 199, 0.25)',
                border: '1.5px solid #0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, letterSpacing: 1 }}>
                  MULTIPLAYER COMBAT ARENA
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: '#22c55e22',
                    border: '1px solid #22c55e',
                    color: '#22c55e',
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-display)'
                  }}
                >
                  ONLINE PVP
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-sub)', fontWeight: 700 }}>
                High-Performance Real-Time WebRTC Peer Network • Zero Latency
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Tactical Info / How it Works Button */}
            <button
              onClick={() => {
                soundManager.playClick();
                setShowBriefingModal(true);
              }}
              className="btn-cyber"
              style={{
                padding: '5px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.78rem',
                fontWeight: 900,
                color: '#38bdf8',
                background: 'rgba(2, 132, 199, 0.15)',
                border: '1.5px solid rgba(2, 132, 199, 0.5)',
                borderRadius: 20,
                cursor: 'pointer'
              }}
              title="How Multiplayer Works & Tactical Guide"
            >
              <HelpCircle size={15} />
              <span>HOW IT WORKS</span>
            </button>

            {/* Current Operative Profile Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: `linear-gradient(135deg, ${currentAvatar.color}, ${currentAvatar.accentColor})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}
              >
                <User size={13} strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8' }}>
                {currentUser?.username || 'Operative'}
              </span>
            </div>

            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="btn-cyber"
              style={{
                width: 34,
                height: 34,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* COUNTDOWN OVERLAY IF MATCH STARTING */}
        {countdown !== null && (
          <div
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(90deg, #0284c7, #22c55e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              animation: 'pulse 1s infinite',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '1.1rem',
              color: '#ffffff'
            }}
          >
            <Radio size={20} className="pulse-glow" />
            <span>OPERATIONAL LAUNCH IN {countdown > 0 ? countdown : 'ENGAGE!'}...</span>
          </div>
        )}

        {/* MODAL CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {!room ? (
            /* --- NOT IN ROOM: BROWSER / QUICK PLAY / CREATE / JOIN TABS --- */
            <div>
              {/* Tab Navigation */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 12 }}>
                <button
                  onClick={() => { setActiveTab('quick'); soundManager.playClick(); }}
                  className={`btn-cyber ${activeTab === 'quick' ? 'btn-cyber-primary' : ''}`}
                  style={{
                    padding: '8px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 800,
                    fontSize: '0.85rem'
                  }}
                >
                  <Zap size={16} />
                  <span>QUICK MATCH</span>
                </button>

                <button
                  onClick={() => { setActiveTab('create'); soundManager.playClick(); }}
                  className={`btn-cyber ${activeTab === 'create' ? 'btn-cyber-primary' : ''}`}
                  style={{
                    padding: '8px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 800,
                    fontSize: '0.85rem'
                  }}
                >
                  <Plus size={16} />
                  <span>HOST CUSTOM ARENA</span>
                </button>

                <button
                  onClick={() => { setActiveTab('join'); soundManager.playClick(); }}
                  className={`btn-cyber ${activeTab === 'join' ? 'btn-cyber-primary' : ''}`}
                  style={{
                    padding: '8px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 800,
                    fontSize: '0.85rem'
                  }}
                >
                  <Globe size={16} />
                  <span>JOIN WITH ROOM CODE</span>
                </button>

                <button
                  onClick={() => { setActiveTab('info'); soundManager.playClick(); }}
                  className={`btn-cyber ${activeTab === 'info' ? 'btn-cyber-primary' : ''}`}
                  style={{
                    padding: '8px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 800,
                    fontSize: '0.85rem'
                  }}
                >
                  <HelpCircle size={16} />
                  <span>HOW IT WORKS</span>
                </button>
              </div>

              {/* TAB 1: QUICK MATCH */}
              {activeTab === 'quick' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '10px 4px' }}>
                  <div style={{ textAlign: 'center', marginBottom: 6 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, margin: '0 0 6px 0', color: '#ffffff' }}>
                      RAPID DEPLOYMENT HUBS
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                      Jump straight into an operation. All modes support instant room sharing with code and tactical voice.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
                    {/* OPTION 1: CO-OP TEAM STRIKE (RECOMMENDED) */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.9))',
                        border: '1.5px solid #10b981',
                        borderRadius: 12,
                        padding: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ padding: '3px 8px', background: '#10b98122', border: '1px solid #10b981', borderRadius: 4, color: '#10b981', fontSize: '0.68rem', fontWeight: 900 }}>
                            RECOMMENDED
                          </span>
                          <Shield size={20} color="#10b981" />
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>
                          CO-OP TEAM STRIKE
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45, margin: 0 }}>
                          Fight together as a squad against waves of tactical AI bots, combat drones, and bosses. Health, score, and wave progression are shared.
                        </p>
                      </div>
                      <button
                        onClick={() => handleQuickMatch('multiplayer_coop')}
                        disabled={isJoining}
                        className="btn-cyber"
                        style={{
                          marginTop: 16,
                          padding: '10px 14px',
                          background: '#10b981',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          cursor: 'pointer'
                        }}
                      >
                        {isJoining ? <RefreshCw size={16} className="spin" /> : <Play size={16} fill="#ffffff" />}
                        <span>PLAY CO-OP STRIKE</span>
                      </button>
                    </div>

                    {/* OPTION 2: TEAM DEATHMATCH (TDM) */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(15, 23, 42, 0.9))',
                        border: '1.5px solid #0284c7',
                        borderRadius: 12,
                        padding: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ padding: '3px 8px', background: '#0284c722', border: '1px solid #0284c7', borderRadius: 4, color: '#38bdf8', fontSize: '0.68rem', fontWeight: 900 }}>
                            AI BOT BACKFILL
                          </span>
                          <Crosshair size={20} color="#38bdf8" />
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, color: '#38bdf8' }}>
                          TEAM DEATHMATCH
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45, margin: 0 }}>
                          Alpha vs Bravo squad deathmatch. Tactical AI Bots fill any empty spots so you always have combatants to battle.
                        </p>
                      </div>
                      <button
                        onClick={() => handleQuickMatch('multiplayer_tdm')}
                        disabled={isJoining}
                        className="btn-cyber btn-cyber-primary"
                        style={{
                          marginTop: 16,
                          padding: '10px 14px',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8
                        }}
                      >
                        {isJoining ? <RefreshCw size={16} className="spin" /> : <Play size={16} fill="#ffffff" />}
                        <span>PLAY TEAM MATCH</span>
                      </button>
                    </div>

                    {/* OPTION 3: FREE-FOR-ALL (FFA) */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(15, 23, 42, 0.9))',
                        border: '1.5px solid #a855f7',
                        borderRadius: 12,
                        padding: 18,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ padding: '3px 8px', background: '#a855f722', border: '1px solid #a855f7', borderRadius: 4, color: '#c084fc', fontSize: '0.68rem', fontWeight: 900 }}>
                            SOLO ARENA
                          </span>
                          <Skull size={20} color="#c084fc" />
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900, color: '#c084fc' }}>
                          FREE-FOR-ALL
                        </h4>
                        <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45, margin: 0 }}>
                          Every operative for themselves. Fast-paced elimination showdown with real players and combat bots.
                        </p>
                      </div>
                      <button
                        onClick={() => handleQuickMatch('multiplayer_ffa')}
                        disabled={isJoining}
                        className="btn-cyber"
                        style={{
                          marginTop: 16,
                          padding: '10px 14px',
                          background: '#a855f7',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          cursor: 'pointer'
                        }}
                      >
                        {isJoining ? <RefreshCw size={16} className="spin" /> : <Play size={16} fill="#ffffff" />}
                        <span>PLAY FREE-FOR-ALL</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CREATE ROOM */}
              {activeTab === 'create' && (
                <form onSubmit={handleCreateRoom} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800, marginBottom: 6 }}>
                        OPERATION / ROOM TITLE
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Vanguard Strike"
                        value={createRoomName}
                        onChange={(e) => setCreateRoomName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: 8,
                          color: '#ffffff',
                          fontFamily: 'var(--font-display)',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800, marginBottom: 6 }}>
                        COMBAT MODE
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                        {/* Co-Op Strike Option */}
                        <div
                          onClick={() => { setCreateMode('multiplayer_coop'); soundManager.playClick(); }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: createMode === 'multiplayer_coop' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                            border: createMode === 'multiplayer_coop' ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Shield size={18} color="#10b981" />
                            <div>
                              <div style={{ fontWeight: 900, fontSize: '0.85rem', color: createMode === 'multiplayer_coop' ? '#10b981' : '#ffffff' }}>
                                CO-OP TEAM STRIKE
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Survive progressive hostile waves together</span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.65rem', background: '#10b98122', color: '#10b981', padding: '2px 6px', borderRadius: 4, fontWeight: 900 }}>CO-OP</span>
                        </div>

                        {/* TDM Option */}
                        <div
                          onClick={() => { setCreateMode('multiplayer_tdm'); soundManager.playClick(); }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: createMode === 'multiplayer_tdm' ? 'rgba(2, 132, 199, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                            border: createMode === 'multiplayer_tdm' ? '1.5px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Crosshair size={18} color="#38bdf8" />
                            <div>
                              <div style={{ fontWeight: 900, fontSize: '0.85rem', color: createMode === 'multiplayer_tdm' ? '#38bdf8' : '#ffffff' }}>
                                TEAM DEATHMATCH
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Alpha vs Bravo (with AI Bot backfill)</span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.65rem', background: '#0284c722', color: '#38bdf8', padding: '2px 6px', borderRadius: 4, fontWeight: 900 }}>PVP</span>
                        </div>

                        {/* FFA Option */}
                        <div
                          onClick={() => { setCreateMode('multiplayer_ffa'); soundManager.playClick(); }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: createMode === 'multiplayer_ffa' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                            border: createMode === 'multiplayer_ffa' ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Skull size={18} color="#c084fc" />
                            <div>
                              <div style={{ fontWeight: 900, fontSize: '0.85rem', color: createMode === 'multiplayer_ffa' ? '#c084fc' : '#ffffff' }}>
                                FREE-FOR-ALL
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Solo elimination against all players</span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.65rem', background: '#a855f722', color: '#c084fc', padding: '2px 6px', borderRadius: 4, fontWeight: 900 }}>SOLO</span>
                        </div>
                      </div>
                    </div>

                    {createMode !== 'multiplayer_coop' ? (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800, marginBottom: 6 }}>
                          KILL ELIMINATION TARGET
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[10, 15, 25, 50].map((limit) => (
                            <button
                              type="button"
                              key={limit}
                              onClick={() => { setCreateScoreLimit(limit); soundManager.playClick(); }}
                              className={`btn-cyber ${createScoreLimit === limit ? 'btn-cyber-primary' : ''}`}
                              style={{ flex: 1, padding: '8px 0', fontWeight: 900 }}
                            >
                              {limit} KILLS
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '10px 12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 8 }}>
                        <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 900, marginBottom: 2 }}>
                          PROGRESSIVE HOSTILE WAVES
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          Survive as long as possible. Enemies escalate from light scouts to armored heavy bruisers and drones.
                        </span>
                      </div>
                    )}

                    {/* AI BOT BACKFILL TOGGLE */}
                    <div
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Bot size={18} color="#38bdf8" />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc' }}>
                            Tactical AI Bots Auto-Fill
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            Ensures active combatants on the map at all times
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={createEnableBots}
                        onChange={(e) => setCreateEnableBots(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: '#0284c7', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800, marginBottom: 6 }}>
                        COMBAT ARENA
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {ARENAS.map((a) => (
                          <div
                            key={a.id}
                            onClick={() => { setCreateArena(a.id); soundManager.playClick(); }}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              background: createArena === a.id ? 'rgba(2, 132, 199, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                              border: createArena === a.id ? '1.5px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.1)',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              color: createArena === a.id ? '#38bdf8' : '#e2e8f0'
                            }}
                          >
                            {a.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                      <button
                        type="submit"
                        disabled={isJoining}
                        className="btn-cyber btn-cyber-primary"
                        style={{
                          width: '100%',
                          padding: '12px 20px',
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10
                        }}
                      >
                        <Plus size={18} />
                        <span>CREATE & OPEN LOBBY</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* TAB 3: JOIN WITH ROOM CODE */}
              {activeTab === 'join' && (
                <div style={{ maxWidth: 440, margin: '20px auto', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 16,
                      background: 'rgba(2, 132, 199, 0.18)',
                      border: '2px solid #0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px auto',
                      color: '#38bdf8'
                    }}
                  >
                    <Globe size={28} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, margin: '0 0 6px 0' }}>
                    ENTER ROOM CODE
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 20px 0' }}>
                    Enter the 5-character tactical lobby code shared by the host to join their game.
                  </p>

                  <form onSubmit={handleJoinWithCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input
                      type="text"
                      placeholder="e.g. 7X9K2"
                      maxLength={12}
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      style={{
                        padding: '12px 18px',
                        textAlign: 'center',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '2px solid rgba(2, 132, 199, 0.5)',
                        borderRadius: 10,
                        color: '#38bdf8',
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.4rem',
                        fontWeight: 900,
                        letterSpacing: 4
                      }}
                    />

                    <button
                      type="submit"
                      disabled={isJoining || !joinCodeInput.trim()}
                      className="btn-cyber btn-cyber-primary"
                      style={{
                        padding: '12px 20px',
                        fontWeight: 900,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10
                      }}
                    >
                      {isJoining ? <RefreshCw size={18} className="spin" /> : <Play size={18} fill="#ffffff" />}
                      <span>{isJoining ? 'CONNECTING...' : 'JOIN ROOM'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: HOW IT WORKS / BRIEFING */}
              {activeTab === 'info' && (
                <MultiplayerBriefing />
              )}
            </div>
          ) : (
            /* --- IN ROOM LOBBY VIEW --- */
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
              {/* Left Column: Room Details & Player Roster */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Room Info Bar */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 900 }}>
                      {room.roomName}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
                      {room.mode === 'multiplayer_coop'
                        ? 'CO-OP TEAM STRIKE'
                        : room.mode === 'multiplayer_tdm'
                        ? 'TEAM DEATHMATCH'
                        : 'FREE-FOR-ALL'} • MAP: {room.arena.toUpperCase()} • {room.mode === 'multiplayer_coop' ? 'WAVE SURVIVAL' : `LIMIT: ${room.scoreLimit} KILLS`}
                      {room.enableBots ? ' • AI BOTS ACTIVE' : ''}
                    </span>
                  </div>

                  {/* Room Code Badge with Copy */}
                  <div
                    onClick={handleCopyCode}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      background: 'rgba(2, 132, 199, 0.2)',
                      border: '1px solid #0284c7',
                      borderRadius: 8,
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 900, color: '#38bdf8', letterSpacing: 1 }}>
                      {room.roomId}
                    </span>
                    {copiedCode ? <Check size={16} color="#22c55e" /> : <Copy size={16} color="#38bdf8" />}
                  </div>
                </div>

                {/* Tactical Voice Comms Strip */}
                <div
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: 'rgba(2, 132, 199, 0.08)',
                    border: '1px solid rgba(2, 132, 199, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: voiceState.status === 'connected' ? '#22c55e' : '#64748b',
                        boxShadow: voiceState.status === 'connected' ? '0 0 8px #22c55e' : 'none'
                      }}
                    />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Radio size={14} color="#38bdf8" />
                      {room.mode === 'multiplayer_tdm'
                        ? `TACTICAL VOICE: ${multiplayerService.localPlayer?.team === 'alpha' ? 'TEAM ALPHA' : 'TEAM BRAVO'}`
                        : 'TACTICAL VOICE COMMS'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        if (voiceState.status !== 'connected') {
                          voiceChatService.initMicrophone();
                        } else {
                          voiceChatService.toggleMute();
                        }
                      }}
                      className="btn-cyber"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: voiceState.isMuted ? '#ef4444' : '#22c55e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {voiceState.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                      <span>{voiceState.status !== 'connected' ? 'ENABLE VOICE' : voiceState.isMuted ? 'MIC MUTED' : 'MIC ACTIVE'}</span>
                    </button>

                    <button
                      onClick={() => { soundManager.playClick(); setShowVoiceSettings(true); }}
                      className="btn-cyber"
                      style={{ padding: '4px 8px', color: '#94a3b8' }}
                      title="Voice Settings & Squad Mixer"
                    >
                      <Settings size={14} />
                    </button>
                  </div>
                </div>

                {/* Team Roster */}
                {room.mode === 'multiplayer_coop' ? (
                  /* Co-Op Strike Roster */
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1.5px solid rgba(16, 185, 129, 0.45)',
                      borderRadius: 10,
                      padding: 12
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Shield size={16} />
                        CO-OP STRIKE SQUAD ({players.length}/4)
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#6ee7b7', fontWeight: 800 }}>
                        OBJECTIVE: SURVIVE WAVES
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {players.map((p) => {
                        const isPeerSpeaking = (p.id === multiplayerService.localPlayerId && voiceState.isLocalSpeaking) ||
                          Boolean(voiceState.peers.find((vp) => vp.playerId === p.id)?.isSpeaking || p.voiceState?.isSpeaking);
                        return (
                          <div
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: p.id === multiplayerService.localPlayerId ? 'rgba(16, 185, 129, 0.25)' : 'rgba(0, 0, 0, 0.35)',
                              border: isPeerSpeaking ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 6,
                              fontSize: '0.82rem',
                              fontWeight: 800
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {p.isHost && <Crown size={14} color="#facc15" />}
                              <span style={{ color: '#ffffff' }}>{p.name} {p.id === multiplayerService.localPlayerId && '(YOU)'}</span>
                              {isPeerSpeaking && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#22c55e', fontSize: '0.65rem' }}>
                                  <Mic size={12} />
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <CheckCircle2 size={14} color={p.isReady ? '#22c55e' : '#64748b'} />
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{p.ping}ms</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: 6, fontSize: '0.72rem', color: '#94a3b8' }}>
                      💡 Co-op mode connects operatives to fight enemy waves together. Friendly fire is disabled. Health and revive beacons sync across all clients.
                    </div>
                  </div>
                ) : room.mode === 'multiplayer_tdm' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* Team Alpha (Blue) */}
                    <div
                      style={{
                        background: 'rgba(2, 132, 199, 0.1)',
                        border: '1.5px solid rgba(2, 132, 199, 0.4)',
                        borderRadius: 10,
                        padding: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 900, color: '#38bdf8' }}>
                          TEAM ALPHA ({players.filter((p) => p.team === 'alpha').length})
                        </span>
                        {multiplayerService.localPlayer?.team !== 'alpha' && (
                          <button
                            onClick={() => { multiplayerService.switchTeam('alpha'); soundManager.playClick(); }}
                            className="btn-cyber"
                            style={{ padding: '3px 10px', fontSize: '0.68rem', fontWeight: 800 }}
                          >
                            JOIN
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {players.filter((p) => p.team === 'alpha').map((p) => {
                          const isPeerSpeaking = (p.id === multiplayerService.localPlayerId && voiceState.isLocalSpeaking) ||
                            Boolean(voiceState.peers.find((vp) => vp.playerId === p.id)?.isSpeaking || p.voiceState?.isSpeaking);
                          return (
                            <div
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                background: p.id === multiplayerService.localPlayerId ? 'rgba(2, 132, 199, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                                border: isPeerSpeaking ? '1px solid #22c55e' : '1px solid transparent',
                                borderRadius: 6,
                                fontSize: '0.8rem',
                                fontWeight: 800
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {p.isHost && <Crown size={14} color="#facc15" />}
                                <span>{p.name} {p.id === multiplayerService.localPlayerId && '(YOU)'}</span>
                                {isPeerSpeaking && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#22c55e', fontSize: '0.65rem' }}>
                                    <Mic size={12} />
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle2 size={14} color={p.isReady ? '#22c55e' : '#64748b'} />
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{p.ping}ms</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Team Bravo (Red) */}
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1.5px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: 10,
                        padding: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 900, color: '#f87171' }}>
                          TEAM BRAVO ({players.filter((p) => p.team === 'bravo').length})
                        </span>
                        {multiplayerService.localPlayer?.team !== 'bravo' && (
                          <button
                            onClick={() => { multiplayerService.switchTeam('bravo'); soundManager.playClick(); }}
                            className="btn-cyber"
                            style={{ padding: '3px 10px', fontSize: '0.68rem', fontWeight: 800 }}
                          >
                            JOIN
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {players.filter((p) => p.team === 'bravo').map((p) => {
                          const isPeerSpeaking = (p.id === multiplayerService.localPlayerId && voiceState.isLocalSpeaking) ||
                            Boolean(voiceState.peers.find((vp) => vp.playerId === p.id)?.isSpeaking || p.voiceState?.isSpeaking);
                          return (
                            <div
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                background: p.id === multiplayerService.localPlayerId ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                                border: isPeerSpeaking ? '1px solid #22c55e' : '1px solid transparent',
                                borderRadius: 6,
                                fontSize: '0.8rem',
                                fontWeight: 800
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {p.isHost && <Crown size={14} color="#facc15" />}
                                <span>{p.name} {p.id === multiplayerService.localPlayerId && '(YOU)'}</span>
                                {isPeerSpeaking && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#22c55e', fontSize: '0.65rem' }}>
                                    <Mic size={12} />
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle2 size={14} color={p.isReady ? '#22c55e' : '#64748b'} />
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{p.ping}ms</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* FFA Roster */
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 10,
                      padding: 12
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 900, color: '#c084fc', display: 'block', marginBottom: 10 }}>
                      OPERATIVES IN COMBAT ({players.length})
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {players.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: p.id === multiplayerService.localPlayerId ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            fontWeight: 800
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {p.isHost && <Crown size={14} color="#facc15" />}
                            <span>{p.name} {p.id === multiplayerService.localPlayerId && '(YOU)'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle2 size={14} color={p.isReady ? '#22c55e' : '#64748b'} />
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{p.ping}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Host & Player Action Controls */}
                <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                  {multiplayerService.isHost ? (
                    <button
                      onClick={handleLaunchMatch}
                      className="btn-cyber btn-cyber-primary pulse-glow"
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        fontWeight: 900,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10
                      }}
                    >
                      <Play size={18} fill="#ffffff" />
                      <span>LAUNCH OPERATION NOW</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { multiplayerService.toggleReady(); soundManager.playClick(); }}
                      className={`btn-cyber ${multiplayerService.localPlayer?.isReady ? 'btn-cyber-primary' : ''}`}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        fontWeight: 900,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10
                      }}
                    >
                      <CheckCircle2 size={18} />
                      <span>{multiplayerService.localPlayer?.isReady ? 'READY TO PLAY' : 'SET AS READY'}</span>
                    </button>
                  )}

                  <button
                    onClick={handleLeaveLobby}
                    className="btn-cyber"
                    style={{ padding: '12px 18px', fontWeight: 800, color: '#ef4444' }}
                  >
                    LEAVE LOBBY
                  </button>
                </div>
              </div>

              {/* Right Column: In-Lobby Tactical Chat */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 10,
                  height: 380,
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: 800, fontSize: '0.8rem', color: '#94a3b8' }}>
                  TACTICAL COMMS / CHAT
                </div>

                {/* Chat Log */}
                <div
                  ref={chatScrollRef}
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    fontSize: '0.78rem'
                  }}
                >
                  {chatMessages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#64748b', margin: 'auto' }}>
                      Comms frequency clear. Send a tactical ping!
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 800, color: msg.senderTeam === 'alpha' ? '#38bdf8' : msg.senderTeam === 'bravo' ? '#f87171' : '#c084fc' }}>
                        {msg.senderName}:
                      </span>
                      <span style={{ color: '#e2e8f0', wordBreak: 'break-word' }}>{msg.text}</span>
                    </div>
                  ))}
                </div>

                {/* Quick Pings Carousel */}
                <div style={{ padding: '6px 10px', background: 'rgba(255, 255, 255, 0.03)', display: 'flex', gap: 6, overflowX: 'auto' }}>
                  {QUICK_CALLOUTS.map((callout, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendChat(callout, true)}
                      style={{
                        padding: '3px 8px',
                        background: 'rgba(2, 132, 199, 0.2)',
                        border: '1px solid rgba(2, 132, 199, 0.4)',
                        borderRadius: 4,
                        color: '#38bdf8',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer'
                      }}
                    >
                      {callout}
                    </button>
                  ))}
                </div>

                {/* Chat Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChat(chatInput);
                  }}
                  style={{ padding: '8px 10px', display: 'flex', gap: 6, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
                >
                  <input
                    type="text"
                    placeholder="Type message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: '0.8rem'
                    }}
                  />
                  <button
                    type="submit"
                    className="btn-cyber btn-cyber-primary"
                    style={{ padding: '6px 12px', display: 'flex', alignItems: 'center' }}
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Settings & Squad Audio Mixer Modal */}
      <VoiceSettingsModal
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
      />

      {/* Tactical Briefing / How It Works Modal */}
      {showBriefingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 10, 20, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBriefingModal(false);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: 820,
              maxHeight: '90vh',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1.5px solid rgba(2, 132, 199, 0.6)',
              borderRadius: 16,
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9)',
              overflow: 'hidden'
            }}
          >
            <MultiplayerBriefing onClose={() => setShowBriefingModal(false)} isModal={true} />
          </div>
        </div>
      )}
    </div>
  );
};

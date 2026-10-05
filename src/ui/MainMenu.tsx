import React, { useState } from 'react';
import {
  Play,
  Crosshair,
  Zap,
  Sliders,
  HelpCircle,
  Award,
  Coins,
  Skull,
  Flame,
  Compass,
  Layers,
  ChevronRight,
  ChevronDown,
  X,
  ShieldCheck,
  Shield,
  Target,
  Maximize,
  Minimize,
  Lock,
  CheckCircle2,
  Clock,
  Trophy,
  User,
  Users
} from 'lucide-react';
import { GameMode, ArenaId, MissionConfig } from '../types/game';
import { MISSIONS } from '../game/missions/MissionData';
import { saveManager } from '../game/managers/SaveManager';
import { userManager } from '../game/managers/UserManager';
import { AVATAR_OPTIONS } from '../types/user';
import { useFullscreen } from '../utils/fullscreen';

interface MainMenuProps {
  onStartGame: (mode: GameMode, arena: ArenaId, mission?: MissionConfig) => void;
  onPreviewArena?: (arena: ArenaId) => void;
  onOpenArmory: () => void;
  onOpenUpgrades: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
  onOpenAuth: () => void;
  onOpenLeaderboard: () => void;
  onOpenMultiplayer: () => void;
  coins: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onPreviewArena,
  onOpenArmory,
  onOpenUpgrades,
  onOpenSettings,
  onOpenTutorial,
  onOpenAuth,
  onOpenLeaderboard,
  onOpenMultiplayer,
  coins
}) => {
  const savedDifficulty = (saveManager.getData().settings.difficulty || 'medium') as GameMode;
  const [selectedMode, setSelectedMode] = useState<GameMode>(savedDifficulty);
  const [selectedArena, setSelectedArena] = useState<ArenaId>('industrial');
  const [selectedMission, setSelectedMission] = useState<MissionConfig | null>(null);
  const [showMissionSelect, setShowMissionSelect] = useState(false);
  const [activeTab, setActiveTab] = useState<'missions' | 'mode' | 'arena'>('missions');
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  const handleModeChange = (mode: GameMode) => {
    setSelectedMission(null);
    setSelectedMode(mode);
    if (mode === 'easy' || mode === 'medium' || mode === 'hard') {
      const cur = saveManager.getData().settings;
      saveManager.updateSettings({ ...cur, difficulty: mode });
    }
  };

  const savedData = saveManager.getData();
  const currentUser = userManager.getCurrentUser();
  const currentAvatar = AVATAR_OPTIONS.find(a => a.id === currentUser?.avatarId) || AVATAR_OPTIONS[0];

  const ARENAS: { id: ArenaId; name: string; desc: string; tag: string; environment: string }[] = [
    {
      id: 'industrial',
      name: 'SUBURBAN RESIDENTIAL TOWN',
      desc: 'Quiet residential neighborhood with detached family houses, pitched roofs, front lawns, sidewalks, and streets.',
      tag: 'HOUSES & STREETS',
      environment: 'Residential Suburb'
    },
    {
      id: 'neon_city',
      name: 'DOWNTOWN METROPOLIS',
      desc: 'Urban city avenue lined with multi-story commercial buildings, storefronts, awnings, rooftop water towers, and crosswalks.',
      tag: 'URBAN BUILDINGS',
      environment: 'Downtown City'
    },
    {
      id: 'desert',
      name: 'DESERT OASIS SETTLEMENT',
      desc: 'Traditional sunlit desert village with adobe clay houses, rooftop terraces, market canopies, and stone alleys.',
      tag: 'ADOBE HOUSES',
      environment: 'Desert Town'
    },
    {
      id: 'space_station',
      name: 'FREIGHT LOGISTICS & WAREHOUSES',
      desc: 'Heavy industrial logistics depot with corrugated metal warehouses, stacked cargo shipping containers, and loading bays.',
      tag: 'REAL WAREHOUSES',
      environment: 'Industrial Depot'
    }
  ];

  const MODES: { id: GameMode; name: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'easy',
      name: 'EASY',
      desc: 'Casual combat with slower enemies, reduced damage, and relaxed wave pacing.',
      icon: <Shield size={20} color="#22c55e" />,
      color: '#22c55e'
    },
    {
      id: 'medium',
      name: 'MEDIUM',
      desc: 'Standard combat simulation with balanced enemy health, tactical escalation, and boss encounters.',
      icon: <Flame size={20} color="#0284c7" />,
      color: '#0284c7'
    },
    {
      id: 'hard',
      name: 'HARD',
      desc: 'High-octane challenge: aggressive androids, rapid speed, lethal damage, and heavy enemy swarms.',
      icon: <Skull size={20} color="#e11d48" />,
      color: '#e11d48'
    },
    {
      id: 'free_mode',
      name: 'FREE MODE',
      desc: 'Endless target shooting range: only targets (no live enemies), infinite shooting freely.',
      icon: <Target size={20} color="#a855f7" />,
      color: '#a855f7'
    }
  ];

  const currentModeInfo = MODES.find((m) => m.id === selectedMode) || MODES[0];
  const currentArenaInfo = ARENAS.find((a) => a.id === selectedArena) || ARENAS[0];

  const handleSelectArena = (arenaId: ArenaId) => {
    setSelectedArena(arenaId);
    if (onPreviewArena) {
      onPreviewArena(arenaId);
    }
  };

  return (
    <div className="menu-scroll-container">
      {/* CINEMATIC LOBBY VIGNETTES */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.45) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 140,
          background: 'linear-gradient(to top, rgba(15, 23, 42, 0.55) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />

      {/* TOP BAR: OPERATIVE STATUS & RESOURCE HUD */}
      <div className="menu-top-bar">
        {/* Operative Profile Pill (Click to Switch/Login) */}
        <div
          onClick={onOpenAuth}
          className="glass-panel menu-top-profile"
          style={{
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            border: '1.5px solid rgba(2, 132, 199, 0.5)',
            background: 'rgba(255, 255, 255, 0.94)',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Click to switch operative profile or login"
        >
          <div
            className="menu-top-profile-badge"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${currentAvatar.color}, ${currentAvatar.accentColor})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: `0 2px 8px ${currentAvatar.color}55`,
              flexShrink: 0
            }}
          >
            <User size={20} strokeWidth={2.4} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#0f172a', fontWeight: 900, letterSpacing: '0.04em' }}>
                {currentUser.username}
              </span>
              <span
                style={{
                  background: 'rgba(2, 132, 199, 0.12)',
                  color: '#0284c7',
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 4
                }}
              >
                {currentUser.tier.replace('_', ' ')}
              </span>
            </div>

            <div className="menu-top-profile-stats" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
                RECORD: <strong style={{ color: '#0284c7' }}>{currentUser.highScore.toLocaleString()}</strong>
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#94a3b8' }} />
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
                BEST: <strong style={{ color: '#f97316' }}>WAVE {currentUser.highestWave}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Currency & Quick Settings Hub */}
        <div className="menu-top-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Coins Balance Pill */}
          <div
            className="glass-panel"
            style={{
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1.5px solid rgba(217, 119, 6, 0.35)',
              background: 'rgba(255, 255, 255, 0.9)',
              boxShadow: '0 4px 15px rgba(217, 119, 6, 0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          >
            <Coins size={18} color="#d97706" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.6rem', color: '#92400e', fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1 }}>CREDITS</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#b45309', fontWeight: 900, lineHeight: 1.1 }}>
                {coins}
              </span>
            </div>
          </div>

          {/* Leaderboard Trophy Quick Button */}
          <button
            onClick={onOpenLeaderboard}
            className="glass-panel"
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid rgba(234, 179, 8, 0.45)',
              background: 'rgba(255, 255, 255, 0.92)',
              color: '#d97706',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(234, 179, 8, 0.2)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
            aria-label="Leaderboard & High Scores"
            title="High Scores & Leaderboard"
          >
            <Trophy size={18} />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="glass-panel"
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid rgba(15, 23, 42, 0.15)',
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#0f172a',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
            aria-label="Settings"
          >
            <Sliders size={18} />
          </button>

          {/* Gameplay Instructions & Controls Info Button */}
          <button
            onClick={onOpenTutorial}
            className="glass-panel menu-top-info-btn"
            style={{
              height: 42,
              padding: '0 12px',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1.5px solid rgba(2, 132, 199, 0.4)',
              background: 'rgba(255, 255, 255, 0.94)',
              color: '#0284c7',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.8rem',
              fontWeight: 800,
              letterSpacing: '0.04em'
            }}
            aria-label="Game Instructions & Controls"
            title="Game Instructions & Controls"
          >
            <HelpCircle size={18} color="#0284c7" />
            <span>INFO</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={() => toggleFullscreen()}
            onTouchEnd={(e) => {
              e.preventDefault();
              toggleFullscreen();
            }}
            className="glass-panel"
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isFullscreen ? '1.5px solid #0284c7' : '1.5px solid rgba(15, 23, 42, 0.15)',
              background: isFullscreen ? 'rgba(2, 132, 199, 0.14)' : 'rgba(255, 255, 255, 0.9)',
              color: isFullscreen ? '#0284c7' : '#0f172a',
              cursor: 'pointer',
              boxShadow: isFullscreen ? '0 0 12px rgba(2, 132, 199, 0.3)' : '0 4px 12px rgba(15, 23, 42, 0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>

      {/* TACTICAL SELECTION OPTIONS (CORNER DROPDOWN HUB) */}
      <div className="menu-corner-selectors">
        {/* Mode Selector Dropdown */}
        <div className="menu-dropdown-wrapper">
          <div className="menu-dropdown-icon">
            <Crosshair size={14} color="#0284c7" />
          </div>
          <div className="menu-dropdown-content">
            <span className="menu-dropdown-tag">MODE</span>
            <span className="menu-dropdown-val">{currentModeInfo.name}</span>
          </div>
          <ChevronDown size={14} color="#0284c7" className="menu-select-arrow" />
          <select
            value={selectedMode}
            onChange={(e) => handleModeChange(e.target.value as GameMode)}
            className="menu-native-select-overlay"
            aria-label="Select Game Mode"
          >
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                MODE: {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Map / Arena Selector Dropdown */}
        <div className="menu-dropdown-wrapper">
          <div className="menu-dropdown-icon">
            <Layers size={14} color="#0284c7" />
          </div>
          <div className="menu-dropdown-content">
            <span className="menu-dropdown-tag">ARENA</span>
            <span className="menu-dropdown-val">{currentArenaInfo.name}</span>
          </div>
          <ChevronDown size={14} color="#0284c7" className="menu-select-arrow" />
          <select
            value={selectedArena}
            onChange={(e) => handleSelectArena(e.target.value as ArenaId)}
            className="menu-native-select-overlay"
            aria-label="Select Combat Arena"
          >
            {ARENAS.map((a) => (
              <option key={a.id} value={a.id}>
                MAP: {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CENTER HERO: WIDE OPEN CINEMATIC 3D VIEW */}
      <div className="menu-center-hero">
        <div
          className="menu-hero-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '3px 12px',
            borderRadius: 20,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            marginBottom: 6
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.68rem', color: '#ffffff', letterSpacing: '0.22em', fontWeight: 800 }}>
            TACTICAL SIMULATION ONLINE
          </span>
        </div>

        <img
          src="/logo.png"
          alt="Shoot Arena"
          className="menu-hero-logo"
          style={{
            width: 'clamp(95px, 14vw, 150px)',
            height: 'clamp(95px, 14vw, 150px)',
            objectFit: 'contain',
            borderRadius: '50%',
            filter: 'drop-shadow(0 4px 25px rgba(2, 132, 199, 0.6)) drop-shadow(0 2px 10px rgba(0, 0, 0, 0.8))',
            marginBottom: 6,
            animation: 'pulseGlow 3s infinite alternate'
          }}
        />

        <h1
          className="menu-hero-title"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.8rem, 5vw, 3rem)',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '0.08em',
            margin: 0,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.7), 0 0 35px rgba(2, 132, 199, 0.5)',
            lineHeight: 1.1
          }}
        >
          SHOOT <span style={{ color: '#38bdf8' }}>ARENA</span>
        </h1>
        <p
          className="menu-hero-sub"
          style={{
            fontFamily: 'var(--font-sub)',
            fontSize: 'clamp(0.75rem, 1.8vw, 0.95rem)',
            color: 'rgba(255, 255, 255, 0.9)',
            marginTop: 4,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textShadow: '0 1px 8px rgba(0, 0, 0, 0.6)'
          }}
        >
          High-Velocity 3D Sci-Fi Combat
        </p>
      </div>

      {/* BOTTOM CONTAINER: TACTICAL DOCK & DEPLOY HUB */}
      <div className="menu-bottom-container">
        {/* QUICK ACTION DOCK (MISSIONS, ARMORY & UPGRADES) */}
        <div className="menu-bottom-dock">
          <button
            onClick={() => {
              setActiveTab('missions');
              setShowMissionSelect(true);
            }}
            className={`btn-cyber menu-dock-btn ${selectedMission ? 'menu-dock-active' : ''}`}
            style={{
              background: selectedMission ? 'rgba(2, 132, 199, 0.18)' : 'rgba(255, 255, 255, 0.94)',
              border: selectedMission ? '1.5px solid #0284c7' : '1.5px solid rgba(2, 132, 199, 0.35)',
              color: '#0284c7',
              boxShadow: '0 6px 20px rgba(2, 132, 199, 0.2)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              fontWeight: 800
            }}
          >
            <Award size={18} color="#0284c7" />
            <span>MISSIONS (5)</span>
          </button>

          <button
            onClick={onOpenArmory}
            className="btn-cyber menu-dock-btn"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              boxShadow: '0 6px 20px rgba(15, 23, 42, 0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          >
            <Crosshair size={18} color="#0284c7" />
            <span>ARMORY</span>
          </button>

          <button
            onClick={onOpenUpgrades}
            className="btn-cyber btn-cyber-gold menu-dock-btn"
            style={{
              boxShadow: '0 6px 20px rgba(217, 119, 6, 0.2)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          >
            <Zap size={18} />
            <span>UPGRADES</span>
          </button>

          <button
            onClick={onOpenMultiplayer}
            className="btn-cyber menu-dock-btn pulse-glow"
            style={{
              background: 'linear-gradient(135deg, #0284c7, #8b5cf6)',
              boxShadow: '0 6px 22px rgba(2, 132, 199, 0.45)',
              border: '1.5px solid rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#ffffff',
              fontWeight: 900
            }}
          >
            <Users size={18} color="#ffffff" />
            <span>MULTIPLAYER</span>
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="btn-cyber menu-dock-btn"
            style={{
              background: 'rgba(255, 255, 255, 0.94)',
              boxShadow: '0 6px 20px rgba(234, 179, 8, 0.2)',
              border: '1.5px solid rgba(234, 179, 8, 0.5)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#d97706',
              fontWeight: 800
            }}
          >
            <Trophy size={18} color="#d97706" />
            <span>RANKS</span>
          </button>

          <button
            onClick={onOpenTutorial}
            className="btn-cyber menu-dock-btn"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              boxShadow: '0 6px 20px rgba(15, 23, 42, 0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#0284c7',
              fontWeight: 800
            }}
          >
            <HelpCircle size={18} color="#0284c7" />
            <span>INFO</span>
          </button>
        </div>

        {/* TACTICAL MISSION DEPLOYMENT PANEL */}
        <div className="menu-bottom-deploy">
          {/* Mission & Arena Info Card (Desktop Only) */}
          <div
            onClick={() => setShowMissionSelect(true)}
            className="glass-panel menu-mission-card"
            style={{
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              border: selectedMission ? `1.5px solid ${selectedMission.accentColor}` : '1.5px solid rgba(2, 132, 199, 0.45)',
              background: 'rgba(255, 255, 255, 0.92)',
              boxShadow: '0 4px 18px rgba(15, 23, 42, 0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {selectedMission ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: `${selectedMission.accentColor}18`,
                        color: selectedMission.accentColor,
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.62rem',
                        fontWeight: 900
                      }}
                    >
                      OP 0{selectedMission.number}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedMission.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                    <span style={{ fontSize: '0.66rem', fontFamily: 'var(--font-display)', color: selectedMission.accentColor, fontWeight: 800 }}>
                      MAP: {selectedMission.arenaName}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {currentModeInfo.icon}
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                      {currentModeInfo.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                    <span style={{ fontSize: '0.66rem', fontFamily: 'var(--font-display)', color: '#0284c7', fontWeight: 800 }}>
                      MAP: {currentArenaInfo.name}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: selectedMission ? `${selectedMission.accentColor}18` : 'rgba(2, 132, 199, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: selectedMission ? selectedMission.accentColor : '#0284c7',
                flexShrink: 0
              }}
            >
              <Layers size={15} />
            </div>
          </div>

          {/* MAIN DEPLOY BUTTON WITH INTEGRATED MISSION/MODE SUMMARY */}
          <button
            onClick={() => onStartGame(selectedMission ? 'mission' : selectedMode, selectedMission ? selectedMission.arena : selectedArena, selectedMission || undefined)}
            className="btn-cyber btn-cyber-primary pulse-glow menu-deploy-btn"
            style={{
              padding: '8px 18px',
              minHeight: 40,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 6px 25px rgba(2, 132, 199, 0.45)',
              flexShrink: 0
            }}
          >
            <Play size={18} fill="#ffffff" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 900, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
                {selectedMission ? 'DEPLOY OPERATION' : 'DEPLOY TO COMBAT'}
              </span>
              <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.88)', whiteSpace: 'nowrap' }}>
                {selectedMission ? `OP 0${selectedMission.number}: ${selectedMission.title}` : `${currentModeInfo.name} • ${currentArenaInfo.name.split(' ')[0]}`}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* OWNER & COPYRIGHT FOOTER */}
      <div
        className="menu-owner-footer-wrap"
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 10,
          position: 'relative',
          zIndex: 10
        }}
      >
        <div
          className="glass-panel menu-owner-footer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 16px',
            borderRadius: 20,
            background: 'rgba(255, 255, 255, 0.88)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            fontSize: '0.74rem',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.04em'
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0284c7' }} />
          <span style={{ color: '#64748b' }}>
            Owner: <strong style={{ color: '#0f172a', fontWeight: 800 }}>Imeth Mendis</strong> (All Rights Reserved)
          </span>
        </div>
      </div>

      {/* EXPANDABLE MISSION & ARENA SELECTION DRAWER */}
      {showMissionSelect && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 100,
            overflowY: 'auto'
          }}
          onClick={() => setShowMissionSelect(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: '85vh',
              borderRadius: '20px 20px 0 0',
              background: 'rgba(255, 255, 255, 0.98)',
              border: '2px solid rgba(2, 132, 199, 0.4)',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px 24px calc(var(--safe-bottom) + 20px) 24px',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#0284c7', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.15em' }}>
                  TACTICAL DEPLOYMENT PROTOCOL
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 0 0' }}>
                  CONFIGURE MISSION & ARENA
                </h2>
              </div>

              <button
                onClick={() => setShowMissionSelect(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(15, 23, 42, 0.15)',
                  background: 'rgba(241, 245, 249, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Switches: Missions vs Survival Mode vs Arena */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setActiveTab('missions')}
                style={{
                  flex: 1.2,
                  padding: '10px 10px',
                  borderRadius: 10,
                  border: activeTab === 'missions' ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.1)',
                  background: activeTab === 'missions' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(255, 255, 255, 0.8)',
                  color: activeTab === 'missions' ? '#0284c7' : '#64748b',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <Award size={17} />
                MISSIONS (5)
              </button>

              <button
                onClick={() => setActiveTab('mode')}
                style={{
                  flex: 1,
                  padding: '10px 10px',
                  borderRadius: 10,
                  border: activeTab === 'mode' ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.1)',
                  background: activeTab === 'mode' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(255, 255, 255, 0.8)',
                  color: activeTab === 'mode' ? '#0284c7' : '#64748b',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <Flame size={17} />
                SURVIVAL
              </button>

              <button
                onClick={() => setActiveTab('arena')}
                style={{
                  flex: 1,
                  padding: '10px 10px',
                  borderRadius: 10,
                  border: activeTab === 'arena' ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.1)',
                  background: activeTab === 'arena' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(255, 255, 255, 0.8)',
                  color: activeTab === 'arena' ? '#0284c7' : '#64748b',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <Compass size={17} />
                ARENAS
              </button>
            </div>

            {/* TAB CONTENT: MISSIONS */}
            {activeTab === 'missions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MISSIONS.map((mission) => {
                  const isCompleted = saveManager.isMissionCompleted(mission.id);
                  const isUnlocked = saveManager.isMissionUnlocked(mission.id);
                  const isSelected = selectedMission?.id === mission.id;

                  return (
                    <div
                      key={mission.id}
                      onClick={() => {
                        if (isUnlocked) {
                          setSelectedMission(mission);
                          setSelectedArena(mission.arena);
                          if (onPreviewArena) onPreviewArena(mission.arena);
                        }
                      }}
                      className="glass-panel"
                      style={{
                        padding: '14px 16px',
                        cursor: isUnlocked ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        border: isSelected
                          ? `2px solid ${mission.accentColor}`
                          : isUnlocked
                          ? '1px solid rgba(15, 23, 42, 0.12)'
                          : '1px solid rgba(15, 23, 42, 0.05)',
                        background: isSelected
                          ? 'rgba(255, 255, 255, 1)'
                          : isUnlocked
                          ? 'rgba(248, 250, 252, 0.95)'
                          : 'rgba(241, 245, 249, 0.6)',
                        opacity: isUnlocked ? 1 : 0.6,
                        boxShadow: isSelected ? `0 6px 20px ${mission.accentColor}33` : 'none',
                        transition: 'all 0.15s ease',
                        position: 'relative'
                      }}
                    >
                      {/* Top Badges & Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: `${mission.accentColor}18`,
                              color: mission.accentColor,
                              fontFamily: 'var(--font-display)',
                              fontWeight: 900,
                              fontSize: '0.72rem',
                              letterSpacing: '0.06em'
                            }}
                          >
                            OPERATION 0{mission.number}
                          </span>

                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: 'rgba(15, 23, 42, 0.06)',
                              color: '#475569',
                              fontFamily: 'var(--font-display)',
                              fontWeight: 800,
                              fontSize: '0.68rem',
                              letterSpacing: '0.04em'
                            }}
                          >
                            {mission.difficulty}
                          </span>
                        </div>

                        {/* Completion / Lock Indicator */}
                        {isCompleted ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#16a34a', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.75rem' }}>
                            <CheckCircle2 size={16} color="#16a34a" />
                            <span>COMPLETED</span>
                          </div>
                        ) : !isUnlocked ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.75rem' }}>
                            <Lock size={15} color="#64748b" />
                            <span>LOCKED</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: mission.accentColor, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.75rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: mission.accentColor, boxShadow: `0 0 8px ${mission.accentColor}` }} />
                            <span>{isSelected ? 'SELECTED' : 'READY'}</span>
                          </div>
                        )}
                      </div>

                      {/* Title & Briefing */}
                      <div>
                        <h3
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.02rem',
                            fontWeight: 900,
                            color: isSelected ? mission.accentColor : '#0f172a',
                            margin: '0 0 4px 0',
                            letterSpacing: '0.02em'
                          }}
                        >
                          {mission.title}
                        </h3>
                        <p style={{ fontFamily: 'var(--font-sub)', fontSize: '0.8rem', color: '#475569', lineHeight: 1.35, margin: 0 }}>
                          {mission.briefing}
                        </p>
                      </div>

                      {/* Primary Objective Banner */}
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: isSelected ? `${mission.accentColor}12` : 'rgba(255, 255, 255, 0.85)',
                          border: `1px solid ${isSelected ? mission.accentColor : 'rgba(15, 23, 42, 0.08)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          fontSize: '0.78rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Crosshair size={15} color={mission.accentColor} />
                          <span style={{ fontWeight: 800, fontFamily: 'var(--font-display)', color: '#0f172a' }}>
                            OBJECTIVE:
                          </span>
                          <span style={{ color: '#334155', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
                            {mission.primaryObjective}
                          </span>
                        </div>

                        <span style={{ color: '#0284c7', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                          MAP: {mission.arenaName}
                        </span>
                      </div>

                      {/* Rewards & Deploy Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d97706' }}>
                            <Coins size={14} color="#d97706" />
                            <span>+{mission.rewardCoins}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0284c7' }}>
                            <Award size={14} color="#0284c7" />
                            <span>+{mission.rewardScore} XP</span>
                          </div>
                          <div style={{ color: mission.badgeColor, fontWeight: 900 }}>
                            {mission.badge}
                          </div>
                        </div>

                        {isUnlocked && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMission(mission);
                              setSelectedArena(mission.arena);
                              setShowMissionSelect(false);
                              onStartGame('mission', mission.arena, mission);
                            }}
                            className="btn-cyber btn-cyber-primary"
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.78rem',
                              background: isSelected ? undefined : 'linear-gradient(135deg, #0284c7, #0ea5e9)'
                            }}
                          >
                            <Play size={14} fill="#ffffff" />
                            DEPLOY NOW
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: MODES */}
            {activeTab === 'mode' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MODES.map((m) => {
                  const isSelected = m.id === selectedMode;
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleModeChange(m.id)}
                      className="glass-panel"
                      style={{
                        padding: '14px 18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: isSelected ? `2px solid ${m.color}` : '1px solid rgba(15, 23, 42, 0.08)',
                        background: isSelected ? 'rgba(255, 255, 255, 1)' : 'rgba(248, 250, 252, 0.8)',
                        boxShadow: isSelected ? `0 4px 18px ${m.color}33` : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            background: `${m.color}18`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {m.icon}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800, color: isSelected ? m.color : '#0f172a' }}>
                            {m.name}
                          </span>
                          <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.82rem', color: '#64748b' }}>
                            {m.desc}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          border: isSelected ? `2px solid ${m.color}` : '2px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isSelected && <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: ARENAS */}
            {activeTab === 'arena' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {ARENAS.map((a) => {
                  const isSelected = a.id === selectedArena;
                  return (
                    <div
                      key={a.id}
                      onClick={() => handleSelectArena(a.id)}
                      className="glass-panel"
                      style={{
                        padding: '14px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 8,
                        border: isSelected ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.08)',
                        background: isSelected ? 'rgba(255, 255, 255, 1)' : 'rgba(248, 250, 252, 0.8)',
                        boxShadow: isSelected ? '0 4px 18px rgba(2, 132, 199, 0.25)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.68rem', color: '#0284c7', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                            {a.tag}
                          </span>
                          {isSelected && (
                            <span style={{ fontSize: '0.65rem', background: '#0284c7', color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              ACTIVE PREVIEW
                            </span>
                          )}
                        </div>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.92rem', color: isSelected ? '#0284c7' : '#0f172a', fontWeight: 800, margin: '2px 0 4px 0' }}>
                          {a.name}
                        </h4>
                        <p style={{ fontFamily: 'var(--font-sub)', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.3, margin: 0 }}>
                          {a.desc}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        ENV: {a.environment}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Drawer Confirmation Bar */}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowMissionSelect(false)}
                className="btn-cyber btn-cyber-primary"
                style={{ width: '100%', padding: '12px 24px', fontSize: '1rem', justifyContent: 'center' }}
              >
                CONFIRM SELECTION
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

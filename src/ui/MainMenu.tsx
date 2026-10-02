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
  Clock,
  Compass,
  Layers,
  ChevronRight,
  X,
  ShieldCheck
} from 'lucide-react';
import { GameMode, ArenaId } from '../types/game';
import { saveManager } from '../game/managers/SaveManager';

interface MainMenuProps {
  onStartGame: (mode: GameMode, arena: ArenaId) => void;
  onPreviewArena?: (arena: ArenaId) => void;
  onOpenArmory: () => void;
  onOpenUpgrades: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
  coins: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onPreviewArena,
  onOpenArmory,
  onOpenUpgrades,
  onOpenSettings,
  onOpenTutorial,
  coins
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('survival');
  const [selectedArena, setSelectedArena] = useState<ArenaId>('industrial');
  const [showMissionSelect, setShowMissionSelect] = useState(false);
  const [activeTab, setActiveTab] = useState<'mode' | 'arena'>('mode');

  const savedData = saveManager.getData();

  const ARENAS: { id: ArenaId; name: string; desc: string; tag: string; environment: string }[] = [
    {
      id: 'industrial',
      name: 'APEX RESEARCH COMPLEX',
      desc: 'Sunlit high-tech laboratory with white ceramic hex tiles and volatile power canisters.',
      tag: 'PRISTINE HIGH-TECH',
      environment: 'Indoor Lab'
    },
    {
      id: 'desert',
      name: 'SOLIS OUTPOST',
      desc: 'Radiant desert solarium garrison with elevated sniper platforms and solar arrays.',
      tag: 'LONG SIGHTLINES',
      environment: 'Desert Solarium'
    },
    {
      id: 'neon_city',
      name: 'NEO-APEX SKYLINE PLAZA',
      desc: 'Sunlit futuristic city plaza with reflective marble tiles and holographic glass barriers.',
      tag: 'CLOSE QUARTERS',
      environment: 'Urban Plaza'
    },
    {
      id: 'space_station',
      name: 'ORBITAL SOLAR DECK',
      desc: 'High-orbit station platform under brilliant solar rays overlooking Earth.',
      tag: 'TACTICAL COVER',
      environment: 'Orbital Platform'
    }
  ];

  const MODES: { id: GameMode; name: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'survival',
      name: 'ENDLESS SURVIVAL',
      desc: 'Face escalating android waves, elite captains, and boss encounters every 5 waves.',
      icon: <Flame size={20} color="#f97316" />,
      color: '#f97316'
    },
    {
      id: 'time_attack',
      name: 'TIME ATTACK',
      desc: 'Race against a 120s timer. Earn bonus seconds and high multiplier on every kill.',
      icon: <Clock size={20} color="#d97706" />,
      color: '#d97706'
    },
    {
      id: 'boss_arena',
      name: 'TITAN SHOWDOWN',
      desc: 'Immediate high-stakes encounter against the multi-phase Apex Cyber-Colossus.',
      icon: <Skull size={20} color="#e11d48" />,
      color: '#e11d48'
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
        {/* Operative Profile Pill */}
        <div
          className="glass-panel menu-top-profile"
          style={{
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            border: '1.5px solid rgba(2, 132, 199, 0.4)',
            background: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
        >
          <div
            className="menu-top-profile-badge"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={20} strokeWidth={2.4} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#0f172a', fontWeight: 900, letterSpacing: '0.04em' }}>
                OPERATIVE-01
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
                TIER 1
              </span>
            </div>

            <div className="menu-top-profile-stats" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
                RECORD: <strong style={{ color: '#0284c7' }}>{savedData.highestScore.toLocaleString()}</strong>
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#94a3b8' }} />
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
                BEST: <strong style={{ color: '#f97316' }}>WAVE {savedData.highestWave}</strong>
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

          {/* Tutorial / Help Button */}
          <button
            onClick={onOpenTutorial}
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
            aria-label="Manual & Guide"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>

      {/* CENTER HERO: WIDE OPEN CINEMATIC 3D VIEW */}
      <div className="menu-center-hero">
        <div
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

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.6rem, 4.5vw, 2.8rem)',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '0.06em',
            margin: 0,
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.7), 0 0 35px rgba(2, 132, 199, 0.4)',
            lineHeight: 1.1
          }}
        >
          CYBERSTRIKE<span style={{ color: '#38bdf8' }}>:</span> APEX
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sub)',
            fontSize: 'clamp(0.75rem, 1.8vw, 0.92rem)',
            color: 'rgba(255, 255, 255, 0.85)',
            marginTop: 4,
            fontWeight: 600,
            textShadow: '0 1px 8px rgba(0, 0, 0, 0.6)'
          }}
        >
          High-Velocity 3D Sci-Fi Combat
        </p>
      </div>

      {/* BOTTOM CONTAINER: TACTICAL DOCK & DEPLOY HUB */}
      <div className="menu-bottom-container">
        {/* QUICK ACTION DOCK (ARMORY & UPGRADES) */}
        <div className="menu-bottom-dock">
          <button
            onClick={onOpenArmory}
            className="btn-cyber"
            style={{
              padding: '10px 18px',
              fontSize: '0.85rem',
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
            className="btn-cyber btn-cyber-gold"
            style={{
              padding: '10px 18px',
              fontSize: '0.85rem',
              boxShadow: '0 6px 20px rgba(217, 119, 6, 0.2)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          >
            <Zap size={18} />
            <span>UPGRADES</span>
          </button>
        </div>

        {/* TACTICAL MISSION DEPLOYMENT PANEL */}
        <div className="menu-bottom-deploy">
          {/* Mission & Arena Info Card */}
          <div
            onClick={() => setShowMissionSelect(true)}
            className="glass-panel menu-mission-card"
            style={{
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              border: '1.5px solid rgba(2, 132, 199, 0.45)',
              background: 'rgba(255, 255, 255, 0.92)',
              boxShadow: '0 4px 18px rgba(15, 23, 42, 0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {currentModeInfo.icon}
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  {currentModeInfo.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-display)', color: '#0284c7', fontWeight: 800 }}>
                  MAP: {currentArenaInfo.name}
                </span>
              </div>
            </div>

            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'rgba(2, 132, 199, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
                flexShrink: 0
              }}
            >
              <Layers size={16} />
            </div>
          </div>

          {/* MAIN DEPLOY BUTTON */}
          <button
            onClick={() => onStartGame(selectedMode, selectedArena)}
            className="btn-cyber btn-cyber-primary pulse-glow menu-deploy-btn"
            style={{
              padding: '12px 28px',
              fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
              letterSpacing: '0.06em',
              boxShadow: '0 6px 25px rgba(2, 132, 199, 0.45)'
            }}
          >
            <Play size={20} fill="#ffffff" />
            DEPLOY TO COMBAT
          </button>
        </div>
      </div>

      {/* OWNER & COPYRIGHT FOOTER */}
      <div
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
          className="glass-panel"
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

            {/* Tab Switches: Mode vs Arena */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setActiveTab('mode')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: activeTab === 'mode' ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.1)',
                  background: activeTab === 'mode' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(255, 255, 255, 0.8)',
                  color: activeTab === 'mode' ? '#0284c7' : '#64748b',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <Award size={18} />
                COMBAT OBJECTIVE
              </button>

              <button
                onClick={() => setActiveTab('arena')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: activeTab === 'arena' ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.1)',
                  background: activeTab === 'arena' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(255, 255, 255, 0.8)',
                  color: activeTab === 'arena' ? '#0284c7' : '#64748b',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <Compass size={18} />
                DEPLOYMENT ARENA
              </button>
            </div>

            {/* TAB CONTENT: MODES */}
            {activeTab === 'mode' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MODES.map((m) => {
                  const isSelected = m.id === selectedMode;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMode(m.id)}
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

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
  Compass
} from 'lucide-react';
import { GameMode, ArenaId } from '../types/game';
import { saveManager } from '../game/managers/SaveManager';

interface MainMenuProps {
  onStartGame: (mode: GameMode, arena: ArenaId) => void;
  onOpenArmory: () => void;
  onOpenUpgrades: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
  coins: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenArmory,
  onOpenUpgrades,
  onOpenSettings,
  onOpenTutorial,
  coins
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('survival');
  const [selectedArena, setSelectedArena] = useState<ArenaId>('industrial');
  const savedData = saveManager.getData();

  const ARENAS: { id: ArenaId; name: string; desc: string; tag: string }[] = [
    {
      id: 'industrial',
      name: 'APEX RESEARCH COMPLEX',
      desc: 'Sunlit high-tech laboratory with white ceramic hex tiles and volatile power canisters.',
      tag: 'PRISTINE HIGH-TECH'
    },
    {
      id: 'desert',
      name: 'SOLIS OUTPOST',
      desc: 'Radiant desert solarium garrison with elevated sniper platforms and solar arrays.',
      tag: 'LONG SIGHTLINES'
    },
    {
      id: 'neon_city',
      name: 'NEO-APEX SKYLINE PLAZA',
      desc: 'Sunlit futuristic city plaza with reflective marble tiles and holographic glass barriers.',
      tag: 'CLOSE QUARTERS'
    },
    {
      id: 'space_station',
      name: 'ORBITAL SOLAR DECK',
      desc: 'High-orbit station platform under brilliant solar rays overlooking Earth.',
      tag: 'TACTICAL COVER'
    }
  ];

  const MODES: { id: GameMode; name: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'survival',
      name: 'ENDLESS SURVIVAL',
      desc: 'Face escalating android waves, elite captains, and boss encounters every 5 waves.',
      icon: <Flame size={20} color="#f97316" />
    },
    {
      id: 'time_attack',
      name: 'TIME ATTACK',
      desc: 'Race against a 120s timer. Earn bonus seconds and high multiplier on every kill.',
      icon: <Clock size={20} color="#d97706" />
    },
    {
      id: 'boss_arena',
      name: 'TITAN SHOWDOWN',
      desc: 'Immediate high-stakes encounter against the multi-phase Apex Cyber-Colossus.',
      icon: <Skull size={20} color="#e11d48" />
    }
  ];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(248, 250, 252, 0.96)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'calc(var(--safe-top) + 20px) calc(var(--safe-right) + 20px) calc(var(--safe-bottom) + 20px) calc(var(--safe-left) + 20px)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        zIndex: 50
      }}
    >
      {/* Top Bar: Title & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#0284c7', width: 4, height: 22, borderRadius: 2 }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', color: '#0284c7', letterSpacing: '0.2em', fontWeight: 800 }}>
              NEXT-GEN ARCADE PROTOCOL
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 5vw, 3.2rem)',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '0.04em',
              margin: '4px 0 0 0',
              textShadow: '0 2px 15px rgba(2, 132, 199, 0.15)',
              lineHeight: 1.1
            }}
          >
            CYBERSTRIKE<span style={{ color: '#0284c7' }}>:</span> APEX
          </h1>
          <p style={{ fontFamily: 'var(--font-sub)', fontSize: 'clamp(0.85rem, 2vw, 1.05rem)', color: '#64748b', marginTop: 4, fontWeight: 600 }}>
            Fast-paced first-person tactical arcade combat simulation
          </p>
        </div>

        {/* Career Stats Card */}
        <div
          className="glass-panel"
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(10px, 2.5vw, 20px)',
            border: '1.5px solid rgba(2, 132, 199, 0.3)',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)', color: '#64748b', fontWeight: 700 }}>HIGH SCORE</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: '#0f172a', fontWeight: 900 }}>
              {savedData.highestScore.toLocaleString()}
            </span>
          </div>

          <div style={{ width: 1.5, height: 26, background: 'rgba(15, 23, 42, 0.1)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)', color: '#64748b', fontWeight: 700 }}>BEST WAVE</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: '#0284c7', fontWeight: 900 }}>
              WAVE {savedData.highestWave}
            </span>
          </div>

          <div style={{ width: 1.5, height: 26, background: 'rgba(15, 23, 42, 0.1)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-display)', color: '#64748b', fontWeight: 700 }}>COINS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontFamily: 'var(--font-display)', fontWeight: 900 }}>
              <Coins size={16} />
              <span style={{ fontSize: '1.15rem' }}>{coins}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Selection Panels (Modes & Arenas) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(14px, 2.5vw, 24px)', margin: '18px 0' }}>
        {/* Game Mode Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800 }}>
            <Award size={18} color="#0284c7" />
            <span>SELECT COMBAT OBJECTIVE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MODES.map((m) => {
              const isSelected = (m.id === selectedMode);
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMode(m.id)}
                  className="glass-panel"
                  style={{
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    border: isSelected ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.08)',
                    background: isSelected ? 'rgba(2, 132, 199, 0.1)' : 'rgba(255, 255, 255, 0.85)',
                    boxShadow: isSelected ? '0 4px 20px rgba(2, 132, 199, 0.2)' : 'none',
                    transform: isSelected ? 'scale(1.01)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {m.icon}
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: isSelected ? '#0284c7' : '#0f172a', fontWeight: 800 }}>
                      {m.name}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-sub)', fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
                    {m.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arena Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800 }}>
            <Compass size={18} color="#0284c7" />
            <span>DEPLOYMENT ARENA</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {ARENAS.map((a) => {
              const isSelected = (a.id === selectedArena);
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedArena(a.id)}
                  className="glass-panel"
                  style={{
                    padding: '16px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 8,
                    border: isSelected ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.08)',
                    background: isSelected ? 'rgba(2, 132, 199, 0.1)' : 'rgba(255, 255, 255, 0.85)',
                    boxShadow: isSelected ? '0 4px 20px rgba(2, 132, 199, 0.2)' : 'none',
                    transform: isSelected ? 'scale(1.02)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: '0.72rem', color: '#0284c7', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                      {a.tag}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: isSelected ? '#0284c7' : '#0f172a', fontWeight: 800 }}>
                      {a.name}
                    </span>
                    <p style={{ fontFamily: 'var(--font-sub)', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.3, fontWeight: 500 }}>
                      {a.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 14, borderTop: '1px solid rgba(15, 23, 42, 0.1)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: '1 1 300px' }}>
          <button onClick={onOpenArmory} className="btn-cyber">
            <Crosshair size={18} />
            ARMORY
          </button>

          <button onClick={onOpenUpgrades} className="btn-cyber btn-cyber-gold">
            <Zap size={18} />
            UPGRADES
          </button>

          <button onClick={onOpenSettings} className="btn-cyber" style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(15, 23, 42, 0.15)', color: '#0f172a' }}>
            <Sliders size={18} />
            SETTINGS
          </button>

          <button onClick={onOpenTutorial} className="btn-cyber" style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(15, 23, 42, 0.15)', color: '#0f172a' }}>
            <HelpCircle size={18} />
            MANUAL
          </button>
        </div>

        {/* Enter Arena Button */}
        <button
          onClick={() => onStartGame(selectedMode, selectedArena)}
          className="btn-cyber btn-cyber-primary"
          style={{
            flex: '1 1 240px',
            padding: '14px 28px',
            fontSize: 'clamp(1rem, 2vw, 1.2rem)'
          }}
        >
          <Play size={22} fill="#ffffff" />
          ENTER COMBAT ARENA
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { RotateCcw, Zap, Home, Award, Flame, Skull, Crosshair, Coins } from 'lucide-react';
import { saveManager } from '../game/managers/SaveManager';

interface GameOverModalProps {
  score: number;
  wave: number;
  kills: number;
  headshots: number;
  highestCombo: number;
  coinsEarned: number;
  isVictory?: boolean;
  onRestart: () => void;
  onOpenUpgrades: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  wave,
  kills,
  headshots,
  highestCombo,
  coinsEarned,
  isVictory = false,
  onRestart,
  onOpenUpgrades,
  onMainMenu
}) => {
  const savedData = saveManager.getData();
  const isHighScore = score >= savedData.highestScore && score > 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(10px, 2.5vw, 24px)'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '92dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          border: isVictory ? '2px solid rgba(5, 150, 105, 0.5)' : '2px solid rgba(244, 63, 94, 0.5)',
          background: 'rgba(255, 255, 255, 0.96)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 'clamp(18px, 3vw, 32px)',
          gap: 18,
          boxShadow: isVictory ? '0 20px 50px rgba(5, 150, 105, 0.2)' : '0 20px 50px rgba(244, 63, 94, 0.2)'
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.8rem',
              letterSpacing: '0.2em',
              fontWeight: 800,
              color: isVictory ? '#059669' : '#e11d48'
            }}
          >
            {isVictory ? 'TACTICAL OBJECTIVE ACCOMPLISHED' : 'BIOLOGICAL VITALS DEPLETED'}
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
              fontWeight: 900,
              color: isVictory ? '#059669' : '#e11d48',
              letterSpacing: '0.04em'
            }}
          >
            {isVictory ? 'APEX VICTORY' : 'GAME OVER'}
          </h1>
          {isHighScore && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(254, 240, 138, 0.7)',
                border: '1px solid #d97706',
                padding: '4px 14px',
                borderRadius: 20,
                color: '#b45309',
                fontFamily: 'var(--font-display)',
                fontSize: '0.8rem',
                fontWeight: 800
              }}
            >
              <Award size={16} />
              <span>NEW PERSONAL HIGH SCORE!</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'clamp(8px, 1.5vw, 14px)' }}>
          <StatBox label="FINAL SCORE" value={score.toLocaleString()} icon={<Award size={18} color="#0284c7" />} />
          <StatBox label="WAVE REACHED" value={wave} icon={<Award size={18} color="#0ea5e9" />} />
          <StatBox label="BOUNTY COINS" value={`+${coinsEarned}`} icon={<Coins size={18} color="#d97706" />} />
          <StatBox label="ENEMIES KILLED" value={kills} icon={<Skull size={18} color="#e11d48" />} />
          <StatBox label="CRITICAL HEADSHOTS" value={headshots} icon={<Crosshair size={18} color="#b45309" />} />
          <StatBox label="MAX COMBO STREAK" value={`x${highestCombo}`} icon={<Flame size={18} color="#f97316" />} />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, width: '100%', marginTop: 4 }}>
          <button
            onClick={onRestart}
            className="btn-cyber btn-cyber-primary"
            style={{ flex: '1 1 140px', padding: '12px 18px', fontSize: '0.92rem' }}
          >
            <RotateCcw size={18} />
            PLAY AGAIN
          </button>

          <button
            onClick={onOpenUpgrades}
            className="btn-cyber btn-cyber-gold"
            style={{ flex: '1 1 140px', padding: '12px 18px', fontSize: '0.92rem' }}
          >
            <Zap size={18} />
            UPGRADES
          </button>

          <button
            onClick={onMainMenu}
            className="btn-cyber"
            style={{ flex: '1 1 80px', padding: '12px 18px', background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(15, 23, 42, 0.15)', color: '#0f172a' }}
          >
            <Home size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div
    className="glass-panel"
    style={{
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      alignItems: 'center',
      textAlign: 'center',
      background: 'rgba(248, 250, 252, 0.8)'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
      {icon}
      <span>{label}</span>
    </div>
    <span style={{ fontSize: '1.45rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a' }}>
      {value}
    </span>
  </div>
);

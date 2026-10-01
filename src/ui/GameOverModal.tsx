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
        padding: 24
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 680,
          border: isVictory ? '2px solid rgba(5, 150, 105, 0.5)' : '2px solid rgba(244, 63, 94, 0.5)',
          background: 'rgba(255, 255, 255, 0.96)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 36,
          gap: 24,
          boxShadow: isVictory ? '0 20px 50px rgba(5, 150, 105, 0.2)' : '0 20px 50px rgba(244, 63, 94, 0.2)'
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
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
              fontSize: '2.8rem',
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
                fontSize: '0.85rem',
                fontWeight: 800
              }}
            >
              <Award size={16} />
              <span>NEW PERSONAL HIGH SCORE!</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <StatBox label="FINAL SCORE" value={score.toLocaleString()} icon={<Award size={20} color="#0284c7" />} />
          <StatBox label="WAVE REACHED" value={wave} icon={<Award size={20} color="#0ea5e9" />} />
          <StatBox label="BOUNTY COINS" value={`+${coinsEarned}`} icon={<Coins size={20} color="#d97706" />} />
          <StatBox label="ENEMIES KILLED" value={kills} icon={<Skull size={20} color="#e11d48" />} />
          <StatBox label="CRITICAL HEADSHOTS" value={headshots} icon={<Crosshair size={20} color="#b45309" />} />
          <StatBox label="MAX COMBO STREAK" value={`x${highestCombo}`} icon={<Flame size={20} color="#f97316" />} />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 14, width: '100%', marginTop: 8 }}>
          <button
            onClick={onRestart}
            className="btn-cyber btn-cyber-primary"
            style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
          >
            <RotateCcw size={20} />
            PLAY AGAIN
          </button>

          <button
            onClick={onOpenUpgrades}
            className="btn-cyber btn-cyber-gold"
            style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
          >
            <Zap size={20} />
            UPGRADES BAY
          </button>

          <button
            onClick={onMainMenu}
            className="btn-cyber"
            style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(15, 23, 42, 0.15)', color: '#0f172a' }}
          >
            <Home size={20} />
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

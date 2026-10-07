import React, { useState, useEffect } from 'react';
import { RotateCcw, Zap, Home, Award, Flame, Skull, Crosshair, Coins, Play, CheckCircle, Trophy, User } from 'lucide-react';
import { saveManager } from '../game/managers/SaveManager';
import { userManager } from '../game/managers/UserManager';
import { MissionConfig } from '../types/game';

interface GameOverModalProps {
  score: number;
  wave: number;
  kills: number;
  headshots: number;
  highestCombo: number;
  coinsEarned: number;
  isVictory?: boolean;
  activeMission?: MissionConfig | null;
  onNextMission?: () => void;
  hasNextMission?: boolean;
  onRestart: () => void;
  onOpenUpgrades: () => void;
  onOpenLeaderboard?: () => void;
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
  activeMission,
  onNextMission,
  hasNextMission = false,
  onRestart,
  onOpenUpgrades,
  onOpenLeaderboard,
  onMainMenu
}) => {
  const savedData = saveManager.getData();
  const currentUser = userManager.getCurrentUser();
  const [leaderboard, setLeaderboard] = useState(() => userManager.getLeaderboard('score'));

  useEffect(() => {
    // Listen for live leaderboard updates
    const unsubscribe = userManager.onLeaderboardChange((fresh) => {
      setLeaderboard(fresh);
    });
    // Trigger real-time cloud ranking fetch upon game conclusion
    userManager.refreshCloudLeaderboard();
    return () => unsubscribe();
  }, []);

  const userEntry = leaderboard.find(
    e => e.isCurrentUser || e.username.toLowerCase() === currentUser.username.toLowerCase() || e.userId === currentUser.id
  );
  const currentRank = userEntry ? userEntry.rank : leaderboard.length;
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
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.8rem',
              letterSpacing: '0.2em',
              fontWeight: 800,
              color: isVictory ? '#059669' : '#e11d48'
            }}
          >
            {activeMission
              ? (isVictory ? `MISSION ACCOMPLISHED: ${activeMission.codename}` : `MISSION FAILED: ${activeMission.codename}`)
              : (isVictory ? 'TACTICAL OBJECTIVE ACCOMPLISHED' : 'BIOLOGICAL VITALS DEPLETED')}
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
              fontWeight: 900,
              color: isVictory ? '#059669' : '#e11d48',
              letterSpacing: '0.04em',
              margin: 0
            }}
          >
            {activeMission ? (isVictory ? activeMission.title : 'OPERATION FAILED') : (isVictory ? 'APEX VICTORY' : 'GAME OVER')}
          </h1>

          {activeMission && isVictory && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1.5px solid #22c55e',
                padding: '6px 16px',
                borderRadius: 20,
                color: '#15803d',
                fontFamily: 'var(--font-display)',
                fontSize: '0.85rem',
                fontWeight: 900
              }}
            >
              <CheckCircle size={16} color="#15803d" />
              <span>AWARDED BADGE:</span>
              <strong style={{ color: activeMission.badgeColor }}>{activeMission.badge}</strong>
              <span style={{ color: '#d97706', marginLeft: 6 }}>+{activeMission.rewardCoins} COINS</span>
            </div>
          )}

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

          {/* Operative & Leaderboard Rank Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1.5px solid rgba(2, 132, 199, 0.35)',
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: '0.74rem',
              fontFamily: 'var(--font-display)',
              color: '#0284c7',
              fontWeight: 800
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <User size={14} />
              <span>{currentUser.username} ({currentUser.tier.replace('_', ' ')})</span>
            </div>
            <span>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: currentRank <= 3 ? '#d97706' : '#0284c7' }}>
              <Trophy size={14} />
              <span>LEADERBOARD RANK #{currentRank} OF {leaderboard.length}</span>
            </div>
          </div>
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
          {isVictory && hasNextMission && onNextMission && (
            <button
              onClick={onNextMission}
              className="btn-cyber btn-cyber-primary pulse-glow"
              style={{ flex: '2 1 180px', padding: '12px 20px', fontSize: '0.95rem' }}
            >
              <Play size={18} fill="#ffffff" />
              PLAY NEXT MISSION
            </button>
          )}

          <button
            onClick={onRestart}
            className={`btn-cyber ${isVictory && hasNextMission ? '' : 'btn-cyber-primary'}`}
            style={{ flex: '1 1 140px', padding: '12px 18px', fontSize: '0.92rem' }}
          >
            <RotateCcw size={18} />
            {isVictory ? 'REPLAY' : 'TRY AGAIN'}
          </button>

          {onOpenLeaderboard && (
            <button
              onClick={onOpenLeaderboard}
              className="btn-cyber"
              style={{
                flex: '1 1 130px',
                padding: '12px 16px',
                fontSize: '0.92rem',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px solid #d97706',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Trophy size={18} color="#d97706" />
              RANKS
            </button>
          )}

          <button
            onClick={onOpenUpgrades}
            className="btn-cyber btn-cyber-gold"
            style={{ flex: '1 1 130px', padding: '12px 18px', fontSize: '0.92rem' }}
          >
            <Zap size={18} />
            UPGRADES
          </button>

          <button
            onClick={onMainMenu}
            className="btn-cyber"
            style={{ flex: '1 1 70px', padding: '12px 18px', background: 'rgba(255,255,255,0.9)', borderColor: 'rgba(15, 23, 42, 0.15)', color: '#0f172a' }}
            aria-label="Main Menu"
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

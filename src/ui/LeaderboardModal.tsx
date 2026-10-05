import React, { useState } from 'react';
import {
  Trophy,
  Award,
  Flame,
  Crosshair,
  User,
  Crown,
  Medal,
  Search,
  X,
  ChevronRight,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { userManager } from '../game/managers/UserManager';
import { LeaderboardCategory, LeaderboardEntry, AVATAR_OPTIONS } from '../types/user';
import { soundManager } from '../audio/SoundManager';

interface LeaderboardModalProps {
  onClose: () => void;
  onOpenAuth: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose, onOpenAuth }) => {
  const [category, setCategory] = useState<LeaderboardCategory>('score');
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = userManager.getCurrentUser();
  const rawLeaderboard = userManager.getLeaderboard(category);

  const filteredLeaderboard = rawLeaderboard.filter(e =>
    e.username.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const top3 = rawLeaderboard.slice(0, 3);
  const currentUserEntry = rawLeaderboard.find(e => e.isCurrentUser);

  const handleTabChange = (cat: LeaderboardCategory) => {
    soundManager.playClick(0, 1800, 0.2);
    setCategory(cat);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: <Crown size={15} color="#eab308" />, color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', text: '1ST' };
    if (rank === 2) return { icon: <Medal size={15} color="#94a3b8" />, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', text: '2ND' };
    if (rank === 3) return { icon: <Medal size={15} color="#b45309" />, color: '#b45309', bg: 'rgba(180, 83, 9, 0.15)', text: '3RD' };
    return { icon: null, color: '#64748b', bg: 'rgba(15, 23, 42, 0.05)', text: `#${rank}` };
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 120,
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
          maxWidth: 780,
          maxHeight: '92dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: 'rgba(255, 255, 255, 0.97)',
          border: '2px solid rgba(2, 132, 199, 0.45)',
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(2, 132, 199, 0.25)',
          padding: 'clamp(16px, 3vw, 28px)',
          gap: 16
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 15px rgba(234, 179, 8, 0.45)'
              }}
            >
              <Trophy size={22} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '0.04em' }}>
                COMBAT LEADERBOARD
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
                HALL OF ELITE OPERATIVES & HIGH SCORES
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              style={{
                background: 'rgba(2, 132, 199, 0.1)',
                border: '1.5px solid rgba(2, 132, 199, 0.4)',
                borderRadius: 10,
                padding: '6px 12px',
                color: '#0284c7',
                fontFamily: 'var(--font-display)',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <User size={14} />
              SWITCH USER
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Filter Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              gap: 6,
              background: 'rgba(15, 23, 42, 0.05)',
              padding: 4,
              borderRadius: 12,
              border: '1px solid rgba(15, 23, 42, 0.08)'
            }}
          >
            <button
              onClick={() => handleTabChange('score')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: category === 'score' ? '#0284c7' : 'transparent',
                color: category === 'score' ? '#ffffff' : '#475569',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <Award size={15} />
              HIGH SCORE
            </button>

            <button
              onClick={() => handleTabChange('wave')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: category === 'wave' ? '#f97316' : 'transparent',
                color: category === 'wave' ? '#ffffff' : '#475569',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <Flame size={15} />
              MAX WAVE
            </button>

            <button
              onClick={() => handleTabChange('kills')}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                background: category === 'kills' ? '#e11d48' : 'transparent',
                color: category === 'kills' ? '#ffffff' : '#475569',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <Crosshair size={15} />
              TOTAL KILLS
            </button>
          </div>

          {/* Search box */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: 10 }} />
            <input
              type="text"
              placeholder="Search operative..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px 6px 30px',
                borderRadius: 8,
                border: '1.5px solid rgba(15, 23, 42, 0.12)',
                fontSize: '0.76rem',
                fontFamily: 'var(--font-sub)',
                outline: 'none',
                width: 170
              }}
            />
          </div>
        </div>

        {/* --- TOP 3 PODIUM DISPLAY --- */}
        {!searchQuery && top3.length >= 3 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              padding: '12px 14px',
              background: 'radial-gradient(ellipse at top, rgba(2, 132, 199, 0.08) 0%, rgba(248, 250, 252, 0.9) 100%)',
              borderRadius: 16,
              border: '1.5px solid rgba(2, 132, 199, 0.2)'
            }}
          >
            {/* 2nd Place */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #94a3b8, #64748b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(148, 163, 184, 0.4)' }}>
                  <Medal size={22} />
                </div>
                <span style={{ position: 'absolute', top: -6, right: -6, background: '#64748b', color: '#fff', fontSize: '0.55rem', fontWeight: 900, borderRadius: 6, padding: '1px 4px' }}>
                  2ND
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.80rem', color: '#0f172a', textAlign: 'center' }}>
                {top3[1].username}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1rem', color: '#0284c7' }}>
                {category === 'score' ? top3[1].highScore.toLocaleString() : category === 'wave' ? `WAVE ${top3[1].highestWave}` : `${top3[1].totalKills} KILLS`}
              </span>
            </div>

            {/* 1st Place (Gold Center) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, transform: 'scale(1.06)' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 6px 18px rgba(245, 158, 11, 0.6)' }}>
                  <Crown size={28} />
                </div>
                <span style={{ position: 'absolute', top: -8, right: -6, background: '#d97706', color: '#fff', fontSize: '0.58rem', fontWeight: 900, borderRadius: 6, padding: '1px 5px' }}>
                  1ST
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.90rem', color: '#0f172a', textAlign: 'center' }}>
                {top3[0].username}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.2rem', color: '#d97706' }}>
                {category === 'score' ? top3[0].highScore.toLocaleString() : category === 'wave' ? `WAVE ${top3[0].highestWave}` : `${top3[0].totalKills} KILLS`}
              </span>
            </div>

            {/* 3rd Place */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #b45309, #78350f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(180, 83, 9, 0.4)' }}>
                  <Medal size={22} />
                </div>
                <span style={{ position: 'absolute', top: -6, right: -6, background: '#b45309', color: '#fff', fontSize: '0.55rem', fontWeight: 900, borderRadius: 6, padding: '1px 4px' }}>
                  3RD
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.80rem', color: '#0f172a', textAlign: 'center' }}>
                {top3[2].username}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1rem', color: '#0284c7' }}>
                {category === 'score' ? top3[2].highScore.toLocaleString() : category === 'wave' ? `WAVE ${top3[2].highestWave}` : `${top3[2].totalKills} KILLS`}
              </span>
            </div>
          </div>
        )}

        {/* --- SCROLLABLE RANKINGS TABLE --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 310, overflowY: 'auto' }}>
          {filteredLeaderboard.map((entry) => {
            const isUser = entry.isCurrentUser;
            const badge = getRankBadge(entry.rank);
            const avatar = AVATAR_OPTIONS.find(a => a.id === entry.avatarId) || AVATAR_OPTIONS[0];

            return (
              <div
                key={entry.userId}
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: isUser ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.08)',
                  background: isUser ? 'rgba(2, 132, 199, 0.08)' : 'rgba(248, 250, 252, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: isUser ? '0 0 16px rgba(2, 132, 199, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Left: Rank & Avatar & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Rank Badge */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: badge.bg,
                      color: badge.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.78rem',
                      flexShrink: 0
                    }}
                  >
                    {badge.icon || badge.text}
                  </div>

                  {/* Operative Avatar Icon */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: `linear-gradient(135deg, ${avatar.color}, ${avatar.accentColor})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0
                    }}
                  >
                    <User size={18} strokeWidth={2.4} />
                  </div>

                  {/* Name & Tier */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.86rem', color: isUser ? '#0284c7' : '#0f172a' }}>
                        {entry.username}
                      </span>
                      {isUser && (
                        <span style={{ background: '#0284c7', color: '#ffffff', fontSize: '0.55rem', fontWeight: 900, padding: '1px 5px', borderRadius: 4 }}>
                          YOU
                        </span>
                      )}
                      {entry.isRival && (
                        <span style={{ background: 'rgba(15, 23, 42, 0.08)', color: '#64748b', fontSize: '0.55rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4 }}>
                          RIVAL
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.66rem', color: '#64748b', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
                      {entry.tier.replace('_', ' ')} • WAVE {entry.highestWave} • {entry.totalKills} KILLS
                    </span>
                  </div>
                </div>

                {/* Right: Primary Metric Value */}
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontFamily: "'Rajdhani', var(--font-display), sans-serif",
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      color: category === 'score' ? '#0284c7' : category === 'wave' ? '#f97316' : '#e11d48',
                      lineHeight: 1
                    }}
                  >
                    {category === 'score'
                      ? entry.highScore.toLocaleString()
                      : category === 'wave'
                      ? `WAVE ${entry.highestWave}`
                      : `${entry.totalKills}`}
                  </span>
                  <div style={{ fontSize: '0.55rem', color: '#94a3b8', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {category === 'score' ? 'POINTS' : category === 'wave' ? 'CLEARED' : 'TOTAL KILLS'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current User Fixed Status Footer */}
        {currentUserEntry && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(15, 23, 42, 0.04))',
              border: '1.5px solid #0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={20} color="#0284c7" />
              <div>
                <span style={{ fontSize: '0.72rem', color: '#0284c7', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                  CURRENT ACTIVE OPERATIVE: {currentUser.username}
                </span>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  RANK #{currentUserEntry.rank} OF {rawLeaderboard.length} OPERATIVES • BEST SCORE: <strong>{currentUser.highScore.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="btn-cyber btn-cyber-primary"
              style={{ padding: '8px 18px', fontSize: '0.78rem' }}
            >
              DEPLOY TO COMBAT
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

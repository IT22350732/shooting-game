import React from 'react';
import { KillFeedEntry } from '../../game/multiplayer/MultiplayerTypes';
import { Crosshair, Target } from 'lucide-react';

interface KillFeedProps {
  entries: KillFeedEntry[];
}

export const KillFeed: React.FC<KillFeedProps> = ({ entries }) => {
  if (entries.length === 0) return null;

  const getTeamColor = (team: string) => {
    if (team === 'alpha') return '#38bdf8'; // Blue
    if (team === 'bravo') return '#f87171'; // Red
    return '#c084fc'; // FFA Purple
  };

  const formatWeaponName = (id: string) => {
    switch (id) {
      case 'assault_rifle': return 'M4-AR';
      case 'shotgun': return 'STRIKER';
      case 'smg': return 'VECTOR';
      case 'sniper': return 'BARRETT';
      case 'plasma_rifle': return 'PLASMA';
      default: return 'WEAPON';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 65,
        right: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 50,
        pointerEvents: 'none',
        maxWidth: 320
      }}
    >
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 6,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.82rem',
            fontWeight: 800,
            animation: 'fadeInRight 0.25s ease-out'
          }}
        >
          {/* Killer */}
          <span style={{ color: getTeamColor(entry.killerTeam) }}>
            {entry.killerName}
          </span>

          {/* Weapon / Elimination Icon */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '1px 6px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 4,
              color: '#e2e8f0',
              fontSize: '0.68rem',
              letterSpacing: 0.5
            }}
          >
            {entry.isHeadshot ? (
              <>
                <Target size={12} color="#facc15" />
                <span style={{ color: '#facc15', fontWeight: 900 }}>HEADSHOT</span>
              </>
            ) : (
              <>
                <Crosshair size={11} color="#94a3b8" />
                <span>{formatWeaponName(entry.weaponId)}</span>
              </>
            )}
          </div>

          {/* Victim */}
          <span style={{ color: getTeamColor(entry.victimTeam), textDecoration: 'line-through', opacity: 0.85 }}>
            {entry.victimName}
          </span>
        </div>
      ))}
    </div>
  );
};

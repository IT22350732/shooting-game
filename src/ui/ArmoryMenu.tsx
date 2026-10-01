import React from 'react';
import { X, Lock, CheckCircle, Crosshair } from 'lucide-react';
import { WeaponId, WeaponConfig } from '../types/game';
import { BASE_WEAPONS } from '../game/entities/Weapon';
import { saveManager } from '../game/managers/SaveManager';
import { soundManager } from '../audio/SoundManager';

interface ArmoryMenuProps {
  onClose: () => void;
  coins: number;
  onRefreshCoins: () => void;
}

export const ArmoryMenu: React.FC<ArmoryMenuProps> = ({ onClose, coins, onRefreshCoins }) => {
  const [selectedWeaponId, setSelectedWeaponId] = React.useState<WeaponId>('assault_rifle');
  const savedData = saveManager.getData();
  const unlockedList = savedData.unlockedWeapons;

  const currentConfig: WeaponConfig = BASE_WEAPONS[selectedWeaponId];
  const isUnlocked = unlockedList.includes(selectedWeaponId);

  const handleUnlock = () => {
    if (saveManager.unlockWeapon(selectedWeaponId, currentConfig.unlockCost)) {
      soundManager.playPowerup();
      onRefreshCoins();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
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
          maxWidth: 960,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1.5px solid rgba(2, 132, 199, 0.35)',
          background: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(15, 23, 42, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Crosshair size={28} color="#0284c7" />
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#0f172a', letterSpacing: '0.05em', fontWeight: 900 }}>
                TACTICAL WEAPON ARMORY
              </h2>
              <p style={{ fontFamily: 'var(--font-sub)', fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                Review arsenal specifications and acquire high-tier combat ordnance
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d97706', fontFamily: 'var(--font-display)', fontWeight: 900 }}>
              <span>COINS:</span>
              <span style={{ fontSize: '1.3rem' }}>{coins}</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <X size={26} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="armory-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Weapon List (Left Column) */}
          <div
            className="armory-weapon-list"
            style={{
              width: 320,
              borderRight: '1px solid rgba(15, 23, 42, 0.1)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              overflowY: 'auto'
            }}
          >
            {(Object.keys(BASE_WEAPONS) as WeaponId[]).map((wId) => {
              const w = BASE_WEAPONS[wId];
              const unlocked = unlockedList.includes(wId);
              const isSelected = (wId === selectedWeaponId);

              return (
                <div
                  key={wId}
                  onClick={() => setSelectedWeaponId(wId)}
                  className="glass-panel armory-weapon-item"
                  style={{
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.08)',
                    background: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'rgba(255, 255, 255, 0.7)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: isSelected ? '#0284c7' : '#0f172a', fontWeight: 800 }}>
                      {w.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                      {w.category}
                    </span>
                  </div>

                  {unlocked ? (
                    <CheckCircle size={18} color="#0284c7" />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d97706', fontSize: '0.8rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                      <Lock size={14} />
                      <span>{w.unlockCost}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Weapon Details (Right Column) */}
          <div className="armory-weapon-details" style={{ flex: 1, padding: 'clamp(16px, 3vw, 28px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: '#0284c7', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                    {currentConfig.category.toUpperCase()}
                  </span>
                  {isUnlocked && (
                    <span style={{ background: 'rgba(2, 132, 199, 0.1)', border: '1px solid #0284c7', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', color: '#0284c7', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                      UNLOCKED
                    </span>
                  )}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.3rem, 3vw, 2rem)', color: '#0f172a', fontWeight: 900 }}>
                  {currentConfig.name}
                </h3>
                <p style={{ fontFamily: 'var(--font-sub)', fontSize: '0.95rem', color: '#475569', marginTop: 4, lineHeight: 1.35, fontWeight: 500 }}>
                  {currentConfig.description}
                </p>
              </div>

              {/* Stat Bars */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'clamp(8px, 2vw, 16px)' }}>
                <StatBar label="DAMAGE" value={currentConfig.damage * (currentConfig.pellets || 1)} max={200} color="#e11d48" />
                <StatBar label="FIRE RATE" value={currentConfig.fireRate} max={20} unit="rps" color="#0284c7" />
                <StatBar label="MAGAZINE" value={currentConfig.magSize} max={50} color="#d97706" />
                <StatBar label="RELOAD SPEED" value={currentConfig.reloadTime} max={3.5} unit="s" inverse color="#7c3aed" />
                <StatBar label="ACCURACY" value={Math.round((1 - currentConfig.spread * 10) * 100)} max={100} unit="%" color="#059669" />
                <StatBar label="CRITICAL MULTIPLIER" value={currentConfig.critMultiplier} max={4.0} unit="x" color="#b45309" />
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ paddingTop: 24, borderTop: '1px solid rgba(15, 23, 42, 0.1)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
              {isUnlocked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                  <CheckCircle size={20} />
                  <span>READY FOR COMBAT LOADOUT</span>
                </div>
              ) : (
                <button
                  onClick={handleUnlock}
                  disabled={coins < currentConfig.unlockCost}
                  className="btn-cyber btn-cyber-gold"
                  style={{ opacity: coins >= currentConfig.unlockCost ? 1 : 0.5, cursor: coins >= currentConfig.unlockCost ? 'pointer' : 'not-allowed' }}
                >
                  <Lock size={18} />
                  UNLOCK WEAPON ({currentConfig.unlockCost} COINS)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBar: React.FC<{ label: string; value: number; max: number; unit?: string; inverse?: boolean; color: string }> = ({
  label,
  value,
  max,
  unit = '',
  color
}) => {
  const percent = Math.min(100, Math.max(5, (value / max) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'var(--font-display)', color: '#475569', fontWeight: 700 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 900 }}>{value} {unit}</span>
      </div>
      <div style={{ width: '100%', height: 7, background: 'rgba(15, 23, 42, 0.08)', borderRadius: 3.5, overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
};

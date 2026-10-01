import React from 'react';
import { X, Zap, Heart, Shield, RefreshCw, Flame, Award, Crosshair } from 'lucide-react';
import { UpgradeLevels } from '../types/game';
import { saveManager } from '../game/managers/SaveManager';
import { soundManager } from '../audio/SoundManager';

interface UpgradesMenuProps {
  onClose: () => void;
  coins: number;
  onRefreshCoins: () => void;
}

interface UpgradeItemConfig {
  key: keyof UpgradeLevels;
  title: string;
  desc: string;
  effect: string;
  icon: React.ReactNode;
  color: string;
}

export const UpgradesMenu: React.FC<UpgradesMenuProps> = ({ onClose, coins, onRefreshCoins }) => {
  const [, setRerender] = React.useState(0);
  const savedData = saveManager.getData();
  const upgrades = savedData.upgrades;

  const handleBuy = (key: keyof UpgradeLevels) => {
    if (saveManager.buyUpgrade(key)) {
      soundManager.playPowerup();
      onRefreshCoins();
      setRerender(n => n + 1);
    }
  };

  const UPGRADE_ITEMS: UpgradeItemConfig[] = [
    {
      key: 'damage',
      title: 'KINETIC DAMAGE AMPLIFIER',
      desc: 'Supercharges weapon munitions with condensed energy.',
      effect: '+15% Damage to all weapons per level',
      icon: <Flame size={22} color="#e11d48" />,
      color: '#e11d48'
    },
    {
      key: 'fireRate',
      title: 'OVERCLOCKED BOLT CYCLING',
      desc: 'Optimizes weapon firing pin cadence and chamber recovery.',
      effect: '+10% Rate of Fire per level',
      icon: <Zap size={22} color="#0284c7" />,
      color: '#0284c7'
    },
    {
      key: 'magazine',
      title: 'EXTENDED DRUM CONDENSERS',
      desc: 'Expands weapon magazine feeding mechanisms.',
      effect: '+20% Magazine Capacity per level',
      icon: <Crosshair size={22} color="#d97706" />,
      color: '#d97706'
    },
    {
      key: 'reload',
      title: 'TACTICAL QUICK-MAG RELEASE',
      desc: 'Assists servo-assisted magnetic clip reloads.',
      effect: '+8% Faster Reloading per level',
      icon: <RefreshCw size={22} color="#7c3aed" />,
      color: '#7c3aed'
    },
    {
      key: 'health',
      title: 'CYBERNETIC NANO-CHASSIS',
      desc: 'Reinforces biological vitals with synthesized nano-fibers.',
      effect: '+25 Maximum Health per level',
      icon: <Heart size={22} color="#059669" />,
      color: '#059669'
    },
    {
      key: 'armor',
      title: 'ENERGY DEFLECTOR PLATING',
      desc: 'Augments sub-dermal kinetic dispersion shields.',
      effect: '+20 Maximum Armor per level',
      icon: <Shield size={22} color="#0284c7" />,
      color: '#0284c7'
    },
    {
      key: 'critChance',
      title: 'WEAKPOINT TARGETING MATRIX',
      desc: 'Neural link calibration detects vulnerability apertures.',
      effect: '+5% Critical Strike Probability per level',
      icon: <Award size={22} color="#b45309" />,
      color: '#b45309'
    }
  ];

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
        padding: 'clamp(10px, 2.5vw, 24px)'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 960,
          maxHeight: '92dvh',
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
            padding: 'clamp(12px, 2vw, 20px) clamp(14px, 2.5vw, 28px)',
            borderBottom: '1px solid rgba(15, 23, 42, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={26} color="#0284c7" />
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', color: '#0f172a', letterSpacing: '0.05em', fontWeight: 900 }}>
                PERMANENT COMBAT UPGRADES
              </h2>
              <p style={{ fontFamily: 'var(--font-sub)', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Invest earned combat bounty to enhance operative capabilities
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontFamily: 'var(--font-display)', fontWeight: 900 }}>
              <span style={{ fontSize: '0.82rem' }}>COINS:</span>
              <span style={{ fontSize: '1.15rem' }}>{coins}</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Upgrade Cards Grid */}
        <div style={{ padding: 'clamp(12px, 2.5vw, 24px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'clamp(10px, 2vw, 16px)' }}>
          {UPGRADE_ITEMS.map((item) => {
            const currentLvl = upgrades[item.key];
            const isMax = currentLvl >= 5;
            const cost = saveManager.getUpgradeCost(item.key);
            const canAfford = coins >= cost;

            return (
              <div
                key={item.key}
                className="glass-panel"
                style={{
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  border: isMax ? '1.5px solid rgba(5, 150, 105, 0.4)' : '1px solid rgba(15, 23, 42, 0.08)',
                  background: isMax ? 'rgba(5, 150, 105, 0.06)' : 'rgba(255, 255, 255, 0.7)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.icon}
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                        {item.title}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontFamily: 'var(--font-sub)', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.3, fontWeight: 500 }}>
                    {item.desc}
                  </p>

                  <span style={{ fontSize: '0.82rem', color: item.color, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                    {item.effect}
                  </span>

                  {/* Level Pips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-display)', color: '#64748b', fontWeight: 700 }}>LVL {currentLvl}/5</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 1, 2, 3, 4].map(idx => (
                        <div
                          key={idx}
                          style={{
                            width: 18,
                            height: 6,
                            borderRadius: 2,
                            background: idx < currentLvl ? item.color : 'rgba(15, 23, 42, 0.1)'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Upgrade Button */}
                {isMax ? (
                  <button
                    disabled
                    className="btn-cyber"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', opacity: 0.7, cursor: 'default', background: 'rgba(5, 150, 105, 0.15)', borderColor: '#059669', color: '#059669' }}
                  >
                    MAX LEVEL REACHED
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(item.key)}
                    disabled={!canAfford}
                    className="btn-cyber btn-cyber-gold"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      opacity: canAfford ? 1 : 0.5,
                      cursor: canAfford ? 'pointer' : 'not-allowed'
                    }}
                  >
                    UPGRADE ({cost} COINS)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

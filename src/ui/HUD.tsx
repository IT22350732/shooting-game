import React, { useEffect, useState } from 'react';
import {
  Shield,
  Heart,
  Flame,
  Coins,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';
import { WeaponId, PowerupActiveState, HitMarkerInfo, FloatingDamageNumber, GameSettings } from '../types/game';
import { BASE_WEAPONS } from '../game/entities/Weapon';

interface HUDProps {
  stats: {
    health: number;
    maxHealth: number;
    armor: number;
    maxArmor: number;
    ammo: number;
    maxAmmo: number;
    isReloading: boolean;
    reloadProgress: number;
    score: number;
    combo: number;
    comboTimer: number;
    coins: number;
    wave: number;
    enemiesRemaining: number;
    timeRemaining?: number;
    activeWeaponId: WeaponId;
  };
  hitMarker: HitMarkerInfo | null;
  damageNumbers: FloatingDamageNumber[];
  boss: { name: string; health: number; maxHealth: number; phase: number; isAlive: boolean } | null;
  powerups: PowerupActiveState[];
  settings: GameSettings;
  isAimingSniper: boolean;
  onSwitchWeapon: (id: WeaponId) => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  hitMarker,
  damageNumbers,
  boss,
  powerups,
  settings,
  isAimingSniper,
  onSwitchWeapon
}) => {
  const [showHitmarker, setShowHitmarker] = useState(false);
  const [hitmarkerCrit, setHitmarkerCrit] = useState(false);

  useEffect(() => {
    if (hitMarker) {
      setShowHitmarker(true);
      setHitmarkerCrit(hitMarker.isCrit);
      const timer = setTimeout(() => setShowHitmarker(false), 140);
      return () => clearTimeout(timer);
    }
  }, [hitMarker]);

  const activeWeapon = BASE_WEAPONS[stats.activeWeaponId];
  const hpPercent = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100));
  const armorPercent = Math.max(0, Math.min(100, (stats.armor / stats.maxArmor) * 100));
  const isLowHp = hpPercent <= 25;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Low Health Red Vignette Pulse */}
      {isLowHp && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 100px rgba(244, 63, 94, 0.45)',
            animation: 'pulseGlow 1s infinite alternate',
            zIndex: 10
          }}
        />
      )}

      {/* Sniper ADS Scope Overlay */}
      {isAimingSniper && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, transparent 32%, rgba(15, 23, 42, 0.94) 65%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 15
          }}
        >
          {/* Tactical Crosshair Ring */}
          <div
            style={{
              width: 320,
              height: 320,
              border: '2px solid rgba(14, 165, 233, 0.7)',
              borderRadius: '50%',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(14, 165, 233, 0.3)'
            }}
          >
            <div style={{ position: 'absolute', width: '100%', height: 1.5, background: 'rgba(14, 165, 233, 0.8)' }} />
            <div style={{ position: 'absolute', height: '100%', width: 1.5, background: 'rgba(14, 165, 233, 0.8)' }} />
            <div
              style={{
                width: 6,
                height: 6,
                backgroundColor: '#f43f5e',
                borderRadius: '50%',
                boxShadow: '0 0 10px #f43f5e'
              }}
            />
          </div>
        </div>
      )}

      {/* CENTER RETICLE / CROSSHAIR */}
      {!isAimingSniper && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20
          }}
        >
          {settings.crosshairStyle === 'dot' ? (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0284c7', boxShadow: '0 0 6px rgba(2, 132, 199, 0.8)' }} />
          ) : settings.crosshairStyle === 'circle' ? (
            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #0284c7', boxShadow: '0 0 6px rgba(2, 132, 199, 0.5)' }} />
          ) : settings.crosshairStyle === 'tech' ? (
            <div style={{ width: 28, height: 28, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 10, right: 10, height: 2, background: '#0284c7' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 10, right: 10, height: 2, background: '#0284c7' }} />
              <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 2, background: '#0284c7' }} />
              <div style={{ position: 'absolute', right: 0, top: 10, bottom: 10, width: 2, background: '#0284c7' }} />
              <div style={{ position: 'absolute', top: 12, left: 12, width: 4, height: 4, background: '#f43f5e', borderRadius: '50%' }} />
            </div>
          ) : (
            // Classic 4-prong Crosshair
            <div style={{ position: 'relative', width: 24, height: 24 }}>
              <div style={{ position: 'absolute', top: 0, left: 11, width: 2, height: 7, background: '#0284c7', boxShadow: '0 0 4px #0284c7' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 11, width: 2, height: 7, background: '#0284c7', boxShadow: '0 0 4px #0284c7' }} />
              <div style={{ position: 'absolute', left: 0, top: 11, width: 7, height: 2, background: '#0284c7', boxShadow: '0 0 4px #0284c7' }} />
              <div style={{ position: 'absolute', right: 0, top: 11, width: 7, height: 2, background: '#0284c7', boxShadow: '0 0 4px #0284c7' }} />
            </div>
          )}

          {/* HITMARKER ANIMATION */}
          {showHitmarker && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(45deg)',
                width: 26,
                height: 26,
                animation: 'hitMarkerAnim 0.14s ease-out'
              }}
            >
              <div style={{ position: 'absolute', inset: 0, border: `2.5px solid ${hitmarkerCrit ? '#f43f5e' : '#0284c7'}`, borderRadius: 2 }} />
            </div>
          )}
        </div>
      )}

      {/* FLOATING DAMAGE NUMBERS */}
      {damageNumbers.map((d) => (
        <div
          key={d.id}
          style={{
            position: 'absolute',
            left: d.screenX,
            top: d.screenY,
            color: d.isCrit ? '#d97706' : '#0f172a',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            fontSize: d.isCrit ? '1.5rem' : '1.15rem',
            textShadow: d.isCrit ? '0 0 10px rgba(217, 119, 6, 0.6), 0 1px 3px #fff' : '0 1px 3px rgba(255,255,255,0.9)',
            animation: 'floatScoreAnim 0.7s forwards ease-out',
            zIndex: 30
          }}
        >
          {d.isCrit && <span style={{ fontSize: '0.8rem', marginRight: 4, color: '#f43f5e' }}>CRIT!</span>}
          {d.damage}
        </div>
      ))}

      {/* TOP BAR: WAVE / BOSS HEALTH */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          zIndex: 25
        }}
      >
        {boss && boss.isAlive ? (
          // Boss Health Bar
          <div
            className="glass-panel"
            style={{
              padding: '12px 28px',
              minWidth: 460,
              border: '1.5px solid rgba(244, 63, 94, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#e11d48', letterSpacing: '0.08em', fontWeight: 800 }}>
                ⚠️ {boss.name} [PHASE {boss.phase}]
              </span>
              <span style={{ fontFamily: 'var(--font-sub)', fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>
                {Math.max(0, boss.health)} <span style={{ color: '#64748b', fontSize: '0.85rem' }}>/ {boss.maxHealth}</span>
              </span>
            </div>
            <div style={{ width: '100%', height: 10, background: 'rgba(15, 23, 42, 0.1)', borderRadius: 5, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(0, (boss.health / boss.maxHealth) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #f43f5e, #fb7185)',
                  boxShadow: '0 0 12px rgba(244, 63, 94, 0.6)',
                  transition: 'width 0.15s ease-out'
                }}
              />
            </div>
          </div>
        ) : (
          // Normal Wave Display
          <div
            className="glass-panel"
            style={{
              padding: '10px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={20} color="#0284c7" />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                WAVE {stats.wave}
              </span>
            </div>

            <div style={{ width: 1.5, height: 24, background: 'rgba(15, 23, 42, 0.15)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontFamily: 'var(--font-sub)' }}>
              <span>ENEMIES LEFT:</span>
              <span style={{ color: '#0284c7', fontWeight: 800, fontSize: '1.15rem' }}>
                {stats.enemiesRemaining}
              </span>
            </div>

            {stats.timeRemaining !== undefined && (
              <>
                <div style={{ width: 1.5, height: 24, background: 'rgba(15, 23, 42, 0.15)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: stats.timeRemaining < 20 ? '#e11d48' : '#d97706', fontFamily: 'var(--font-display)' }}>
                  <Clock size={18} />
                  <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{stats.timeRemaining}s</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ACTIVE POWERUPS BADGES */}
        {powerups.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {powerups.map((p) => (
              <div
                key={p.type}
                className="glass-panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-display)',
                  color: '#0284c7',
                  border: '1.5px solid rgba(2, 132, 199, 0.35)',
                  background: 'rgba(255, 255, 255, 0.95)'
                }}
              >
                <Sparkles size={13} color="#0284c7" />
                <span style={{ fontWeight: 700 }}>{p.type.replace('_', ' ').toUpperCase()}</span>
                <span style={{ color: '#d97706', fontWeight: 800 }}>{Math.ceil(p.remainingTime)}s</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOP RIGHT: SCORE, COMBO & COINS */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 28,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 10,
          zIndex: 25
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: '12px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-display)', fontWeight: 700 }}>SCORE</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a' }}>
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontSize: '0.95rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            <Coins size={16} />
            <span>{stats.coins}</span>
          </div>
        </div>

        {/* COMBO MULTIPLIER METER */}
        {stats.combo > 1 && (
          <div
            className="glass-panel"
            style={{
              padding: '8px 18px',
              border: '1.5px solid #d97706',
              background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(255, 255, 255, 0.9))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              animation: 'pulseGlow 1.5s infinite alternate'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 900, fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
              <Flame size={18} color="#d97706" />
              <span>COMBO x{Math.min(5, 1 + Math.floor(stats.combo / 3) * 0.5)}</span>
              <span style={{ fontSize: '0.85rem', color: '#92400e' }}>({stats.combo} Kills)</span>
            </div>
            <div style={{ width: 120, height: 4, background: 'rgba(217, 119, 6, 0.2)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(stats.comboTimer / 4.5) * 100}%`,
                  height: '100%',
                  background: '#d97706'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM LEFT: HEALTH & ARMOR BARS */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: 24,
          left: 28,
          padding: '16px 22px',
          minWidth: 260,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 25
        }}
      >
        {/* Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e11d48', fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 800 }}>
              <Heart size={16} fill="#e11d48" />
              <span>HEALTH</span>
            </div>
            <span style={{ fontFamily: 'var(--font-sub)', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
              {stats.health} <span style={{ color: '#64748b', fontSize: '0.8rem' }}>/ {stats.maxHealth}</span>
            </span>
          </div>

          <div style={{ width: '100%', height: 10, background: 'rgba(15, 23, 42, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                width: `${hpPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #e11d48, #f43f5e)',
                boxShadow: '0 0 10px rgba(244, 63, 94, 0.5)',
                transition: 'width 0.2s ease-out'
              }}
            />
          </div>
        </div>

        {/* Armor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0284c7', fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 800 }}>
              <Shield size={16} fill="#0284c7" />
              <span>ARMOR</span>
            </div>
            <span style={{ fontFamily: 'var(--font-sub)', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
              {stats.armor} <span style={{ color: '#64748b', fontSize: '0.8rem' }}>/ {stats.maxArmor}</span>
            </span>
          </div>

          <div style={{ width: '100%', height: 8, background: 'rgba(15, 23, 42, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                width: `${armorPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                boxShadow: '0 0 8px rgba(2, 132, 199, 0.5)',
                transition: 'width 0.2s ease-out'
              }}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT: WEAPONS INVENTORY & AMMO */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 28,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 12,
          zIndex: 25
        }}
      >
        {/* Weapon Slots Selector Cards (1 to 5) */}
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto' }}>
          {(['assault_rifle', 'shotgun', 'smg', 'sniper', 'plasma_rifle'] as WeaponId[]).map((wId, idx) => {
            const w = BASE_WEAPONS[wId];
            const isCurrent = (wId === stats.activeWeaponId);
            return (
              <div
                key={wId}
                onClick={() => onSwitchWeapon(wId)}
                className="glass-panel"
                style={{
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  border: isCurrent ? '1.5px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.1)',
                  background: isCurrent ? 'rgba(2, 132, 199, 0.15)' : 'rgba(255, 255, 255, 0.85)',
                  transform: isCurrent ? 'translateY(-3px)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '0.75rem', color: isCurrent ? '#0284c7' : '#94a3b8', fontWeight: 800 }}>[{idx + 1}]</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: isCurrent ? '#0f172a' : '#64748b', fontWeight: isCurrent ? 800 : 600 }}>
                  {w.name.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current Weapon Stats & Ammo Counter Card */}
        <div
          className="glass-panel"
          style={{
            padding: '16px 24px',
            minWidth: 240,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              {activeWeapon.name}
            </span>
          </div>

          {/* Ammo display */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.8rem',
                fontWeight: 900,
                color: stats.ammo <= 5 ? '#e11d48' : '#0284c7',
                lineHeight: 1
              }}
            >
              {stats.ammo}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#94a3b8', fontWeight: 700 }}>
              / {stats.maxAmmo}
            </span>
          </div>

          {/* Reload Progress or Warning */}
          {stats.isReloading ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-display)', color: '#d97706', fontWeight: 800 }}>RELOADING...</span>
              <div style={{ width: '100%', height: 4, background: 'rgba(15, 23, 42, 0.1)', borderRadius: 2 }}>
                <div style={{ width: `${stats.reloadProgress * 100}%`, height: '100%', background: '#d97706' }} />
              </div>
            </div>
          ) : stats.ammo === 0 ? (
            <span
              style={{
                fontSize: '0.8rem',
                fontFamily: 'var(--font-display)',
                color: '#e11d48',
                animation: 'pulseGlow 0.8s infinite alternate',
                fontWeight: 800
              }}
            >
              PRESS [R] TO RELOAD
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

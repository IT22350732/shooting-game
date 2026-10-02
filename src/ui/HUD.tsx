import React, { useEffect, useState, useRef } from 'react';
import {
  Shield,
  Heart,
  Flame,
  Coins,
  Clock,
  Sparkles,
  Award,
  Pause,
  Maximize,
  Minimize,
  RotateCw
} from 'lucide-react';
import { WeaponId, PowerupActiveState, HitMarkerInfo, FloatingDamageNumber, GameSettings } from '../types/game';
import { BASE_WEAPONS } from '../game/entities/Weapon';
import { useFullscreen } from '../utils/fullscreen';

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
  onPause?: () => void;
  isMobile?: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  hitMarker,
  damageNumbers,
  boss,
  powerups,
  settings,
  isAimingSniper,
  onSwitchWeapon,
  onPause,
  isMobile
}) => {
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const [showHitmarker, setShowHitmarker] = useState(false);
  const [hitmarkerCrit, setHitmarkerCrit] = useState(false);
  const lastCycleTimeRef = useRef<number>(0);

  const WEAPON_LIST: WeaponId[] = ['assault_rifle', 'shotgun', 'smg', 'sniper', 'plasma_rifle'];

  const isMobileView = Boolean(isMobile) || (typeof window !== 'undefined' && (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    window.matchMedia('(pointer: coarse)').matches ||
    (window.innerWidth <= 1024 && window.innerHeight <= 600)
  ));

  const currentWeaponIdx = WEAPON_LIST.indexOf(stats.activeWeaponId);
  const nextWeaponIdx = (currentWeaponIdx + 1) % WEAPON_LIST.length;
  const nextWeapon = BASE_WEAPONS[WEAPON_LIST[nextWeaponIdx]];

  const handleCycleWeaponNext = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastCycleTimeRef.current < 220) {
      return;
    }
    lastCycleTimeRef.current = now;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    onSwitchWeapon(WEAPON_LIST[nextWeaponIdx]);
  };



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
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50 }}>
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

      {/* TOP-LEFT: TACTICAL CONTROLS (PAUSE & FULLSCREEN) */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 16px)',
          zIndex: 45,
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        {onPause && (
          <button
            onClick={onPause}
            className="glass-panel"
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              border: '1.5px solid rgba(2, 132, 199, 0.45)',
              background: 'rgba(255, 255, 255, 0.94)',
              color: '#0284c7',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(2, 132, 199, 0.2)'
            }}
            aria-label="Pause Combat Simulation"
            title="Pause Simulation"
          >
            <Pause size={20} />
          </button>
        )}

        <button
          onClick={() => toggleFullscreen()}
          onTouchEnd={(e) => {
            e.preventDefault();
            toggleFullscreen();
          }}
          className="glass-panel"
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            border: isFullscreen ? '1.5px solid #0284c7' : '1.5px solid rgba(15, 23, 42, 0.15)',
            background: isFullscreen ? 'rgba(2, 132, 199, 0.15)' : 'rgba(255, 255, 255, 0.94)',
            color: isFullscreen ? '#0284c7' : '#0f172a',
            cursor: 'pointer',
            boxShadow: isFullscreen ? '0 0 14px rgba(2, 132, 199, 0.35)' : '0 4px 15px rgba(15, 23, 42, 0.1)'
          }}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>

      {/* TOP BAR: WAVE / BOSS HEALTH */}
      <div
        className="hud-top-wave"
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          zIndex: 25,
          maxWidth: 'calc(100vw - 120px)'
        }}
      >
        {boss && boss.isAlive ? (
          // Boss Health Bar
          <div
            className="glass-panel"
            style={{
              padding: '10px 20px',
              width: 'min(90vw, 460px)',
              border: '1.5px solid rgba(244, 63, 94, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: '#e11d48', letterSpacing: '0.08em', fontWeight: 800 }}>
                ⚠️ {boss.name} [PHASE {boss.phase}]
              </span>
              <span style={{ fontFamily: 'var(--font-sub)', fontSize: '1rem', color: '#0f172a', fontWeight: 800 }}>
                {Math.max(0, boss.health)} <span style={{ color: '#64748b', fontSize: '0.8rem' }}>/ {boss.maxHealth}</span>
              </span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'rgba(15, 23, 42, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
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
        className="hud-top-score"
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          zIndex: 25
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: '10px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 2
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-display)', fontWeight: 700 }}>SCORE</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#0f172a' }}>
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontSize: '0.85rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            <Coins size={14} />
            <span>{stats.coins}</span>
          </div>
        </div>

        {/* COMBO MULTIPLIER METER */}
        {stats.combo > 1 && (
          <div
            className="glass-panel"
            style={{
              padding: '6px 14px',
              border: '1.5px solid #d97706',
              background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(255, 255, 255, 0.9))',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              animation: 'pulseGlow 1.5s infinite alternate'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 900, fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
              <Flame size={16} color="#d97706" />
              <span>COMBO x{Math.min(5, 1 + Math.floor(stats.combo / 3) * 0.5)}</span>
              <span style={{ fontSize: '0.78rem', color: '#92400e' }}>({stats.combo})</span>
            </div>
            <div style={{ width: 100, height: 3, background: 'rgba(217, 119, 6, 0.2)', borderRadius: 2, overflow: 'hidden' }}>
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
        className="glass-panel hud-health-panel"
        style={{
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}
      >
        {/* Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e11d48', fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 800 }}>
              <Heart size={15} fill="#e11d48" />
              <span className="stat-label">HEALTH</span>
            </div>
            <span className="stat-val" style={{ fontFamily: 'var(--font-sub)', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
              {stats.health} <span style={{ color: '#64748b', fontSize: '0.75rem' }}>/ {stats.maxHealth}</span>
            </span>
          </div>

          <div style={{ width: '100%', height: 8, background: 'rgba(15, 23, 42, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0284c7', fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 800 }}>
              <Shield size={15} fill="#0284c7" />
              <span className="stat-label">ARMOR</span>
            </div>
            <span className="stat-val" style={{ fontFamily: 'var(--font-sub)', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
              {stats.armor} <span style={{ color: '#64748b', fontSize: '0.75rem' }}>/ {stats.maxArmor}</span>
            </span>
          </div>

          <div style={{ width: '100%', height: 7, background: 'rgba(15, 23, 42, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
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
      <div className="hud-weapon-panel" style={{ pointerEvents: 'auto', zIndex: 60 }}>
        {isMobileView ? (
          /* MOBILE VIEW: Single One-Tap Weapon Cycler Button (1 click -> next weapon) */
          <button
            type="button"
            onClick={handleCycleWeaponNext}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={handleCycleWeaponNext}
            className="hud-weapon-mobile-cycler"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '8px 14px',
              background: 'rgba(255, 255, 255, 0.96)',
              border: '2px solid #0284c7',
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(2, 132, 199, 0.35)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'manipulation',
              pointerEvents: 'auto',
              minWidth: 185
            }}
            aria-label="Switch Weapon"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)',
                  flexShrink: 0
                }}
              >
                <RotateCw size={18} strokeWidth={2.6} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#0284c7', letterSpacing: '0.06em', lineHeight: 1 }}>
                  WEAPON [{currentWeaponIdx + 1}/5] • TAP
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.15 }}>
                  {activeWeapon.name}
                </span>
              </div>
            </div>

            <div
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(2, 132, 199, 0.12)',
                border: '1.5px solid rgba(2, 132, 199, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                pointerEvents: 'none'
              }}
            >
              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#0284c7' }}>
                NEXT: {nextWeapon.name.split(' ')[0]} ➔
              </span>
            </div>
          </button>
        ) : (
          /* DESKTOP VIEW: WEAPON SLOTS [1-5] (Keys 1, 2, 3, 4, 5 or Click) */
          <div className="hud-weapon-slots" style={{ display: 'flex', gap: 6, pointerEvents: 'auto' }}>
            {WEAPON_LIST.map((wId, idx) => {
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
                    background: isCurrent ? 'rgba(2, 132, 199, 0.18)' : 'rgba(255, 255, 255, 0.88)',
                    transform: isCurrent ? 'translateY(-3px)' : 'none',
                    boxShadow: isCurrent ? '0 4px 15px rgba(2, 132, 199, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: isCurrent ? '#0284c7' : '#94a3b8', fontWeight: 800 }}>
                    [{idx + 1}]
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', color: isCurrent ? '#0f172a' : '#64748b', fontWeight: isCurrent ? 800 : 600 }}>
                    {w.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Current Weapon Stats & Ammo Counter Card */}
        <div
          className="glass-panel hud-weapon-card"
          style={{
            padding: '12px 18px',
            minWidth: 190,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4
          }}
        >
          {/* Ammo display */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              className="hud-ammo-big"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.5rem',
                fontWeight: 900,
                color: stats.ammo <= 5 ? '#e11d48' : '#0284c7',
                lineHeight: 1
              }}
            >
              {stats.ammo}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#94a3b8', fontWeight: 700 }}>
              / {stats.maxAmmo}
            </span>
          </div>

          {/* Reload Progress or Warning */}
          {stats.isReloading ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-display)', color: '#d97706', fontWeight: 800 }}>RELOADING...</span>
              <div style={{ width: '100%', height: 4, background: 'rgba(15, 23, 42, 0.1)', borderRadius: 2 }}>
                <div style={{ width: `${stats.reloadProgress * 100}%`, height: '100%', background: '#d97706' }} />
              </div>
            </div>
          ) : stats.ammo === 0 ? (
            <span
              style={{
                fontSize: '0.78rem',
                fontFamily: 'var(--font-display)',
                color: '#e11d48',
                animation: 'pulseGlow 0.8s infinite alternate',
                fontWeight: 800
              }}
            >
              RELOAD NEEDED [R]
            </span>
          ) : (
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-display)', color: '#64748b', fontWeight: 700 }}>
              [R] RELOAD
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

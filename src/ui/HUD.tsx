import React, { useEffect, useState } from 'react';
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
  ChevronDown,
  Crosshair,
  Check,
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
  onPause
}) => {
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const [showHitmarker, setShowHitmarker] = useState(false);
  const [hitmarkerCrit, setHitmarkerCrit] = useState(false);
  const [isWeaponMenuOpen, setIsWeaponMenuOpen] = useState(false);

  const WEAPON_LIST: WeaponId[] = ['assault_rifle', 'shotgun', 'smg', 'sniper', 'plasma_rifle'];

  const currentWeaponIdx = WEAPON_LIST.indexOf(stats.activeWeaponId);
  const nextWeaponIdx = (currentWeaponIdx + 1) % WEAPON_LIST.length;
  const nextWeapon = BASE_WEAPONS[WEAPON_LIST[nextWeaponIdx]];

  const handleCycleWeaponNext = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onSwitchWeapon(WEAPON_LIST[nextWeaponIdx]);
  };

  useEffect(() => {
    if (!isWeaponMenuOpen) return;
    const handleClose = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest?.('.hud-weapon-dropdown-container')) {
        setIsWeaponMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClose);
    window.addEventListener('touchstart', handleClose);
    return () => {
      window.removeEventListener('mousedown', handleClose);
      window.removeEventListener('touchstart', handleClose);
    };
  }, [isWeaponMenuOpen]);

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
        {/* DESKTOP VIEW: Tactical Dropdown Selector */}
        <div className="hud-weapon-desktop-dropdown hud-weapon-dropdown-container" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {/* Dropdown Header Pill (Click to toggle options) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsWeaponMenuOpen(prev => !prev);
            }}
            className="hud-weapon-dropdown-wrapper"
            style={{ cursor: 'pointer', outline: 'none' }}
            aria-label="Select Weapon"
          >
            <div className="hud-dropdown-icon">
              <Crosshair size={14} color="#0284c7" />
            </div>
            <div className="hud-dropdown-content">
              <span className="hud-dropdown-tag">WEAPON</span>
              <span className="hud-dropdown-val">
                [{currentWeaponIdx + 1}] {activeWeapon.name}
              </span>
            </div>
            <ChevronDown
              size={14}
              color="#0284c7"
              className="hud-select-arrow"
              style={{
                transform: isWeaponMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>

          {/* REAL VERTICAL DROPDOWN MENU (PULSE, BREAKER, VIPER, VALKYRIE, HELIOS) */}
          {isWeaponMenuOpen && (
            <div
              className="hud-weapon-dropdown-menu"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                padding: 8,
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: 14,
                border: '1.5px solid rgba(2, 132, 199, 0.45)',
                boxShadow: '0 10px 32px rgba(15, 23, 42, 0.3)',
                minWidth: 220,
                zIndex: 120,
                pointerEvents: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 6px 4px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
                <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#0284c7', letterSpacing: '0.06em' }}>
                  SELECT WEAPON
                </span>
                <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>KEY [1-5]</span>
              </div>

              {WEAPON_LIST.map((wId, idx) => {
                const w = BASE_WEAPONS[wId];
                const isCurrent = (wId === stats.activeWeaponId);
                return (
                  <button
                    key={wId}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSwitchWeapon(wId);
                      setIsWeaponMenuOpen(false);
                    }}
                    className="hud-weapon-option-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: isCurrent ? '1.5px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.08)',
                      background: isCurrent ? 'rgba(2, 132, 199, 0.15)' : 'rgba(255, 255, 255, 0.85)',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      textAlign: 'left',
                      outline: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 800,
                        color: isCurrent ? '#0284c7' : '#94a3b8'
                      }}>
                        [{idx + 1}]
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '0.82rem',
                          fontWeight: isCurrent ? 800 : 700,
                          color: isCurrent ? '#0284c7' : '#0f172a',
                          lineHeight: 1.1
                        }}>
                          {w.name}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', marginTop: 1 }}>
                          {w.category}
                        </span>
                      </div>
                    </div>
                    {isCurrent && (
                      <Check size={15} color="#0284c7" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* MOBILE VIEW: Single One-Tap Weapon Cycler Button (1 click -> next weapon) */}
        <button
          type="button"
          onClick={handleCycleWeaponNext}
          onTouchEnd={handleCycleWeaponNext}
          className="hud-weapon-mobile-cycler"
          aria-label="Switch Weapon"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
                flexShrink: 0
              }}
            >
              <RotateCw size={17} strokeWidth={2.5} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#0284c7', letterSpacing: '0.04em', lineHeight: 1 }}>
                WEAPON [{currentWeaponIdx + 1}/5]
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.15 }}>
                {activeWeapon.name.split(' ')[0]}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(2, 132, 199, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              pointerEvents: 'none'
            }}
          >
            <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#0284c7' }}>
              NEXT: {nextWeapon.name.split(' ')[0]} ➔
            </span>
          </div>
        </button>

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

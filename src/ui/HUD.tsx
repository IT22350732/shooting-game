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
  RotateCw,
  Target,
  HelpCircle,
  Wifi,
  Skull,
  Activity
} from 'lucide-react';
import {
  WeaponId,
  PowerupActiveState,
  HitMarkerInfo,
  FloatingDamageNumber,
  GameSettings,
  GameMode,
  TargetLockInfo,
  MissionObjectiveInfo,
  MissionConfig
} from '../types/game';
import { BASE_WEAPONS } from '../game/entities/Weapon';
import { useFullscreen } from '../utils/fullscreen';
import { KillFeed } from './multiplayer/KillFeed';
import { MultiplayerScoreboard } from './multiplayer/MultiplayerScoreboard';
import { SquadVoiceHUD } from './multiplayer/SquadVoiceHUD';
import { multiplayerService } from '../game/multiplayer/MultiplayerService';
import { KillFeedEntry } from '../game/multiplayer/MultiplayerTypes';

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
    kills?: number;
    enemiesRemaining: number;
    timeRemaining?: number;
    activeWeaponId: WeaponId;
    isAiming?: boolean;
    isZooming?: boolean;
    zoomLevel?: number;
    zoomMagnification?: number;
    targetLock?: TargetLockInfo | null;
    mode?: GameMode;
    missionObjective?: MissionObjectiveInfo | null;
    activeMission?: MissionConfig | null;
    isMultiplayer?: boolean;
    isRespawning?: boolean;
    respawnCountdown?: number;
    killerName?: string;
    multiplayerAlphaScore?: number;
    multiplayerBravoScore?: number;
    multiplayerScoreLimit?: number;
    multiplayerPing?: number;
    fps?: number;
    graphicsQuality?: string;
  };
  hitMarker: HitMarkerInfo | null;
  damageNumbers: FloatingDamageNumber[];
  boss: { name: string; health: number; maxHealth: number; phase: number; isAlive: boolean } | null;
  powerups: PowerupActiveState[];
  settings: GameSettings;
  isAimingSniper: boolean;
  onSwitchWeapon: (id: WeaponId) => void;
  onPause?: () => void;
  onOpenTutorial?: () => void;
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
  onOpenTutorial,
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

  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowScoreboard(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    multiplayerService.setEvents({
      onKillFeed: (entry) => {
        setKillFeed(prev => [...prev.slice(-5), entry]);
        setTimeout(() => {
          setKillFeed(prev => prev.filter(k => k.id !== entry.id));
        }, 4500);
      }
    });
  }, []);

  const activeWeapon = BASE_WEAPONS[stats.activeWeaponId];
  const hpPercent = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100));
  const armorPercent = Math.max(0, Math.min(100, (stats.armor / stats.maxArmor) * 100));
  const isLowHp = hpPercent <= 25;

  return (
    <div className="hud-root-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
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

      {/* SMART TARGET ACQUISITION & LOCK-ON HUD */}
      {stats.isZooming && stats.targetLock && (
        <div
          style={{
            position: 'absolute',
            left: stats.targetLock.screenX,
            top: stats.targetLock.screenY,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 25,
            transition: 'left 0.04s ease-out, top 0.04s ease-out'
          }}
        >
          {/* Target Tracking Bracket Box */}
          <div
            style={{
              position: 'relative',
              width: 68,
              height: 68,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* 4 Corner Bracket Accents */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 14,
                height: 14,
                borderTop: `2px solid ${stats.targetLock.isCritical ? '#facc15' : '#00f0ff'}`,
                borderLeft: `2px solid ${stats.targetLock.isCritical ? '#facc15' : '#00f0ff'}`,
                boxShadow: stats.targetLock.isCritical ? '0 0 10px #facc15' : '0 0 10px #00f0ff'
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 14,
                height: 14,
                borderTop: `2px solid ${stats.targetLock.isCritical ? '#facc15' : '#00f0ff'}`,
                borderRight: `2px solid ${stats.targetLock.isCritical ? '#facc15' : '#00f0ff'}`,
                boxShadow: stats.targetLock.isCritical ? '0 0 10px #facc15' : '0 0 10px #00f0ff'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: 14,
                height: 14,
                borderBottom: `2px solid ${stats.targetLock.isCritical ? '#facc15' : '#00f0ff'}`,
                borderLeft: `2px solid ${stats.targetLock.isCritical ? '#facc15' : '#00f0ff'}`,
                boxShadow: stats.targetLock.isCritical ? '0 0 10px #facc15' : '0 0 10px #00f0ff'
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 14,
                height: 14,
                borderBottom: `2px solid ${stats.targetLock.isCritical ? '#facc15' : '#00f0ff'}`,
                borderRight: `2px solid ${stats.targetLock.isCritical ? '#facc15' : '#00f0ff'}`,
                boxShadow: stats.targetLock.isCritical ? '0 0 10px #facc15' : '0 0 10px #00f0ff'
              }}
            />

            {/* Target Reticle Pip */}
            <div
              style={{
                width: 8,
                height: 8,
                transform: 'rotate(45deg)',
                border: `1.5px solid ${stats.targetLock.isCritical ? '#facc15' : '#00f0ff'}`,
                backgroundColor: stats.targetLock.isCritical ? 'rgba(250, 204, 21, 0.5)' : 'rgba(0, 240, 255, 0.4)',
                boxShadow: stats.targetLock.isCritical ? '0 0 8px #facc15' : '0 0 8px #00f0ff'
              }}
            />
          </div>

          {/* Target Metadata Badge */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              background: 'rgba(15, 23, 42, 0.88)',
              padding: '4px 8px',
              borderRadius: 6,
              border: `1px solid ${stats.targetLock.isCritical ? 'rgba(250, 204, 21, 0.7)' : 'rgba(0, 240, 255, 0.5)'}`,
              backdropFilter: 'blur(6px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: stats.targetLock.isCritical ? '#facc15' : '#38bdf8',
                  letterSpacing: '0.08em'
                }}
              >
                {stats.targetLock.name}
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  fontFamily: 'monospace'
                }}
              >
                {stats.targetLock.distance}m
              </span>
            </div>

            {/* Target Health Mini-Bar */}
            <div
              style={{
                width: 76,
                height: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, (stats.targetLock.health / stats.targetLock.maxHealth) * 100))}%`,
                  height: '100%',
                  backgroundColor: stats.targetLock.isCritical ? '#facc15' : '#22c55e',
                  transition: 'width 0.15s ease'
                }}
              />
            </div>

            <span
              style={{
                fontSize: '0.55rem',
                fontWeight: 800,
                color: stats.targetLock.isCritical ? '#facc15' : '#38bdf8',
                letterSpacing: '0.06em'
              }}
            >
              {stats.targetLock.isCritical ? '⚡ CRITICAL SENSOR LOCKED' : '🎯 TARGET ACQUIRED'}
            </span>
          </div>
        </div>
      )}

      {/* TACTICAL ZOOM SCOPE OVERLAY */}
      {stats.isZooming && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {/* Sniper or Precision Focus (Stage 2) High Magnification Scope */}
          {(isAimingSniper || (stats.zoomLevel || 1) >= 2) ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: isMobileView
                  ? 'radial-gradient(circle at center, transparent 38%, rgba(15, 23, 42, 0.65) 68%, rgba(15, 23, 42, 0.82) 100%)'
                  : 'radial-gradient(circle at center, transparent 28%, rgba(15, 23, 42, 0.92) 65%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Tactical Crosshair Ring */}
              <div
                style={{
                  width: 340,
                  height: 340,
                  border: '2px solid rgba(14, 165, 233, 0.75)',
                  borderRadius: '50%',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(14, 165, 233, 0.35)'
                }}
              >
                {/* Horizontal Crosshair Line with Mil-Dots */}
                <div style={{ position: 'absolute', width: '100%', height: 1.5, background: 'rgba(14, 165, 233, 0.85)' }} />
                {/* Vertical Crosshair Line with Rangefinder Ticks */}
                <div style={{ position: 'absolute', height: '100%', width: 1.5, background: 'rgba(14, 165, 233, 0.85)' }} />

                {/* Mil-dot Range Increments */}
                {[-100, -50, 50, 100].map(offset => (
                  <React.Fragment key={offset}>
                    <div
                      style={{
                        position: 'absolute',
                        left: `calc(50% + ${offset}px)`,
                        top: 'calc(50% - 4px)',
                        width: 1.5,
                        height: 8,
                        background: 'rgba(14, 165, 233, 0.9)'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: `calc(50% + ${offset}px)`,
                        left: 'calc(50% - 4px)',
                        height: 1.5,
                        width: 8,
                        background: 'rgba(14, 165, 233, 0.9)'
                      }}
                    />
                  </React.Fragment>
                ))}

                {/* Center Illuminated Precision Reticle */}
                <div
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: stats.targetLock ? (stats.targetLock.isCritical ? '#facc15' : '#00f0ff') : '#f43f5e',
                    borderRadius: '50%',
                    boxShadow: `0 0 10px ${stats.targetLock ? (stats.targetLock.isCritical ? '#facc15' : '#00f0ff') : '#f43f5e'}`
                  }}
                />
              </div>
            </div>
          ) : (
            /* Tactical ADS (Stage 1) Optical Framing Overlay */
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, transparent 45%, rgba(15, 23, 42, 0.45) 75%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* ADS Optic Reticle Frame */}
              <div
                style={{
                  width: 260,
                  height: 260,
                  border: '1.5px dashed rgba(56, 189, 248, 0.35)',
                  borderRadius: '50%',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Horizontal Guide Notches */}
                <div style={{ position: 'absolute', left: -14, width: 28, height: 2, background: 'rgba(56, 189, 248, 0.8)' }} />
                <div style={{ position: 'absolute', right: -14, width: 28, height: 2, background: 'rgba(56, 189, 248, 0.8)' }} />
                <div style={{ position: 'absolute', top: -14, height: 28, width: 2, background: 'rgba(56, 189, 248, 0.8)' }} />
                <div style={{ position: 'absolute', bottom: -14, height: 28, width: 2, background: 'rgba(56, 189, 248, 0.8)' }} />
              </div>
            </div>
          )}

          {/* Tactical Zoom HUD Header & Magnification Status */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top, 0px) + 72px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(15, 23, 42, 0.82)',
              padding: '5px 14px',
              borderRadius: 8,
              border: '1px solid rgba(56, 189, 248, 0.4)',
              backdropFilter: 'blur(6px)',
              pointerEvents: 'none',
              zIndex: 25
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  color: '#38bdf8',
                  letterSpacing: '0.08em'
                }}
              >
                ZOOM {stats.zoomMagnification || ((stats.zoomLevel || 1) >= 2 ? 4.5 : 1.8)}X
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase'
                }}
              >
                {(stats.zoomLevel || 1) >= 2 ? 'PRECISION SCOPE FOCUS' : 'TACTICAL ADS ACQUISITION'}
              </span>
            </div>

            {/* Quick Keybind Guidance */}
            <span
              style={{
                fontSize: '0.62rem',
                color: '#64748b',
                fontWeight: 600,
                letterSpacing: '0.05em'
              }}
            >
              {isMobile ? 'TAP ADS TO CYCLE ZOOM' : 'Q: CYCLE ZOOM / HOLD  •  SHIFT: SPRINT  •  CLICK: FIRE'}
            </span>
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

      {/* TOP-LEFT: TACTICAL CONTROLS (PAUSE, FULLSCREEN & FPS) */}
      <div
        className="hud-top-actions"
        style={{
          position: 'absolute',
          top: isMobileView ? 'calc(env(safe-area-inset-top, 0px) + 8px)' : 'calc(env(safe-area-inset-top, 0px) + 16px)',
          left: isMobileView ? 'calc(env(safe-area-inset-left, 0px) + 12px)' : 'calc(env(safe-area-inset-left, 0px) + 16px)',
          zIndex: 90,
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: isMobileView ? 4 : 8
        }}
      >
        {onPause && (
          <button
            onClick={onPause}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPause();
            }}
            className="glass-panel"
            style={{
              width: isMobileView ? 30 : 44,
              height: isMobileView ? 30 : 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: isMobileView ? 8 : 10,
              border: isMobileView ? '1.5px solid rgba(56, 189, 248, 0.45)' : '1.5px solid rgba(2, 132, 199, 0.45)',
              background: isMobileView ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
              color: isMobileView ? '#38bdf8' : '#0284c7',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
              pointerEvents: 'auto',
              touchAction: 'manipulation'
            }}
            aria-label="Pause Combat Simulation"
            title="Pause Simulation"
          >
            <Pause size={isMobileView ? 14 : 20} />
          </button>
        )}

        {!isMobileView && onOpenTutorial && (
          <button
            onClick={() => {
              if (onPause) onPause();
              onOpenTutorial();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onPause) onPause();
              onOpenTutorial();
            }}
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
              boxShadow: '0 4px 15px rgba(2, 132, 199, 0.2)',
              pointerEvents: 'auto',
              touchAction: 'manipulation'
            }}
            aria-label="Gameplay Info & Instructions"
            title="Gameplay Info & Instructions"
          >
            <HelpCircle size={20} />
          </button>
        )}

        <button
          onClick={() => toggleFullscreen()}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="glass-panel"
          style={{
            width: isMobileView ? 30 : 44,
            height: isMobileView ? 30 : 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: isMobileView ? 8 : 10,
            border: isFullscreen ? '1.5px solid #0284c7' : isMobileView ? '1.5px solid rgba(56, 189, 248, 0.45)' : '1.5px solid rgba(15, 23, 42, 0.15)',
            background: isFullscreen ? 'rgba(2, 132, 199, 0.15)' : isMobileView ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
            color: isFullscreen ? '#0284c7' : isMobileView ? '#38bdf8' : '#0f172a',
            cursor: 'pointer',
            boxShadow: isFullscreen ? '0 0 14px rgba(2, 132, 199, 0.35)' : '0 4px 15px rgba(0, 0, 0, 0.4)',
            pointerEvents: 'auto',
            touchAction: 'manipulation'
          }}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize size={isMobileView ? 14 : 20} /> : <Maximize size={isMobileView ? 14 : 20} />}
        </button>

        {/* Real-time FPS & Graphics Quality Badge */}
        <div
          className="glass-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobileView ? 2.5 : 7,
            height: isMobileView ? 30 : 44,
            padding: isMobileView ? '0 6px' : '0 12px',
            borderRadius: isMobileView ? 8 : 10,
            border: isMobileView ? '1.5px solid rgba(56, 189, 248, 0.4)' : '1.5px solid rgba(2, 132, 199, 0.35)',
            background: isMobileView ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
            color: isMobileView ? '#f8fafc' : '#0f172a',
            fontFamily: 'var(--font-display)',
            fontSize: isMobileView ? '0.66rem' : '0.78rem',
            fontWeight: 800,
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
            userSelect: 'none'
          }}
          title="Live Frame Rate & Graphics Preset"
        >
          <Activity size={isMobileView ? 11 : 15} color="#38bdf8" />
          <span style={{ color: (stats.fps || 60) >= 55 ? '#22c55e' : (stats.fps || 60) >= 28 ? '#38bdf8' : '#ef4444' }}>
            {stats.fps || 60} <span style={{ fontSize: isMobileView ? '0.52rem' : '0.62rem', color: '#94a3b8', fontWeight: 700 }}>FPS</span>
          </span>
          {!isMobileView && (
            <>
              <span style={{ color: 'rgba(15, 23, 42, 0.2)' }}>•</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  color:
                    (settings?.graphicsQuality || 'high') === 'normal'
                      ? '#16a34a'
                      : (settings?.graphicsQuality || 'high') === 'ultra'
                      ? '#8b5cf6'
                      : '#0284c7',
                  textTransform: 'uppercase',
                  fontWeight: 900,
                  letterSpacing: '0.04em'
                }}
              >
                {settings?.graphicsQuality || 'HIGH'}
              </span>
            </>
          )}
        </div>
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
        ) : stats.isMultiplayer ? (
          // MULTIPLAYER MATCH COMBAT HEADER
          <div
            className="glass-panel"
            style={{
              padding: isMobileView ? '3px 8px' : '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: isMobileView ? 5 : 14,
              border: '1.5px solid rgba(2, 132, 199, 0.45)',
              background: 'rgba(15, 23, 42, 0.92)'
            }}
          >
            {multiplayerService.room?.mode === 'multiplayer_tdm' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? 4 : 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? 3 : 6 }}>
                  <Shield size={isMobileView ? 12 : 16} color="#38bdf8" />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: isMobileView ? '0.78rem' : '1.15rem', fontWeight: 900, color: '#38bdf8' }}>
                    ALPHA {stats.multiplayerAlphaScore ?? 0}
                  </span>
                </div>
                <span style={{ color: '#64748b', fontWeight: 900, fontSize: isMobileView ? '0.60rem' : '0.8rem' }}>VS</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? 3 : 6 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: isMobileView ? '0.78rem' : '1.15rem', fontWeight: 900, color: '#f87171' }}>
                    {stats.multiplayerBravoScore ?? 0} BRAVO
                  </span>
                  <Skull size={isMobileView ? 12 : 16} color="#f87171" />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#c084fc', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: isMobileView ? '0.70rem' : '1rem' }}>
                <Target size={isMobileView ? 13 : 18} />
                <span>{isMobileView ? `FFA • ${stats.multiplayerScoreLimit || 15} KILLS` : `FREE-FOR-ALL • LIMIT: ${stats.multiplayerScoreLimit || 15} KILLS`}</span>
              </div>
            )}

            <div style={{ width: 1, height: isMobileView ? 12 : 20, background: 'rgba(255, 255, 255, 0.15)' }} />

            {/* Scoreboard Button */}
            <button
              type="button"
              onClick={() => setShowScoreboard(true)}
              className="btn-cyber"
              style={{
                padding: isMobileView ? '2px 5px' : '4px 10px',
                fontSize: isMobileView ? '0.58rem' : '0.72rem',
                fontWeight: 900,
                background: 'rgba(2, 132, 199, 0.2)',
                border: '1px solid rgba(2, 132, 199, 0.5)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                pointerEvents: 'auto',
                cursor: 'pointer'
              }}
            >
              <span>{isMobileView ? 'RANKS' : 'RANKS [TAB]'}</span>
            </button>

            {/* Ping */}
            <span style={{ fontSize: isMobileView ? '0.58rem' : '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Wifi size={isMobileView ? 10 : 13} color="#22c55e" />
              {stats.multiplayerPing ?? 20}ms
            </span>
          </div>
        ) : stats.mode === 'free_mode' ? (
          // Free Mode: Target Practice Range Display
          <div
            className="glass-panel"
            style={{
              padding: '8px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 14
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1.5px solid rgba(168, 85, 247, 0.4)',
                  color: '#a855f7',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  letterSpacing: '0.05em'
                }}
              >
                FREE MODE
              </div>
              <Target size={18} color="#a855f7" />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                TARGET RANGE
              </span>
            </div>

            <div style={{ width: 1.5, height: 22, background: 'rgba(15, 23, 42, 0.15)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontFamily: 'var(--font-sub)', fontSize: '0.85rem' }}>
              <span>TARGETS HIT:</span>
              <span style={{ color: '#a855f7', fontWeight: 900, fontSize: '1.15rem' }}>
                {stats.kills ?? 0}
              </span>
            </div>

            <div style={{ width: 1.5, height: 22, background: 'rgba(15, 23, 42, 0.15)' }} />

            <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              ENDLESS PRACTICE
            </span>
          </div>
        ) : stats.mode === 'mission' && stats.missionObjective ? (
          // Active Tactical Mission Objective Display
          <div
            className="glass-panel"
            style={{
              padding: '8px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              border: '1.5px solid rgba(2, 132, 199, 0.45)',
              background: 'rgba(255, 255, 255, 0.96)',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.2)',
              minWidth: 'min(90vw, 420px)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(2, 132, 199, 0.15)',
                    border: '1px solid #0284c7',
                    color: '#0284c7',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    letterSpacing: '0.06em'
                  }}
                >
                  OPERATION
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>
                  {stats.missionObjective.title}
                </span>
              </div>

              {stats.timeRemaining !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: stats.timeRemaining < 20 ? '#e11d48' : '#d97706', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.9rem' }}>
                  <Clock size={16} />
                  <span>{stats.timeRemaining}s</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, fontSize: '0.78rem' }}>
              <span style={{ color: '#64748b', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
                {stats.missionObjective.objectiveText}
              </span>
              <span style={{ color: '#0284c7', fontFamily: 'var(--font-display)', fontWeight: 800, whiteSpace: 'nowrap' }}>
                {stats.missionObjective.progressText}
              </span>
            </div>
          </div>
        ) : (
          // Normal Wave Display with Difficulty Badge
          <div
            className="glass-panel"
            style={{
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {stats.mode && (
                <div
                  style={{
                    padding: '2px 7px',
                    borderRadius: 6,
                    background: stats.mode === 'easy' ? 'rgba(34, 197, 94, 0.15)' : (stats.mode === 'hard' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(2, 132, 199, 0.15)'),
                    border: `1.5px solid ${stats.mode === 'easy' ? '#22c55e' : (stats.mode === 'hard' ? '#f43f5e' : '#0284c7')}`,
                    color: stats.mode === 'easy' ? '#22c55e' : (stats.mode === 'hard' ? '#e11d48' : '#0284c7'),
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    letterSpacing: '0.04em'
                  }}
                >
                  {stats.mode.toUpperCase()}
                </div>
              )}
              <Award size={18} color="#0284c7" />
              <span style={{ fontFamily: "'Rajdhani', var(--font-display), sans-serif", fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                WAVE {stats.wave}
              </span>
            </div>

            <div style={{ width: 1.5, height: 24, background: 'rgba(15, 23, 42, 0.15)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontFamily: 'var(--font-sub)' }}>
              <span>ENEMIES LEFT:</span>
              <span style={{ color: '#0284c7', fontWeight: 900, fontSize: '1.25rem', fontFamily: "'Rajdhani', var(--font-display), sans-serif" }}>
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
            <span style={{ fontSize: '1.45rem', fontWeight: 900, fontFamily: "'Rajdhani', var(--font-display), sans-serif", color: '#0f172a', lineHeight: 1.1 }}>
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontSize: '0.85rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            <Coins size={14} />
            <span style={{ fontFamily: "'Rajdhani', var(--font-display), sans-serif", fontSize: '1.1rem', fontWeight: 900, lineHeight: 1 }}>{stats.coins}</span>
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
            <span className="stat-val" style={{ fontFamily: "'Rajdhani', var(--font-sub), sans-serif", fontSize: '1.15rem', fontWeight: 900, color: isMobileView ? '#ffffff' : '#0f172a' }}>
              {stats.health} <span style={{ color: isMobileView ? '#94a3b8' : '#64748b', fontSize: '0.78rem' }}>/ {stats.maxHealth}</span>
            </span>
          </div>

          <div style={{ width: '100%', height: 8, background: isMobileView ? 'rgba(0, 0, 0, 0.45)' : 'rgba(15, 23, 42, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
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
            <span className="stat-val" style={{ fontFamily: "'Rajdhani', var(--font-sub), sans-serif", fontSize: '1.15rem', fontWeight: 900, color: isMobileView ? '#ffffff' : '#0f172a' }}>
              {stats.armor} <span style={{ color: isMobileView ? '#94a3b8' : '#64748b', fontSize: '0.78rem' }}>/ {stats.maxArmor}</span>
            </span>
          </div>

          <div style={{ width: '100%', height: 7, background: isMobileView ? 'rgba(0, 0, 0, 0.45)' : 'rgba(15, 23, 42, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
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
        {!isMobileView && (
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
          onClick={isMobileView ? handleCycleWeaponNext : undefined}
          onTouchStart={isMobileView ? (e) => e.stopPropagation() : undefined}
          onTouchEnd={isMobileView ? handleCycleWeaponNext : undefined}
          style={{
            padding: isMobileView ? '5px 14px' : '12px 18px',
            minWidth: isMobileView ? 'auto' : 190,
            display: 'flex',
            flexDirection: isMobileView ? 'row' : 'column',
            alignItems: isMobileView ? 'center' : 'flex-end',
            gap: isMobileView ? 10 : 4,
            cursor: isMobileView ? 'pointer' : 'default',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          title={isMobileView ? 'Tap to switch weapon' : undefined}
        >
          {isMobileView && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRight: '1px solid rgba(56, 189, 248, 0.25)', paddingRight: 10 }}>
              <RotateCw size={13} color="#38bdf8" strokeWidth={2.5} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.52rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#94a3b8' }}>
                  WEAPON [{currentWeaponIdx + 1}/5]
                </span>
                <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-display)', fontWeight: 900, color: '#ffffff' }}>
                  {activeWeapon.name.split(' ')[0]}
                </span>
              </div>
            </div>
          )}
          {/* Ammo display */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobileView ? 'flex-start' : 'flex-end', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: isMobileView ? 4 : 6 }}>
              <span
                className="hud-ammo-big"
                style={{
                  fontFamily: "'Rajdhani', var(--font-display), sans-serif",
                  fontSize: isMobileView ? '1.45rem' : '2.5rem',
                  fontWeight: 900,
                  color: stats.ammo <= 5 ? '#e11d48' : '#38bdf8',
                  lineHeight: 1
                }}
              >
                {stats.ammo}
              </span>
              <span style={{ fontFamily: "'Rajdhani', var(--font-display), sans-serif", fontSize: isMobileView ? '0.90rem' : '1.15rem', color: '#94a3b8', fontWeight: 800 }}>
                / {stats.maxAmmo}
              </span>
            </div>

            {/* Reload Progress or Warning */}
            {stats.isReloading ? (
              <div style={{ width: '100%', minWidth: 60, display: 'flex', flexDirection: 'column', gap: 2, alignItems: isMobileView ? 'flex-start' : 'flex-end' }}>
                <span style={{ fontSize: '0.55rem', fontFamily: 'var(--font-display)', color: '#f59e0b', fontWeight: 800 }}>RELOADING...</span>
                <div style={{ width: '100%', height: 3, background: 'rgba(255, 255, 255, 0.15)', borderRadius: 2 }}>
                  <div style={{ width: `${stats.reloadProgress * 100}%`, height: '100%', background: '#f59e0b' }} />
                </div>
              </div>
            ) : stats.ammo === 0 ? (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-display)',
                  color: '#e11d48',
                  animation: 'pulseGlow 0.8s infinite alternate',
                  fontWeight: 900
                }}
              >
                RELOAD!
              </span>
            ) : (
              <span style={{ fontSize: '0.55rem', fontFamily: 'var(--font-display)', color: '#94a3b8', fontWeight: 700 }}>
                AMMO
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MULTIPLAYER LIVE SQUAD VOICE CHAT HUD */}
      {stats.isMultiplayer && (
        <SquadVoiceHUD isMobile={isMobileView} />
      )}

      {/* MULTIPLAYER KILL FEED */}
      <KillFeed entries={killFeed} isMobile={isMobileView} />

      {/* MULTIPLAYER TAB SCOREBOARD */}
      {showScoreboard && (
        <MultiplayerScoreboard
          room={multiplayerService.room}
          players={Array.from(multiplayerService.players.values())}
          localPlayerId={multiplayerService.localPlayerId}
          onClose={() => setShowScoreboard(false)}
        />
      )}

      {/* MULTIPLAYER RESPAWN OVERLAY */}
      {stats.isRespawning && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(220, 38, 38, 0.3)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '2px solid #ef4444',
              borderRadius: 16,
              padding: '24px 40px',
              textAlign: 'center',
              boxShadow: '0 0 60px rgba(239, 68, 68, 0.65)',
              animation: 'pulseGlow 1s infinite alternate'
            }}
          >
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: '#ef4444', fontWeight: 900, letterSpacing: 2 }}>
              TACTICAL ELIMINATION
            </span>
            <h2 style={{ margin: '8px 0 16px 0', fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#ffffff', fontWeight: 900 }}>
              ELIMINATED BY {stats.killerName || 'RIVAL OPERATIVE'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#38bdf8', fontSize: '1.15rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>
              <span>RESPAWNING IN {stats.respawnCountdown || 3} SECONDS...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

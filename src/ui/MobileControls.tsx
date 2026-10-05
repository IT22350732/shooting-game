import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Crosshair,
  Eye,
  ArrowUp,
  RotateCw,
  ArrowRightLeft,
  Zap,
  Smartphone,
  X,
  Maximize
} from 'lucide-react';
import { GameEngine } from '../game/core/GameEngine';
import { useFullscreen } from '../utils/fullscreen';

interface MobileControlsProps {
  engine: GameEngine | null;
  onPause: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ engine }) => {
  const { toggle: toggleFullscreen } = useFullscreen();
  // Joystick state
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSprintingAuto, setIsSprintingAuto] = useState(false);
  const [isSprintLocked, setIsSprintLocked] = useState(false);

  // Look state
  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Aim ADS state
  const [isAiming, setIsAiming] = useState(false);
  const [isFiring, setIsFiring] = useState(false);

  // Orientation notice
  const [showRotateNotice, setShowRotateNotice] = useState(false);

  // Check orientation
  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 800;
      setShowRotateNotice(isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Update aim state from engine
  useEffect(() => {
    if (!engine) return;
    const interval = setInterval(() => {
      setIsAiming(engine.isAimingActive());
    }, 200);
    return () => clearInterval(interval);
  }, [engine]);

  // Haptic feedback helper
  const triggerHaptic = (ms: number = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignore vibration errors if blocked
      }
    }
  };

  // --- JOYSTICK TOUCH HANDLERS ---
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;

    if (joystickBaseRef.current) {
      const rect = joystickBaseRef.current.getBoundingClientRect();
      joystickCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    handleJoystickMove(touch.clientX, touch.clientY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        handleJoystickMove(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!engine || !joystickKnobRef.current) return;

    const maxRadius = 48; // Max displacement in pixels
    const dx = clientX - joystickCenterRef.current.x;
    const dy = clientY - joystickCenterRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let clampedX = dx;
    let clampedY = dy;
    if (dist > maxRadius) {
      clampedX = (dx / dist) * maxRadius;
      clampedY = (dy / dist) * maxRadius;
    }

    // Normalized coordinates (-1 to 1)
    const normX = clampedX / maxRadius;
    const normY = -clampedY / maxRadius; // Up is positive forward in 3D

    // Sprint threshold (pushed forward > 78%)
    const isSprintPushed = normY > 0.78 || isSprintLocked;
    setIsSprintingAuto(isSprintPushed);

    // Apply to engine
    engine.setAnalogMove(normX, normY, isSprintPushed);

    // Update UI knob position
    joystickKnobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setIsSprintingAuto(false);

        if (joystickKnobRef.current) {
          joystickKnobRef.current.style.transform = 'translate(0px, 0px)';
        }
        if (engine) {
          engine.setAnalogMove(0, 0, false);
        }
        break;
      }
    }
  };

  // --- TOUCH AIM / CAMERA LOOK HANDLERS ---
  const handleLookTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Only capture if we don't already have an active look touch
    if (lookTouchIdRef.current !== null) return;
    const target = e.target as HTMLElement;
    if (target?.closest?.('.hud-weapon-panel, .hud-weapon-slots, .hud-weapon-card, .mobile-joystick, button, select, [role="button"]')) {
      return;
    }
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== joystickTouchIdRef.current) {
        lookTouchIdRef.current = touch.identifier;
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  }, []);

  const handleLookTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!engine) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const deltaX = touch.clientX - lookLastPosRef.current.x;
        const deltaY = touch.clientY - lookLastPosRef.current.y;
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };

        engine.rotateCameraTouch(deltaX, deltaY);
        break;
      }
    }
  }, [engine]);

  const handleLookTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  }, []);

  // --- ACTION BUTTON HANDLERS ---
  const handleFireStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFiring(true);
    triggerHaptic(15);
    engine?.setFiring(true);
  };

  const handleFireEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFiring(false);
    engine?.setFiring(false);
  };

  const handleJumpStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(10);
    engine?.setJump(true);
  };

  const handleJumpEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    engine?.setJump(false);
  };

  const handleToggleAim = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(10);
    if (engine) {
      const newAim = engine.toggleAiming();
      setIsAiming(newAim);
    }
  };

  const handleReload = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(10);
    engine?.reload();
  };

  const handleToggleSprintLock = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(10);
    setIsSprintLocked(prev => !prev);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 75,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {/* PORTRAIT ORIENTATION BANNER TIP */}
      {showRotateNotice && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 70px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.94)',
            border: '1.5px solid #0284c7',
            borderRadius: 24,
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 20px rgba(2, 132, 199, 0.25)',
            zIndex: 60,
            pointerEvents: 'auto',
            animation: 'pulseGlow 2s infinite alternate'
          }}
        >
          <Smartphone size={16} color="#0284c7" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.74rem', color: '#0f172a', fontWeight: 700 }}>
            ROTATE TO LANDSCAPE FOR WIDER VISION
          </span>
          <button
            onClick={() => toggleFullscreen()}
            onTouchEnd={(e) => {
              e.preventDefault();
              toggleFullscreen();
            }}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              padding: '3px 8px',
              fontSize: '0.66rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Maximize size={11} />
            FULLSCREEN
          </button>
          <button
            onClick={() => setShowRotateNotice(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* FULL-SCREEN TOUCH AIM SURFACE (COVERS ENTIRE SCREEN BEHIND HUD & CONTROLS) */}
      <div
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
        onTouchCancel={handleLookTouchEnd}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'auto',
          touchAction: 'none',
          zIndex: 1
        }}
      />

      {/* LEFT-SIDE VIRTUAL JOYSTICK */}
      <div
        ref={joystickBaseRef}
        className="mobile-joystick"
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 20px)',
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 41, 59, 0.88) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: isSprintingAuto ? '2.5px solid #f97316' : '2px solid rgba(255, 255, 255, 0.75)',
          boxShadow: isSprintingAuto
            ? '0 0 25px rgba(249, 115, 22, 0.75), inset 0 0 15px rgba(249, 115, 22, 0.3)'
            : '0 4px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(2, 132, 199, 0.35), inset 0 0 15px rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          touchAction: 'none',
          zIndex: 85,
          transition: 'border 0.2s, box-shadow 0.2s'
        }}
      >
        {/* Cardinal Direction Indicators */}
        <div style={{ position: 'absolute', top: 6, width: 8, height: 2, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 6, width: 8, height: 2, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: 6, width: 2, height: 8, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', right: 6, width: 2, height: 8, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />

        {/* Sprint Range Arc Indicator */}
        <span
          style={{
            position: 'absolute',
            top: 14,
            fontSize: '0.62rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            color: isSprintingAuto ? '#f97316' : '#38bdf8',
            letterSpacing: '0.05em'
          }}
        >
          SPRINT
        </span>

        {/* Joystick Thumb Knob */}
        <div
          ref={joystickKnobRef}
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: isSprintingAuto
              ? 'linear-gradient(135deg, #f97316, #ea580c)'
              : 'linear-gradient(135deg, #0284c7, #38bdf8)',
            border: '2.5px solid #ffffff',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5), 0 0 14px rgba(56, 189, 248, 0.8)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.05s ease-out'
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 6px #ffffff' }} />
        </div>
      </div>

      {/* RIGHT-SIDE TACTICAL ACTION BUTTONS CLUSTER */}
      <div
        className="mobile-action-cluster"
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 10,
          pointerEvents: 'auto',
          zIndex: 85
        }}
      >
        {/* UPPER ROW: SPRINT LOCK, RELOAD & AIM (ADS) BUTTONS */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Sprint Lock Toggle Button */}
          <button
            onTouchStart={handleToggleSprintLock}
            onMouseDown={handleToggleSprintLock}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isSprintLocked ? 'linear-gradient(135deg, #f97316, #fb923c)' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.96))',
              border: isSprintLocked ? '2.5px solid #ffffff' : '2px solid #f97316',
              color: '#ffffff',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: isSprintLocked ? '0 0 20px rgba(249, 115, 22, 0.8), 0 4px 12px rgba(0, 0, 0, 0.5)' : '0 4px 14px rgba(0, 0, 0, 0.5), 0 0 8px rgba(249, 115, 22, 0.35)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            aria-label="Toggle Sprint Lock"
          >
            <Zap size={18} fill={isSprintLocked ? '#ffffff' : '#f97316'} color={isSprintLocked ? '#ffffff' : '#f97316'} />
          </button>

          {/* Quick Weapon Switch Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              triggerHaptic(12);
              engine?.cycleWeapon(1);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              triggerHaptic(12);
              engine?.cycleWeapon(1);
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
              border: '2px solid #ffffff',
              color: '#ffffff',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 0 16px rgba(14, 165, 233, 0.8), 0 4px 12px rgba(0, 0, 0, 0.5)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            aria-label="Cycle Weapon"
          >
            <ArrowRightLeft size={16} strokeWidth={2.6} />
            <span style={{ fontSize: '0.46rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: 1, letterSpacing: '0.04em' }}>GUN</span>
          </button>

          {/* Reload Button */}
          <button
            onTouchStart={handleReload}
            onMouseDown={handleReload}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.96))',
              border: '2px solid rgba(255, 255, 255, 0.85)',
              color: '#ffffff',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 0 12px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.5)',
              cursor: 'pointer'
            }}
            aria-label="Reload Weapon"
          >
            <RotateCw size={19} strokeWidth={2.4} />
          </button>

          {/* Aim / ADS Toggle Button */}
          <button
            onTouchStart={handleToggleAim}
            onMouseDown={handleToggleAim}
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isAiming ? 'linear-gradient(135deg, #0284c7, #38bdf8)' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.96))',
              border: isAiming ? '2.5px solid #ffffff' : '2px solid #38bdf8',
              color: '#ffffff',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: isAiming ? '0 0 25px rgba(56, 189, 248, 1), 0 4px 15px rgba(0, 0, 0, 0.5)' : '0 0 14px rgba(56, 189, 248, 0.5), 0 4px 14px rgba(0, 0, 0, 0.5)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            aria-label="Toggle Aim Down Sights / Zoom"
          >
            <Eye size={22} strokeWidth={2.4} />
            {isAiming && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#0284c7',
                  border: '1.5px solid #ffffff',
                  borderRadius: 8,
                  fontSize: '0.52rem',
                  fontWeight: 900,
                  padding: '1px 4px',
                  color: '#ffffff',
                  boxShadow: '0 0 8px rgba(14, 165, 233, 1)'
                }}
              >
                {engine ? `${engine.getZoomLevel()}X` : 'ADS'}
              </span>
            )}
          </button>
        </div>

        {/* LOWER ROW: JUMP & MAIN FIRE TRIGGER */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Jump Button */}
          <button
            onTouchStart={handleJumpStart}
            onTouchEnd={handleJumpEnd}
            onTouchCancel={handleJumpEnd}
            onMouseDown={handleJumpStart}
            onMouseUp={handleJumpEnd}
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.96))',
              border: '2px solid rgba(255, 255, 255, 0.85)',
              color: '#ffffff',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 0 14px rgba(255, 255, 255, 0.25), 0 4px 14px rgba(0, 0, 0, 0.5)',
              cursor: 'pointer'
            }}
            aria-label="Jump"
          >
            <ArrowUp size={24} strokeWidth={2.6} />
          </button>

          {/* Primary FIRE Trigger Button */}
          <button
            onTouchStart={handleFireStart}
            onTouchEnd={handleFireEnd}
            onTouchCancel={handleFireEnd}
            onMouseDown={handleFireStart}
            onMouseUp={handleFireEnd}
            style={{
              width: 74,
              height: 74,
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              background: isFiring
                ? 'linear-gradient(135deg, #e11d48, #f43f5e)'
                : 'radial-gradient(circle, rgba(244, 63, 94, 0.9) 0%, rgba(225, 29, 72, 0.98) 100%)',
              border: isFiring ? '3px solid #ffffff' : '2.5px solid #ffffff',
              color: '#ffffff',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: isFiring
                ? '0 0 40px rgba(225, 29, 72, 1), inset 0 0 14px rgba(255, 255, 255, 0.8)'
                : '0 0 25px rgba(244, 63, 94, 0.85), 0 4px 16px rgba(0, 0, 0, 0.6)',
              cursor: 'pointer',
              transform: isFiring ? 'scale(0.95)' : 'scale(1)',
              transition: 'transform 0.08s ease, background 0.1s, box-shadow 0.1s'
            }}
            aria-label="Fire Weapon"
          >
            <Crosshair size={30} strokeWidth={2.6} />
            <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '0.08em', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
              FIRE
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

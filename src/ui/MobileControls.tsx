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

  // Fire & Aim Joystick state (twin controller for aiming and firing simultaneously)
  const fireBaseRef = useRef<HTMLDivElement>(null);
  const fireKnobRef = useRef<HTMLDivElement>(null);
  const fireTouchIdRef = useRef<number | null>(null);
  const fireCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const fireLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // --- MOVEMENT JOYSTICK TOUCH HANDLERS (WALKING & RUNNING ONLY) ---
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

    // Apply to engine (walking and running only)
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

  // --- FIRE & AIM CONTROLLER HANDLERS (AIM GUN & FIRE BOTH) ---
  const handleFireJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (fireTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    fireTouchIdRef.current = touch.identifier;

    if (fireBaseRef.current) {
      const rect = fireBaseRef.current.getBoundingClientRect();
      fireCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    fireLastPosRef.current = { x: touch.clientX, y: touch.clientY };

    setIsFiring(true);
    triggerHaptic(16);
    engine?.setFiring(true);

    handleFireJoystickMove(touch.clientX, touch.clientY);
  };

  const handleFireJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === fireTouchIdRef.current) {
        handleFireJoystickMove(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleFireJoystickMove = (clientX: number, clientY: number) => {
    if (!engine || !fireKnobRef.current) return;

    // 1. Aim camera & gun movement via touch delta
    const deltaX = clientX - fireLastPosRef.current.x;
    const deltaY = clientY - fireLastPosRef.current.y;
    fireLastPosRef.current = { x: clientX, y: clientY };

    if (deltaX !== 0 || deltaY !== 0) {
      engine.rotateCameraTouch(deltaX, deltaY);
    }

    // 2. Visual knob deflection inside the fire controller
    const maxRadius = 46;
    const dx = clientX - fireCenterRef.current.x;
    const dy = clientY - fireCenterRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let clampedX = dx;
    let clampedY = dy;
    if (dist > maxRadius) {
      clampedX = (dx / dist) * maxRadius;
      clampedY = (dy / dist) * maxRadius;
    }

    fireKnobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
  };

  const handleFireJoystickTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === fireTouchIdRef.current) {
        fireTouchIdRef.current = null;
        setIsFiring(false);

        if (fireKnobRef.current) {
          fireKnobRef.current.style.transform = 'translate(0px, 0px)';
        }
        if (engine) {
          engine.setFiring(false);
        }
        break;
      }
    }
  };

  // Mouse fallback for desktop browser testing of Fire Controller
  const handleFireMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (fireBaseRef.current) {
      const rect = fireBaseRef.current.getBoundingClientRect();
      fireCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    fireLastPosRef.current = { x: e.clientX, y: e.clientY };
    setIsFiring(true);
    triggerHaptic(14);
    engine?.setFiring(true);

    const onMouseMove = (ev: MouseEvent) => {
      handleFireJoystickMove(ev.clientX, ev.clientY);
    };

    const onMouseUp = () => {
      setIsFiring(false);
      if (fireKnobRef.current) {
        fireKnobRef.current.style.transform = 'translate(0px, 0px)';
      }
      engine?.setFiring(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // --- TOUCH AIM / BACKGROUND CAMERA LOOK HANDLERS ---
  const handleLookTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Only capture if we don't already have an active look touch
    if (lookTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    // Never capture touches in top-left tactical buttons zone (Pause, Info, Fullscreen)
    if (touch.clientY < 80 && touch.clientX < 200) {
      return;
    }

    // Never capture touches in the bottom-left moving joystick zone
    if (touch.clientY > window.innerHeight - 170 && touch.clientX < 170) {
      return;
    }

    // Never capture touches in the bottom-right fire controller & action buttons zone
    if (touch.clientY > window.innerHeight - 240 && touch.clientX > window.innerWidth - 250) {
      return;
    }

    const target = e.target as HTMLElement;
    if (target?.closest?.('.hud-top-actions, .hud-weapon-panel, .hud-weapon-slots, .hud-weapon-card, .mobile-joystick, .mobile-fire-joystick, .mobile-action-cluster, button, select, [role="button"]')) {
      return;
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== joystickTouchIdRef.current && t.identifier !== fireTouchIdRef.current) {
        lookTouchIdRef.current = t.identifier;
        lookLastPosRef.current = { x: t.clientX, y: t.clientY };
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
        zIndex: 50,
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

      {/* RIGHT-SIDE AIM & FIRE CONTROLLER (TWIN CONTROLLER FOR AIMING & SHOOTING) */}
      <div
        ref={fireBaseRef}
        className="mobile-fire-joystick"
        onTouchStart={handleFireJoystickTouchStart}
        onTouchMove={handleFireJoystickTouchMove}
        onTouchEnd={handleFireJoystickTouchEnd}
        onTouchCancel={handleFireJoystickTouchEnd}
        onMouseDown={handleFireMouseDown}
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 20px)',
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 41, 59, 0.90) 0%, rgba(15, 23, 42, 0.96) 100%)',
          border: isFiring ? '2.5px solid #f43f5e' : '2px solid rgba(255, 255, 255, 0.75)',
          boxShadow: isFiring
            ? '0 0 30px rgba(244, 63, 94, 0.85), inset 0 0 15px rgba(244, 63, 94, 0.4)'
            : '0 4px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(225, 29, 72, 0.35), inset 0 0 15px rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          touchAction: 'none',
          zIndex: 85,
          cursor: 'pointer',
          transition: 'border 0.2s, box-shadow 0.2s'
        }}
      >
        {/* Cardinal Direction Indicators */}
        <div style={{ position: 'absolute', top: 6, width: 8, height: 2, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 6, width: 8, height: 2, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: 6, width: 2, height: 8, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', right: 6, width: 2, height: 8, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />

        {/* Aim & Fire Header Badge */}
        <span
          style={{
            position: 'absolute',
            top: 14,
            fontSize: '0.62rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            color: isFiring ? '#f43f5e' : '#fb7185',
            letterSpacing: '0.05em'
          }}
        >
          AIM & FIRE
        </span>

        {/* Fire Joystick Thumb Knob */}
        <div
          ref={fireKnobRef}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: isFiring
              ? 'linear-gradient(135deg, #e11d48, #f43f5e)'
              : 'linear-gradient(135deg, #be123c, #e11d48)',
            border: '2.5px solid #ffffff',
            boxShadow: isFiring
              ? '0 0 25px rgba(244, 63, 94, 0.95), 0 4px 15px rgba(0, 0, 0, 0.5)'
              : '0 4px 15px rgba(0, 0, 0, 0.5), 0 0 14px rgba(225, 29, 72, 0.7)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            transition: 'transform 0.05s ease-out'
          }}
        >
          <Crosshair size={22} color="#ffffff" strokeWidth={2.8} />
          <span
            style={{
              fontSize: '0.50rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '0.04em'
            }}
          >
            FIRE
          </span>
        </div>
      </div>

      {/* TACTICAL ACTION BUTTONS (ALIGNED CONVENIENTLY ABOVE FIRE CONTROLLER) */}
      <div
        className="mobile-action-cluster"
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 162px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          display: 'flex',
          gap: 9,
          alignItems: 'center',
          pointerEvents: 'auto',
          zIndex: 85
        }}
      >
        {/* Sprint Lock Toggle Button */}
        <button
          onTouchStart={handleToggleSprintLock}
          onMouseDown={handleToggleSprintLock}
          style={{
            width: 42,
            height: 42,
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
          <Zap size={17} fill={isSprintLocked ? '#ffffff' : '#f97316'} color={isSprintLocked ? '#ffffff' : '#f97316'} />
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
            width: 42,
            height: 42,
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
          <span style={{ fontSize: '0.44rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: 1, letterSpacing: '0.04em' }}>GUN</span>
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
          <RotateCw size={18} strokeWidth={2.4} />
        </button>

        {/* Aim / ADS Zoom Button */}
        <button
          onTouchStart={handleToggleAim}
          onMouseDown={handleToggleAim}
          style={{
            width: 48,
            height: 48,
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
          <Eye size={21} strokeWidth={2.4} />
          {isAiming && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: '#0284c7',
                border: '1.5px solid #ffffff',
                borderRadius: 8,
                fontSize: '0.50rem',
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

        {/* Combat Jump Button */}
        <button
          onTouchStart={handleJumpStart}
          onTouchEnd={handleJumpEnd}
          onTouchCancel={handleJumpEnd}
          onMouseDown={handleJumpStart}
          onMouseUp={handleJumpEnd}
          style={{
            width: 50,
            height: 50,
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
      </div>
    </div>
  );
};

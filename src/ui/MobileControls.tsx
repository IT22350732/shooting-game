import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Crosshair,
  Eye,
  ArrowUp,
  RotateCw,
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
    const touch = e.changedTouches[0];
    lookTouchIdRef.current = touch.identifier;
    lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
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
        zIndex: 35,
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

      {/* RIGHT-SIDE TOUCH AIM SURFACE (COVERS RIGHT HALF) */}
      <div
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
        onTouchCancel={handleLookTouchEnd}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '55%',
          height: '100%',
          pointerEvents: 'auto',
          touchAction: 'none'
        }}
      />

      {/* LEFT-SIDE VIRTUAL JOYSTICK */}
      <div
        ref={joystickBaseRef}
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
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(15, 23, 42, 0.35) 100%)',
          border: isSprintingAuto ? '2px solid #f97316' : '1.5px solid rgba(255, 255, 255, 0.3)',
          boxShadow: isSprintingAuto
            ? '0 0 25px rgba(249, 115, 22, 0.5), inset 0 0 15px rgba(249, 115, 22, 0.2)'
            : '0 4px 20px rgba(0, 0, 0, 0.25), inset 0 0 15px rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          touchAction: 'none',
          transition: 'border 0.2s, box-shadow 0.2s'
        }}
      >
        {/* Cardinal Direction Indicators */}
        <div style={{ position: 'absolute', top: 6, width: 8, height: 2, background: 'rgba(255, 255, 255, 0.4)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 6, width: 8, height: 2, background: 'rgba(255, 255, 255, 0.4)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: 6, width: 2, height: 8, background: 'rgba(255, 255, 255, 0.4)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', right: 6, width: 2, height: 8, background: 'rgba(255, 255, 255, 0.4)', borderRadius: 1 }} />

        {/* Sprint Range Arc Indicator */}
        <span
          style={{
            position: 'absolute',
            top: 14,
            fontSize: '0.62rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            color: isSprintingAuto ? '#f97316' : 'rgba(255, 255, 255, 0.6)',
            letterSpacing: '0.05em'
          }}
        >
          SPRINT
        </span>

        {/* Joystick Thumb Knob */}
        <div
          ref={joystickKnobRef}
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: isSprintingAuto
              ? 'linear-gradient(135deg, #f97316, #ea580c)'
              : 'linear-gradient(135deg, rgba(2, 132, 199, 0.9), rgba(56, 189, 248, 0.9))',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 0 6px rgba(255, 255, 255, 0.6)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.05s ease-out'
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#ffffff', opacity: 0.9 }} />
        </div>
      </div>


      {/* RIGHT-SIDE TACTICAL ACTION BUTTONS CLUSTER */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 18px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 12,
          pointerEvents: 'auto',
          zIndex: 40
        }}
      >
        {/* UPPER ROW: SPRINT LOCK, RELOAD & AIM (ADS) BUTTONS */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Sprint Lock Toggle Button */}
          <button
            onTouchStart={handleToggleSprintLock}
            onMouseDown={handleToggleSprintLock}
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isSprintLocked ? 'linear-gradient(135deg, #f97316, #fb923c)' : 'rgba(15, 23, 42, 0.45)',
              border: isSprintLocked ? '2px solid #ffffff' : '1.5px solid rgba(249, 115, 22, 0.5)',
              color: isSprintLocked ? '#ffffff' : '#fb923c',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: isSprintLocked ? '0 0 15px rgba(249, 115, 22, 0.6)' : '0 4px 12px rgba(0, 0, 0, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            aria-label="Toggle Sprint Lock"
          >
            <Zap size={20} fill={isSprintLocked ? '#ffffff' : 'none'} />
          </button>

          {/* Reload Button */}
          <button
            onTouchStart={handleReload}
            onMouseDown={handleReload}
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.45)',
              border: '1.5px solid rgba(255, 255, 255, 0.35)',
              color: '#ffffff',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
              cursor: 'pointer'
            }}
            aria-label="Reload Weapon"
          >
            <RotateCw size={20} />
          </button>

          {/* Aim / ADS Toggle Button */}
          <button
            onTouchStart={handleToggleAim}
            onMouseDown={handleToggleAim}
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isAiming ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'rgba(15, 23, 42, 0.45)',
              border: isAiming ? '2px solid #ffffff' : '1.5px solid rgba(56, 189, 248, 0.6)',
              color: isAiming ? '#ffffff' : '#38bdf8',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: isAiming ? '0 0 20px rgba(14, 165, 233, 0.8)' : '0 4px 14px rgba(0, 0, 0, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            aria-label="Toggle Aim Down Sights"
          >
            <Eye size={24} />
          </button>
        </div>

        {/* LOWER ROW: JUMP & MAIN FIRE TRIGGER */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {/* Jump Button */}
          <button
            onTouchStart={handleJumpStart}
            onTouchEnd={handleJumpEnd}
            onTouchCancel={handleJumpEnd}
            onMouseDown={handleJumpStart}
            onMouseUp={handleJumpEnd}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 23, 42, 0.45)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              color: '#ffffff',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)',
              cursor: 'pointer'
            }}
            aria-label="Jump"
          >
            <ArrowUp size={26} strokeWidth={2.5} />
          </button>

          {/* Primary FIRE Trigger Button */}
          <button
            onTouchStart={handleFireStart}
            onTouchEnd={handleFireEnd}
            onTouchCancel={handleFireEnd}
            onMouseDown={handleFireStart}
            onMouseUp={handleFireEnd}
            style={{
              width: 78,
              height: 78,
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              background: isFiring
                ? 'linear-gradient(135deg, #e11d48, #f43f5e)'
                : 'radial-gradient(circle, rgba(225, 29, 72, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: isFiring ? '3px solid #ffffff' : '2.5px solid rgba(244, 63, 94, 0.85)',
              color: '#ffffff',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: isFiring
                ? '0 0 35px rgba(225, 29, 72, 0.85), inset 0 0 12px rgba(255, 255, 255, 0.7)'
                : '0 6px 20px rgba(225, 29, 72, 0.35), inset 0 0 10px rgba(244, 63, 94, 0.2)',
              cursor: 'pointer',
              transform: isFiring ? 'scale(0.95)' : 'scale(1)',
              transition: 'transform 0.08s ease, background 0.1s, box-shadow 0.1s'
            }}
            aria-label="Fire Weapon"
          >
            <Crosshair size={32} strokeWidth={2.4} />
            <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '0.08em' }}>
              FIRE
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

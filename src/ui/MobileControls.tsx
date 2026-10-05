import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  RotateCw,
  Maximize,
  Minimize,
  Sliders,
  Check,
  RotateCcw,
  X,
  Zap,
  Flame,
  Smartphone
} from 'lucide-react';
import { GameEngine } from '../game/core/GameEngine';
import { useFullscreen } from '../utils/fullscreen';

// --- INTERFACES & TYPES ---

export type ControlId =
  | 'joystick'
  | 'sprintLock'
  | 'fire'
  | 'leftFire'
  | 'ads'
  | 'reload'
  | 'jump'
  | 'crouch'
  | 'prone'
  | 'weaponSwitch'
  | 'melee'
  | 'grenade'
  | 'interact'
  | 'customize';

export interface ControlPos {
  x: number; // 0 to 1 (percentage of screen width)
  y: number; // 0 to 1 (percentage of screen height)
  size: number; // Base pixel diameter / width
}

export type LayoutPresetName = 'two_thumb' | 'three_claw' | 'four_claw';

export interface MobileLayoutConfig {
  version: number;
  opacity: number; // 0.2 to 1.0
  cameraSensitivity: number; // 10 to 200 (default 100)
  adsSensitivity: number; // 10 to 200 (default 85)
  adsMode: 'tap' | 'hold' | 'hybrid';
  fireAimDrag: boolean;
  showLeftFire: boolean;
  activePreset: LayoutPresetName | 'custom';
  positions: Record<ControlId, ControlPos>;
}

// --- DEFAULT PRESETS ---

const DEFAULT_PRESET_TWO_THUMB: Record<ControlId, ControlPos> = {
  joystick: { x: 0.12, y: 0.78, size: 130 },
  sprintLock: { x: 0.12, y: 0.52, size: 44 },
  fire: { x: 0.88, y: 0.78, size: 120 },
  leftFire: { x: 0.10, y: 0.22, size: 68 },
  ads: { x: 0.75, y: 0.78, size: 56 },
  crouch: { x: 0.88, y: 0.57, size: 50 },
  prone: { x: 0.77, y: 0.63, size: 48 },
  jump: { x: 0.92, y: 0.40, size: 52 },
  reload: { x: 0.81, y: 0.47, size: 48 },
  weaponSwitch: { x: 0.71, y: 0.47, size: 48 },
  melee: { x: 0.92, y: 0.25, size: 44 },
  grenade: { x: 0.81, y: 0.32, size: 44 },
  interact: { x: 0.70, y: 0.34, size: 46 },
  customize: { x: 0.96, y: 0.13, size: 38 }
};

const DEFAULT_PRESET_THREE_CLAW: Record<ControlId, ControlPos> = {
  joystick: { x: 0.12, y: 0.78, size: 130 },
  sprintLock: { x: 0.12, y: 0.52, size: 44 },
  fire: { x: 0.88, y: 0.78, size: 116 },
  leftFire: { x: 0.10, y: 0.18, size: 76 },
  ads: { x: 0.75, y: 0.78, size: 56 },
  crouch: { x: 0.88, y: 0.57, size: 50 },
  prone: { x: 0.77, y: 0.63, size: 48 },
  jump: { x: 0.92, y: 0.40, size: 52 },
  reload: { x: 0.81, y: 0.47, size: 48 },
  weaponSwitch: { x: 0.71, y: 0.47, size: 48 },
  melee: { x: 0.92, y: 0.25, size: 44 },
  grenade: { x: 0.81, y: 0.32, size: 44 },
  interact: { x: 0.70, y: 0.34, size: 46 },
  customize: { x: 0.96, y: 0.13, size: 38 }
};

const DEFAULT_PRESET_FOUR_CLAW: Record<ControlId, ControlPos> = {
  joystick: { x: 0.12, y: 0.78, size: 130 },
  sprintLock: { x: 0.12, y: 0.52, size: 44 },
  fire: { x: 0.88, y: 0.78, size: 110 },
  leftFire: { x: 0.10, y: 0.18, size: 78 },
  ads: { x: 0.88, y: 0.18, size: 68 },
  jump: { x: 0.76, y: 0.18, size: 54 },
  crouch: { x: 0.88, y: 0.56, size: 50 },
  prone: { x: 0.77, y: 0.62, size: 46 },
  reload: { x: 0.88, y: 0.38, size: 48 },
  weaponSwitch: { x: 0.76, y: 0.78, size: 50 },
  melee: { x: 0.76, y: 0.38, size: 44 },
  grenade: { x: 0.76, y: 0.50, size: 44 },
  interact: { x: 0.65, y: 0.60, size: 46 },
  customize: { x: 0.50, y: 0.12, size: 38 }
};

const STORAGE_KEY = 'shooting_game_mobile_controls_v4';

function loadStoredConfig(): MobileLayoutConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === 4) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse mobile controls config:', err);
  }

  return {
    version: 4,
    opacity: 0.82,
    cameraSensitivity: 100,
    adsSensitivity: 80,
    adsMode: 'hybrid',
    fireAimDrag: true,
    showLeftFire: false,
    activePreset: 'two_thumb',
    positions: { ...DEFAULT_PRESET_TWO_THUMB }
  };
}

interface MobileControlsProps {
  engine: GameEngine | null;
  onPause: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ engine }) => {
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  // Configuration state
  const [config, setConfig] = useState<MobileLayoutConfig>(loadStoredConfig);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [selectedControl, setSelectedControl] = useState<ControlId>('fire');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Active combat states
  const [isAiming, setIsAiming] = useState(false);
  const [isFiring, setIsFiring] = useState(false);
  const [stance, setStance] = useState<'stand' | 'crouch' | 'prone'>('stand');
  const [isSprintLocked, setIsSprintLocked] = useState(false);
  const [isSprintingAuto, setIsSprintingAuto] = useState(false);
  const [currentWeaponTag, setCurrentWeaponTag] = useState<string>('AR');
  const [zoomLevelText, setZoomLevelText] = useState<string>('ADS');

  // Portrait warning notice
  const [showRotateNotice, setShowRotateNotice] = useState(false);

  // Touch tracking refs
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joystickKnobRef = useRef<HTMLDivElement>(null);

  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const fireTouchIdRef = useRef<number | null>(null);
  const fireLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const leftFireTouchIdRef = useRef<number | null>(null);
  const adsTouchStartRef = useRef<number>(0);

  // Layout editing drag ref
  const dragTouchIdRef = useRef<number | null>(null);

  // Haptic feedback trigger
  const triggerHaptic = (ms: number = 12) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignored
      }
    }
  };

  // Toast feedback helper
  const showToast = (text: string) => {
    setFeedbackToast(text);
    setTimeout(() => {
      setFeedbackToast(prev => (prev === text ? null : prev));
    }, 2200);
  };

  // Check orientation
  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 820;
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

  // Sync state with engine periodically
  useEffect(() => {
    if (!engine) return;
    const interval = setInterval(() => {
      setIsAiming(engine.isAimingActive());
      setStance(engine.getStance());

      // Update weapon tag
      const wId = engine.currentWeaponId;
      if (wId === 'assault_rifle') setCurrentWeaponTag('AR');
      else if (wId === 'shotgun') setCurrentWeaponTag('SG');
      else if (wId === 'smg') setCurrentWeaponTag('SMG');
      else if (wId === 'sniper') setCurrentWeaponTag('SNP');
      else if (wId === 'plasma_rifle') setCurrentWeaponTag('PLS');

      // Update zoom level
      const z = engine.getZoomLevel();
      setZoomLevelText(z >= 2 ? '2X' : z === 1 ? '1X' : 'ADS');
    }, 150);

    return () => clearInterval(interval);
  }, [engine]);

  // Persist config changes
  const saveConfig = (newConfig: MobileLayoutConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to save controls to localStorage:', e);
    }
  };

  // --- 1. VIRTUAL MOVEMENT JOYSTICK HANDLERS ---
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditingLayout) return;
    e.stopPropagation();
    if (joystickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;

    const baseElem = e.currentTarget;
    const rect = baseElem.getBoundingClientRect();
    joystickCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    handleJoystickMove(touch.clientX, touch.clientY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditingLayout) return;
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

    const maxRadius = 46;
    const dx = clientX - joystickCenterRef.current.x;
    const dy = clientY - joystickCenterRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let clampedX = dx;
    let clampedY = dy;
    if (dist > maxRadius) {
      clampedX = (dx / dist) * maxRadius;
      clampedY = (dy / dist) * maxRadius;
    }

    const normX = clampedX / maxRadius;
    const normY = -clampedY / maxRadius; // Up is forward

    // Pushed up into sprint lock range (> 78%)
    const sprintPushed = normY > 0.78 || isSprintLocked;
    setIsSprintingAuto(sprintPushed);

    engine.setAnalogMove(normX, normY, sprintPushed);
    joystickKnobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditingLayout) return;
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

  // Mouse fallback for Joystick (desktop/browser testing)
  const handleJoystickMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditingLayout) {
      handleControlDragStart('joystick', e);
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const baseElem = e.currentTarget;
    const rect = baseElem.getBoundingClientRect();
    joystickCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };

    handleJoystickMove(e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => {
      handleJoystickMove(ev.clientX, ev.clientY);
    };

    const onMouseUp = () => {
      setIsSprintingAuto(false);
      if (joystickKnobRef.current) {
        joystickKnobRef.current.style.transform = 'translate(0px, 0px)';
      }
      if (engine) {
        engine.setAnalogMove(0, 0, false);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // --- 2. CAMERA / AIM TOUCH AREA (RIGHT SIDE SCREEN) ---
  const handleLookMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditingLayout) return;
    const target = e.target as HTMLElement;
    if (target?.closest?.('button, .mobile-ctrl-btn, .mobile-joystick, .hud-top-actions, .hud-weapon-card, [role="button"]')) {
      return;
    }
    lookLastPosRef.current = { x: e.clientX, y: e.clientY };

    const onMouseMove = (ev: MouseEvent) => {
      if (!engine) return;
      const deltaX = ev.clientX - lookLastPosRef.current.x;
      const deltaY = ev.clientY - lookLastPosRef.current.y;
      lookLastPosRef.current = { x: ev.clientX, y: ev.clientY };

      engine.rotateCameraTouch(deltaX, deltaY, {
        cameraSens: config.cameraSensitivity,
        adsSens: config.adsSensitivity
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleLookTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (isEditingLayout) return;
      if (lookTouchIdRef.current !== null) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      // Ignore touches on top-left tactical area (pause, fullscreen)
      if (touch.clientY < 70 && touch.clientX < 180) return;

      // Ignore touches on buttons
      const target = e.target as HTMLElement;
      if (
        target?.closest?.(
          'button, .mobile-ctrl-btn, .mobile-joystick, .hud-top-actions, .hud-weapon-card, [role="button"]'
        )
      ) {
        return;
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (
          t.identifier !== joystickTouchIdRef.current &&
          t.identifier !== fireTouchIdRef.current &&
          t.identifier !== leftFireTouchIdRef.current
        ) {
          lookTouchIdRef.current = t.identifier;
          lookLastPosRef.current = { x: t.clientX, y: t.clientY };
          break;
        }
      }
    },
    [isEditingLayout]
  );

  const handleLookTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (isEditingLayout || !engine) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchIdRef.current) {
          const deltaX = touch.clientX - lookLastPosRef.current.x;
          const deltaY = touch.clientY - lookLastPosRef.current.y;
          lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };

          engine.rotateCameraTouch(deltaX, deltaY, {
            cameraSens: config.cameraSensitivity,
            adsSens: config.adsSensitivity
          });
          break;
        }
      }
    },
    [isEditingLayout, engine, config.cameraSensitivity, config.adsSensitivity]
  );

  const handleLookTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  }, []);

  // --- 3. PRIMARY & SECONDARY FIRE BUTTON HANDLERS ---
  const handleFireTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditingLayout) return;
    e.stopPropagation();
    e.preventDefault();
    if (fireTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    fireTouchIdRef.current = touch.identifier;
    fireLastPosRef.current = { x: touch.clientX, y: touch.clientY };

    setIsFiring(true);
    triggerHaptic(16);
    engine?.setFiring(true);
  };

  const handleFireTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditingLayout || !config.fireAimDrag || !engine) return;
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === fireTouchIdRef.current) {
        const deltaX = touch.clientX - fireLastPosRef.current.x;
        const deltaY = touch.clientY - fireLastPosRef.current.y;
        fireLastPosRef.current = { x: touch.clientX, y: touch.clientY };

        if (deltaX !== 0 || deltaY !== 0) {
          engine.rotateCameraTouch(deltaX, deltaY, {
            cameraSens: config.cameraSensitivity,
            adsSens: config.adsSensitivity
          });
        }
        break;
      }
    }
  };

  const handleFireTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditingLayout) return;
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === fireTouchIdRef.current) {
        fireTouchIdRef.current = null;
        setIsFiring(false);
        engine?.setFiring(false);
        break;
      }
    }
  };

  // Mouse fallback for Fire Button
  const handleFireMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditingLayout) {
      setSelectedControl('fire');
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    fireLastPosRef.current = { x: e.clientX, y: e.clientY };
    setIsFiring(true);
    triggerHaptic(16);
    engine?.setFiring(true);

    const onMouseMove = (ev: MouseEvent) => {
      if (!config.fireAimDrag || !engine) return;
      const deltaX = ev.clientX - fireLastPosRef.current.x;
      const deltaY = ev.clientY - fireLastPosRef.current.y;
      fireLastPosRef.current = { x: ev.clientX, y: ev.clientY };

      if (deltaX !== 0 || deltaY !== 0) {
        engine.rotateCameraTouch(deltaX, deltaY, {
          cameraSens: config.cameraSensitivity,
          adsSens: config.adsSensitivity
        });
      }
    };

    const onMouseUp = () => {
      setIsFiring(false);
      engine?.setFiring(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Left fire button (tap/hold for multi-finger claw play)
  const handleLeftFireTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditingLayout) return;
    e.stopPropagation();
    e.preventDefault();
    if (leftFireTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    leftFireTouchIdRef.current = touch.identifier;

    setIsFiring(true);
    triggerHaptic(16);
    engine?.setFiring(true);
  };

  const handleLeftFireTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditingLayout) return;
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === leftFireTouchIdRef.current) {
        leftFireTouchIdRef.current = null;
        setIsFiring(false);
        engine?.setFiring(false);
        break;
      }
    }
  };

  const handleLeftFireMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditingLayout) {
      setSelectedControl('leftFire');
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    setIsFiring(true);
    triggerHaptic(16);
    engine?.setFiring(true);

    const onMouseUp = () => {
      setIsFiring(false);
      engine?.setFiring(false);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mouseup', onMouseUp);
  };

  // --- 4. ADS / AIM BUTTON HANDLERS ---
  const handleAdsTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(12);
    adsTouchStartRef.current = Date.now();

    if (config.adsMode === 'hold') {
      engine?.setAiming(true);
      setIsAiming(true);
    }
  };

  const handleAdsTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    const duration = Date.now() - adsTouchStartRef.current;

    if (config.adsMode === 'hold') {
      engine?.setAiming(false);
      setIsAiming(false);
    } else if (config.adsMode === 'tap') {
      if (engine) {
        const active = engine.toggleAiming();
        setIsAiming(active);
      }
    } else {
      // Hybrid mode: quick tap toggles, hold unzooms on release
      if (duration > 260) {
        engine?.setAiming(false);
        setIsAiming(false);
      } else {
        if (engine) {
          const active = engine.toggleAiming();
          setIsAiming(active);
        }
      }
    }
  };

  // --- 5. COMBAT ACTION BUTTON HANDLERS ---
  const handleReload = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(14);
    engine?.reload();
  };

  const handleJumpStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(10);
    engine?.setJump(true);
  };

  const handleJumpEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    engine?.setJump(false);
  };

  const handleCrouch = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(12);
    engine?.toggleCrouch();
    const newStance = engine?.getStance() || 'stand';
    setStance(newStance);
    showToast(newStance === 'crouch' ? 'CROUCHING' : 'STANDING');
  };

  const handleProne = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(14);
    engine?.toggleProne();
    const newStance = engine?.getStance() || 'stand';
    setStance(newStance);
    showToast(newStance === 'prone' ? 'PRONE STANCE' : 'STANDING');
  };

  const handleWeaponSwitch = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(14);
    engine?.cycleWeapon(1);
  };

  const handleMelee = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(18);
    engine?.performMelee();
    showToast('KNIFE STRIKE');
  };

  const handleGrenade = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(20);
    engine?.throwGrenade();
    showToast('GRENADE THROWN');
  };

  const handleInteract = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(12);
    const result = engine?.interact();
    if (result) {
      showToast(result.toUpperCase());
    } else {
      showToast('NO ITEM NEARBY');
    }
  };

  const handleSprintLockToggle = (e: React.TouchEvent | React.MouseEvent) => {
    if (isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic(12);
    setIsSprintLocked(prev => {
      const next = !prev;
      showToast(next ? 'SPRINT LOCKED' : 'SPRINT UNLOCKED');
      return next;
    });
  };

  // --- 6. DRAG & DROP LAYOUT CUSTOMIZATION SYSTEM ---
  const handleControlDragStart = (id: ControlId, e: React.TouchEvent | React.MouseEvent) => {
    if (!isEditingLayout) return;
    e.stopPropagation();
    setSelectedControl(id);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragTouchIdRef.current = 'touches' in e ? e.touches[0].identifier : 999;

    const onMove = (moveEv: TouchEvent | MouseEvent) => {
      const moveX = 'touches' in moveEv ? moveEv.touches[0]?.clientX : (moveEv as MouseEvent).clientX;
      const moveY = 'touches' in moveEv ? moveEv.touches[0]?.clientY : (moveEv as MouseEvent).clientY;
      if (moveX === undefined || moveY === undefined) return;

      const normX = Math.max(0.04, Math.min(0.96, moveX / window.innerWidth));
      const normY = Math.max(0.06, Math.min(0.94, moveY / window.innerHeight));

      setConfig(prev => ({
        ...prev,
        activePreset: 'custom',
        positions: {
          ...prev.positions,
          [id]: {
            ...prev.positions[id],
            x: normX,
            y: normY
          }
        }
      }));
    };

    const onEnd = () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  };

  const handleApplyPreset = (preset: LayoutPresetName) => {
    let positions = DEFAULT_PRESET_TWO_THUMB;
    let showLeft = false;

    if (preset === 'three_claw') {
      positions = DEFAULT_PRESET_THREE_CLAW;
      showLeft = true;
    } else if (preset === 'four_claw') {
      positions = DEFAULT_PRESET_FOUR_CLAW;
      showLeft = true;
    }

    const updated: MobileLayoutConfig = {
      ...config,
      activePreset: preset,
      showLeftFire: showLeft,
      positions: { ...positions }
    };
    saveConfig(updated);
    showToast(`APPLIED ${preset.toUpperCase().replace('_', ' ')} PRESET`);
  };

  const handleResetLayout = () => {
    handleApplyPreset('two_thumb');
  };

  const handleUpdateSize = (sizeDelta: number) => {
    setConfig(prev => {
      const current = prev.positions[selectedControl];
      const newSize = Math.max(34, Math.min(160, current.size + sizeDelta));
      return {
        ...prev,
        activePreset: 'custom',
        positions: {
          ...prev.positions,
          [selectedControl]: {
            ...current,
            size: newSize
          }
        }
      };
    });
  };

  // Helper to convert normalized (0..1) coords to inline CSS positioning
  const getStyleForControl = (id: ControlId, defaultSize: number = 50) => {
    const pos = config.positions[id] || { x: 0.5, y: 0.5, size: defaultSize };
    const pxSize = pos.size;
    const isSelected = isEditingLayout && selectedControl === id;

    return {
      position: 'absolute' as const,
      left: `${pos.x * 100}%`,
      top: `${pos.y * 100}%`,
      transform: 'translate(-50%, -50%)',
      width: pxSize,
      height: pxSize,
      opacity: isEditingLayout ? 1 : config.opacity,
      pointerEvents: 'auto' as const,
      touchAction: 'none' as const,
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      outline: isSelected ? '2px dashed #38bdf8' : 'none',
      outlineOffset: 4,
      transition: isEditingLayout ? 'none' : 'transform 0.1s ease, border-color 0.15s ease'
    };
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
        WebkitUserSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* 1. PORTRAIT ROTATE NOTIFICATION */}
      {showRotateNotice && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 64px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1.5px solid #0284c7',
            borderRadius: 24,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 4px 25px rgba(2, 132, 199, 0.35)',
            zIndex: 90,
            pointerEvents: 'auto'
          }}
        >
          <Smartphone size={18} color="#38bdf8" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.74rem', color: '#f8fafc', fontWeight: 800 }}>
            ROTATE PHONE TO LANDSCAPE FOR FULL COMBAT HUD
          </span>
          <button
            onClick={() => toggleFullscreen()}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 14,
              padding: '4px 10px',
              fontSize: '0.68rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            {isFullscreen ? <Minimize size={12} /> : <Maximize size={12} />}
            FULLSCREEN
          </button>
          <button
            onClick={() => setShowRotateNotice(false)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. ON-SCREEN TACTICAL NOTIFICATION TOAST */}
      {feedbackToast && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 72px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.96))',
            border: '1.5px solid #38bdf8',
            borderRadius: 20,
            padding: '5px 16px',
            color: '#38bdf8',
            fontFamily: 'var(--font-display)',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.35)',
            zIndex: 88,
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {feedbackToast}
        </div>
      )}

      {/* 3. DEDICATED FULL-SCREEN CAMERA / AIM TOUCH AREA */}
      {!isEditingLayout && (
        <div
          onTouchStart={handleLookTouchStart}
          onTouchMove={handleLookTouchMove}
          onTouchEnd={handleLookTouchEnd}
          onTouchCancel={handleLookTouchEnd}
          onMouseDown={handleLookMouseDown}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'auto',
            touchAction: 'none',
            zIndex: 1
          }}
        />
      )}

      {/* 4. VIRTUAL MOVEMENT JOYSTICK (BOTTOM-LEFT) */}
      <div
        className="mobile-joystick"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('joystick', e) : handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
        onMouseDown={handleJoystickMouseDown}
        style={{
          ...getStyleForControl('joystick', 132),
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 41, 59, 0.88) 0%, rgba(15, 23, 42, 0.96) 100%)',
          border: isSprintingAuto ? '2.5px solid #f97316' : '2px solid rgba(56, 189, 248, 0.75)',
          boxShadow: isSprintingAuto
            ? '0 0 28px rgba(249, 115, 22, 0.8), inset 0 0 16px rgba(249, 115, 22, 0.3)'
            : '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.35), inset 0 0 15px rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60
        }}
      >
        {/* Cardinal Direction Ticks */}
        <div style={{ position: 'absolute', top: 6, width: 8, height: 2, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 6, width: 8, height: 2, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', left: 6, width: 2, height: 8, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />
        <div style={{ position: 'absolute', right: 6, width: 2, height: 8, background: 'rgba(255, 255, 255, 0.8)', borderRadius: 1 }} />

        {/* Sprint Range Label */}
        <span
          style={{
            position: 'absolute',
            top: 13,
            fontSize: '0.58rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            color: isSprintingAuto ? '#f97316' : '#38bdf8',
            letterSpacing: '0.08em'
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
              : 'linear-gradient(135deg, #0284c7, #38bdf8)',
            border: '2.5px solid #ffffff',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6), 0 0 14px rgba(56, 189, 248, 0.8)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.04s ease-out'
          }}
        >
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 8px #ffffff' }} />
        </div>
      </div>

      {/* 5. SPRINT LOCK BUTTON */}
      <div
        className="mobile-ctrl-btn"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('sprintLock', e) : handleSprintLockToggle}
        onClick={isEditingLayout ? () => setSelectedControl('sprintLock') : handleSprintLockToggle}
        style={{
          ...getStyleForControl('sprintLock', 44),
          borderRadius: '50%',
          background: isSprintLocked
            ? 'linear-gradient(135deg, #f97316, #ea580c)'
            : 'radial-gradient(circle, rgba(30, 41, 59, 0.90) 0%, rgba(15, 23, 42, 0.96) 100%)',
          border: isSprintLocked ? '2.5px solid #ffffff' : '2px solid #f97316',
          boxShadow: isSprintLocked ? '0 0 20px rgba(249, 115, 22, 0.9)' : '0 4px 15px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          zIndex: 65
        }}
      >
        <Flame size={18} color={isSprintLocked ? '#ffffff' : '#f97316'} />
        <span style={{ fontSize: '0.42rem', fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>LOCK</span>
      </div>

      {/* 6. LARGE PRIMARY FIRE BUTTON (BOTTOM-RIGHT) */}
      <div
        className="mobile-ctrl-btn"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('fire', e) : handleFireTouchStart}
        onTouchMove={handleFireTouchMove}
        onTouchEnd={handleFireTouchEnd}
        onTouchCancel={handleFireTouchEnd}
        onMouseDown={handleFireMouseDown}
        onClick={isEditingLayout ? () => setSelectedControl('fire') : undefined}
        style={{
          ...getStyleForControl('fire', 126),
          borderRadius: '50%',
          background: isFiring
            ? 'radial-gradient(circle, #e11d48 0%, #9f1239 100%)'
            : 'radial-gradient(circle, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: isFiring ? '3px solid #ffffff' : '2.5px solid #f43f5e',
          boxShadow: isFiring
            ? '0 0 35px rgba(244, 63, 94, 0.95), inset 0 0 20px rgba(244, 63, 94, 0.5)'
            : '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 18px rgba(244, 63, 94, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          cursor: 'pointer',
          zIndex: 70
        }}
      >
        {/* Reticle Graphics */}
        <div style={{ position: 'relative', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: isFiring ? '2.5px solid #ffffff' : '2px dashed #f43f5e',
              animation: isFiring ? 'spin 1.5s linear infinite' : 'none'
            }}
          />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: isFiring ? '#ffffff' : '#f43f5e', boxShadow: '0 0 10px #f43f5e' }} />
          <div style={{ position: 'absolute', width: '100%', height: 2, background: isFiring ? '#ffffff' : 'rgba(244, 63, 94, 0.7)' }} />
          <div style={{ position: 'absolute', height: '100%', width: 2, background: isFiring ? '#ffffff' : 'rgba(244, 63, 94, 0.7)' }} />
        </div>
        <span
          style={{
            fontSize: '0.66rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '0.06em'
          }}
        >
          FIRE
        </span>
      </div>

      {/* 7. SECONDARY LEFT-HAND FIRE BUTTON (FOR 3/4-FINGER CLAW) */}
      {(config.showLeftFire || isEditingLayout) && (
        <div
          className="mobile-ctrl-btn"
          onTouchStart={isEditingLayout ? (e) => handleControlDragStart('leftFire', e) : handleLeftFireTouchStart}
          onTouchEnd={handleLeftFireTouchEnd}
          onTouchCancel={handleLeftFireTouchEnd}
          onMouseDown={handleLeftFireMouseDown}
          onClick={isEditingLayout ? () => setSelectedControl('leftFire') : undefined}
          style={{
            ...getStyleForControl('leftFire', 66),
            borderRadius: '50%',
            background: isFiring
              ? 'linear-gradient(135deg, #e11d48, #f43f5e)'
              : 'radial-gradient(circle, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '2px solid #f43f5e',
            boxShadow: '0 0 18px rgba(244, 63, 94, 0.6), 0 4px 15px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 70
          }}
        >
          <Zap size={22} color="#ffffff" />
          <span style={{ fontSize: '0.46rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#fff' }}>FIRE</span>
        </div>
      )}

      {/* 8. ADS / AIM BUTTON */}
      <div
        className="mobile-ctrl-btn"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('ads', e) : handleAdsTouchStart}
        onTouchEnd={handleAdsTouchEnd}
        onTouchCancel={handleAdsTouchEnd}
        onMouseDown={isEditingLayout ? () => setSelectedControl('ads') : handleAdsTouchStart}
        onMouseUp={handleAdsTouchEnd}
        style={{
          ...getStyleForControl('ads', 58),
          borderRadius: '50%',
          background: isAiming
            ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
            : 'radial-gradient(circle, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: isAiming ? '2.5px solid #ffffff' : '2px solid #38bdf8',
          boxShadow: isAiming ? '0 0 25px #38bdf8, 0 4px 15px rgba(0,0,0,0.5)' : '0 4px 15px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 70
        }}
      >
        {/* Holographic Scope Icon */}
        <div style={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #ffffff' }} />
          <div style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
        </div>
        <span style={{ fontSize: '0.48rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#ffffff', marginTop: 2 }}>
          {zoomLevelText}
        </span>
      </div>

      {/* 9. JUMP BUTTON */}
      <div
        className="mobile-ctrl-btn"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('jump', e) : handleJumpStart}
        onTouchEnd={handleJumpEnd}
        onTouchCancel={handleJumpEnd}
        onMouseDown={isEditingLayout ? () => setSelectedControl('jump') : handleJumpStart}
        onMouseUp={handleJumpEnd}
        style={{
          ...getStyleForControl('jump', 54),
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '2px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          zIndex: 65
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
          <line x1="12" y1="9" x2="12" y2="21" />
        </svg>
        <span style={{ fontSize: '0.44rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: 1 }}>JUMP</span>
      </div>

      {/* 10. CROUCH BUTTON */}
      <div
        className="mobile-ctrl-btn"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('crouch', e) : handleCrouch}
        onClick={isEditingLayout ? () => setSelectedControl('crouch') : handleCrouch}
        style={{
          ...getStyleForControl('crouch', 52),
          borderRadius: '50%',
          background: stance === 'crouch'
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : 'radial-gradient(circle, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: stance === 'crouch' ? '2.5px solid #ffffff' : '2px solid #10b981',
          boxShadow: stance === 'crouch' ? '0 0 22px rgba(16, 185, 129, 0.9)' : '0 4px 15px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          zIndex: 65
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2.5" />
          <path d="M7 21l3-5 2 2 3-5" />
          <path d="M10 11l2 2 4-2" />
        </svg>
        <span style={{ fontSize: '0.42rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: 1 }}>CROUCH</span>
      </div>

      {/* 11. PRONE BUTTON */}
      <div
        className="mobile-ctrl-btn"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('prone', e) : handleProne}
        onClick={isEditingLayout ? () => setSelectedControl('prone') : handleProne}
        style={{
          ...getStyleForControl('prone', 50),
          borderRadius: '50%',
          background: stance === 'prone'
            ? 'linear-gradient(135deg, #eab308, #ca8a04)'
            : 'radial-gradient(circle, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: stance === 'prone' ? '2.5px solid #ffffff' : '2px solid #eab308',
          boxShadow: stance === 'prone' ? '0 0 22px rgba(234, 179, 8, 0.9)' : '0 4px 15px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          zIndex: 65
        }}
      >
        <svg width="22" height="16" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="4" cy="8" r="2.5" />
          <path d="M7 9h14" />
          <path d="M14 9v4" />
        </svg>
        <span style={{ fontSize: '0.42rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: 1 }}>PRONE</span>
      </div>

      {/* 12. RELOAD BUTTON */}
      <div
        className="mobile-ctrl-btn"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('reload', e) : handleReload}
        onClick={isEditingLayout ? () => setSelectedControl('reload') : handleReload}
        style={{
          ...getStyleForControl('reload', 52),
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '2px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          zIndex: 65
        }}
      >
        <RotateCw size={19} strokeWidth={2.4} />
        <span style={{ fontSize: '0.42rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: 1 }}>RELOAD</span>
      </div>

      {/* 13. WEAPON SWITCH BUTTON */}
      <div
        className="mobile-ctrl-btn"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('weaponSwitch', e) : handleWeaponSwitch}
        onClick={isEditingLayout ? () => setSelectedControl('weaponSwitch') : handleWeaponSwitch}
        style={{
          ...getStyleForControl('weaponSwitch', 54),
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
          border: '2px solid #ffffff',
          boxShadow: '0 0 18px rgba(14, 165, 233, 0.8), 0 4px 15px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          zIndex: 65
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        <span style={{ fontSize: '0.48rem', fontWeight: 900, fontFamily: 'var(--font-display)', marginTop: 1 }}>{currentWeaponTag}</span>
      </div>

      {/* 14. MELEE COMBAT BUTTON */}
      <div
        className="mobile-ctrl-btn"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('melee', e) : handleMelee}
        onClick={isEditingLayout ? () => setSelectedControl('melee') : handleMelee}
        style={{
          ...getStyleForControl('melee', 48),
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '2px solid #ef4444',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          zIndex: 65
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="14.5 17.5 3 6 6 3 17.5 14.5 14.5 17.5" />
          <line x1="13" y1="19" x2="19" y2="13" />
          <line x1="16" y1="16" x2="20" y2="20" />
          <line x1="19" y1="21" x2="21" y2="19" />
        </svg>
        <span style={{ fontSize: '0.42rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#ef4444', marginTop: 1 }}>MELEE</span>
      </div>

      {/* 15. GRENADE BUTTON */}
      <div
        className="mobile-ctrl-btn"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('grenade', e) : handleGrenade}
        onClick={isEditingLayout ? () => setSelectedControl('grenade') : handleGrenade}
        style={{
          ...getStyleForControl('grenade', 48),
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '2px solid #f97316',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          zIndex: 65
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="14" r="7" />
          <path d="M12 7V3" />
          <path d="M9 3h6" />
          <path d="M10 7h4" />
        </svg>
        <span style={{ fontSize: '0.40rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#f97316', marginTop: 1 }}>NADE</span>
      </div>

      {/* 16. INTERACT / PICKUP BUTTON */}
      <div
        className="mobile-ctrl-btn"
        onTouchStart={isEditingLayout ? (e) => handleControlDragStart('interact', e) : handleInteract}
        onClick={isEditingLayout ? () => setSelectedControl('interact') : handleInteract}
        style={{
          ...getStyleForControl('interact', 50),
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '2px solid #a855f7',
          boxShadow: '0 0 16px rgba(168, 85, 247, 0.5), 0 4px 15px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          zIndex: 65
        }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
        <span style={{ fontSize: '0.40rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#c084fc', marginTop: 1 }}>LOOT</span>
      </div>

      {/* 17. QUICK CUSTOMIZE BUTTON */}
      <div
        className="mobile-ctrl-btn"
        onClick={() => setIsEditingLayout(prev => !prev)}
        style={{
          ...getStyleForControl('customize', 40),
          borderRadius: '50%',
          background: isEditingLayout
            ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
            : 'radial-gradient(circle, rgba(30, 41, 59, 0.90) 0%, rgba(15, 23, 42, 0.96) 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.75)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          zIndex: 80
        }}
      >
        <Sliders size={18} />
      </div>

      {/* 18. LAYOUT & SENSITIVITY CUSTOMIZER MODAL OVERLAY */}
      {isEditingLayout && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(92vw, 760px)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '2px solid #0284c7',
            borderRadius: 20,
            padding: '14px 18px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(2, 132, 199, 0.4)',
            zIndex: 95,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: '44vh',
            overflowY: 'auto'
          }}
        >
          {/* Header & Presets */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={18} color="#38bdf8" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.86rem', color: '#ffffff', letterSpacing: '0.06em' }}>
                MOBILE TOUCH LAYOUT & SENSITIVITY STUDIO
              </span>
            </div>

            {/* Layout Preset Selectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {(['two_thumb', 'three_claw', 'four_claw'] as LayoutPresetName[]).map(p => (
                <button
                  key={p}
                  onClick={() => handleApplyPreset(p)}
                  style={{
                    background: config.activePreset === p ? '#0284c7' : 'rgba(30, 41, 59, 0.8)',
                    color: '#ffffff',
                    border: config.activePreset === p ? '1.5px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 12,
                    padding: '4px 10px',
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-display)',
                    cursor: 'pointer'
                  }}
                >
                  {p === 'two_thumb' ? '2-THUMB' : p === 'three_claw' ? '3-CLAW' : '4-PRO CLAW'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic' }}>
            Tip: Drag any button on screen to reposition it. Select a button to scale its size.
          </div>

          {/* Sliders Grid: Sensitivity, Opacity, Selected Button Size */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {/* Camera Look Sensitivity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 800, color: '#38bdf8' }}>
                <span>CAMERA SENSITIVITY</span>
                <span>{config.cameraSensitivity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                value={config.cameraSensitivity}
                onChange={(e) => setConfig(prev => ({ ...prev, cameraSensitivity: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
            </div>

            {/* ADS Sensitivity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 800, color: '#38bdf8' }}>
                <span>ADS ZOOM SENSITIVITY</span>
                <span>{config.adsSensitivity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                value={config.adsSensitivity}
                onChange={(e) => setConfig(prev => ({ ...prev, adsSensitivity: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
            </div>

            {/* Button Opacity Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 800, color: '#38bdf8' }}>
                <span>CONTROLS OPACITY</span>
                <span>{Math.round(config.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="1.0"
                step="0.05"
                value={config.opacity}
                onChange={(e) => setConfig(prev => ({ ...prev, opacity: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
            </div>

            {/* Selected Control Size Adjustment */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 800, color: '#f59e0b' }}>
                <span>SELECTED: {selectedControl.toUpperCase()}</span>
                <span>{config.positions[selectedControl]?.size || 50}px</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button
                  onClick={() => handleUpdateSize(-6)}
                  style={{
                    flex: 1,
                    background: 'rgba(30, 41, 59, 0.8)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 8,
                    padding: '3px 0',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  - SMALLER
                </button>
                <button
                  onClick={() => handleUpdateSize(6)}
                  style={{
                    flex: 1,
                    background: 'rgba(30, 41, 59, 0.8)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 8,
                    padding: '3px 0',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  + LARGER
                </button>
              </div>
            </div>
          </div>

          {/* Aim Mode & Options Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.66rem', fontWeight: 800, color: '#cbd5e1' }}>
              <span>ADS MODE:</span>
              {(['tap', 'hold', 'hybrid'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setConfig(prev => ({ ...prev, adsMode: m }))}
                  style={{
                    background: config.adsMode === m ? '#0284c7' : 'rgba(30, 41, 59, 0.8)',
                    color: '#ffffff',
                    border: config.adsMode === m ? '1.5px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 10,
                    padding: '3px 8px',
                    fontSize: '0.60rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Left Fire Button Toggle */}
            <button
              onClick={() => setConfig(prev => ({ ...prev, showLeftFire: !prev.showLeftFire }))}
              style={{
                background: config.showLeftFire ? '#f43f5e' : 'rgba(30, 41, 59, 0.8)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 10,
                padding: '4px 10px',
                fontSize: '0.64rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {config.showLeftFire ? 'LEFT FIRE: ON' : 'LEFT FIRE: OFF'}
            </button>
          </div>

          {/* Bottom Action Buttons: Reset, Save, Close */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button
              onClick={handleResetLayout}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1.5px solid #ef4444',
                borderRadius: 12,
                padding: '6px 14px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <RotateCcw size={13} />
              RESET DEFAULT
            </button>

            <button
              onClick={() => {
                saveConfig(config);
                setIsEditingLayout(false);
                showToast('LAYOUT CONFIG SAVED');
              }}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                color: '#ffffff',
                border: '1.5px solid #ffffff',
                borderRadius: 12,
                padding: '6px 18px',
                fontSize: '0.70rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 0 15px rgba(14, 165, 233, 0.6)'
              }}
            >
              <Check size={14} />
              SAVE & APPLY
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState, useEffect, useCallback } from 'react';

export const FULLSCREEN_CHANGE_EVENT = 'app-fullscreen-change';
export const OPEN_IOS_GUIDE_EVENT = 'open-ios-fullscreen-guide';

/**
 * Checks if the user is running Safari on iPhone / iPod (outside standalone PWA mode)
 */
export function isIPhoneSafari(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIPhone = /iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && window.innerWidth < 800);
  const isStandalone = Boolean(
    (navigator as any).standalone ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
  return isIPhone && !isStandalone;
}

/**
 * Checks if HTML5 Native Fullscreen API is supported by the current browser.
 */
export function isNativeFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    doc.mozFullScreenEnabled ||
    doc.msFullscreenEnabled
  );
}

/**
 * Checks if HTML5 Native Fullscreen is currently engaged.
 */
export function isNativeFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

/**
 * Checks if fullscreen (native or virtual fallback) is active.
 */
export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;

  // Check HTML5 Native Fullscreen
  if (isNativeFullscreenActive()) {
    return true;
  }

  // Check CSS Virtual Fullscreen (only for devices where native fullscreen is unsupported, e.g. iPhone Safari)
  if (!isNativeFullscreenSupported() || isIPhoneSafari()) {
    return document.documentElement.classList.contains('fullscreen-virtual-active');
  }

  return false;
}

/**
 * Dispatches an event to notify React hooks of state change
 */
function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(FULLSCREEN_CHANGE_EVENT));
    window.dispatchEvent(new Event('resize'));
  }
}

/**
 * Enables CSS Virtual Fullscreen for browsers without native HTML5 Fullscreen (e.g., iPhone Safari)
 */
export function enableVirtualFullscreen(): void {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.add('fullscreen-virtual-active');
  document.body.classList.add('fullscreen-virtual-active');

  // Attempt to collapse mobile browser address bar
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
  } catch {
    window.scrollTo(0, 0);
  }

  // Attempt orientation lock to landscape if available
  try {
    const orientation = (screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation) as any;
    if (orientation && typeof orientation.lock === 'function') {
      orientation.lock('landscape').catch(() => {});
    }
  } catch {
    // Ignore orientation failure
  }

  notifyChange();
}

/**
 * Disables CSS Virtual Fullscreen
 */
export function disableVirtualFullscreen(): void {
  if (typeof document === 'undefined') return;

  document.documentElement.classList.remove('fullscreen-virtual-active');
  document.body.classList.remove('fullscreen-virtual-active');

  // Attempt unlock orientation
  try {
    const orientation = (screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation) as any;
    if (orientation && typeof orientation.unlock === 'function') {
      orientation.unlock();
    }
  } catch {
    // Ignore unlock failure
  }

  notifyChange();
}

/**
 * Enters fullscreen mode. Supports both Android & Desktop (Native) and iOS / Mobile Safari (Virtual).
 * CRITICAL: Native request must be invoked synchronously to preserve the mobile user gesture token.
 */
export function enterFullscreen(element?: HTMLElement): boolean {
  if (typeof document === 'undefined') return false;

  // On iPhone Safari, Apple forbids Element.requestFullscreen() in standard browser tabs.
  // We activate virtual fullscreen AND dispatch the guide event so the user knows how to get 100% borderless display.
  if (isIPhoneSafari()) {
    enableVirtualFullscreen();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(OPEN_IOS_GUIDE_EVENT));
    }
    return true;
  }

  const target = (element || document.documentElement) as any;
  let nativeAttempted = false;

  // 1. Try standard requestFullscreen first (Synchronously on user gesture!)
  if (typeof target.requestFullscreen === 'function') {
    nativeAttempted = true;
    try {
      const promise = target.requestFullscreen();
      if (promise && typeof promise.then === 'function') {
        promise
          .then(() => {
            // Also apply virtual class so layout 100dvh is always guaranteed
            enableVirtualFullscreen();
          })
          .catch(() => {
            // If native rejected because native is not supported, enable virtual fallback
            if (!isNativeFullscreenSupported()) {
              enableVirtualFullscreen();
            }
          });
      } else {
        enableVirtualFullscreen();
      }
    } catch {
      if (!isNativeFullscreenSupported()) {
        enableVirtualFullscreen();
      }
    }
  } else if (typeof target.webkitRequestFullscreen === 'function') {
    // 2. WebKit fallback (iPad Safari, older Chrome / Safari)
    nativeAttempted = true;
    try {
      target.webkitRequestFullscreen();
      enableVirtualFullscreen();
    } catch {
      if (!isNativeFullscreenSupported()) {
        enableVirtualFullscreen();
      }
    }
  } else if (typeof target.mozRequestFullScreen === 'function') {
    nativeAttempted = true;
    try {
      target.mozRequestFullScreen();
      enableVirtualFullscreen();
    } catch {
      if (!isNativeFullscreenSupported()) {
        enableVirtualFullscreen();
      }
    }
  } else if (typeof target.msRequestFullscreen === 'function') {
    nativeAttempted = true;
    try {
      target.msRequestFullscreen();
      enableVirtualFullscreen();
    } catch {
      if (!isNativeFullscreenSupported()) {
        enableVirtualFullscreen();
      }
    }
  }

  // 3. If native Fullscreen API is not available (e.g. iPhone Safari), immediately enable Virtual Fullscreen
  if (!nativeAttempted) {
    enableVirtualFullscreen();
  }

  return true;
}

/**
 * Automatically sets the screen to full screen mode when opening the game.
 * Attempts an immediate transition on load/mount, and registers a one-time
 * listener on the initial user interaction (click, tap, keypress) to satisfy browser
 * security/user-gesture requirements seamlessly.
 */
export function initAutoFullscreen(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // If already active, nothing to do
  if (isFullscreenActive()) {
    return () => {};
  }

  // 1. Attempt immediate entry on game opening/startup
  try {
    enterFullscreen();
  } catch {
    // Expected on browsers requiring prior user gesture
  }

  if (isFullscreenActive()) {
    return () => {};
  }

  let activated = false;

  const triggerOnInteraction = () => {
    if (activated) return;
    if (isFullscreenActive()) {
      activated = true;
      cleanup();
      return;
    }

    try {
      enterFullscreen();
    } catch {
      // Continue listening until gesture successfully triggers
    }
  };

  const onFsChange = () => {
    if (isFullscreenActive()) {
      activated = true;
      cleanup();
    }
  };

  const cleanup = () => {
    window.removeEventListener('click', triggerOnInteraction, true);
    window.removeEventListener('pointerdown', triggerOnInteraction, true);
    window.removeEventListener('touchend', triggerOnInteraction, true);
    window.removeEventListener('keydown', triggerOnInteraction, true);
    document.removeEventListener('fullscreenchange', onFsChange);
    document.removeEventListener('webkitfullscreenchange', onFsChange);
    document.removeEventListener('mozfullscreenchange', onFsChange);
    document.removeEventListener('MSFullscreenChange', onFsChange);
    window.removeEventListener(FULLSCREEN_CHANGE_EVENT, onFsChange);
  };

  // Use capture phase to intercept earliest interaction
  window.addEventListener('click', triggerOnInteraction, true);
  window.addEventListener('pointerdown', triggerOnInteraction, true);
  window.addEventListener('touchend', triggerOnInteraction, true);
  window.addEventListener('keydown', triggerOnInteraction, true);

  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('mozfullscreenchange', onFsChange);
  document.addEventListener('MSFullscreenChange', onFsChange);
  window.addEventListener(FULLSCREEN_CHANGE_EVENT, onFsChange);

  return cleanup;
}

/**
 * Exits fullscreen mode (both native and virtual)
 */
export function exitFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;

  // Disable virtual fullscreen
  disableVirtualFullscreen();

  // Exit native fullscreen if active
  try {
    if (doc.exitFullscreen && doc.fullscreenElement) {
      doc.exitFullscreen().catch(() => {});
    } else if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
      doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen && doc.mozFullScreenElement) {
      doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen && doc.msFullscreenElement) {
      doc.msExitFullscreen();
    }
  } catch {
    // Ignore native exit error
  }

  notifyChange();
  return true;
}

/**
 * Toggles fullscreen mode synchronously on user gesture.
 */
export function toggleFullscreen(element?: HTMLElement): boolean {
  if (isFullscreenActive()) {
    exitFullscreen();
    return false;
  } else {
    enterFullscreen(element);
    return true;
  }
}

/**
 * React hook that tracks fullscreen status and provides a toggle function.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => isFullscreenActive());

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(isFullscreenActive());
    };

    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    document.addEventListener('mozfullscreenchange', handleChange);
    document.addEventListener('MSFullscreenChange', handleChange);
    window.addEventListener(FULLSCREEN_CHANGE_EVENT, handleChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
      document.removeEventListener('mozfullscreenchange', handleChange);
      document.removeEventListener('MSFullscreenChange', handleChange);
      window.removeEventListener(FULLSCREEN_CHANGE_EVENT, handleChange);
    };
  }, []);

  const toggle = useCallback((element?: HTMLElement) => {
    const nextState = toggleFullscreen(element);
    setIsFullscreen(nextState);
    return nextState;
  }, []);

  return { isFullscreen, toggle, enter: enterFullscreen, exit: exitFullscreen };
}

import { useState, useEffect, useCallback } from 'react';

const FULLSCREEN_CHANGE_EVENT = 'app-fullscreen-change';

/**
 * Checks if fullscreen (native or virtual) is active.
 */
export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;

  // Check HTML5 Native Fullscreen
  const hasNativeFs = Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );

  // Check CSS Virtual Fullscreen (for iOS Safari and in-app mobile browsers)
  const hasVirtualFs = typeof document !== 'undefined' &&
    document.documentElement.classList.contains('fullscreen-virtual-active');

  return hasNativeFs || hasVirtualFs;
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
            // Native rejected (e.g. iframe permission or mobile policy) -> activate virtual fullscreen
            enableVirtualFullscreen();
          });
      } else {
        enableVirtualFullscreen();
      }
    } catch {
      enableVirtualFullscreen();
    }
  } else if (typeof target.webkitRequestFullscreen === 'function') {
    // 2. WebKit fallback (iPad Safari, older Chrome / Safari)
    nativeAttempted = true;
    try {
      target.webkitRequestFullscreen();
      enableVirtualFullscreen();
    } catch {
      enableVirtualFullscreen();
    }
  } else if (typeof target.mozRequestFullScreen === 'function') {
    nativeAttempted = true;
    try {
      target.mozRequestFullScreen();
      enableVirtualFullscreen();
    } catch {
      enableVirtualFullscreen();
    }
  } else if (typeof target.msRequestFullscreen === 'function') {
    nativeAttempted = true;
    try {
      target.msRequestFullscreen();
      enableVirtualFullscreen();
    } catch {
      enableVirtualFullscreen();
    }
  }

  // 3. If native Fullscreen API is not available (e.g. iPhone Safari), immediately enable Virtual Fullscreen
  if (!nativeAttempted) {
    enableVirtualFullscreen();
  }

  return true;
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

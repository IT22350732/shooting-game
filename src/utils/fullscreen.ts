import { useState, useEffect, useCallback } from 'react';

/**
 * Utility functions for cross-platform Fullscreen API support (Web desktop & Mobile)
 */

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

export async function enterFullscreen(element?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const target = (element || document.documentElement) as any;

  try {
    if (target.requestFullscreen) {
      await target.requestFullscreen({ navigationUI: 'hide' } as any);
    } else if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen();
    } else if (target.mozRequestFullScreen) {
      target.mozRequestFullScreen();
    } else if (target.msRequestFullscreen) {
      target.msRequestFullscreen();
    }
  } catch {
    try {
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      }
    } catch {
      // Browser prevented fullscreen or unpermitted
      return false;
    }
  }

  // Attempt screen orientation lock to landscape if available on mobile
  try {
    const orientation = (screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation) as any;
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape').catch(() => {});
    }
  } catch {
    // Orientation lock not permitted or supported
  }

  return isFullscreenActive();
}

export async function exitFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const doc = document as any;

  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen();
    }
  } catch {
    return false;
  }

  // Attempt unlock screen orientation
  try {
    const orientation = (screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation) as any;
    if (orientation && typeof orientation.unlock === 'function') {
      orientation.unlock();
    }
  } catch {
    // Ignore unlock error
  }

  return !isFullscreenActive();
}

export async function toggleFullscreen(element?: HTMLElement): Promise<boolean> {
  if (isFullscreenActive()) {
    await exitFullscreen();
    return false;
  } else {
    await enterFullscreen(element);
    return true;
  }
}

/**
 * React hook that tracks fullscreen status and provides a toggle function
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

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
      document.removeEventListener('mozfullscreenchange', handleChange);
      document.removeEventListener('MSFullscreenChange', handleChange);
    };
  }, []);

  const toggle = useCallback(async (element?: HTMLElement) => {
    const nextState = await toggleFullscreen(element);
    setIsFullscreen(nextState);
  }, []);

  return { isFullscreen, toggle, enter: enterFullscreen, exit: exitFullscreen };
}

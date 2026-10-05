import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, HUDStats } from './game/core/GameEngine';
import {
  GameMode,
  GameState,
  ArenaId,
  WeaponId,
  PowerupActiveState,
  HitMarkerInfo,
  FloatingDamageNumber,
  GameSettings,
  MissionConfig
} from './types/game';
import { MISSIONS } from './game/missions/MissionData';
import { saveManager } from './game/managers/SaveManager';
import { HUD } from './ui/HUD';
import { MainMenu } from './ui/MainMenu';
import { ArmoryMenu } from './ui/ArmoryMenu';
import { UpgradesMenu } from './ui/UpgradesMenu';
import { SettingsModal } from './ui/SettingsModal';
import { GameOverModal } from './ui/GameOverModal';
import { PauseModal } from './ui/PauseModal';
import { TutorialModal } from './ui/TutorialModal';
import { MobileControls } from './ui/MobileControls';
import { IOSFullscreenModal } from './ui/IOSFullscreenModal';
import { OPEN_IOS_GUIDE_EVENT } from './utils/fullscreen';
import { userManager } from './game/managers/UserManager';
import { AuthModal } from './ui/AuthModal';
import { LeaderboardModal } from './ui/LeaderboardModal';

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [engineInstance, setEngineInstance] = useState<GameEngine | null>(null);

  // Game State
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [coins, setCoins] = useState<number>(() => saveManager.getData().coins);
  const [settings, setSettings] = useState<GameSettings>(() => saveManager.getData().settings);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
      const isSmall = window.innerWidth <= 1024;
      setIsMobileDevice(isTouch || isSmall);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // HUD stats
  const [stats, setStats] = useState<HUDStats>({
    health: 100,
    maxHealth: 100,
    armor: 50,
    maxArmor: 50,
    ammo: 30,
    maxAmmo: 30,
    isReloading: false,
    reloadProgress: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    coins: 0,
    wave: 1,
    kills: 0,
    enemiesRemaining: 0,
    timeRemaining: undefined,
    activeWeaponId: 'assault_rifle',
    isAiming: false,
    isZooming: false,
    zoomLevel: 0,
    zoomMagnification: 1.0,
    targetLock: null,
    mode: 'medium'
  });

  const [hitMarker, setHitMarker] = useState<HitMarkerInfo | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<FloatingDamageNumber[]>([]);
  const [boss, setBoss] = useState<{ name: string; health: number; maxHealth: number; phase: number; isAlive: boolean } | null>(null);
  const [powerups, setPowerups] = useState<PowerupActiveState[]>([]);

  // Modals
  const [showArmory, setShowArmory] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    const handleOpenGuide = () => setShowIOSGuide(true);
    window.addEventListener(OPEN_IOS_GUIDE_EVENT, handleOpenGuide);
    return () => window.removeEventListener(OPEN_IOS_GUIDE_EVENT, handleOpenGuide);
  }, []);

  // Run statistics for game over modal
  const [endStats, setEndStats] = useState({
    score: 0,
    wave: 1,
    kills: 0,
    headshots: 0,
    highestCombo: 0,
    coinsEarned: 0
  });

  const refreshCoins = () => {
    setCoins(saveManager.getData().coins);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Instantiate Core Game Engine
    const engine = new GameEngine(containerRef.current, {
      onStatsUpdate: (s) => setStats(s),
      onHitMarker: (hm) => setHitMarker(hm),
      onDamageNumber: (dmg) => {
        setDamageNumbers((prev: FloatingDamageNumber[]) => [...prev.slice(-15), dmg]);
        setTimeout(() => {
          setDamageNumbers((prev: FloatingDamageNumber[]) => prev.filter((d: FloatingDamageNumber) => d.id !== dmg.id));
        }, 700);
      },
      onBossUpdate: (b) => setBoss(b),
      onPowerupChange: (p) => setPowerups(p),
      onGameStateChange: (newState) => {
        setGameState(newState);
        if (newState === 'GAME_OVER' || newState === 'VICTORY') {
          const currentP = engine.player.stats;
          userManager.recordGameResult(
            currentP.score,
            currentP.wave,
            currentP.kills,
            currentP.headshots
          );
          setEndStats({
            score: currentP.score,
            wave: currentP.wave,
            kills: currentP.kills,
            headshots: currentP.headshots,
            highestCombo: currentP.highestCombo,
            coinsEarned: currentP.coins
          });
          refreshCoins();
        }
      }
    });

    engineRef.current = engine;
    setEngineInstance(engine);

    return () => {
      engine.destroy();
    };
  }, []);

  const handleStartGame = (mode: GameMode, arena: ArenaId, mission?: MissionConfig) => {
    if (engineRef.current) {
      if (mode === 'mission' && mission) {
        engineRef.current.startMission(mission);
      } else {
        engineRef.current.startNewGame(mode, arena);
      }
    }
  };

  const handleSwitchWeapon = (id: WeaponId) => {
    if (engineRef.current) {
      engineRef.current.switchWeapon(id);
    }
  };

  const isAimingSniper = stats.activeWeaponId === 'sniper' && stats.isAiming;

  const activeMission = stats.activeMission || engineRef.current?.currentMission || null;
  const currentMissionIdx = activeMission ? MISSIONS.findIndex(m => m.id === activeMission.id) : -1;
  const nextMission = currentMissionIdx >= 0 && currentMissionIdx < MISSIONS.length - 1 ? MISSIONS[currentMissionIdx + 1] : null;

  const handleNextMission = () => {
    if (nextMission && engineRef.current) {
      engineRef.current.startMission(nextMission);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100dvh', overflow: 'hidden' }}>
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} />

      {/* Atmospheric Scanlines & Vignette */}
      <div className="scanlines" />
      <div className="vignette" />

      {/* IN-GAME HUD & MOBILE CONTROLS */}
      {gameState === 'PLAYING' && (
        <>
          <HUD
            stats={stats}
            hitMarker={hitMarker}
            damageNumbers={damageNumbers}
            boss={boss}
            powerups={powerups}
            settings={settings}
            isAimingSniper={isAimingSniper}
            onSwitchWeapon={handleSwitchWeapon}
            onPause={() => engineRef.current?.pauseGame()}
            onOpenTutorial={() => setShowTutorial(true)}
            isMobile={isMobileDevice}
          />
          {isMobileDevice && (
            <MobileControls
              engine={engineInstance}
              onPause={() => engineRef.current?.pauseGame()}
            />
          )}
        </>
      )}

      {/* MAIN MENU */}
      {gameState === 'MENU' && (
        <MainMenu
          onStartGame={handleStartGame}
          onPreviewArena={(arena) => engineRef.current?.previewArena(arena)}
          onOpenArmory={() => setShowArmory(true)}
          onOpenUpgrades={() => setShowUpgrades(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenTutorial={() => setShowTutorial(true)}
          onOpenAuth={() => setShowAuth(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          coins={coins}
        />
      )}

      {/* PAUSE MODAL */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={() => engineRef.current?.resumeGame()}
          onRestart={() => {
            if (engineRef.current) {
              if (activeMission) {
                engineRef.current.startMission(activeMission);
              } else {
                engineRef.current.startNewGame(engineRef.current.mode, engineRef.current.currentArenaId);
              }
            }
          }}
          onOpenSettings={() => setShowSettings(true)}
          onOpenTutorial={() => setShowTutorial(true)}
          onMainMenu={() => {
            setGameState('MENU');
            engineRef.current?.showMenu();
          }}
        />
      )}

      {/* GAME OVER / VICTORY MODAL */}
      {(gameState === 'GAME_OVER' || gameState === 'VICTORY') && (
        <GameOverModal
          score={endStats.score}
          wave={endStats.wave}
          kills={endStats.kills}
          headshots={endStats.headshots}
          highestCombo={endStats.highestCombo}
          coinsEarned={endStats.coinsEarned}
          isVictory={gameState === 'VICTORY'}
          activeMission={activeMission}
          hasNextMission={Boolean(nextMission)}
          onNextMission={handleNextMission}
          onRestart={() => {
            if (engineRef.current) {
              if (activeMission) {
                engineRef.current.startMission(activeMission);
              } else {
                engineRef.current.startNewGame(engineRef.current.mode, engineRef.current.currentArenaId);
              }
            }
          }}
          onOpenUpgrades={() => setShowUpgrades(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onMainMenu={() => {
            setGameState('MENU');
            engineRef.current?.showMenu();
          }}
        />
      )}

      {/* MODALS */}
      {showArmory && (
        <ArmoryMenu
          onClose={() => setShowArmory(false)}
          coins={coins}
          onRefreshCoins={refreshCoins}
        />
      )}

      {showUpgrades && (
        <UpgradesMenu
          onClose={() => setShowUpgrades(false)}
          coins={coins}
          onRefreshCoins={refreshCoins}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSettingsChanged={(newSettings) => {
            setSettings(newSettings);
            engineRef.current?.updateSettings(newSettings);
          }}
        />
      )}

      {showTutorial && (
        <TutorialModal
          onClose={() => setShowTutorial(false)}
        />
      )}

      {/* IPHONE FULLSCREEN IMMERSIVE GUIDE MODAL */}
      {showIOSGuide && (
        <IOSFullscreenModal
          onClose={() => setShowIOSGuide(false)}
        />
      )}

      {/* AUTHENTICATION & OPERATIVE SWITCHER MODAL */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onUserChanged={() => {
            refreshCoins();
            setSettings(saveManager.getData().settings);
          }}
        />
      )}

      {/* LEADERBOARD & OPERATIVE RANKINGS MODAL */}
      {showLeaderboard && (
        <LeaderboardModal
          onClose={() => setShowLeaderboard(false)}
          onOpenAuth={() => {
            setShowLeaderboard(false);
            setShowAuth(true);
          }}
        />
      )}
    </div>
  );
};

export default App;

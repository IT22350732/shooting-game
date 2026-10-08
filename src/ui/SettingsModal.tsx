import React from 'react';
import { X, Sliders, Maximize, Minimize, Shield, Flame, Skull, Gauge, Monitor, Zap, Sparkles, Cpu, Activity, Volume2, VolumeX, Radio, Settings } from 'lucide-react';
import { GameSettings, DifficultyLevel, GraphicsQuality, FrameRateLimit } from '../types/game';
import { saveManager } from '../game/managers/SaveManager';
import { soundManager } from '../audio/SoundManager';
import { useFullscreen } from '../utils/fullscreen';
import { voiceChatService } from '../game/multiplayer/VoiceChatService';
import { VoiceSettingsModal } from './multiplayer/VoiceSettingsModal';

interface SettingsModalProps {
  onClose: () => void;
  onSettingsChanged: (settings: GameSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSettingsChanged }) => {
  const [settings, setSettings] = React.useState<GameSettings>(() => saveManager.getData().settings);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const [voiceState, setVoiceState] = React.useState(() => voiceChatService.getState());
  const [showVoiceSettings, setShowVoiceSettings] = React.useState(false);

  React.useEffect(() => {
    return voiceChatService.subscribe(setVoiceState);
  }, []);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveManager.updateSettings(updated);
    onSettingsChanged(updated);

    if (key === 'soundVolume' || key === 'musicVolume') {
      soundManager.setVolumes(updated.soundVolume / 100, updated.musicVolume / 100);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(10px, 2.5vw, 24px)'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '92dvh',
          border: '1.5px solid rgba(2, 132, 199, 0.35)',
          background: 'rgba(255, 255, 255, 0.96)',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(15, 23, 42, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={22} color="#0284c7" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: '#0f172a', fontWeight: 900 }}>
              SYSTEM CONFIGURATION
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Settings Body */}
        <div style={{ padding: 'clamp(14px, 3vw, 24px)', display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Graphics Quality (Lag & Performance) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.06), rgba(15, 23, 42, 0.02))',
              padding: '14px 16px',
              borderRadius: 12,
              border: '1.5px solid rgba(2, 132, 199, 0.22)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Monitor size={18} color="#0284c7" />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>
                  GRAPHICS QUALITY
                </span>
              </div>
              {(() => {
                const q = settings.graphicsQuality || 'high';
                const isLow = q === 'low' || q === 'normal';
                const isUltra = q === 'ultra';
                return (
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                      padding: '3px 10px',
                      borderRadius: 6,
                      background: isLow
                        ? 'rgba(16, 185, 129, 0.15)'
                        : isUltra
                        ? 'rgba(139, 92, 246, 0.15)'
                        : 'rgba(2, 132, 199, 0.15)',
                      color: isLow ? '#10b981' : isUltra ? '#8b5cf6' : '#0284c7',
                      border: `1px solid ${
                        isLow
                          ? 'rgba(16, 185, 129, 0.3)'
                          : isUltra
                          ? 'rgba(139, 92, 246, 0.3)'
                          : 'rgba(2, 132, 199, 0.3)'
                      }`,
                      textTransform: 'uppercase'
                    }}
                  >
                    {isLow ? 'LOW' : isUltra ? 'ULTRA' : 'HIGH'}
                  </span>
                );
              })()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                {
                  id: 'low' as GraphicsQuality,
                  label: 'LOW',
                  tag: 'MAX PERFORMANCE',
                  desc: '0.65x DPR, Shadows & FX Off, Fast Shaders. Eliminates lag on all laptops',
                  icon: <Zap size={16} />,
                  color: '#10b981',
                  activeBg: 'rgba(16, 185, 129, 0.14)',
                  activeBorder: '#10b981'
                },
                {
                  id: 'high' as GraphicsQuality,
                  label: 'HIGH',
                  tag: 'BALANCED',
                  desc: '1.25x DPR, PCF Shadows, Dynamic Effects. Balanced gameplay',
                  icon: <Sparkles size={16} />,
                  color: '#0284c7',
                  activeBg: 'rgba(2, 132, 199, 0.14)',
                  activeBorder: '#0284c7'
                },
                {
                  id: 'ultra' as GraphicsQuality,
                  label: 'ULTRA',
                  tag: 'MAX FIDELITY',
                  desc: '2.0x Retina DPR, Soft Shadows, Full Weather. Requires strong GPU',
                  icon: <Cpu size={16} />,
                  color: '#8b5cf6',
                  activeBg: 'rgba(139, 92, 246, 0.14)',
                  activeBorder: '#8b5cf6'
                }
              ].map((opt) => {
                const currentQuality = settings.graphicsQuality || 'high';
                const isSelected = currentQuality === opt.id || (opt.id === 'low' && currentQuality === 'normal');
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateSetting('graphicsQuality', opt.id)}
                    className="glass-panel"
                    style={{
                      padding: '10px 8px',
                      border: isSelected ? `2px solid ${opt.activeBorder}` : '1px solid rgba(15, 23, 42, 0.12)',
                      background: isSelected ? opt.activeBg : 'rgba(255, 255, 255, 0.85)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? `0 4px 12px ${opt.activeBg}` : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isSelected ? opt.color : '#64748b' }}>
                      {opt.icon}
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 900 }}>
                        {opt.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: isSelected ? 'rgba(0, 0, 0, 0.06)' : 'rgba(15, 23, 42, 0.05)',
                        color: isSelected ? opt.color : '#64748b',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {opt.tag}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: isSelected ? '#334155' : '#94a3b8', textAlign: 'center', lineHeight: 1.25, fontWeight: 500 }}>
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frame Rate Cap (FPS) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.06), rgba(15, 23, 42, 0.02))',
              padding: '14px 16px',
              borderRadius: 12,
              border: '1.5px solid rgba(2, 132, 199, 0.22)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} color="#0284c7" />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>
                  FRAME RATE (FPS)
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: 'rgba(2, 132, 199, 0.15)',
                  color: '#0284c7',
                  border: '1px solid rgba(2, 132, 199, 0.3)'
                }}
              >
                {settings.frameRateLimit || 60} FPS
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                {
                  id: 30 as FrameRateLimit,
                  label: '30 FPS',
                  tag: 'BATTERY / LOW SPEC',
                  desc: 'Reduced GPU heating & stable pacing on weaker hardware',
                  color: '#10b981',
                  activeBg: 'rgba(16, 185, 129, 0.14)',
                  activeBorder: '#10b981'
                },
                {
                  id: 60 as FrameRateLimit,
                  label: '60 FPS',
                  tag: 'RECOMMENDED',
                  desc: 'Standard smooth esports target for balanced play',
                  color: '#0284c7',
                  activeBg: 'rgba(2, 132, 199, 0.14)',
                  activeBorder: '#0284c7'
                },
                {
                  id: 120 as FrameRateLimit,
                  label: '120 FPS',
                  tag: 'HIGH REFRESH',
                  desc: 'Ultra fluid response for 120Hz/144Hz+ monitors',
                  color: '#8b5cf6',
                  activeBg: 'rgba(139, 92, 246, 0.14)',
                  activeBorder: '#8b5cf6'
                }
              ].map((fpsOpt) => {
                const isSelected = (settings.frameRateLimit || 60) === fpsOpt.id;
                return (
                  <button
                    key={fpsOpt.id}
                    type="button"
                    onClick={() => updateSetting('frameRateLimit', fpsOpt.id)}
                    className="glass-panel"
                    style={{
                      padding: '10px 8px',
                      border: isSelected ? `2px solid ${fpsOpt.activeBorder}` : '1px solid rgba(15, 23, 42, 0.12)',
                      background: isSelected ? fpsOpt.activeBg : 'rgba(255, 255, 255, 0.85)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? `0 4px 12px ${fpsOpt.activeBg}` : 'none'
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.86rem', fontWeight: 900, color: isSelected ? fpsOpt.color : '#0f172a' }}>
                      {fpsOpt.label}
                    </span>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: isSelected ? 'rgba(0, 0, 0, 0.06)' : 'rgba(15, 23, 42, 0.05)',
                        color: isSelected ? fpsOpt.color : '#64748b',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {fpsOpt.tag}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: isSelected ? '#334155' : '#94a3b8', textAlign: 'center', lineHeight: 1.25, fontWeight: 500 }}>
                      {fpsOpt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Game Hardness Level (Difficulty) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.06), rgba(15, 23, 42, 0.02))',
              padding: '14px 16px',
              borderRadius: 12,
              border: '1.5px solid rgba(2, 132, 199, 0.22)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gauge size={18} color="#0284c7" />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>
                  GAME HARDNESS LEVEL
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.74rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  padding: '3px 10px',
                  borderRadius: 6,
                  background:
                    (settings.difficulty || 'medium') === 'easy'
                      ? 'rgba(34, 197, 94, 0.15)'
                      : (settings.difficulty || 'medium') === 'hard'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(2, 132, 199, 0.15)',
                  color:
                    (settings.difficulty || 'medium') === 'easy'
                      ? '#16a34a'
                      : (settings.difficulty || 'medium') === 'hard'
                      ? '#dc2626'
                      : '#0284c7',
                  border: `1px solid ${
                    (settings.difficulty || 'medium') === 'easy'
                      ? 'rgba(34, 197, 94, 0.3)'
                      : (settings.difficulty || 'medium') === 'hard'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(2, 132, 199, 0.3)'
                  }`,
                  textTransform: 'uppercase'
                }}
              >
                {settings.difficulty || 'medium'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                {
                  id: 'easy' as DifficultyLevel,
                  label: 'EASY',
                  desc: 'Enemy HP -35%, DMG -50%, Slower',
                  icon: <Shield size={16} />,
                  color: '#16a34a',
                  activeBg: 'rgba(34, 197, 94, 0.14)',
                  activeBorder: '#16a34a'
                },
                {
                  id: 'medium' as DifficultyLevel,
                  label: 'MEDIUM',
                  desc: 'Standard combat simulation balance',
                  icon: <Flame size={16} />,
                  color: '#0284c7',
                  activeBg: 'rgba(2, 132, 199, 0.14)',
                  activeBorder: '#0284c7'
                },
                {
                  id: 'hard' as DifficultyLevel,
                  label: 'HARD',
                  desc: 'Enemy HP +40%, DMG +50%, Faster',
                  icon: <Skull size={16} />,
                  color: '#dc2626',
                  activeBg: 'rgba(239, 68, 68, 0.14)',
                  activeBorder: '#dc2626'
                }
              ].map((lvl) => {
                const isSelected = (settings.difficulty || 'medium') === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => updateSetting('difficulty', lvl.id)}
                    className="glass-panel"
                    style={{
                      padding: '10px 8px',
                      border: isSelected ? `2px solid ${lvl.activeBorder}` : '1px solid rgba(15, 23, 42, 0.12)',
                      background: isSelected ? lvl.activeBg : 'rgba(255, 255, 255, 0.85)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? `0 4px 12px ${lvl.activeBg}` : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isSelected ? lvl.color : '#64748b' }}>
                      {lvl.icon}
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 900 }}>
                        {lvl.label}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.67rem', color: isSelected ? '#334155' : '#94a3b8', textAlign: 'center', lineHeight: 1.25, fontWeight: 500 }}>
                      {lvl.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Touch Sensitivity (for mobile) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700 }}>
              <span style={{ color: '#0f172a' }}>📱 TOUCH LOOK SENSITIVITY</span>
              <span style={{ color: '#0284c7', fontWeight: 900 }}>{settings.touchSensitivity ?? 50}</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={settings.touchSensitivity ?? 50}
              onChange={(e) => updateSetting('touchSensitivity', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
            />
          </div>

          {/* Mouse Sensitivity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700 }}>
              <span style={{ color: '#0f172a' }}>🖱️ MOUSE LOOK SENSITIVITY</span>
              <span style={{ color: '#0284c7', fontWeight: 900 }}>{settings.mouseSensitivity}</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={settings.mouseSensitivity}
              onChange={(e) => updateSetting('mouseSensitivity', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
            />
          </div>

          {/* Sound Effects Volume */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700 }}>
              <span style={{ color: '#0f172a' }}>SFX VOLUME</span>
              <span style={{ color: '#0284c7', fontWeight: 900 }}>{settings.soundVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.soundVolume}
              onChange={(e) => updateSetting('soundVolume', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
            />
          </div>

          {/* Music Volume */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700 }}>
              <span style={{ color: '#0f172a' }}>COMBAT SYNTH MUSIC VOLUME</span>
              <span style={{ color: '#0284c7', fontWeight: 900 }}>{settings.musicVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.musicVolume}
              onChange={(e) => updateSetting('musicVolume', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
            />
          </div>

          {/* Tactical Squad Voice Comms & Audio Settings */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(15, 23, 42, 0.03))',
              padding: '14px 16px',
              borderRadius: 12,
              border: '1.5px solid rgba(2, 132, 199, 0.28)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Radio size={18} color="#0284c7" />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', color: '#0f172a', fontWeight: 800 }}>
                  TACTICAL SQUAD VOICE COMMS
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.70rem',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: voiceState.status === 'connected' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(2, 132, 199, 0.15)',
                  color: voiceState.status === 'connected' ? '#16a34a' : '#0284c7',
                  border: `1px solid ${voiceState.status === 'connected' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(2, 132, 199, 0.3)'}`
                }}
              >
                {voiceState.mode === 'ptt' ? 'KEY [V] • HYBRID PTT / LIVE' : 'OPEN MIC (VAD)'}
              </span>
            </div>

            {/* Deafen Comms Toggle Button (Speaker button moved from HUD) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.85)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 6,
                    background: voiceState.isDeafened ? 'rgba(239, 68, 68, 0.15)' : 'rgba(2, 132, 199, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: voiceState.isDeafened ? '#ef4444' : '#0284c7'
                  }}
                >
                  {voiceState.isDeafened ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </div>
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                    DEAFEN SQUAD COMMS
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {voiceState.isDeafened ? 'All incoming squad transmissions are muted' : 'Mute all incoming teammate voice audio'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  voiceChatService.toggleDeafen();
                }}
                className="glass-panel"
                style={{
                  padding: '7px 14px',
                  border: voiceState.isDeafened ? '1.5px solid #ef4444' : '1px solid rgba(15, 23, 42, 0.15)',
                  background: voiceState.isDeafened ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.9)',
                  color: voiceState.isDeafened ? '#ef4444' : '#0f172a',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                {voiceState.isDeafened ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{voiceState.isDeafened ? 'DEAFENED' : 'ACTIVE'}</span>
              </button>
            </div>

            {/* Squad Voice Master Volume Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700 }}>
                <span style={{ color: '#0f172a' }}>INCOMING SQUAD VOICE VOLUME</span>
                <span style={{ color: '#0284c7', fontWeight: 900 }}>{Math.round(voiceState.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(voiceState.masterVolume * 100)}
                onChange={(e) => voiceChatService.setMasterVolume(Number(e.target.value) / 100)}
                style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
              />
            </div>

            {/* Advanced Voice Settings Button (Settings gear button moved from HUD) */}
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setShowVoiceSettings(true);
              }}
              className="glass-panel"
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1.5px solid rgba(2, 132, 199, 0.35)',
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(56, 189, 248, 0.08))',
                color: '#0284c7',
                fontFamily: 'var(--font-display)',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s ease'
              }}
            >
              <Settings size={16} />
              <span>CONFIGURE MICROPHONE & ADVANCED VOICE CONSOLE</span>
            </button>
          </div>

          {/* Crosshair Style */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }}>
              TARGETING RETICLE STYLE
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(['classic', 'dot', 'circle', 'tech'] as GameSettings['crosshairStyle'][]).map(style => (
                <button
                  key={style}
                  onClick={() => updateSetting('crosshairStyle', style)}
                  className="glass-panel"
                  style={{
                    padding: '8px 12px',
                    border: settings.crosshairStyle === style ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.1)',
                    background: settings.crosshairStyle === style ? 'rgba(2, 132, 199, 0.12)' : 'rgba(255, 255, 255, 0.8)',
                    color: settings.crosshairStyle === style ? '#0284c7' : '#64748b',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.78rem',
                    fontWeight: settings.crosshairStyle === style ? 900 : 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Screen Shake Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700, display: 'block' }}>
                DYNAMIC SCREEN SHAKE
              </span>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                Kinetic camera impulse during recoil and explosions
              </span>
            </div>
            <button
              onClick={() => updateSetting('screenShake', !settings.screenShake)}
              className="glass-panel"
              style={{
                padding: '6px 16px',
                border: settings.screenShake ? '1.5px solid #059669' : '1px solid rgba(15, 23, 42, 0.12)',
                background: settings.screenShake ? 'rgba(5, 150, 105, 0.12)' : 'transparent',
                color: settings.screenShake ? '#059669' : '#64748b',
                fontFamily: 'var(--font-display)',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {settings.screenShake ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* Fullscreen Display Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#0f172a', fontWeight: 700, display: 'block' }}>
                FULLSCREEN DISPLAY
              </span>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                Immersive full-display mode for desktop web and mobile browsers
              </span>
            </div>
            <button
              onClick={() => toggleFullscreen()}
              onTouchEnd={(e) => {
                e.preventDefault();
                toggleFullscreen();
              }}
              className="glass-panel"
              style={{
                padding: '6px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: isFullscreen ? '1.5px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.12)',
                background: isFullscreen ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                color: isFullscreen ? '#0284c7' : '#64748b',
                fontFamily: 'var(--font-display)',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
              {isFullscreen ? 'ACTIVE' : 'ENTER'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(15, 23, 42, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
            Owner: <strong style={{ color: '#0284c7' }}>Imeth Mendis</strong> (All Rights Reserved)
          </span>
          <button onClick={onClose} className="btn-cyber btn-cyber-primary">
            CLOSE & SAVE
          </button>
        </div>
      </div>

      {/* Advanced Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
      />
    </div>
  );
};

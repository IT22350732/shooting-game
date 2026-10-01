import React from 'react';
import { X, Sliders } from 'lucide-react';
import { GameSettings } from '../types/game';
import { saveManager } from '../game/managers/SaveManager';
import { soundManager } from '../audio/SoundManager';

interface SettingsModalProps {
  onClose: () => void;
  onSettingsChanged: (settings: GameSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSettingsChanged }) => {
  const [settings, setSettings] = React.useState<GameSettings>(() => saveManager.getData().settings);

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
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(15, 23, 42, 0.1)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-cyber btn-cyber-primary">
            CLOSE & SAVE
          </button>
        </div>
      </div>
    </div>
  );
};

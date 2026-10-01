import React from 'react';
import { Play, RotateCcw, Sliders, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 420,
          border: '1.5px solid rgba(2, 132, 199, 0.35)',
          background: 'rgba(255, 255, 255, 0.96)',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 32,
          gap: 20
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#0f172a', letterSpacing: '0.08em', fontWeight: 900 }}>
            TACTICAL PAUSE
          </h2>
          <p style={{ fontFamily: 'var(--font-sub)', fontSize: '0.9rem', color: '#64748b', marginTop: 4, fontWeight: 600 }}>
            Combat simulation currently suspended
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <button
            onClick={onResume}
            className="btn-cyber btn-cyber-primary"
            style={{ width: '100%', padding: '12px 18px', fontSize: '0.95rem' }}
          >
            <Play size={18} />
            RESUME COMBAT
          </button>

          <button
            onClick={onRestart}
            className="btn-cyber"
            style={{ width: '100%', padding: '12px 18px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(15, 23, 42, 0.15)', color: '#0f172a' }}
          >
            <RotateCcw size={18} />
            RESTART MISSION
          </button>

          <button
            onClick={onOpenSettings}
            className="btn-cyber"
            style={{ width: '100%', padding: '12px 18px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.85)', borderColor: 'rgba(15, 23, 42, 0.15)', color: '#0f172a' }}
          >
            <Sliders size={18} />
            SETTINGS
          </button>

          <button
            onClick={onMainMenu}
            className="btn-cyber btn-cyber-danger"
            style={{ width: '100%', padding: '12px 18px', fontSize: '0.95rem' }}
          >
            <Home size={18} />
            QUIT TO MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
};

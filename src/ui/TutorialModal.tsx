import React from 'react';
import { X, Shield, Flame, Crosshair, Award } from 'lucide-react';

interface TutorialModalProps {
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
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
        padding: 'clamp(10px, 2.5vw, 24px)'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 760,
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
            <Crosshair size={22} color="#0284c7" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: '#0f172a', fontWeight: 900 }}>
              COMBAT OPERATIVE FIELD MANUAL
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 'clamp(14px, 3vw, 24px)', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Mobile Touch Controls Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#0284c7', fontWeight: 800 }}>
              📱 MOBILE TOUCH CONTROLS
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              <KeybindCard keyLabel="LEFT JOYSTICK" action="Analog Move (Push max to sprint)" />
              <KeybindCard keyLabel="RIGHT TOUCH DRAG" action="Aim & Look Camera Rotation" />
              <KeybindCard keyLabel="FIRE BUTTON" action="Hold/Tap to Shoot Active Weapon" />
              <KeybindCard keyLabel="EYE (ADS) BUTTON" action="Toggle Aim Down Sights / Scope Zoom" />
              <KeybindCard keyLabel="ARROW UP BUTTON" action="Jump / Evasive Combat Hop" />
              <KeybindCard keyLabel="RELOAD BUTTON" action="Reload Magazine Ammo" />
              <KeybindCard keyLabel="ZAP BUTTON" action="Toggle Permanent Sprint Lock" />
              <KeybindCard keyLabel="ARROWS (< >)" action="Quick Cycle Unlocked Weapons" />
              <KeybindCard keyLabel="TOP-LEFT PAUSE" action="Tactical Pause & Menu" />
            </div>
          </div>

          {/* PC Keyboard & Mouse Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#64748b', fontWeight: 800 }}>
              ⌨️ KEYBOARD & MOUSE CONTROLS (DESKTOP)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              <KeybindCard keyLabel="W / A / S / D" action="Omni-Directional Movement" />
              <KeybindCard keyLabel="MOUSE AIM" action="Target Acquisition & Pitch/Yaw" />
              <KeybindCard keyLabel="LEFT CLICK" action="Fire Weapon Munitions" />
              <KeybindCard keyLabel="RIGHT CLICK" action="Aim Down Sights (ADS) / Sniper Zoom" />
              <KeybindCard keyLabel="R" action="Reload Magazine" />
              <KeybindCard keyLabel="SHIFT / SPACE" action="Sprint / Vertical Jump" />
              <KeybindCard keyLabel="1 / 2 / 3 / 4 / 5" action="Instant Weapon Switching" />
              <KeybindCard keyLabel="ESC" action="Tactical Pause & Menu" />
            </div>
          </div>

          {/* Combat Tactics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#0284c7', fontWeight: 800 }}>
              TACTICAL ADVICE
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TipRow
                icon={<Crosshair size={18} color="#d97706" />}
                title="Critical Weakpoints"
                desc="Headshots deal 2.5x critical damage and produce distinct golden impact sparks."
              />
              <TipRow
                icon={<Flame size={18} color="#f97316" />}
                title="Combo Multiplier"
                desc="Chain kills in quick succession to ramp your score multiplier up to x5. Taking damage drops your streak."
              />
              <TipRow
                icon={<Shield size={18} color="#0284c7" />}
                title="Shield Enforcers"
                desc="Shield Troopers deflect direct front fire. Maneuver behind their flank or strike with explosive barrels."
              />
              <TipRow
                icon={<Award size={18} color="#059669" />}
                title="Armory & Upgrades"
                desc="Spend earned coins between runs to permanently boost damage, ammo capacity, and health!"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(15, 23, 42, 0.1)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-cyber btn-cyber-primary">
            DISMISS MANUAL
          </button>
        </div>
      </div>
    </div>
  );
};

const KeybindCard: React.FC<{ keyLabel: string; action: string }> = ({ keyLabel, action }) => (
  <div
    className="glass-panel"
    style={{
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(248, 250, 252, 0.8)'
    }}
  >
    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#0284c7', fontWeight: 800 }}>
      {keyLabel}
    </span>
    <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.88rem', color: '#0f172a', fontWeight: 600 }}>
      {action}
    </span>
  </div>
);

const TipRow: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
    <div style={{ marginTop: 2 }}>{icon}</div>
    <div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: '#0f172a', fontWeight: 800 }}>
        {title}:{' '}
      </span>
      <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.88rem', color: '#64748b', fontWeight: 500 }}>
        {desc}
      </span>
    </div>
  </div>
);

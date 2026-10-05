import React, { useState } from 'react';
import {
  X,
  Shield,
  Flame,
  Crosshair,
  Award,
  HelpCircle,
  Keyboard,
  Smartphone,
  Zap,
  Bomb,
  Target,
  Sparkles,
  Compass,
  Eye,
  ArrowUp
} from 'lucide-react';

interface TutorialModalProps {
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  const isTouchDevice = typeof window !== 'undefined' && (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    window.matchMedia('(pointer: coarse)').matches
  );

  const [activeTab, setActiveTab] = useState<'keyboard' | 'mobile' | 'mechanics'>(
    isTouchDevice ? 'mobile' : 'keyboard'
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(10px, 2.5vw, 24px)'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '92dvh',
          border: '1.5px solid rgba(2, 132, 199, 0.45)',
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 20,
          animation: 'modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid rgba(15, 23, 42, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, rgba(2, 132, 199, 0.08), transparent)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                flexShrink: 0
              }}
            >
              <HelpCircle size={22} strokeWidth={2.4} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#0284c7', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.12em' }}>
                TACTICAL OPERATIVE MANUAL
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', color: '#0f172a', fontWeight: 900, margin: 0 }}>
                GAMEPLAY INSTRUCTIONS & CONTROLS
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1.5px solid rgba(15, 23, 42, 0.12)',
              background: 'rgba(241, 245, 249, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            aria-label="Close Manual"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px 0 20px', borderBottom: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <TabButton
            active={activeTab === 'keyboard'}
            onClick={() => setActiveTab('keyboard')}
            icon={<Keyboard size={17} />}
            label="KEYBOARD & MOUSE (PC)"
          />
          <TabButton
            active={activeTab === 'mobile'}
            onClick={() => setActiveTab('mobile')}
            icon={<Smartphone size={17} />}
            label="MOBILE TOUCH"
          />
          <TabButton
            active={activeTab === 'mechanics'}
            onClick={() => setActiveTab('mechanics')}
            icon={<Compass size={17} />}
            label="COMBAT TIPS & RULES"
          />
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* TAB 1: KEYBOARD & MOUSE (PC) */}
          {activeTab === 'keyboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Highlight Banner: Core Requested Keybinds */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.1), rgba(56, 189, 248, 0.18))',
                  border: '1.5px solid #0284c7',
                  borderRadius: 14,
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#0284c7" />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 900, color: '#0284c7', letterSpacing: '0.04em' }}>
                    PRIMARY COMBAT CONTROLS
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  <HighlightKeyItem
                    keys={['W', 'A', 'S', 'D']}
                    action="MOVE OPERATIVE"
                    desc="Walk forward, backward, and strafe laterally"
                  />
                  <HighlightKeyItem
                    keys={['Q']}
                    altKeys={['RIGHT CLICK']}
                    action="PRESS Q TO ZOOM"
                    desc="Engage optical ADS, narrow spread & lock targets"
                  />
                  <HighlightKeyItem
                    keys={['SPACE']}
                    action="JUMP / COMBAT HOP"
                    desc="Leap over incoming enemy fire and clear obstacles"
                  />
                  <HighlightKeyItem
                    keys={['LEFT CLICK']}
                    action="SHOOT / FIRE WEAPON"
                    desc="Shoot freely or fire while zoomed with aim-assist"
                  />
                </div>
              </div>

              {/* Complete Desktop Controls Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: '#64748b', fontWeight: 800, letterSpacing: '0.06em' }}>
                  ALL DESKTOP KEYBINDINGS
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  <KeyCard
                    keys={['W', 'A', 'S', 'D']}
                    label="Move Operative"
                    detail="Omni-directional ground movement and tactical strafing"
                  />
                  <KeyCard
                    keys={['Q']}
                    secondaryKey="Right Click"
                    label="Zoom & Aim Assist"
                    detail="Hold or tap Q to zoom in and lock onto hostile weakpoints"
                  />
                  <KeyCard
                    keys={['SPACE']}
                    label="Combat Jump"
                    detail="Vertical leap to evade ground projectiles and bypass obstacles"
                  />
                  <KeyCard
                    keys={['LEFT CLICK']}
                    label="Fire Weapon"
                    detail="Discharges active firearm (fully functional while zoomed)"
                  />
                  <KeyCard
                    keys={['MOUSE AIM']}
                    label="Camera & Crosshair"
                    detail="Smooth 360° pitch and yaw aim targeting"
                  />
                  <KeyCard
                    keys={['SHIFT', 'C']}
                    label="Tactical Sprint"
                    detail="High-speed dash to escape enemy squads or reposition"
                  />
                  <KeyCard
                    keys={['R']}
                    label="Reload Magazine"
                    detail="Reload ammunition supply before your clip runs empty"
                  />
                  <KeyCard
                    keys={['SCROLL WHEEL']}
                    label="Zoom Magnification"
                    detail="Cycle through 1.8X and 4.5X precision optical zoom steps"
                  />
                  <KeyCard
                    keys={['1', '2', '3', '4', '5']}
                    label="Weapon Selection"
                    detail="Assault Rifle, Shotgun, SMG, Sniper, or Plasma Rifle"
                  />
                  <KeyCard
                    keys={['ESC', 'P']}
                    label="Tactical Pause"
                    detail="Freeze simulation, view options, or restart run"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MOBILE TOUCH CONTROLS */}
          {activeTab === 'mobile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  background: 'rgba(2, 132, 199, 0.08)',
                  border: '1px solid rgba(2, 132, 199, 0.25)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <Smartphone size={20} color="#0284c7" />
                <span style={{ fontSize: '0.85rem', color: '#0f172a', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
                  Touch-optimized dual virtual HUD controls for smartphones and tablets.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                <KeyCard
                  keys={['LEFT JOYSTICK']}
                  label="Movement Only"
                  detail="Drag joystick to walk in any direction; push to outer rim to sprint"
                />
                <KeyCard
                  keys={['RIGHT FIRE JOYSTICK']}
                  label="Aim & Fire Controller"
                  detail="Touch and drag to steer gun aim and continuously discharge firearm"
                />
                <KeyCard
                  keys={['FREE TOUCH DRAG']}
                  label="Camera Look"
                  detail="Swipe screen background to look around without firing"
                />
                <KeyCard
                  keys={['EYE (ADS) BUTTON']}
                  label="Toggle Zoom Scope"
                  detail="Activates Tactical Zoom optic mode with target acquisition assist"
                />
                <KeyCard
                  keys={['ARROW UP BUTTON']}
                  label="Jump / Hop"
                  detail="Leap vertically into the air to dodge bullets"
                />
                <KeyCard
                  keys={['RELOAD BUTTON']}
                  label="Reload Magazine"
                  detail="Replenishes your weapon's bullet magazine"
                />
                <KeyCard
                  keys={['ARROWS (< >)']}
                  label="Quick Cycle Weapons"
                  detail="Cycle through your arsenal of unlocked firearms"
                />
                <KeyCard
                  keys={['ZAP BUTTON']}
                  label="Sprint Lock"
                  detail="Toggles permanent continuous sprint mode"
                />
                <KeyCard
                  keys={['TOP-LEFT BUTTONS']}
                  label="Pause & Fullscreen"
                  detail="Access tactical pause menu and immersive fullscreen"
                />
              </div>
            </div>
          )}

          {/* TAB 3: COMBAT MECHANICS & TIPS */}
          {activeTab === 'mechanics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <TipCard
                  icon={<Eye size={20} color="#0284c7" />}
                  title="TACTICAL ZOOM TARGET ASSIST"
                  desc="Engaging Zoom (Q key or Right Click) significantly tightens bullet spread and automatically activates magnetic aim-assist, keeping your crosshair locked onto enemy centroids."
                />
                <TipCard
                  icon={<Crosshair size={20} color="#d97706" />}
                  title="CRITICAL HEADSHOT WEAKPOINTS"
                  desc="Enemy combatants have sensitive head sensors. Headshots deal 2.5x critical damage and yield distinct golden hit sparks and score bonuses."
                />
                <TipCard
                  icon={<Bomb size={20} color="#e11d48" />}
                  title="EXPLOSIVE SUPPLY BARRELS"
                  desc="Strategically shoot red explosive canisters when hostiles or bosses congregate nearby to inflict massive splash explosion damage."
                />
                <TipCard
                  icon={<Shield size={20} color="#0284c7" />}
                  title="SHIELD ENFORCER TACTICS"
                  desc="Shield Troopers deflect direct front projectile fire. Flank around their sides, jump over their heads, or detonate barrels near them."
                />
                <TipCard
                  icon={<Flame size={20} color="#f97316" />}
                  title="COMBO STREAK MULTIPLIER"
                  desc="Chain eliminations quickly to build a kill combo multiplier up to 5x for maximum score and bounty coin rewards. Avoid taking hits to preserve your streak."
                />
                <TipCard
                  icon={<Zap size={20} color="#8b5cf6" />}
                  title="HEALTH & POWERUP DROPS"
                  desc="Every 3 kills guarantees a green Health Nanite drop. Enemies also drop Armor, Shield, Rapid Fire, Damage Boost, and Slow-Motion beacons."
                />
                <TipCard
                  icon={<Award size={20} color="#10b981" />}
                  title="5 TACTICAL MISSIONS"
                  desc="Deploy into 5 structured campaign operations with tailored objectives (Barrels, Headshots, Boss Elimination, Time Attack) to earn medals and coins."
                />
                <TipCard
                  icon={<Target size={20} color="#06b6d4" />}
                  title="ARMORY UPGRADES"
                  desc="Visit the Armory and Upgrades Hub in the Main Menu to permanently enhance damage, fire rate, magazine capacity, and player health."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid rgba(15, 23, 42, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            background: 'rgba(248, 250, 252, 0.8)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748b', fontFamily: 'var(--font-display)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0284c7' }} />
            <span>Owner: <strong style={{ color: '#0f172a', fontWeight: 800 }}>Imeth Mendis</strong> (All Rights Reserved)</span>
          </div>

          <button
            onClick={onClose}
            className="btn-cyber btn-cyber-primary"
            style={{ padding: '10px 24px', fontSize: '0.9rem' }}
          >
            DISMISS INSTRUCTIONS
          </button>
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({
  active,
  onClick,
  icon,
  label
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '10px 14px',
      borderRadius: '8px 8px 0 0',
      border: 'none',
      borderBottom: active ? '3px solid #0284c7' : '3px solid transparent',
      background: active ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
      color: active ? '#0284c7' : '#64748b',
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: '0.82rem',
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    }}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const HighlightKeyItem: React.FC<{ keys: string[]; altKeys?: string[]; action: string; desc: string }> = ({
  keys,
  altKeys,
  action,
  desc
}) => (
  <div
    style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 10,
      padding: '10px 14px',
      border: '1px solid rgba(2, 132, 199, 0.3)',
      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {keys.map((k, i) => (
        <React.Fragment key={k}>
          <kbd
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              background: '#0f172a',
              color: '#38bdf8',
              fontFamily: 'var(--font-display)',
              fontSize: '0.78rem',
              fontWeight: 900,
              boxShadow: '0 2px 0 #0284c7, 0 3px 6px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}
          >
            {k}
          </kbd>
          {i < keys.length - 1 && <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>/</span>}
        </React.Fragment>
      ))}

      {altKeys && (
        <>
          <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>OR</span>
          {altKeys.map((ak) => (
            <kbd
              key={ak}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                background: '#1e293b',
                color: '#f8fafc',
                fontFamily: 'var(--font-display)',
                fontSize: '0.75rem',
                fontWeight: 800,
                boxShadow: '0 2px 0 #334155',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              {ak}
            </kbd>
          ))}
        </>
      )}
    </div>

    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>
        {action}
      </div>
      <div style={{ fontFamily: 'var(--font-sub)', fontSize: '0.78rem', color: '#64748b', marginTop: 1 }}>
        {desc}
      </div>
    </div>
  </div>
);

const KeyCard: React.FC<{ keys: string[]; secondaryKey?: string; label: string; detail: string }> = ({
  keys,
  secondaryKey,
  label,
  detail
}) => (
  <div
    className="glass-panel"
    style={{
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      background: 'rgba(248, 250, 252, 0.85)',
      border: '1px solid rgba(15, 23, 42, 0.08)'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {keys.map((k, i) => (
          <React.Fragment key={k}>
            <kbd
              style={{
                padding: '2px 7px',
                borderRadius: 5,
                background: '#0f172a',
                color: '#38bdf8',
                fontFamily: 'var(--font-display)',
                fontSize: '0.72rem',
                fontWeight: 900,
                boxShadow: '0 2px 0 #0284c7'
              }}
            >
              {k}
            </kbd>
            {i < keys.length - 1 && <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>/</span>}
          </React.Fragment>
        ))}

        {secondaryKey && (
          <>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>or</span>
            <kbd
              style={{
                padding: '2px 7px',
                borderRadius: 5,
                background: '#1e293b',
                color: '#cbd5e1',
                fontFamily: 'var(--font-display)',
                fontSize: '0.7rem',
                fontWeight: 800,
                boxShadow: '0 2px 0 #334155'
              }}
            >
              {secondaryKey}
            </kbd>
          </>
        )}
      </div>

      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', color: '#0284c7', fontWeight: 800 }}>
        {label}
      </span>
    </div>

    <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.78rem', color: '#475569', lineHeight: 1.3 }}>
      {detail}
    </span>
  </div>
);

const TipCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div
    className="glass-panel"
    style={{
      padding: '12px 14px',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      background: 'rgba(248, 250, 252, 0.9)',
      border: '1px solid rgba(15, 23, 42, 0.08)'
    }}
  >
    <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.84rem', color: '#0f172a', fontWeight: 900, letterSpacing: '0.02em' }}>
        {title}
      </span>
      <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.35 }}>
        {desc}
      </span>
    </div>
  </div>
);

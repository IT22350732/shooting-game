import React from 'react';
import {
  Users,
  Shield,
  Skull,
  Radio,
  Wifi,
  Globe,
  HelpCircle,
  Bot,
  Crosshair,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface MultiplayerBriefingProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const MultiplayerBriefing: React.FC<MultiplayerBriefingProps> = ({ onClose, isModal = false }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        color: '#f8fafc',
        maxHeight: isModal ? '80vh' : 'auto',
        overflowY: isModal ? 'auto' : 'visible',
        padding: isModal ? '24px' : '8px 4px'
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(15, 23, 42, 0.8))',
          border: '1.5px solid rgba(2, 132, 199, 0.5)',
          borderRadius: 14,
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 8px 32px rgba(2, 132, 199, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(56, 189, 248, 0.2)',
              border: '1.5px solid #38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}
          >
            <HelpCircle size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, letterSpacing: 0.5 }}>
              TACTICAL MULTIPLAYER BRIEFING
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>
              Complete Guide to Matchmaking, Tactical Radar, Wave Co-Op & Peer Navigation
            </span>
          </div>
        </div>

        {onClose && isModal && (
          <button
            onClick={onClose}
            className="btn-cyber"
            style={{
              padding: '6px 16px',
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#38bdf8',
              borderColor: 'rgba(2, 132, 199, 0.5)'
            }}
          >
            DISMISS
          </button>
        )}
      </div>

      {/* Grid of 4 Key Focus Areas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* CARD 1: CONNECTING & JOINING WITH ROOM CODES */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(2, 132, 199, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Globe size={18} />
            </div>
            <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, color: '#38bdf8' }}>
              1. CONNECTING WITH FRIENDS
            </h4>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
            No server setup or accounts required. You can connect across different computers, tabs, or mobile phones instantly:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ background: '#0284c7', color: '#ffffff', borderRadius: 4, padding: '1px 6px', fontWeight: 900, fontSize: '0.7rem' }}>A</span>
              <span><strong>Host Creates Arena:</strong> Select <em>Co-Op Strike</em> or <em>Team Match</em>, click <strong>Create & Open Lobby</strong>.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ background: '#0284c7', color: '#ffffff', borderRadius: 4, padding: '1px 6px', fontWeight: 900, fontSize: '0.7rem' }}>B</span>
              <span><strong>Copy Room Code:</strong> Click the 5-character Code (e.g. <code>W7K2P</code>) at the top of the lobby to copy it.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ background: '#0284c7', color: '#ffffff', borderRadius: 4, padding: '1px 6px', fontWeight: 900, fontSize: '0.7rem' }}>C</span>
              <span><strong>Guest Enters Code:</strong> Your friend goes to <em>Join with Room Code</em>, types the code, and clicks <strong>Join</strong>.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ background: '#0284c7', color: '#ffffff', borderRadius: 4, padding: '1px 6px', fontWeight: 900, fontSize: '0.7rem' }}>D</span>
              <span><strong>Dual Relay Support:</strong> Seamless fallback between WebSocket Relay (LAN/local) and WebRTC PeerJS for guaranteed connection.</span>
            </div>
          </div>
        </div>

        {/* CARD 2: LOCATING TEAMMATES & ENEMIES */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(34, 197, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#22c55e'
              }}
            >
              <Crosshair size={18} />
            </div>
            <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, color: '#22c55e' }}>
              2. LOCATING EACH OTHER IN COMBAT
            </h4>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
            In large multi-story arenas, our tactical navigation suite ensures you never lose your squad or miss enemy movement:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <CheckCircle2 size={15} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong>Wall-Penetrating Teammate Beacons:</strong> Allied player nameplates display through buildings and walls with real-time distance in meters (e.g. <code>Alpha-1 (24m)</code>).</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <CheckCircle2 size={15} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong>Top-Right Tactical Radar:</strong> 360° circular mini-map sweeps surroundings up to 50m. Teammates appear as <span style={{ color: '#38bdf8' }}>Cyan</span> / <span style={{ color: '#22c55e' }}>Green</span> dots; enemies as <span style={{ color: '#ef4444' }}>Red</span> dots; bosses as <span style={{ color: '#c084fc' }}>Purple</span> diamonds.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <CheckCircle2 size={15} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong>Shared Spawn Elevation:</strong> Spawn points calibrate with terrain elevation to prevent players spawning under roofs or out of view.</span>
            </div>
          </div>
        </div>

        {/* CARD 3: GAME MODES & AI ENEMIES */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(244, 63, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f43f5e'
              }}
            >
              <Skull size={18} />
            </div>
            <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, color: '#f43f5e' }}>
              3. GAME MODES & COMBAT THREATS
            </h4>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
            Multiplayer matches are always packed with action and targets to eliminate:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Shield size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong>Co-Op Team Strike:</strong> Players join on the same squad to fight progressive waves of hostile AI infantry, drones, and heavy bosses. Wave progress and damage synchronize across all operatives.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Bot size={15} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong>Tactical AI Bot Backfill:</strong> In Team Deathmatch (TDM) and Free-For-All, empty slots are filled with tactical bots so you always have enemies to engage even with 2 players.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Zap size={15} color="#facc15" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong>Fast Respawn Cycle:</strong> When eliminated in PvP, a 3-second respawn counter automatically deploys you back into combat at a safe base point.</span>
            </div>
          </div>
        </div>

        {/* CARD 4: VOICE COMMS & NETWORK DIAGNOSTICS */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(168, 85, 247, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc'
              }}
            >
              <Radio size={18} />
            </div>
            <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, color: '#c084fc' }}>
              4. SQUAD COMMS & VOICE CHAT
            </h4>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
            Coordinate strategies in real-time with zero extra downloads:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Radio size={15} color="#c084fc" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong>Squad Voice Chat:</strong> Click <strong>Enable Voice</strong> to talk with teammates. In TDM, voice streams are isolated to your squad team channels.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Wifi size={15} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong>Real-Time Latency Meter:</strong> Ping is monitored continuously on the HUD. Green indicates sub-50ms transmission.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Sparkles size={15} color="#facc15" style={{ flexShrink: 0, marginTop: 2 }} />
              <span><strong>Quick Tactical Pings:</strong> Use quick chat buttons in the lobby and combat chat to transmit tactical callouts instantly.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting Tips Footer */}
      <div
        style={{
          background: 'rgba(2, 132, 199, 0.1)',
          border: '1px dashed rgba(2, 132, 199, 0.4)',
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}
      >
        <AlertCircle size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
          <strong style={{ color: '#38bdf8' }}>Pro-Tip:</strong> Want to play against waves of hostile robots and drones together with your friend?
          Choose <strong>CO-OP TEAM STRIKE</strong> when hosting. You will both drop into the arena as teammates, share health recovery, and fight coordinated waves together!
        </div>
      </div>
    </div>
  );
};

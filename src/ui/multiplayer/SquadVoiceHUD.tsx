import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  VolumeX,
  Radio,
  Shield,
  Users
} from 'lucide-react';
import { voiceChatService, VoiceChatServiceState, VoicePeerInfo } from '../../game/multiplayer/VoiceChatService';
import { multiplayerService } from '../../game/multiplayer/MultiplayerService';
import { soundManager } from '../../audio/SoundManager';

interface SquadVoiceHUDProps {
  isMobile?: boolean;
  isEmbedded?: boolean;
}

export const SquadVoiceHUD: React.FC<SquadVoiceHUDProps> = ({ isMobile, isEmbedded }) => {
  const [voiceState, setVoiceState] = useState<VoiceChatServiceState>(() => voiceChatService.getState());
  const [isMobilePttActive, setIsMobilePttActive] = useState<boolean>(false);

  useEffect(() => {
    const unsub = voiceChatService.subscribe((s) => {
      setVoiceState(s);
    });
    return () => unsub();
  }, []);

  const localPlayer = multiplayerService.localPlayer;
  const room = multiplayerService.room;
  const isTDM = room?.mode === 'multiplayer_tdm';
  const myTeam = localPlayer?.team || 'alpha';

  const teamColor = myTeam === 'alpha' ? '#38bdf8' : myTeam === 'bravo' ? '#f87171' : '#c084fc';
  const teamBorder = myTeam === 'alpha' ? 'rgba(2, 132, 199, 0.4)' : myTeam === 'bravo' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)';

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    if (voiceState.status !== 'connected') {
      voiceChatService.initMicrophone();
    } else {
      voiceChatService.toggleMute();
    }
  };

  // Mobile Touch PTT Handlers (Smart Hold to Talk & Tap to Toggle)
  const handleMobilePttStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMobilePttActive(true);
    voiceChatService.handlePttDown();
  };

  const handleMobilePttEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMobilePttActive(false);
    voiceChatService.handlePttUp();
  };

  const [isMobileRosterOpen, setIsMobileRosterOpen] = useState<boolean>(false);

  return (
    <>
      {/* MOBILE COMPACT TACTICAL COMMS STRIP (Height: 26px) */}
      {isMobile ? (
        <div style={{ position: 'relative', width: isEmbedded ? '100%' : 175 }}>
          <div
            style={{
              position: isEmbedded ? 'relative' : 'fixed',
              top: isEmbedded ? 'auto' : 'calc(env(safe-area-inset-top, 0px) + 106px)',
              left: isEmbedded ? 'auto' : 'calc(env(safe-area-inset-left, 0px) + 12px)',
              zIndex: 88,
              width: '100%',
              height: 26,
              pointerEvents: 'auto',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: `1.5px solid ${teamBorder}`,
              borderRadius: 8,
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Status & Channel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: voiceState.status === 'connected' ? '#22c55e' : '#64748b',
                  boxShadow: voiceState.status === 'connected' ? '0 0 6px #22c55e' : 'none',
                  flexShrink: 0
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  color: teamColor,
                  letterSpacing: 0.5,
                  whiteSpace: 'nowrap'
                }}
              >
                {isTDM ? `${myTeam.toUpperCase()}` : 'COMMS'}
              </span>

              {/* Speaking visualizer if transmitting */}
              {voiceState.isTransmitting && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 1.5, marginLeft: 2 }}>
                  <span style={{ width: 2, height: 7, background: '#22c55e', borderRadius: 1 }} />
                  <span style={{ width: 2, height: 11, background: '#22c55e', borderRadius: 1 }} />
                  <span style={{ width: 2, height: 6, background: '#22c55e', borderRadius: 1 }} />
                </div>
              )}
            </div>

            {/* Quick Actions (PTT + Roster Toggle) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onTouchStart={handleMobilePttStart}
                onTouchEnd={handleMobilePttEnd}
                onMouseDown={handleMobilePttStart}
                onMouseUp={handleMobilePttEnd}
                onClick={handleToggleMute}
                style={{
                  background: (isMobilePttActive || voiceState.isLiveLocked)
                    ? 'rgba(34, 197, 94, 0.35)'
                    : voiceState.isMuted
                    ? 'rgba(239, 68, 68, 0.25)'
                    : 'rgba(2, 132, 199, 0.25)',
                  border: `1px solid ${(isMobilePttActive || voiceState.isLiveLocked) ? '#22c55e' : voiceState.isMuted ? '#ef4444' : '#0284c7'}`,
                  borderRadius: 5,
                  padding: '2px 5px',
                  color: (isMobilePttActive || voiceState.isLiveLocked) ? '#4ade80' : voiceState.isMuted ? '#f87171' : '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: '0.58rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  touchAction: 'manipulation'
                }}
              >
                {voiceState.isMuted ? <MicOff size={11} /> : <Mic size={11} />}
                <span>{voiceState.isLiveLocked ? 'LIVE' : isMobilePttActive ? 'TALK' : voiceState.isMuted ? 'MUTED' : 'PTT'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMobileRosterOpen(!isMobileRosterOpen);
                }}
                style={{
                  background: isMobileRosterOpen ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 5,
                  padding: '2px 4px',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  fontSize: '0.56rem',
                  fontWeight: 700
                }}
                title="Toggle Squad Roster"
              >
                <Users size={10} />
                <span>{1 + (voiceState.peers?.length || 0)}</span>
              </button>
            </div>
          </div>

          {/* Optional Expanded Roster Popover for Mobile */}
          {isMobileRosterOpen && (
            <div
              style={{
                position: isEmbedded ? 'absolute' : 'fixed',
                top: isEmbedded ? 'calc(100% + 4px)' : 'calc(env(safe-area-inset-top, 0px) + 144px)',
                left: isEmbedded ? 0 : 'calc(env(safe-area-inset-left, 0px) + 12px)',
                zIndex: 96,
                width: isEmbedded ? '100%' : 185,
                maxHeight: 140,
                overflowY: 'auto',
                background: 'rgba(10, 15, 30, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: 8,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                pointerEvents: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 4 }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8' }}>SQUAD ROSTER</span>
                <button
                  onClick={() => setIsMobileRosterOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                >
                  ✕
                </button>
              </div>
              {/* Local user row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                <span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 700 }}>{localPlayer?.name || 'You'} (YOU)</span>
                <span style={{ fontSize: '0.58rem', color: voiceState.isMuted ? '#ef4444' : '#22c55e' }}>{voiceState.isMuted ? 'MUTED' : 'READY'}</span>
              </div>
              {/* Remote peers */}
              {voiceState.peers.map((peer) => (
                <div key={peer.playerId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                  <span style={{ fontSize: '0.65rem', color: peer.isSpeaking ? '#4ade80' : '#cbd5e1' }}>{peer.name}</span>
                  <button
                    onClick={() => voiceChatService.toggleMutePeer(peer.playerId)}
                    style={{ background: 'none', border: 'none', color: peer.isLocallyMuted ? '#ef4444' : '#94a3b8', cursor: 'pointer' }}
                  >
                    {peer.isLocallyMuted ? <VolumeX size={12} /> : <Mic size={12} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* DESKTOP TACTICAL SQUAD VOICE OVERLAY */
        <div
          style={{
            position: 'fixed',
            top: 100,
            left: 'calc(env(safe-area-inset-left, 0px) + 16px)',
            zIndex: 45,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            pointerEvents: 'auto',
            maxWidth: 260
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              background: 'rgba(10, 15, 30, 0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: `1px solid ${teamBorder}`,
              borderRadius: 8,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: voiceState.status === 'connected' ? '#22c55e' : '#64748b',
                  boxShadow: voiceState.status === 'connected' ? '0 0 8px #22c55e' : 'none',
                  display: 'inline-block'
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  color: teamColor,
                  letterSpacing: 0.8
                }}
              >
                {isTDM ? `${myTeam.toUpperCase()} SQUAD COMMS` : 'VOICE COMMS'}
              </span>
            </div>

            {/* Quick Action Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={handleToggleMute}
                style={{
                  background: voiceState.isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: 4,
                  padding: 4,
                  color: voiceState.isMuted ? '#ef4444' : '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={voiceState.isMuted ? 'Unmute Mic (M)' : 'Mute Mic (M)'}
              >
                {voiceState.isMuted ? <MicOff size={12} /> : <Mic size={12} />}
              </button>
            </div>
          </div>

          {/* Squad Members Roster */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Local Player Row */}
            <div
              style={{
                background: voiceState.isTransmitting
                  ? 'rgba(34, 197, 94, 0.22)'
                  : 'rgba(10, 15, 30, 0.65)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                border: voiceState.isTransmitting
                  ? '1px solid #22c55e'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 6,
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.12s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: teamColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: '0.62rem',
                    flexShrink: 0
                  }}
                >
                  YOU
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#f8fafc',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {localPlayer?.name || 'Operative'}
                </span>
              </div>

              {/* Speaking / Audio Waves */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {voiceState.isMuted ? (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      color: '#ef4444',
                      fontWeight: 800,
                      letterSpacing: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Mic Muted (Press V to Unmute, Hold V to Talk)"
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    MUTED
                    <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 600 }}>
                      [TAP V: LIVE]
                    </span>
                  </span>
                ) : voiceState.isTransmitting ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {voiceState.isLiveLocked ? (
                      <span
                        style={{
                          fontSize: '0.58rem',
                          color: '#22c55e',
                          fontWeight: 900,
                          background: 'rgba(34, 197, 94, 0.2)',
                          border: '1px solid rgba(34, 197, 94, 0.5)',
                          padding: '1px 5px',
                          borderRadius: 3,
                          letterSpacing: 0.5,
                          boxShadow: '0 0 8px rgba(34, 197, 94, 0.3)'
                        }}
                        title="Always Live Talking (Tap V to Mute)"
                      >
                        ● LIVE
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.58rem',
                          color: '#38bdf8',
                          fontWeight: 900,
                          background: 'rgba(56, 189, 248, 0.2)',
                          border: '1px solid rgba(56, 189, 248, 0.5)',
                          padding: '1px 5px',
                          borderRadius: 3,
                          letterSpacing: 0.5
                        }}
                        title="Temporary Voice (Release V to stop)"
                      >
                        PTT
                      </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span
                        style={{
                          width: 3,
                          height: 10 + voiceState.localAudioLevel * 8,
                          background: '#22c55e',
                          borderRadius: 1,
                          transition: 'height 0.05s'
                        }}
                      />
                      <span
                        style={{
                          width: 3,
                          height: 6 + voiceState.localAudioLevel * 12,
                          background: '#22c55e',
                          borderRadius: 1,
                          transition: 'height 0.05s'
                        }}
                      />
                      <span
                        style={{
                          width: 3,
                          height: 8 + voiceState.localAudioLevel * 6,
                          background: '#22c55e',
                          borderRadius: 1,
                          transition: 'height 0.05s'
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.60rem', color: '#64748b', fontWeight: 700 }}>
                    HOLD [V] • TAP LIVE
                  </span>
                )}
              </div>
            </div>

            {/* Remote Teammates */}
            {voiceState.peers.map((peer) => {
              const isSpeaking = peer.isSpeaking;
              return (
                <div
                  key={peer.playerId}
                  style={{
                    background: isSpeaking
                      ? 'rgba(34, 197, 94, 0.2)'
                      : 'rgba(10, 15, 30, 0.65)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    border: isSpeaking
                      ? '1px solid #22c55e'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 6,
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        background: peer.team === 'alpha' ? '#0284c7' : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '0.62rem',
                        flexShrink: 0
                      }}
                    >
                      {peer.name.charAt(0).toUpperCase()}
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: isSpeaking ? '#4ade80' : '#f8fafc',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {peer.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {peer.isLocallyMuted ? (
                      <VolumeX size={12} color="#ef4444" />
                    ) : isSpeaking ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <span
                          style={{
                            width: 3,
                            height: 8 + peer.audioLevel * 10,
                            background: '#22c55e',
                            borderRadius: 1,
                            transition: 'height 0.05s'
                          }}
                        />
                        <span
                          style={{
                            width: 3,
                            height: 12 + peer.audioLevel * 6,
                            background: '#22c55e',
                            borderRadius: 1,
                            transition: 'height 0.05s'
                          }}
                        />
                        <span
                          style={{
                            width: 3,
                            height: 6 + peer.audioLevel * 12,
                            background: '#22c55e',
                            borderRadius: 1,
                            transition: 'height 0.05s'
                          }}
                        />
                      </div>
                    ) : (
                      <Mic size={12} color="#64748b" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Settings,
  Shield,
  Users
} from 'lucide-react';
import { voiceChatService, VoiceChatServiceState, VoicePeerInfo } from '../../game/multiplayer/VoiceChatService';
import { multiplayerService } from '../../game/multiplayer/MultiplayerService';
import { soundManager } from '../../audio/SoundManager';
import { VoiceSettingsModal } from './VoiceSettingsModal';

interface SquadVoiceHUDProps {
  isMobile?: boolean;
}

export const SquadVoiceHUD: React.FC<SquadVoiceHUDProps> = ({ isMobile }) => {
  const [voiceState, setVoiceState] = useState<VoiceChatServiceState>(() => voiceChatService.getState());
  const [showSettings, setShowSettings] = useState<boolean>(false);
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

  const handleToggleDeafen = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playClick();
    voiceChatService.toggleDeafen();
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

  return (
    <>
      {/* TACTICAL SQUAD VOICE OVERLAY (Top-Left HUD) */}
      <div
        style={{
          position: 'fixed',
          top: isMobile ? 80 : 100,
          left: 16,
          zIndex: 45,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          pointerEvents: 'auto',
          maxWidth: isMobile ? 220 : 260
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

            <button
              onClick={handleToggleDeafen}
              style={{
                background: voiceState.isDeafened ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: 4,
                padding: 4,
                color: voiceState.isDeafened ? '#ef4444' : '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={voiceState.isDeafened ? 'Undeafen Comms' : 'Deafen Comms'}
            >
              {voiceState.isDeafened ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>

            <button
              onClick={() => { soundManager.playClick(); setShowSettings(true); }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: 4,
                padding: 4,
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Voice Settings"
            >
              <Settings size={12} />
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
                    {!isMobile ? '[TAP V: LIVE]' : ''}
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
                  {voiceState.mode === 'ptt' ? (!isMobile ? 'HOLD [V] • TAP LIVE' : 'HOLD/TAP') : 'VAD'}
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

      {/* MOBILE FLOATING PUSH-TO-TALK BUTTON */}
      {isMobile && (
        <div
          onTouchStart={handleMobilePttStart}
          onTouchEnd={handleMobilePttEnd}
          onMouseDown={handleMobilePttStart}
          onMouseUp={handleMobilePttEnd}
          style={{
            position: 'fixed',
            bottom: 110,
            left: 20,
            zIndex: 60,
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: (isMobilePttActive || voiceState.isLiveLocked)
              ? 'radial-gradient(circle, #22c55e 0%, #15803d 100%)'
              : voiceState.isMuted
              ? 'rgba(239, 68, 68, 0.4)'
              : 'rgba(15, 23, 42, 0.85)',
            border: `2px solid ${(isMobilePttActive || voiceState.isLiveLocked) ? '#4ade80' : voiceState.isMuted ? '#ef4444' : '#0284c7'}`,
            boxShadow: (isMobilePttActive || voiceState.isLiveLocked)
              ? '0 0 22px #22c55e'
              : '0 4px 15px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
            cursor: 'pointer',
            transition: 'transform 0.1s ease, box-shadow 0.1s ease'
          }}
        >
          {voiceState.isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          <span style={{ fontSize: '0.50rem', fontWeight: 900, letterSpacing: 0.5, marginTop: 1 }}>
            {voiceState.isLiveLocked ? 'LIVE ON' : isMobilePttActive ? 'TALKING' : 'HOLD / TAP'}
          </span>
        </div>
      )}

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
};

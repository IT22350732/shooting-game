import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  X,
  Shield,
  Headphones,
  Users,
  Activity
} from 'lucide-react';
import { voiceChatService, VoiceChatServiceState, VoiceMode, VoiceChannel } from '../../game/multiplayer/VoiceChatService';
import { soundManager } from '../../audio/SoundManager';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ isOpen, onClose }) => {
  const [voiceState, setVoiceState] = useState<VoiceChatServiceState>(() => voiceChatService.getState());
  const [isTestingMic, setIsTestingMic] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'audio' | 'squad'>('audio');

  useEffect(() => {
    if (!isOpen) return;
    const unsub = voiceChatService.subscribe((s) => {
      setVoiceState(s);
    });
    voiceChatService.refreshAudioDevices();
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleVoice = async () => {
    soundManager.playClick();
    if (voiceState.status === 'disconnected' || voiceState.status === 'permission_denied') {
      await voiceChatService.initMicrophone();
    } else {
      voiceChatService.toggleMute();
    }
  };

  const handleModeChange = (mode: VoiceMode) => {
    soundManager.playClick();
    voiceChatService.setVoiceMode(mode);
  };

  const handleChannelChange = (channel: VoiceChannel) => {
    soundManager.playClick();
    voiceChatService.setVoiceChannel(channel);
  };

  const handleToggleTestLoopback = () => {
    soundManager.playClick();
    const active = voiceChatService.toggleTestLoopback();
    setIsTestingMic(active);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 10, 20, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="cyber-panel"
        style={{
          width: '100%',
          maxWidth: 620,
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 30, 0.98) 100%)',
          border: '1.5px solid rgba(2, 132, 199, 0.4)',
          borderRadius: 14,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(2, 132, 199, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(2, 132, 199, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)'
              }}
            >
              <Radio size={20} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  letterSpacing: 1.2,
                  color: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                TACTICAL VOICE COMMS
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: voiceState.status === 'connected' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: voiceState.status === 'connected' ? '#22c55e' : '#ef4444',
                    border: `1px solid ${voiceState.status === 'connected' ? '#22c55e' : '#ef4444'}`,
                    fontWeight: 800
                  }}
                >
                  {voiceState.status === 'connected' ? 'ONLINE' : 'OFFLINE'}
                </span>
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                Low-Latency WebRTC Encrypted Tactical Team Audio
              </span>
            </div>
          </div>

          <button
            onClick={() => { soundManager.playClick(); onClose(); }}
            className="btn-cyber"
            style={{ padding: 6, borderRadius: 8, color: '#94a3b8' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.2)'
          }}
        >
          <button
            onClick={() => { soundManager.playClick(); setActiveTab('audio'); }}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === 'audio' ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'audio' ? '2px solid #0284c7' : '2px solid transparent',
              color: activeTab === 'audio' ? '#38bdf8' : '#94a3b8',
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <Sliders size={16} />
            <span>AUDIO & INPUT SETTINGS</span>
          </button>

          <button
            onClick={() => { soundManager.playClick(); setActiveTab('squad'); }}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === 'squad' ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'squad' ? '2px solid #0284c7' : '2px solid transparent',
              color: activeTab === 'squad' ? '#38bdf8' : '#94a3b8',
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={16} />
            <span>SQUAD MIXER ({voiceState.peers.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {activeTab === 'audio' ? (
            <>
              {/* Mic Status & Quick Connect Banner */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: voiceState.status === 'connected' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: `1px solid ${voiceState.status === 'connected' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: voiceState.status === 'connected' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: voiceState.status === 'connected' ? '#22c55e' : '#ef4444'
                    }}
                  >
                    {voiceState.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </div>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f8fafc', display: 'block' }}>
                      {voiceState.status === 'connected'
                        ? voiceState.isMuted
                          ? 'Microphone Muted'
                          : 'Microphone Active & Ready'
                        : 'Microphone Not Connected'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {voiceState.errorMessage || 'Echo cancellation & auto gain enabled for crystal clarity.'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleToggleVoice}
                  className={`btn-cyber ${voiceState.status === 'connected' ? '' : 'btn-cyber-primary'}`}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {voiceState.status === 'connected' ? (
                    voiceState.isMuted ? <Mic size={16} /> : <MicOff size={16} />
                  ) : (
                    <Radio size={16} />
                  )}
                  <span>
                    {voiceState.status === 'connected'
                      ? voiceState.isMuted ? 'UNMUTE' : 'MUTE MIC'
                      : 'INITIALIZE MIC'}
                  </span>
                </button>
              </div>

              {/* Hardware Input Device Selection */}
              {voiceState.availableDevices.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#cbd5e1' }}>
                    MICROPHONE INPUT DEVICE
                  </label>
                  <select
                    value={voiceState.selectedDeviceId}
                    onChange={(e) => voiceChatService.setSelectedDevice(e.target.value)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  >
                    <option value="default">Default System Microphone</option>
                    {voiceState.availableDevices.map((dev) => (
                      <option key={dev.deviceId} value={dev.deviceId}>
                        {dev.label || `Microphone (${dev.deviceId.substring(0, 6)})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mode & Channel Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Voice Mode */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#cbd5e1' }}>
                      TRANSMISSION MODE
                    </label>
                    <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700 }}>
                      Hold [V]: Temp PTT • Tap [V]: Live Talk / Mute
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, background: 'rgba(0, 0, 0, 0.4)', padding: 4, borderRadius: 8 }}>
                    <button
                      onClick={() => handleModeChange('ptt')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: voiceState.mode === 'ptt' ? '#0284c7' : 'transparent',
                        color: voiceState.mode === 'ptt' ? '#fff' : '#94a3b8',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      HYBRID PTT / LIVE [V]
                    </button>
                    <button
                      onClick={() => handleModeChange('open_mic')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: voiceState.mode === 'open_mic' ? '#0284c7' : 'transparent',
                        color: voiceState.mode === 'open_mic' ? '#fff' : '#94a3b8',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      OPEN MIC (VAD)
                    </button>
                  </div>
                </div>

                {/* Team Voice Isolation Channel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#cbd5e1' }}>
                    VOICE CHANNEL
                  </label>
                  <div style={{ display: 'flex', gap: 6, background: 'rgba(0, 0, 0, 0.4)', padding: 4, borderRadius: 8 }}>
                    <button
                      onClick={() => handleChannelChange('team')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: voiceState.channel === 'team' ? '#0284c7' : 'transparent',
                        color: voiceState.channel === 'team' ? '#fff' : '#94a3b8',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Shield size={14} />
                      <span>TEAM SQUAD</span>
                    </button>
                    <button
                      onClick={() => handleChannelChange('all')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: voiceState.channel === 'all' ? '#0284c7' : 'transparent',
                        color: voiceState.channel === 'all' ? '#fff' : '#94a3b8',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Users size={14} />
                      <span>ALL PLAYERS</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* LIVE REAL-TIME MICROPHONE VU-METER */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={16} color="#38bdf8" />
                    LIVE MIC INPUT LEVEL & VAD THRESHOLD
                  </span>
                  <span style={{ fontSize: '0.72rem', color: voiceState.isLocalSpeaking ? '#22c55e' : '#94a3b8', fontWeight: 800 }}>
                    {voiceState.isLocalSpeaking ? 'TRANSMITTING' : 'IDLE'}
                  </span>
                </div>

                {/* Meter Bar with Threshold Indicator */}
                <div
                  style={{
                    position: 'relative',
                    height: 18,
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Active Level Fill */}
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, voiceState.localAudioLevel * 100)}%`,
                      background:
                        voiceState.localAudioLevel > 0.65
                          ? 'linear-gradient(90deg, #22c55e 0%, #eab308 70%, #ef4444 100%)'
                          : voiceState.localAudioLevel > voiceState.vadThreshold
                          ? 'linear-gradient(90deg, #0284c7 0%, #22c55e 100%)'
                          : 'rgba(2, 132, 199, 0.5)',
                      transition: 'width 0.05s ease-out',
                      borderRadius: 6
                    }}
                  />

                  {/* VAD Threshold Marker */}
                  {voiceState.mode === 'open_mic' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${Math.min(100, voiceState.vadThreshold * 100)}%`,
                        width: 2,
                        background: '#facc15',
                        boxShadow: '0 0 6px #facc15'
                      }}
                      title="Activation Threshold"
                    />
                  )}
                </div>

                {/* VAD Sensitivity Slider (Only in Open Mic) */}
                {voiceState.mode === 'open_mic' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                      <span>Mic Sensitivity Threshold: {Math.round(voiceState.vadThreshold * 100)}%</span>
                      <span>Adjust to filter background noise</span>
                    </div>
                    <input
                      type="range"
                      min="0.03"
                      max="0.35"
                      step="0.01"
                      value={voiceState.vadThreshold}
                      onChange={(e) => voiceChatService.setVadThreshold(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: '#0284c7' }}
                    />
                  </div>
                )}

                {/* Test Loopback Toggle */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={handleToggleTestLoopback}
                    className="btn-cyber"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: isTestingMic ? '#22c55e' : '#cbd5e1'
                    }}
                  >
                    <Headphones size={14} />
                    <span>{isTestingMic ? 'STOP MIC TEST' : 'TEST MY MICROPHONE (LOOPBACK)'}</span>
                  </button>
                </div>
              </div>

              {/* Master Audio Volume & Radio Effects */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1' }}>
                    <span>INCOMING VOICE VOLUME</span>
                    <span style={{ color: '#38bdf8' }}>{Math.round(voiceState.masterVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={voiceState.masterVolume}
                    onChange={(e) => voiceChatService.setMasterVolume(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#0284c7' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1' }}>
                    <span>MIC INPUT GAIN / BOOST</span>
                    <span style={{ color: '#38bdf8' }}>{Math.round(voiceState.inputGain * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={voiceState.inputGain}
                    onChange={(e) => voiceChatService.setInputGain(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#0284c7' }}
                  />
                </div>
              </div>

              {/* Tactical Radio Squelch & Roger Beep Sound FX Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc', display: 'block' }}>
                    TACTICAL RADIO CHIRP & ROGER BEEP
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Play military walkie-talkie audio clicks when pressing and releasing Push-to-Talk
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={voiceState.radioSoundEffects}
                  onChange={(e) => voiceChatService.setRadioSoundEffects(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#0284c7', cursor: 'pointer' }}
                />
              </div>
            </>
          ) : (
            /* Squad Mixer Tab: Individual Volume Sliders & Mute */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8' }}>
                  ADJUST INDIVIDUAL SQUAD MEMBERS OR MUTE NOISY PLAYERS
                </span>
                <button
                  onClick={() => { soundManager.playClick(); voiceChatService.toggleDeafen(); }}
                  className="btn-cyber"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: voiceState.isDeafened ? '#ef4444' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {voiceState.isDeafened ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span>{voiceState.isDeafened ? 'UNDEAFEN ALL' : 'DEAFEN ALL COMMS'}</span>
                </button>
              </div>

              {voiceState.peers.length === 0 ? (
                <div
                  style={{
                    padding: '30px 20px',
                    textAlign: 'center',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 10,
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    color: '#64748b',
                    fontSize: '0.85rem'
                  }}
                >
                  <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div>No other teammates currently in this voice channel.</div>
                  <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
                    Invite comrades to the room to start live tactical squad calling!
                  </div>
                </div>
              ) : (
                voiceState.peers.map((peer) => (
                  <div
                      key={peer.playerId}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: `1px solid ${peer.isSpeaking ? '#22c55e' : 'rgba(255, 255, 255, 0.08)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        transition: 'border-color 0.1s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: peer.team === 'alpha' ? 'rgba(2, 132, 199, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                            border: `1.5px solid ${peer.team === 'alpha' ? '#0284c7' : '#ef4444'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 900,
                            fontSize: '0.8rem'
                          }}
                        >
                          {peer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {peer.name}
                            {peer.isSpeaking && (
                              <span style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 900 }}>
                                TALKING
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: peer.team === 'alpha' ? '#38bdf8' : '#f87171', fontWeight: 700 }}>
                            {peer.team.toUpperCase()} SQUAD
                          </span>
                        </div>
                      </div>

                      {/* Individual Volume Slider & Mute Toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', width: 32, textAlign: 'right' }}>
                            {Math.round(peer.volume * 100)}%
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="1.5"
                            step="0.05"
                            value={peer.volume}
                            disabled={peer.isLocallyMuted}
                            onChange={(e) => voiceChatService.setPeerVolume(peer.playerId, parseFloat(e.target.value))}
                            style={{ width: 100, accentColor: '#0284c7' }}
                          />
                        </div>

                        <button
                          onClick={() => { soundManager.playClick(); voiceChatService.toggleMutePeer(peer.playerId); }}
                          className="btn-cyber"
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            color: peer.isLocallyMuted ? '#ef4444' : '#cbd5e1'
                          }}
                          title={peer.isLocallyMuted ? 'Unmute Player' : 'Mute Player'}
                        >
                          {peer.isLocallyMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.3)'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Desktop hotkey: Hold [V] to Talk • Press [M] to Mute
          </span>

          <button
            onClick={() => { soundManager.playClick(); onClose(); }}
            className="btn-cyber btn-cyber-primary"
            style={{ padding: '8px 24px', fontWeight: 800, fontSize: '0.85rem' }}
          >
            CONFIRM & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

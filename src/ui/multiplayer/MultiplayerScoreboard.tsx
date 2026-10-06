import React, { useState, useEffect } from 'react';
import { NetworkPlayerState, RoomConfig } from '../../game/multiplayer/MultiplayerTypes';
import { Trophy, Shield, Skull, Wifi, Award, User, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { AVATAR_OPTIONS } from '../../types/user';
import { voiceChatService, VoiceChatServiceState } from '../../game/multiplayer/VoiceChatService';

interface MultiplayerScoreboardProps {
  room: RoomConfig | null;
  players: NetworkPlayerState[];
  localPlayerId: string;
  onClose?: () => void;
}

export const MultiplayerScoreboard: React.FC<MultiplayerScoreboardProps> = ({
  room,
  players,
  localPlayerId,
  onClose
}) => {
  const [voiceState, setVoiceState] = useState<VoiceChatServiceState>(() => voiceChatService.getState());

  useEffect(() => {
    const unsub = voiceChatService.subscribe((s) => setVoiceState(s));
    return () => unsub();
  }, []);

  if (!room) return null;

  const isTDM = room.mode === 'multiplayer_tdm';
  const alphaPlayers = players.filter((p) => p.team === 'alpha');
  const bravoPlayers = players.filter((p) => p.team === 'bravo');
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const renderPlayerRow = (p: NetworkPlayerState, rank?: number) => {
    const isMe = p.id === localPlayerId;
    const avatar = AVATAR_OPTIONS.find((a) => a.id === p.avatarId) || AVATAR_OPTIONS[0];
    const kd = p.deaths === 0 ? p.kills.toFixed(1) : (p.kills / p.deaths).toFixed(2);

    const voicePeer = voiceState.peers.find((vp) => vp.playerId === p.id);
    const isSpeaking = isMe ? voiceState.isLocalSpeaking : (voicePeer?.isSpeaking || p.voiceState?.isSpeaking || false);
    const isMuted = isMe ? voiceState.isMuted : (p.voiceState?.isMuted || false);
    const isLocallyMuted = voicePeer?.isLocallyMuted || false;

    return (
      <tr
        key={p.id}
        style={{
          background: isMe ? 'rgba(2, 132, 199, 0.22)' : isSpeaking ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontWeight: isMe ? 900 : 700
        }}
      >
        <td style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          {rank !== undefined && (
            <span style={{ width: 18, color: rank === 1 ? '#facc15' : '#94a3b8', fontSize: '0.8rem' }}>
              #{rank}
            </span>
          )}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${avatar.color}, ${avatar.accentColor})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: isSpeaking ? '0 0 10px #22c55e' : 'none'
            }}
          >
            <User size={14} strokeWidth={2.5} />
          </div>
          <span style={{ color: isMe ? '#38bdf8' : isSpeaking ? '#4ade80' : '#f8fafc', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            {p.name} {isMe && '(YOU)'}
            {isMuted && <MicOff size={12} color="#ef4444" />}
            {isSpeaking && (
              <span style={{ fontSize: '0.62rem', background: '#22c55e', color: '#000', padding: '1px 5px', borderRadius: 4, fontWeight: 900 }}>
                MIC
              </span>
            )}
          </span>

          {/* Voice indicator / Mute Button */}
          {!isMe && voicePeer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                voiceChatService.toggleMutePeer(p.id);
              }}
              style={{
                marginLeft: 'auto',
                background: isLocallyMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: 4,
                padding: '3px 6px',
                color: isLocallyMuted ? '#ef4444' : isSpeaking ? '#22c55e' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.68rem'
              }}
              title={isLocallyMuted ? 'Unmute Player' : 'Mute Player'}
            >
              {isLocallyMuted ? <VolumeX size={12} /> : isSpeaking ? <Mic size={12} /> : <Volume2 size={12} />}
            </button>
          )}
        </td>
        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#f8fafc' }}>{p.score}</td>
        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#22c55e' }}>{p.kills}</td>
        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ef4444' }}>{p.deaths}</td>
        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#e2e8f0' }}>{kd}</td>
        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.72rem',
              color: p.ping < 60 ? '#22c55e' : p.ping < 120 ? '#eab308' : '#ef4444'
            }}
          >
            <Wifi size={12} />
            {p.ping}ms
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 10, 20, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 780,
          maxHeight: '90vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: 'rgba(15, 23, 42, 0.94)',
          border: '1.5px solid rgba(2, 132, 199, 0.5)',
          borderRadius: 14,
          padding: 20,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
          fontFamily: 'var(--font-display)',
          color: '#f8fafc'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Trophy size={24} color="#facc15" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: 1, fontWeight: 900 }}>
                {room.roomName.toUpperCase()}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-sub)', fontWeight: 700 }}>
                MODE: {isTDM ? 'TEAM DEATHMATCH' : 'FREE-FOR-ALL'} • LIMIT: {room.scoreLimit} KILLS • MAP: {room.arena.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Match Score Badge */}
          {isTDM ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0, 0, 0, 0.5)', padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span style={{ color: '#38bdf8', fontWeight: 900, fontSize: '1.2rem' }}>ALPHA {room.teamAlphaScore}</span>
              <span style={{ color: '#64748b', fontWeight: 800 }}>VS</span>
              <span style={{ color: '#f87171', fontWeight: 900, fontSize: '1.2rem' }}>BRAVO {room.teamBravoScore}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#facc15', fontWeight: 800, fontSize: '0.9rem' }}>
              <Award size={18} />
              <span>SCORE LIMIT: {room.scoreLimit}</span>
            </div>
          )}
        </div>

        {/* Tables */}
        {isTDM ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            {/* Team Alpha (Blue) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontWeight: 900, fontSize: '0.9rem', marginBottom: 8 }}>
                <Shield size={16} />
                <span>TEAM ALPHA ({alphaPlayers.length})</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(2, 132, 199, 0.25)', color: '#94a3b8', textAlign: 'center', fontSize: '0.72rem' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>OPERATIVE</th>
                    <th style={{ padding: '6px 8px' }}>SCORE</th>
                    <th style={{ padding: '6px 8px' }}>K</th>
                    <th style={{ padding: '6px 8px' }}>D</th>
                    <th style={{ padding: '6px 8px' }}>K/D</th>
                    <th style={{ padding: '6px 8px' }}>PING</th>
                  </tr>
                </thead>
                <tbody>
                  {alphaPlayers.map((p) => renderPlayerRow(p))}
                  {alphaPlayers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                        No operatives assigned
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Team Bravo (Red) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontWeight: 900, fontSize: '0.9rem', marginBottom: 8 }}>
                <Skull size={16} />
                <span>TEAM BRAVO ({bravoPlayers.length})</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(239, 68, 68, 0.25)', color: '#94a3b8', textAlign: 'center', fontSize: '0.72rem' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>OPERATIVE</th>
                    <th style={{ padding: '6px 8px' }}>SCORE</th>
                    <th style={{ padding: '6px 8px' }}>K</th>
                    <th style={{ padding: '6px 8px' }}>D</th>
                    <th style={{ padding: '6px 8px' }}>K/D</th>
                    <th style={{ padding: '6px 8px' }}>PING</th>
                  </tr>
                </thead>
                <tbody>
                  {bravoPlayers.map((p) => renderPlayerRow(p))}
                  {bravoPlayers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                        No operatives assigned
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Free For All Table */
          <div style={{ marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(168, 85, 247, 0.25)', color: '#cbd5e1', textAlign: 'center', fontSize: '0.75rem' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>OPERATIVE</th>
                  <th style={{ padding: '8px 10px' }}>SCORE</th>
                  <th style={{ padding: '8px 10px' }}>KILLS</th>
                  <th style={{ padding: '8px 10px' }}>DEATHS</th>
                  <th style={{ padding: '8px 10px' }}>K/D</th>
                  <th style={{ padding: '8px 10px' }}>PING</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, idx) => renderPlayerRow(p, idx + 1))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
          PRESS [TAB] OR CLICK OUTSIDE TO CLOSE SCOREBOARD
        </div>
      </div>
    </div>
  );
};

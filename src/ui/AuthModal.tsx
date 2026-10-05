import React, { useState } from 'react';
import {
  User,
  UserPlus,
  Users,
  KeyRound,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  X,
  Trash2,
  LogIn,
  Sparkles,
  Flame
} from 'lucide-react';
import { userManager } from '../game/managers/UserManager';
import { AVATAR_OPTIONS, UserProfile } from '../types/user';
import { soundManager } from '../audio/SoundManager';

interface AuthModalProps {
  onClose: () => void;
  onUserChanged: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onUserChanged }) => {
  const [activeTab, setActiveTab] = useState<'switch' | 'login' | 'register'>('switch');
  const [usersList, setUsersList] = useState<UserProfile[]>(() => userManager.getAllUsers());
  const currentUser = userManager.getCurrentUser();

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState(AVATAR_OPTIONS[0].id);

  // Status feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleTabChange = (tab: 'switch' | 'login' | 'register') => {
    soundManager.playClick(0, 1600, 0.2);
    clearMessages();
    setActiveTab(tab);
    setUsersList(userManager.getAllUsers());
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setErrorMsg('Please enter both codename and PIN/password.');
      return;
    }

    const res = userManager.login(loginUsername, loginPassword);
    if (res.success && res.user) {
      soundManager.playPowerup();
      setSuccessMsg(res.message);
      onUserChanged(res.user);
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      soundManager.playEmptyClick();
      setErrorMsg(res.message);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const selectedAvatar = AVATAR_OPTIONS.find(a => a.id === selectedAvatarId);
    const res = userManager.register(
      regUsername,
      regPassword,
      selectedAvatar?.id,
      selectedAvatar?.color
    );

    if (res.success && res.user) {
      soundManager.playPowerup();
      setSuccessMsg(res.message);
      setUsersList(userManager.getAllUsers());
      onUserChanged(res.user);
      setTimeout(() => {
        onClose();
      }, 800);
    } else {
      soundManager.playEmptyClick();
      setErrorMsg(res.message);
    }
  };

  const handleQuickSwitch = (userId: string) => {
    if (userId === currentUser.id) return;
    soundManager.playPowerup();
    userManager.switchUser(userId);
    const updated = userManager.getCurrentUser();
    onUserChanged(updated);
    setUsersList(userManager.getAllUsers());
    setSuccessMsg(`Switched operative to ${updated.username}`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleDeleteUser = (userId: string, username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete profile "${username}"? This cannot be undone.`)) {
      return;
    }
    const res = userManager.deleteUser(userId);
    if (res.success) {
      soundManager.playClick(0, 800, 0.3);
      setUsersList(userManager.getAllUsers());
      onUserChanged(userManager.getCurrentUser());
      setSuccessMsg(res.message);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 120,
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
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          background: 'rgba(255, 255, 255, 0.97)',
          border: '2px solid rgba(2, 132, 199, 0.5)',
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(2, 132, 199, 0.25)',
          padding: 'clamp(16px, 3vw, 28px)',
          gap: 16
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '0.04em' }}>
                OPERATIVE TERMINAL
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
                AUTHENTICATION & PROFILE MANAGEMENT
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            background: 'rgba(15, 23, 42, 0.05)',
            padding: 4,
            borderRadius: 12,
            border: '1px solid rgba(15, 23, 42, 0.08)'
          }}
        >
          <button
            onClick={() => handleTabChange('switch')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'switch' ? '#0284c7' : 'transparent',
              color: activeTab === 'switch' ? '#ffffff' : '#475569',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={15} />
            SAVED OPERATIVES ({usersList.length})
          </button>

          <button
            onClick={() => handleTabChange('login')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'login' ? '#0284c7' : 'transparent',
              color: activeTab === 'login' ? '#ffffff' : '#475569',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <LogIn size={15} />
            LOGIN
          </button>

          <button
            onClick={() => handleTabChange('register')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'register' ? '#0284c7' : 'transparent',
              color: activeTab === 'register' ? '#ffffff' : '#475569',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <UserPlus size={15} />
            REGISTER NEW
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div
            style={{
              padding: '8px 14px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1.5px solid #ef4444',
              borderRadius: 10,
              color: '#dc2626',
              fontSize: '0.76rem',
              fontFamily: 'var(--font-sub)',
              fontWeight: 700
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '8px 14px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1.5px solid #10b981',
              borderRadius: 10,
              color: '#059669',
              fontSize: '0.76rem',
              fontFamily: 'var(--font-sub)',
              fontWeight: 700
            }}
          >
            {successMsg}
          </div>
        )}

        {/* --- TAB 1: SAVED OPERATIVES LIST --- */}
        {activeTab === 'switch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                SELECT ACTIVE PROFILE FOR COMBAT DEPLOYMENT:
              </span>
              <button
                onClick={() => handleTabChange('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284c7',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                + ADD NEW USER
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 310, overflowY: 'auto' }}>
              {usersList.map((u) => {
                const isCurrent = u.id === currentUser.id;
                const avatar = AVATAR_OPTIONS.find(a => a.id === u.avatarId) || AVATAR_OPTIONS[0];

                return (
                  <div
                    key={u.id}
                    onClick={() => handleQuickSwitch(u.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: isCurrent ? '2px solid #0284c7' : '1px solid rgba(15, 23, 42, 0.1)',
                      background: isCurrent ? 'rgba(2, 132, 199, 0.08)' : 'rgba(248, 250, 252, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: isCurrent ? 'default' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Avatar Icon */}
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: `linear-gradient(135deg, ${avatar.color}, ${avatar.accentColor})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                          boxShadow: `0 2px 8px ${avatar.color}44`
                        }}
                      >
                        <User size={20} strokeWidth={2.4} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.88rem', color: '#0f172a' }}>
                            {u.username}
                          </span>
                          {isCurrent && (
                            <span style={{ background: '#0284c7', color: '#ffffff', fontSize: '0.58rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                              ACTIVE
                            </span>
                          )}
                          <span style={{ background: 'rgba(15, 23, 42, 0.08)', color: '#475569', fontSize: '0.58rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                            {u.tier.replace('_', ' ')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.68rem', color: '#64748b', marginTop: 3 }}>
                          <span>
                            HIGH SCORE: <strong style={{ color: '#0284c7' }}>{u.highScore.toLocaleString()}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            WAVE: <strong style={{ color: '#f97316' }}>{u.highestWave}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            KILLS: <strong>{u.totalKills}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!isCurrent && (
                        <button
                          onClick={() => handleQuickSwitch(u.id)}
                          style={{
                            background: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          DEPLOY AS
                        </button>
                      )}

                      {usersList.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteUser(u.id, u.username, e)}
                          title="Delete profile"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 6,
                            borderRadius: 6
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TAB 2: LOGIN --- */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#334155', marginBottom: 5 }}>
                OPERATIVE CODENAME / USERNAME
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} color="#64748b" style={{ position: 'absolute', left: 12 }} />
                <input
                  type="text"
                  placeholder="Enter codename (e.g. ApexSoldier)"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(15, 23, 42, 0.15)',
                    fontFamily: 'var(--font-sub)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'rgba(248, 250, 252, 0.8)'
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#334155', marginBottom: 5 }}>
                SECURITY PIN / PASSWORD
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <KeyRound size={16} color="#64748b" style={{ position: 'absolute', left: 12 }} />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Enter your secret PIN"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(15, 23, 42, 0.15)',
                    fontFamily: 'var(--font-sub)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'rgba(248, 250, 252, 0.8)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 4
                  }}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-cyber btn-cyber-primary"
              style={{
                padding: '12px 20px',
                fontSize: '0.90rem',
                justifyContent: 'center',
                marginTop: 6
              }}
            >
              <LogIn size={16} />
              AUTHENTICATE & LOG IN
            </button>
          </form>
        )}

        {/* --- TAB 3: REGISTER NEW OPERATIVE --- */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#334155', marginBottom: 5 }}>
                NEW OPERATIVE CODENAME (3-16 CHARACTERS)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} color="#64748b" style={{ position: 'absolute', left: 12 }} />
                <input
                  type="text"
                  placeholder="e.g. CyberVanguard"
                  maxLength={16}
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(15, 23, 42, 0.15)',
                    fontFamily: 'var(--font-sub)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'rgba(248, 250, 252, 0.8)'
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#334155', marginBottom: 5 }}>
                SECURITY PIN / PASSWORD
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <KeyRound size={16} color="#64748b" style={{ position: 'absolute', left: 12 }} />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  placeholder="Set an operative PIN or password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 38px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(15, 23, 42, 0.15)',
                    fontFamily: 'var(--font-sub)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    background: 'rgba(248, 250, 252, 0.8)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 4
                  }}
                >
                  {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Avatar Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                CHOOSE COMBAT SPECIALIZATION & AVATAR:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                {AVATAR_OPTIONS.map((a) => {
                  const isSelected = a.id === selectedAvatarId;
                  return (
                    <div
                      key={a.id}
                      onClick={() => setSelectedAvatarId(a.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: isSelected ? `2px solid ${a.color}` : '1.5px solid rgba(15, 23, 42, 0.1)',
                        background: isSelected ? `${a.color}15` : 'rgba(248, 250, 252, 0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: `linear-gradient(135deg, ${a.color}, ${a.accentColor})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff'
                        }}
                      >
                        <User size={18} />
                      </div>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                        {a.tag}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="btn-cyber btn-cyber-primary"
              style={{
                padding: '12px 20px',
                fontSize: '0.90rem',
                justifyContent: 'center',
                marginTop: 6
              }}
            >
              <Sparkles size={16} />
              ENLIST & CREATE OPERATIVE
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

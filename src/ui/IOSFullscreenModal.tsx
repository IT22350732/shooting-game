import React from 'react';
import { X, Share, PlusSquare, Smartphone, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { enableVirtualFullscreen } from '../utils/fullscreen';

interface IOSFullscreenModalProps {
  onClose: () => void;
}

export const IOSFullscreenModal: React.FC<IOSFullscreenModalProps> = ({ onClose }) => {
  const handleEnterCompact = () => {
    enableVirtualFullscreen();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(12px, 3vw, 24px)',
        overflowY: 'auto'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 540,
          maxHeight: '94dvh',
          borderRadius: 20,
          border: '2px solid rgba(2, 132, 199, 0.45)',
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(15, 23, 42, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(56, 189, 248, 0.04))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)'
              }}
            >
              <Smartphone size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#0284c7', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.12em' }}>
                APPLE IOS SAFARI PROTOCOL
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: '#0f172a', fontWeight: 900, margin: 0 }}>
                IPHONE FULLSCREEN GUIDE
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(15, 23, 42, 0.06)',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: 'clamp(14px, 3vw, 22px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Explanation Alert */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10
            }}
          >
            <Sparkles size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontFamily: 'var(--font-sub)', fontSize: '0.85rem', color: '#0f172a', lineHeight: 1.35, margin: 0 }}>
              Apple Safari blocks web pages from removing the bottom URL bar automatically. Follow either method below for the optimal fullscreen experience:
            </p>
          </div>

          {/* METHOD 1: STANDALONE HOME SCREEN (BEST) */}
          <div
            className="glass-panel"
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              border: '1.5px solid #0284c7',
              background: 'rgba(2, 132, 199, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.68rem', background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                  RECOMMENDED
                </span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  100% Borderless App (Zero Bars)
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Share size={15} />
                </div>
                <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.86rem', color: '#334155', fontWeight: 600 }}>
                  1. Tap the <strong>Share</strong> button <Share size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> at the bottom of Safari
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PlusSquare size={15} />
                </div>
                <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.86rem', color: '#334155', fontWeight: 600 }}>
                  2. Scroll down and tap <strong>"Add to Home Screen"</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={16} />
                </div>
                <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.86rem', color: '#059669', fontWeight: 700 }}>
                  3. Launch from your Home Screen for complete borderless fullscreen!
                </span>
              </div>
            </div>
          </div>

          {/* METHOD 2: IN-SAFARI QUICK HACKS */}
          <div
            className="glass-panel"
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              border: '1px solid rgba(15, 23, 42, 0.1)',
              background: 'rgba(248, 250, 252, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              ⚡ In-Safari Quick Options:
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#0284c7', fontWeight: 800 }}>•</span>
                <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.82rem', color: '#475569' }}>
                  <strong>Hide Toolbar:</strong> Tap the <strong>"aA"</strong> button on the left of Safari's address bar, then select <strong>"Hide Toolbar"</strong>.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#0284c7', fontWeight: 800 }}>•</span>
                <span style={{ fontFamily: 'var(--font-sub)', fontSize: '0.82rem', color: '#475569' }}>
                  <strong>Landscape Orientation:</strong> Rotate your iPhone sideways — Safari automatically shrinks its top and bottom bars into compact mode.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(15, 23, 42, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.95)'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-sub)', fontWeight: 600 }}>
            CYBERSTRIKE APEX ARENA
          </span>
          <button
            onClick={handleEnterCompact}
            className="btn-cyber btn-cyber-primary"
            style={{ padding: '10px 20px', fontSize: '0.88rem' }}
          >
            CONTINUE PLAYING
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

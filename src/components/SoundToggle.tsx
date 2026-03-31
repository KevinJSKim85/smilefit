import { useState, useCallback } from 'react';
import { soundManager } from '../audio/SoundManager';

/**
 * Universal sound on/off toggle — renders on every screen.
 * Frosted glass circle with speaker icon, fixed top-right.
 * Persists mute state to localStorage via SoundManager.
 */
export default function SoundToggle() {
  const [muted, setMuted] = useState(() => soundManager.isMuted());

  const toggle = useCallback(() => {
    const next = !muted;
    soundManager.setMuted(next);
    setMuted(next);
    // Play a soft click when turning sound ON
    if (!next) {
      soundManager.play('buttonClick', 0.5);
    }
  }, [muted]);

  return (
    <button
      onClick={toggle}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '1px solid rgba(0,0,0,0.08)',
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'background 0.2s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.75)';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.55)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: muted ? '#9C9CA8' : '#1A1A2E' }}
      >
        {/* Speaker body */}
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {muted ? (
          <>
            {/* X for muted */}
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        ) : (
          <>
            {/* Sound waves */}
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        )}
      </svg>
    </button>
  );
}

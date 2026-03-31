import { useEffect, useState } from 'react';

export type DemoVariant = 'smile-balloon' | 'left-wink' | 'right-wink' | 'smile-rotate' | 'double-wink-drop';

interface MiniGameDemoProps {
  variant: DemoVariant;
  isActive: boolean;
}

/**
 * Pure SVG + CSS mini-demo that visualises a face control.
 * `isActive` toggles animation state (e.g. balloon floats up when true).
 */
export function MiniGameDemo({ variant, isActive }: MiniGameDemoProps) {
  switch (variant) {
    case 'smile-balloon':
      return <SmileBalloon isActive={isActive} />;
    case 'left-wink':
      return <WinkMove direction="left" isActive={isActive} />;
    case 'right-wink':
      return <WinkMove direction="right" isActive={isActive} />;
    case 'smile-rotate':
      return <SmileRotate isActive={isActive} />;
    case 'double-wink-drop':
      return <DoubleWinkDrop isActive={isActive} />;
  }
}

// ─── Smile Balloon ──────────────────────────────────────

function SmileBalloon({ isActive }: { isActive: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Clouds */}
      <ellipse cx="25" cy="30" rx="18" ry="8" fill="rgba(0,0,0,0.04)" />
      <ellipse cx="90" cy="45" rx="15" ry="6" fill="rgba(0,0,0,0.04)" />

      {/* Balloon + string move as one unit */}
      <g style={{ transform: `translateY(${isActive ? -20 : 0}px)`, transition: 'transform 0.6s ease-out' }}>
        <ellipse cx="60" cy="55" rx="16" ry="20" fill="var(--accent-balloon)" />
        <polygon points="54,73 60,80 66,73" fill="var(--accent-balloon)" />
        {/* Highlight */}
        <ellipse cx="53" cy="48" rx="4" ry="6" fill="rgba(255,255,255,0.35)" />
        {/* String */}
        <line x1="60" y1="80" x2="60" y2="105" stroke="var(--text-muted)" strokeWidth="1" />
      </g>

      {/* Ground */}
      <rect x="0" y="110" width="120" height="10" rx="2" fill="rgba(0,0,0,0.04)" />
    </svg>
  );
}

// ─── Wink Move (left/right) ─────────────────────────────

function WinkMove({ direction, isActive }: { direction: 'left' | 'right'; isActive: boolean }) {
  const offset = isActive ? (direction === 'left' ? -20 : 20) : 0;

  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`v${i}`} x1={20 + i * 20} y1="20" x2={20 + i * 20} y2="100" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`h${i}`} x1="20" y1={20 + i * 20} x2="100" y2={20 + i * 20} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      ))}

      {/* T-piece */}
      <g style={{ transform: `translateX(${offset}px)`, transition: 'transform 0.4s ease-out' }}>
        <rect x="40" y="40" width="18" height="18" rx="3" fill="var(--accent-tetris)" />
        <rect x="60" y="40" width="18" height="18" rx="3" fill="var(--accent-tetris)" />
        <rect x="20" y="40" width="18" height="18" rx="3" fill="var(--accent-tetris)" />
        <rect x="40" y="20" width="18" height="18" rx="3" fill="var(--accent-tetris)" />
      </g>

      {/* Arrow indicator */}
      <g style={{ opacity: isActive ? 1 : 0.3, transition: 'opacity 0.3s' }}>
        {direction === 'left' ? (
          <polygon points="8,60 18,52 18,68" fill="var(--accent-teal)" />
        ) : (
          <polygon points="112,60 102,52 102,68" fill="var(--accent-teal)" />
        )}
      </g>
    </svg>
  );
}

// ─── Smile Rotate ───────────────────────────────────────

function SmileRotate({ isActive }: { isActive: boolean }) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isActive) {
      setRotation((r) => r + 90);
    }
  }, [isActive]);

  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`v${i}`} x1={20 + i * 20} y1="20" x2={20 + i * 20} y2="100" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`h${i}`} x1="20" y1={20 + i * 20} x2="100" y2={20 + i * 20} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      ))}

      {/* L-piece rotating around center */}
      <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '60px 50px', transition: 'transform 0.4s ease-out' }}>
        <rect x="41" y="31" width="18" height="18" rx="3" fill="var(--accent-balloon)" />
        <rect x="41" y="51" width="18" height="18" rx="3" fill="var(--accent-balloon)" />
        <rect x="61" y="51" width="18" height="18" rx="3" fill="var(--accent-balloon)" />
        <rect x="61" y="31" width="18" height="18" rx="3" fill="var(--accent-balloon)" />
      </g>

      {/* Rotation arrow */}
      <path
        d="M90,30 A30,30 0 0,1 90,70"
        fill="none" stroke="var(--accent-teal)" strokeWidth="2" strokeDasharray="4,3"
        style={{ opacity: isActive ? 1 : 0.3, transition: 'opacity 0.3s' }}
      />
      <polygon
        points="88,70 94,70 91,76"
        fill="var(--accent-teal)"
        style={{ opacity: isActive ? 1 : 0.3, transition: 'opacity 0.3s' }}
      />
    </svg>
  );
}

// ─── Double Wink Drop ───────────────────────────────────

function DoubleWinkDrop({ isActive }: { isActive: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`v${i}`} x1={20 + i * 20} y1="20" x2={20 + i * 20} y2="100" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`h${i}`} x1="20" y1={20 + i * 20} x2="100" y2={20 + i * 20} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      ))}

      {/* Existing blocks at bottom */}
      <rect x="20" y="80" width="18" height="18" rx="3" fill="rgba(0,0,0,0.08)" />
      <rect x="40" y="80" width="18" height="18" rx="3" fill="rgba(0,0,0,0.08)" />
      <rect x="80" y="80" width="18" height="18" rx="3" fill="rgba(0,0,0,0.08)" />

      {/* Falling I-piece */}
      <g style={{
        transform: `translateY(${isActive ? 40 : 0}px) scaleY(${isActive ? 0.95 : 1})`,
        transformOrigin: '60px 100px',
        transition: isActive ? 'transform 0.25s ease-in' : 'transform 0.6s ease-out',
      }}>
        <rect x="41" y="21" width="18" height="18" rx="3" fill="var(--accent-tetris)" />
        <rect x="61" y="21" width="18" height="18" rx="3" fill="var(--accent-tetris)" />
        <rect x="41" y="41" width="18" height="18" rx="3" fill="var(--accent-tetris)" />
        <rect x="61" y="41" width="18" height="18" rx="3" fill="var(--accent-tetris)" />
      </g>

      {/* Down arrows */}
      <g style={{ opacity: isActive ? 1 : 0.3, transition: 'opacity 0.3s' }}>
        <polygon points="55,108 60,115 65,108" fill="var(--accent-teal)" />
        <polygon points="55,100 60,107 65,100" fill="var(--accent-teal)" />
      </g>
    </svg>
  );
}

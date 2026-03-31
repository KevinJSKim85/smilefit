/**
 * Icon System — SVG icon registry with emoji fallback toggle.
 * Works like the i18n system: a code-level registry mapping semantic names to SVG components.
 * Toggle via USE_CUSTOM_ICONS. Screens consume <Icon name="..." size={N} />.
 */

export const USE_CUSTOM_ICONS = true;

// ─── SVG Icon Components ─────────────────────────────────

function SmileIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="smile-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#FFBF8A" />
          <stop offset="100%" stopColor="#E87461" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#smile-g)" />
      <path d="M15 19c0-1.5 1.2-2.5 2.5-2.5S20 17.5 20 19" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M28 19c0-1.5 1.2-2.5 2.5-2.5S33 17.5 33 19" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M14 28c2.5 5 7.5 7 10 7s7.5-2 10-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function WinkIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="wink-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#7DADE2" />
          <stop offset="100%" stopColor="#B49ADB" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#wink-g)" />
      <circle cx="17" cy="19" r="2.2" fill="#fff" />
      <path d="M27 19c1.5-1.8 4-1.8 5.5 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M14 28c2.5 5 7.5 7 10 7s7.5-2 10-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function BlinkIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="blink-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#C8A2E8" />
          <stop offset="100%" stopColor="#8B5DC8" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#blink-g)" />
      <path d="M13 20c1.5-1.8 4-1.8 5.5 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M29 20c1.5-1.8 4-1.8 5.5 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="31" rx="3" ry="2" fill="#fff" opacity="0.8" />
    </svg>
  );
}

function NeutralIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="neutral-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#5CC4B0" />
          <stop offset="100%" stopColor="#2BA89A" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#neutral-g)" />
      <circle cx="17" cy="19" r="2.2" fill="#fff" />
      <circle cx="31" cy="19" r="2.2" fill="#fff" />
      <line x1="17" y1="30" x2="31" y2="30" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function EyesIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 32" fill="none">
      <defs>
        <linearGradient id="eyes-g" x1="0" y1="0" x2="48" y2="32">
          <stop offset="0%" stopColor="#F0C040" />
          <stop offset="100%" stopColor="#D09020" />
        </linearGradient>
      </defs>
      <ellipse cx="14" cy="16" rx="10" ry="12" fill="url(#eyes-g)" />
      <ellipse cx="34" cy="16" rx="10" ry="12" fill="url(#eyes-g)" />
      <circle cx="16" cy="16" r="4" fill="#fff" />
      <circle cx="36" cy="16" r="4" fill="#fff" />
      <circle cx="17" cy="15" r="2" fill="#1A1A2E" />
      <circle cx="37" cy="15" r="2" fill="#1A1A2E" />
    </svg>
  );
}

function BalloonIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="balloon-g" x1="12" y1="4" x2="36" y2="36">
          <stop offset="0%" stopColor="#F06A8D" />
          <stop offset="100%" stopColor="#D44870" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="18" rx="14" ry="17" fill="url(#balloon-g)" />
      <ellipse cx="20" cy="12" rx="3" ry="4" fill="#fff" opacity="0.3" />
      <polygon points="21,34 27,34 24,39" fill="#D44870" />
      <path d="M24 39C22 41 26 43 24 45" stroke="#D44870" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function TetrisIcon({ size }: { size: number }) {
  // T-tetromino — 3 wide × 2 tall, centered and sized to fill the viewBox
  const b = 14;     // block size
  const g = 1;      // gap between blocks
  const ox = (48 - (3 * b + 2 * g)) / 2; // horizontal offset to center
  const oy = (48 - (2 * b + g)) / 2;     // vertical offset to center
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="tetris-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#9B7EDB" />
          <stop offset="100%" stopColor="#6B42B0" />
        </linearGradient>
      </defs>
      {/* Top center block */}
      <rect x={ox + b + g} y={oy} width={b} height={b} rx="3" fill="url(#tetris-g)" stroke="#fff" strokeWidth="0.5" strokeOpacity="0.3" />
      {/* Bottom row: left, center, right */}
      <rect x={ox} y={oy + b + g} width={b} height={b} rx="3" fill="url(#tetris-g)" stroke="#fff" strokeWidth="0.5" strokeOpacity="0.3" />
      <rect x={ox + b + g} y={oy + b + g} width={b} height={b} rx="3" fill="url(#tetris-g)" stroke="#fff" strokeWidth="0.5" strokeOpacity="0.3" />
      <rect x={ox + 2 * (b + g)} y={oy + b + g} width={b} height={b} rx="3" fill="url(#tetris-g)" stroke="#fff" strokeWidth="0.5" strokeOpacity="0.3" />
    </svg>
  );
}

function CheckIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="check-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#3DBF70" />
          <stop offset="100%" stopColor="#2BA89A" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#check-g)" />
      <path d="M14 24l7 7 13-14" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function WarningIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="warn-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#F0C040" />
          <stop offset="100%" stopColor="#E09020" />
        </linearGradient>
      </defs>
      <path d="M24 4L44 42H4L24 4z" fill="url(#warn-g)" rx="4" />
      <line x1="24" y1="18" x2="24" y2="30" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="36" r="2" fill="#fff" />
    </svg>
  );
}

function CelebrationIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="celeb-g" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#F0C040" />
          <stop offset="100%" stopColor="#2BA89A" />
        </linearGradient>
      </defs>
      <path d="M24 4l3 8 8-3-3 8 8 3-8 3 3 8-8-3-3 8-3-8-8 3 3-8-8-3 8-3-3-8 8 3z" fill="url(#celeb-g)" />
    </svg>
  );
}

function MedalIcon({ size, rank }: { size: number; rank: 1 | 2 | 3 }) {
  const colors = {
    1: { from: '#FFD700', to: '#DAA520' },
    2: { from: '#D0D0D0', to: '#A0A0A0' },
    3: { from: '#CD7F32', to: '#A0612B' },
  };
  const { from, to } = colors[rank];
  const id = `medal-${rank}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      {/* Ribbon */}
      <path d="M18 4l-6 18h6l6-18z" fill={from} opacity="0.6" />
      <path d="M30 4l6 18h-6l-6-18z" fill={from} opacity="0.6" />
      {/* Circle medal */}
      <circle cx="24" cy="30" r="14" fill={`url(#${id})`} />
      <circle cx="24" cy="30" r="10" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
      <text x="24" y="35" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">{rank}</text>
    </svg>
  );
}

// ─── Emoji fallback map ──────────────────────────────────

const EMOJI_MAP: Record<string, string> = {
  'face.smile': '\u{1F60A}',
  'face.wink': '\u{1F609}',
  'face.blink': '\u{1F62C}',
  'face.neutral': '\u{1F610}',
  'face.eyes': '\u{1F440}',
  'game.balloon': '\u{1F388}',
  'game.tetris': '\u{1F9F1}',
  'status.check': '\u{2705}',
  'status.warning': '\u{26A0}\u{FE0F}',
  'status.celebration': '\u{1F389}',
  'rank.1': '\u{1F947}',
  'rank.2': '\u{1F948}',
  'rank.3': '\u{1F949}',
};

// ─── SVG component map ───────────────────────────────────

type IconName = keyof typeof EMOJI_MAP;

function SvgIcon({ name, size }: { name: string; size: number }) {
  switch (name) {
    case 'face.smile': return <SmileIcon size={size} />;
    case 'face.wink': return <WinkIcon size={size} />;
    case 'face.blink': return <BlinkIcon size={size} />;
    case 'face.neutral': return <NeutralIcon size={size} />;
    case 'face.eyes': return <EyesIcon size={size} />;
    case 'game.balloon': return <BalloonIcon size={size} />;
    case 'game.tetris': return <TetrisIcon size={size} />;
    case 'status.check': return <CheckIcon size={size} />;
    case 'status.warning': return <WarningIcon size={size} />;
    case 'status.celebration': return <CelebrationIcon size={size} />;
    case 'rank.1': return <MedalIcon size={size} rank={1} />;
    case 'rank.2': return <MedalIcon size={size} rank={2} />;
    case 'rank.3': return <MedalIcon size={size} rank={3} />;
    default: return null;
  }
}

// ─── Public API ──────────────────────────────────────────

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  if (USE_CUSTOM_ICONS) {
    return (
      <span
        style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0 }}
        aria-hidden="true"
      >
        <SvgIcon name={name} size={size} />
      </span>
    );
  }

  return (
    <span
      style={{ fontSize: size * 0.75, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}
      aria-hidden="true"
    >
      {EMOJI_MAP[name] ?? ''}
    </span>
  );
}

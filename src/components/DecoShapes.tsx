/**
 * Decorative Shape System — Layer 3
 *
 * Abstract geometric shapes that float between the background blobs and glass cards.
 * Structural, intentional, "designed by a human" aesthetic.
 *
 * Shape primitives: HexDot, SoftDiamond, FloatingCross, GradientRing,
 *                   WavyRibbon, AbstractArc, DotGrid
 *
 * Uses existing CSS keyframes: floatDrift, floatDriftAlt, floatSpin
 */

import { memo } from 'react';

// ─── Types ────────────────────────────────────────────────

export type DecoVariant =
  | 'start' | 'gameSelect' | 'gameOverBalloon' | 'gameOverTetris'
  | 'nickname' | 'calibration' | 'tutorial' | 'countdown' | 'leaderboard';

interface ShapeBase {
  top?: string; bottom?: string; left?: string; right?: string;
}

interface AnimatedShape extends ShapeBase {
  type: 'hexDot' | 'softDiamond' | 'floatingCross';
  size: number;
  color: string;
  opacity: number;
  anim: 'floatDrift' | 'floatDriftAlt' | 'floatSpin';
  duration: string;
  delay: string;
  /** Optional secondary animation to combine (e.g., floatSpin for SoftDiamond) */
  anim2?: 'floatDrift' | 'floatDriftAlt' | 'floatSpin';
  duration2?: string;
}

interface StaticShape extends ShapeBase {
  type: 'gradientRing' | 'wavyRibbon' | 'abstractArc' | 'dotGrid';
  size: number;
  color1: string;
  color2: string;
  opacity: number;
  rotate?: number;
}

type ShapeDef = AnimatedShape | StaticShape;

// ─── Shape Renderers ─────────────────────────────────────

function HexDot({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <polygon
        points="16,2 28,9 28,23 16,30 4,23 4,9"
        fill={color}
        opacity={opacity}
      />
    </svg>
  );
}

function SoftDiamond({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  const r = size * 0.12;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: color,
        opacity,
        transform: 'rotate(45deg)',
      }}
    />
  );
}

function FloatingCross({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  const arm = size * 0.7;
  const thick = size * 0.28;
  return (
    <div style={{ width: size, height: size, position: 'relative', opacity }}>
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: arm, height: thick,
        borderRadius: thick / 2,
        backgroundColor: color,
        transform: 'translate(-50%, -50%)',
      }} />
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: thick, height: arm,
        borderRadius: thick / 2,
        backgroundColor: color,
        transform: 'translate(-50%, -50%)',
      }} />
    </div>
  );
}

function GradientRing({ size, color1, color2, opacity }: { size: number; color1: string; color2: string; opacity: number }) {
  const sw = Math.max(3, size * 0.05);
  const r = (size - sw) / 2;
  const id = `gr-${size}-${color1.replace('#', '')}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={sw}
        opacity={opacity}
      />
    </svg>
  );
}

function WavyRibbon({ size, color1, color2, opacity }: { size: number; color1: string; color2: string; opacity: number }) {
  const h = size * 0.3;
  const id = `wr-${size}-${color1.replace('#', '')}`;
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} aria-hidden="true" style={{ opacity }}>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      <path
        d={`M0,${h * 0.5} C${size * 0.2},${h * 0.1} ${size * 0.35},${h * 0.9} ${size * 0.5},${h * 0.5} S${size * 0.8},${h * 0.1} ${size},${h * 0.5}`}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AbstractArc({ size, color1, color2, opacity, rotate = 0 }: { size: number; color1: string; color2: string; opacity: number; rotate?: number }) {
  const sw = Math.max(4, size * 0.05);
  const r = (size - sw) / 2;
  const id = `aa-${size}-${color1.replace('#', '')}-${rotate}`;
  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ transform: `rotate(${rotate}deg)`, opacity }}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      <path
        d={`M${size / 2},${sw / 2} A${r},${r} 0 0 1 ${size - sw / 2},${size / 2}`}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </svg>
  );
}

function DotGrid({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  const gap = 20;
  const dotSize = 5;
  const cols = Math.floor(size / gap);
  const rows = Math.floor((size * 0.6) / gap);
  const dots: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push({ x: c * gap + gap / 2, y: r * gap + gap / 2 });
    }
  }
  return (
    <svg width={cols * gap} height={rows * gap} aria-hidden="true" style={{ opacity }}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={dotSize / 2} fill={color} />
      ))}
    </svg>
  );
}

// ─── Render dispatcher ───────────────────────────────────

function renderShape(shape: ShapeDef) {
  switch (shape.type) {
    case 'hexDot':
      return <HexDot size={shape.size} color={(shape as AnimatedShape).color} opacity={shape.opacity} />;
    case 'softDiamond':
      return <SoftDiamond size={shape.size} color={(shape as AnimatedShape).color} opacity={shape.opacity} />;
    case 'floatingCross':
      return <FloatingCross size={shape.size} color={(shape as AnimatedShape).color} opacity={shape.opacity} />;
    case 'gradientRing':
      return <GradientRing size={shape.size} color1={(shape as StaticShape).color1} color2={(shape as StaticShape).color2} opacity={shape.opacity} />;
    case 'wavyRibbon':
      return <WavyRibbon size={shape.size} color1={(shape as StaticShape).color1} color2={(shape as StaticShape).color2} opacity={shape.opacity} />;
    case 'abstractArc':
      return <AbstractArc size={shape.size} color1={(shape as StaticShape).color1} color2={(shape as StaticShape).color2} opacity={shape.opacity} rotate={(shape as StaticShape).rotate} />;
    case 'dotGrid':
      return <DotGrid size={shape.size} color={(shape as StaticShape).color1} opacity={shape.opacity} />;
  }
}

// ─── Color constants ─────────────────────────────────────

const TEAL = '#2BA89A';
const PINK = '#E9557E';
const PURPLE = '#7C5CC4';

// ─── Per-screen variant configurations ───────────────────

const VARIANTS: Record<DecoVariant, ShapeDef[]> = {
  // ═══ HERO SCREENS — Rich decoration ═══

  start: [
    { type: 'gradientRing', size: 120, color1: TEAL, color2: PINK, opacity: 0.18, top: '12%', left: '42%' },
    { type: 'hexDot', size: 22, color: TEAL, opacity: 0.4, anim: 'floatDrift', duration: '16s', delay: '0s', top: '6%', left: '5%' },
    { type: 'hexDot', size: 18, color: TEAL, opacity: 0.35, anim: 'floatDrift', duration: '18s', delay: '1s', top: '10%', left: '9%' },
    { type: 'hexDot', size: 26, color: TEAL, opacity: 0.4, anim: 'floatDrift', duration: '14s', delay: '2s', bottom: '8%', right: '6%' },
    { type: 'hexDot', size: 16, color: TEAL, opacity: 0.35, anim: 'floatDrift', duration: '20s', delay: '0.5s', bottom: '12%', right: '10%' },
    { type: 'softDiamond', size: 44, color: TEAL, opacity: 0.35, anim: 'floatDriftAlt', duration: '20s', delay: '1s', anim2: 'floatSpin', duration2: '24s', top: '25%', right: '7%' },
    { type: 'softDiamond', size: 32, color: PINK, opacity: 0.3, anim: 'floatDriftAlt', duration: '22s', delay: '3s', anim2: 'floatSpin', duration2: '26s', bottom: '30%', left: '4%' },
    { type: 'floatingCross', size: 28, color: TEAL, opacity: 0.35, anim: 'floatDrift', duration: '15s', delay: '2s', top: '50%', left: '3%' },
    { type: 'floatingCross', size: 24, color: PINK, opacity: 0.3, anim: 'floatDrift', duration: '18s', delay: '4s', bottom: '20%', right: '4%' },
    { type: 'abstractArc', size: 100, color1: TEAL, color2: PINK, opacity: 0.4, bottom: '4%', left: '3%', rotate: 180 },
    { type: 'dotGrid', size: 200, color1: TEAL, color2: TEAL, opacity: 0.25, top: '60%', right: '5%' },
    { type: 'wavyRibbon', size: 350, color1: TEAL, color2: PINK, opacity: 0.35, top: '75%', left: '8%' },
  ],

  gameSelect: [
    { type: 'softDiamond', size: 40, color: PINK, opacity: 0.35, anim: 'floatDriftAlt', duration: '18s', delay: '0s', anim2: 'floatSpin', duration2: '22s', top: '15%', left: '5%' },
    { type: 'hexDot', size: 20, color: PINK, opacity: 0.4, anim: 'floatDrift', duration: '16s', delay: '1s', top: '8%', left: '8%' },
    { type: 'hexDot', size: 16, color: PINK, opacity: 0.35, anim: 'floatDrift', duration: '14s', delay: '2s', bottom: '15%', left: '6%' },
    { type: 'floatingCross', size: 24, color: PINK, opacity: 0.3, anim: 'floatDrift', duration: '20s', delay: '3s', top: '55%', left: '3%' },
    { type: 'softDiamond', size: 38, color: PURPLE, opacity: 0.35, anim: 'floatDriftAlt', duration: '20s', delay: '1s', anim2: 'floatSpin', duration2: '24s', top: '12%', right: '5%' },
    { type: 'hexDot', size: 22, color: PURPLE, opacity: 0.4, anim: 'floatDrift', duration: '15s', delay: '0s', top: '10%', right: '9%' },
    { type: 'hexDot', size: 18, color: PURPLE, opacity: 0.35, anim: 'floatDrift', duration: '17s', delay: '2s', bottom: '12%', right: '7%' },
    { type: 'floatingCross', size: 22, color: PURPLE, opacity: 0.3, anim: 'floatDrift', duration: '19s', delay: '4s', top: '60%', right: '4%' },
    { type: 'gradientRing', size: 80, color1: PINK, color2: PURPLE, opacity: 0.4, top: '4%', left: '15%' },
    { type: 'gradientRing', size: 70, color1: PURPLE, color2: TEAL, opacity: 0.35, bottom: '6%', right: '12%' },
    { type: 'wavyRibbon', size: 280, color1: PINK, color2: PURPLE, opacity: 0.3, top: '45%', left: '25%' },
    { type: 'abstractArc', size: 90, color1: TEAL, color2: PINK, opacity: 0.35, bottom: '3%', left: '42%', rotate: 270 },
  ],

  gameOverBalloon: [
    { type: 'gradientRing', size: 120, color1: PINK, color2: TEAL, opacity: 0.4, top: '18%', left: '35%' },
    { type: 'gradientRing', size: 90, color1: PINK, color2: PURPLE, opacity: 0.35, top: '22%', left: '45%' },
    { type: 'hexDot', size: 24, color: PINK, opacity: 0.4, anim: 'floatDrift', duration: '14s', delay: '0s', top: '8%', left: '10%' },
    { type: 'hexDot', size: 20, color: PINK, opacity: 0.35, anim: 'floatDrift', duration: '16s', delay: '1s', top: '10%', right: '12%' },
    { type: 'softDiamond', size: 36, color: PINK, opacity: 0.35, anim: 'floatDriftAlt', duration: '18s', delay: '2s', anim2: 'floatSpin', duration2: '22s', bottom: '15%', left: '8%' },
    { type: 'softDiamond', size: 30, color: TEAL, opacity: 0.3, anim: 'floatDriftAlt', duration: '20s', delay: '0s', anim2: 'floatSpin', duration2: '24s', bottom: '10%', right: '10%' },
    { type: 'floatingCross', size: 22, color: PINK, opacity: 0.3, anim: 'floatDrift', duration: '17s', delay: '3s', top: '60%', left: '5%' },
  ],

  gameOverTetris: [
    { type: 'gradientRing', size: 120, color1: PURPLE, color2: TEAL, opacity: 0.4, top: '18%', left: '35%' },
    { type: 'gradientRing', size: 90, color1: PURPLE, color2: PINK, opacity: 0.35, top: '22%', left: '45%' },
    { type: 'hexDot', size: 24, color: PURPLE, opacity: 0.4, anim: 'floatDrift', duration: '14s', delay: '0s', top: '8%', left: '10%' },
    { type: 'hexDot', size: 20, color: PURPLE, opacity: 0.35, anim: 'floatDrift', duration: '16s', delay: '1s', top: '10%', right: '12%' },
    { type: 'softDiamond', size: 36, color: PURPLE, opacity: 0.35, anim: 'floatDriftAlt', duration: '18s', delay: '2s', anim2: 'floatSpin', duration2: '22s', bottom: '15%', left: '8%' },
    { type: 'softDiamond', size: 30, color: TEAL, opacity: 0.3, anim: 'floatDriftAlt', duration: '20s', delay: '0s', anim2: 'floatSpin', duration2: '24s', bottom: '10%', right: '10%' },
    { type: 'floatingCross', size: 22, color: PURPLE, opacity: 0.3, anim: 'floatDrift', duration: '17s', delay: '3s', top: '60%', left: '5%' },
  ],

  // ═══ FOCUS SCREENS — Light decoration (2-4 elements) ═══

  nickname: [
    { type: 'hexDot', size: 20, color: TEAL, opacity: 0.3, anim: 'floatDrift', duration: '18s', delay: '0s', top: '8%', right: '8%' },
    { type: 'hexDot', size: 16, color: TEAL, opacity: 0.3, anim: 'floatDrift', duration: '20s', delay: '1s', top: '12%', right: '14%' },
    { type: 'gradientRing', size: 70, color1: TEAL, color2: TEAL, opacity: 0.4, bottom: '10%', left: '6%' },
  ],

  calibration: [
    { type: 'abstractArc', size: 80, color1: TEAL, color2: TEAL, opacity: 0.4, bottom: '6%', left: '4%', rotate: 180 },
    { type: 'hexDot', size: 18, color: TEAL, opacity: 0.3, anim: 'floatDrift', duration: '16s', delay: '0s', top: '6%', right: '6%' },
    { type: 'hexDot', size: 16, color: TEAL, opacity: 0.3, anim: 'floatDrift', duration: '18s', delay: '1s', top: '10%', right: '10%' },
  ],

  tutorial: [
    { type: 'dotGrid', size: 160, color1: TEAL, color2: TEAL, opacity: 0.2, bottom: '8%', right: '5%' },
    { type: 'gradientRing', size: 60, color1: TEAL, color2: TEAL, opacity: 0.4, top: '6%', left: '5%' },
  ],

  countdown: [],

  leaderboard: [
    { type: 'hexDot', size: 20, color: TEAL, opacity: 0.3, anim: 'floatDrift', duration: '16s', delay: '0s', top: '4%', left: '8%' },
    { type: 'hexDot', size: 16, color: TEAL, opacity: 0.3, anim: 'floatDrift', duration: '18s', delay: '1s', top: '8%', left: '12%' },
    { type: 'dotGrid', size: 180, color1: TEAL, color2: TEAL, opacity: 0.2, top: '25%', right: '3%' },
  ],
};

// ─── Component ───────────────────────────────────────────

export const DecoShapes = memo(function DecoShapes({
  variant,
  countdownScale,
}: {
  variant: DecoVariant;
  countdownScale?: number;
}) {
  const shapes = VARIANTS[variant];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }} aria-hidden="true">
      {shapes.map((shape, i) => {
        const isAnimated = shape.type === 'hexDot' || shape.type === 'softDiamond' || shape.type === 'floatingCross';
        const aShape = shape as AnimatedShape;

        const isCountdownRing = variant === 'countdown' && shape.type === 'gradientRing';
        const ringScale = isCountdownRing && countdownScale != null
          ? 0.6 + countdownScale * 0.4
          : undefined;

        const needsCenter = shape.left === '50%' && shape.top === '50%';

        return (
          <div
            key={i}
            className="absolute"
            style={{
              top: shape.top,
              bottom: shape.bottom,
              left: shape.left,
              right: shape.right,
              ...(needsCenter ? { transform: `translate(-50%, -50%)${ringScale != null ? ` scale(${ringScale})` : ''}`, transition: 'transform 0.6s ease-out' } : {}),
              ...(!needsCenter && ringScale != null ? { transform: `scale(${ringScale})`, transition: 'transform 0.6s ease-out' } : {}),
              ...(isAnimated ? { animation: `${aShape.anim} ${aShape.duration} ease-in-out ${aShape.delay} infinite${aShape.anim2 ? `, ${aShape.anim2} ${aShape.duration2 || aShape.duration} ease-in-out ${aShape.delay} infinite` : ''}` } : {}),
            }}
          >
            {renderShape(shape)}
          </div>
        );
      })}
    </div>
  );
});

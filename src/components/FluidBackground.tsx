import { memo } from 'react';

// ─── Variant type ─────────────────────────────────────────
export type FluidVariant =
  | 'start' | 'nickname' | 'calibration' | 'gameSelect'
  | 'countdownBalloon' | 'countdownTetris'
  | 'tutorialBalloon' | 'tutorialTetris'
  | 'gameOverBalloon' | 'gameOverTetris'
  | 'leaderboardBalloon' | 'leaderboardTetris';

interface Props {
  variant: FluidVariant;
  /** Celebration pulse — temporarily boosts opacity + scale on all blobs */
  pulse?: boolean;
  /** 0–1 opacity multiplier (countdown build-up). Default 1. */
  intensity?: number;
}

// ─── Blob configuration types ──────────────────────────────
interface BlobDef {
  c: [string, string];   // radial-gradient colors (center → edge)
  s: string;             // CSS size: min(Xpx, Yvw)
  bl: number;            // blur px
  o: number;             // base opacity
  t?: string; l?: string; b?: string; r?: string; // position
  d: number;             // drift animation index 1-4
  dd: number;            // drift duration (s)
  md: number;            // morph duration (s)
}

interface MixBlobDef {
  c: string;             // rgba color
  s: string;             // CSS size
  bl: number;            // blur px
  t?: string; l?: string; b?: string; r?: string;
  o: number;             // orbit index 1-2
  od: number;            // orbit duration (s)
  md: number;            // morph duration (s)
}

interface VariantDef {
  g: string;             // CSS gradient for base layer
  blobs: BlobDef[];
  mix?: MixBlobDef[];    // Layer 3 — multiply blobs (Tier 1 only)
}

// ─── Variant configurations ──────────────────────────────────
// Target: blur 45-65px, opacity 0.40-0.65, medium-bright colors

const V: Record<FluidVariant, VariantDef> = {
  // ════ Tier 1: Full atmosphere (all 5 layers) ════

  start: {
    g: 'linear-gradient(to bottom, #F0F7FF, #FFF8F5)',
    blobs: [
      { c: ['#D4EEFF', '#C0ECEF'], s: 'min(600px, 80vw)', bl: 55, o: 0.60, t: '5%',  l: '5%',  d: 1, dd: 22, md: 22 },
      { c: ['#F0A0B8', '#FADCE5'], s: 'min(450px, 60vw)', bl: 50, o: 0.48, t: '35%', r: '5%',  d: 2, dd: 26, md: 24 },
      { c: ['#E8DFFF', '#F0EAFF'], s: 'min(420px, 60vw)', bl: 60, o: 0.55, b: '12%', l: '20%', d: 3, dd: 20, md: 23 },
      { c: ['#FFF0D0', '#FFE8D4'], s: 'min(350px, 50vw)', bl: 45, o: 0.50, b: '28%', l: '35%', d: 4, dd: 24, md: 25 },
    ],
    mix: [
      { c: 'rgba(170,200,255,0.42)', s: 'min(650px, 85vw)', bl: 65, t: '10%', l: '8%',  o: 1, od: 38, md: 28 },
      { c: 'rgba(255,180,210,0.38)', s: 'min(550px, 75vw)', bl: 60, b: '5%',  r: '5%',  o: 2, od: 48, md: 32 },
    ],
  },

  gameSelect: {
    g: 'linear-gradient(to right, #F0F7FF, #F5F2FF)',
    blobs: [
      { c: ['#D4EEFF', '#FADCE5'], s: 'min(550px, 70vw)', bl: 55, o: 0.58, t: '8%',  l: '3%',  d: 1, dd: 24, md: 22 },
      { c: ['#C4B0E8', '#E8DFFF'], s: 'min(500px, 65vw)', bl: 55, o: 0.48, t: '10%', r: '3%',  d: 2, dd: 28, md: 24 },
      { c: ['#C8EDE8', '#B8E4DD'], s: 'min(320px, 45vw)', bl: 50, o: 0.45, b: '20%', l: '30%', d: 3, dd: 22, md: 23 },
    ],
    mix: [
      { c: 'rgba(255,180,210,0.38)', s: 'min(500px, 65vw)', bl: 60, t: '15%', l: '5%',  o: 1, od: 42, md: 30 },
      { c: 'rgba(200,185,255,0.38)', s: 'min(500px, 65vw)', bl: 60, t: '15%', r: '5%',  o: 2, od: 46, md: 32 },
    ],
  },

  gameOverBalloon: {
    g: 'linear-gradient(to bottom, #F0F7FF, #FFF8F5)',
    blobs: [
      { c: ['#D4EEFF', '#E8F4FD'], s: 'min(550px, 70vw)', bl: 55, o: 0.58, t: '5%',  l: '8%',  d: 1, dd: 22, md: 22 },
      { c: ['#F0A0B8', '#FADCE5'], s: 'min(420px, 55vw)', bl: 50, o: 0.48, t: '30%', r: '10%', d: 2, dd: 26, md: 24 },
      { c: ['#FFF0D0', '#FFEAB8'], s: 'min(350px, 50vw)', bl: 45, o: 0.45, b: '15%', l: '25%', d: 3, dd: 24, md: 23 },
    ],
    mix: [
      { c: 'rgba(170,200,255,0.42)', s: 'min(600px, 80vw)', bl: 65, t: '10%', l: '5%', o: 1, od: 40, md: 28 },
    ],
  },

  gameOverTetris: {
    g: 'linear-gradient(to bottom, #F5F2FF, #FFF8F5)',
    blobs: [
      { c: ['#C4B0E8', '#E8DFFF'], s: 'min(500px, 65vw)', bl: 55, o: 0.48, t: '8%',  l: '5%',  d: 1, dd: 24, md: 22 },
      { c: ['#FFE8D4', '#FFF8F0'], s: 'min(450px, 60vw)', bl: 50, o: 0.55, t: '25%', r: '8%',  d: 2, dd: 28, md: 24 },
      { c: ['#D4F4F8', '#C0ECEF'], s: 'min(380px, 50vw)', bl: 45, o: 0.45, b: '12%', l: '22%', d: 3, dd: 22, md: 23 },
    ],
    mix: [
      { c: 'rgba(200,185,255,0.38)', s: 'min(550px, 70vw)', bl: 65, t: '15%', r: '10%', o: 2, od: 44, md: 30 },
    ],
  },

  // ════ Tier 2: Light atmosphere (layers 1, 2, 4 — no multiply blobs) ════

  nickname: {
    g: 'linear-gradient(to bottom, #F0F7FF, #FFF8F5)',
    blobs: [
      { c: ['#C8EDE8', '#B8E4DD'], s: 'min(400px, 55vw)', bl: 55, o: 0.42, t: '15%', r: '10%', d: 1, dd: 24, md: 22 },
      { c: ['#FFF0D0', '#FFE8D4'], s: 'min(350px, 50vw)', bl: 55, o: 0.42, b: '15%', l: '10%', d: 3, dd: 28, md: 24 },
    ],
  },

  calibration: {
    g: 'linear-gradient(to bottom, #F0F7FF, #FFF8F5)',
    blobs: [
      { c: ['#C8EDE8', '#B8E4DD'], s: 'min(380px, 50vw)', bl: 55, o: 0.40, t: '20%', l: '8%', d: 2, dd: 26, md: 23 },
    ],
  },

  countdownBalloon: {
    g: 'linear-gradient(to bottom, #F0F7FF, #F5FBFF)',
    blobs: [
      { c: ['#D4EEFF', '#C0ECEF'], s: 'min(450px, 60vw)', bl: 55, o: 0.45, t: '10%', l: '10%', d: 1, dd: 22, md: 22 },
      { c: ['#FADCE5', '#F8C8D6'], s: 'min(380px, 50vw)', bl: 50, o: 0.40, b: '15%', r: '10%', d: 3, dd: 26, md: 24 },
    ],
  },

  countdownTetris: {
    g: 'linear-gradient(to bottom, #F5F2FF, #FFF8F5)',
    blobs: [
      { c: ['#E8DFFF', '#F0EAFF'], s: 'min(450px, 60vw)', bl: 55, o: 0.45, t: '10%', r: '10%', d: 2, dd: 24, md: 22 },
      { c: ['#FFE8D4', '#FFF8F0'], s: 'min(380px, 50vw)', bl: 50, o: 0.40, b: '15%', l: '10%', d: 4, dd: 28, md: 24 },
    ],
  },

  tutorialBalloon: {
    g: 'linear-gradient(to bottom, #F0F7FF, #F5FBFF)',
    blobs: [
      { c: ['#D4EEFF', '#C0ECEF'], s: 'min(400px, 55vw)', bl: 55, o: 0.42, t: '12%', l: '8%',  d: 1, dd: 24, md: 22 },
      { c: ['#FADCE5', '#F8C8D6'], s: 'min(320px, 45vw)', bl: 50, o: 0.40, b: '18%', r: '12%', d: 3, dd: 28, md: 24 },
    ],
  },

  tutorialTetris: {
    g: 'linear-gradient(to bottom, #F5F2FF, #FFF8F5)',
    blobs: [
      { c: ['#E8DFFF', '#F0EAFF'], s: 'min(400px, 55vw)', bl: 55, o: 0.42, t: '12%', r: '8%',  d: 2, dd: 24, md: 22 },
      { c: ['#FFE8D4', '#FFF8F0'], s: 'min(320px, 45vw)', bl: 50, o: 0.40, b: '18%', l: '12%', d: 4, dd: 28, md: 24 },
    ],
  },

  leaderboardBalloon: {
    g: 'linear-gradient(to bottom, #F0F7FF, #FFF8F5)',
    blobs: [
      { c: ['#FADCE5', '#F8C8D6'], s: 'min(400px, 55vw)', bl: 55, o: 0.42, t: '10%', l: '8%',  d: 1, dd: 24, md: 22 },
      { c: ['#C8EDE8', '#B8E4DD'], s: 'min(350px, 48vw)', bl: 55, o: 0.40, b: '15%', r: '10%', d: 3, dd: 26, md: 24 },
    ],
  },

  leaderboardTetris: {
    g: 'linear-gradient(to bottom, #F5F2FF, #FFF8F5)',
    blobs: [
      { c: ['#E8DFFF', '#F0EAFF'], s: 'min(400px, 55vw)', bl: 55, o: 0.42, t: '10%', r: '8%',  d: 2, dd: 24, md: 22 },
      { c: ['#C8EDE8', '#B8E4DD'], s: 'min(350px, 48vw)', bl: 55, o: 0.40, b: '15%', l: '10%', d: 4, dd: 28, md: 24 },
    ],
  },
};

// ─── Component ──────────────────────────────────────────────

export const FluidBackground = memo(function FluidBackground({
  variant,
  pulse = false,
  intensity,
}: Props) {
  const cfg = V[variant];
  // intensity: 0→ blobs at 50% opacity, 1→ full opacity, undefined→ full
  const opMul = intensity != null ? 0.5 + intensity * 0.5 : 1;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden="true">
      {/* Layer 1 — Base gradient */}
      <div className="absolute inset-0" style={{ background: cfg.g }} />

      {/* Layer 2 — Primary blobs */}
      {cfg.blobs.map((b, i) => (
        <div
          key={`b${i}`}
          className="fluid-blob"
          style={{
            top: b.t, left: b.l, bottom: b.b, right: b.r,
            width: b.s, height: b.s,
            background: `radial-gradient(circle at 38% 35%, ${b.c[0]}, ${b.c[1]})`,
            filter: `blur(${b.bl}px)`,
            opacity: b.o * opMul + (pulse ? 0.15 : 0),
            scale: pulse ? '1.12' : '1',
            transition: 'opacity 1.5s ease-out, scale 1.5s ease-out',
            animation: `blobDrift${b.d} ${b.dd}s ease-in-out infinite, blobMorph ${b.md}s ease-in-out infinite`,
          }}
        />
      ))}

      {/* Layer 3 — Interaction blobs (multiply) — Tier 1 only */}
      {cfg.mix?.map((m, i) => (
        <div
          key={`m${i}`}
          className="fluid-interaction"
          style={{
            top: m.t, left: m.l, bottom: m.b, right: m.r,
            width: m.s, height: m.s,
            background: m.c,
            filter: `blur(${m.bl}px)`,
            mixBlendMode: 'multiply',
            animation: `meshOrbit${m.o} ${m.od}s ease-in-out infinite, blobMorph ${m.md}s ease-in-out infinite`,
          }}
        />
      ))}

      {/* Layer 4a — Noise texture */}
      <div className="fluid-noise" />

      {/* Layer 4b — Focal vignette (upper-left light source) */}
      <div className="fluid-vignette" />
    </div>
  );
});

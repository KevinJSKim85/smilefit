import type { BalloonGameState, BalloonEntity, Obstacle } from '../../types/balloon';
import {
  SKY_TOP, SKY_UPPER, SKY_MID, SKY_LOWER, SKY_BOT,
  ACCENT_BALLOON, BALLOON_TIE,
  OBS_FILL_START, OBS_FILL_END,
  BIRD_BEAK, BIRD_BEAK_DARK, BIRD_CHEEK, BIRD_EYE_RING, BIRD_WING_DARK,
  ACCENT_TETRIS, TEXT_PRIMARY, TEXT_MUTED,
  BALLOON_STRING, EMOJI_LABEL, TRACK_BG, TRACK_BORDER,
  GROUND_FAR, GROUND_NEAR,
  BALLOON_BODY_LIGHT, BALLOON_BODY_DEEP,
  BIRD_BELLY, BIRD_BACK,
  GROUND_FAR_TOP, GROUND_NEAR_TOP,
  WIND_GUST_CORE, WIND_GUST_EDGE, WIND_GUST_LINE,
  BEE_YELLOW, BEE_DARK, BEE_WING,
} from '../../constants/theme';

const PI2 = Math.PI * 2;

// ─── Font constants (avoid re-parsing inline strings) ─
const FONT_EMOJI = '20px system-ui, sans-serif';
const FONT_SCORE_LABEL = '600 13px system-ui, sans-serif';
const FONT_SCORE_VALUE = 'bold 32px system-ui, sans-serif';
const FONT_GAME_OVER = 'bold 48px system-ui, sans-serif';
const FONT_GAME_OVER_SCORE = '600 24px system-ui, sans-serif';

// ─── Deterministic pseudo-random helper ─────────────
function prand(i: number, prime: number): number {
  return ((42 * (i + 1) * prime) % 10000) / 10000;
}

// ─── Parallax cloud layer data ──────────────────────
const TILE_W = 1600;

interface CloudDef { x: number; y: number; size: number }

function genClouds(
  n: number, seed: number,
  yMin: number, yMax: number,
  sMin: number, sMax: number,
): CloudDef[] {
  const out: CloudDef[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: prand(i + seed, 7919) * TILE_W,
      y: yMin + prand(i + seed, 6271) * (yMax - yMin),
      size: sMin + prand(i + seed, 3571) * (sMax - sMin),
    });
  }
  return out;
}

const PARALLAX_LAYERS = [
  { speed: 5,  alpha: 0.38, clouds: genClouds(7, 10, 20, 150, 30, 55), shadow: false },
  { speed: 12, alpha: 0.50, clouds: genClouds(5, 30, 60, 220, 25, 45), shadow: false },
  { speed: 22, alpha: 0.30, clouds: genClouds(4, 50, 100, 250, 20, 35), shadow: true },
];

// ─── Cached obstacle gradients (keyed on y_height_direction) ──
const _obsGradCache = new Map<string, CanvasGradient>();
let _obsGradCtx: CanvasRenderingContext2D | null = null;

function getObsGradient(
  ctx: CanvasRenderingContext2D,
  y: number, height: number, isTop: boolean,
): CanvasGradient {
  if (_obsGradCtx !== ctx) { _obsGradCache.clear(); _obsGradCtx = ctx; }
  const key = `${Math.round(y)}_${Math.round(height)}_${isTop ? 1 : 0}`;
  let grad = _obsGradCache.get(key);
  if (!grad) {
    grad = ctx.createLinearGradient(0, y, 0, y + height);
    if (isTop) {
      grad.addColorStop(0, OBS_FILL_END);
      grad.addColorStop(1, OBS_FILL_START);
    } else {
      grad.addColorStop(0, OBS_FILL_START);
      grad.addColorStop(1, OBS_FILL_END);
    }
    _obsGradCache.set(key, grad);
  }
  return grad;
}

// ─── Cached smile bar gradient ──
let _smileGrad: CanvasGradient | null = null;
let _smileFillH = -1;
let _smileBarBot = -1;
let _smileGradCtx: CanvasRenderingContext2D | null = null;

// ─── Cached sun glow (OffscreenCanvas, created once) ──
const SUN_R = 200;
let _sunGlow: OffscreenCanvas | null = null;

function getSunGlow(): OffscreenCanvas {
  if (!_sunGlow) {
    const d = SUN_R * 2;
    _sunGlow = new OffscreenCanvas(d, d);
    const c = _sunGlow.getContext('2d')!;
    const g = c.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, SUN_R);
    g.addColorStop(0, 'rgba(255,248,220,0.40)');
    g.addColorStop(0.4, 'rgba(255,245,210,0.15)');
    g.addColorStop(1, 'rgba(255,245,210,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, d, d);
  }
  return _sunGlow;
}

// ─── Cached horizon haze gradient ──
let _hazeGrad: CanvasGradient | null = null;
let _hazeH = 0;
let _hazeCtx: CanvasRenderingContext2D | null = null;

function getHazeGrad(ctx: CanvasRenderingContext2D, h: number): CanvasGradient {
  if (!_hazeGrad || _hazeCtx !== ctx || _hazeH !== h) {
    _hazeGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
    _hazeGrad.addColorStop(0, 'rgba(255,240,220,0)');
    _hazeGrad.addColorStop(1, 'rgba(255,235,210,0.28)');
    _hazeCtx = ctx;
    _hazeH = h;
  }
  return _hazeGrad;
}

// ─── Cached ground gradients ──
let _gFarGrad: CanvasGradient | null = null;
let _gNearGrad: CanvasGradient | null = null;
let _gH = 0;
let _gCtx: CanvasRenderingContext2D | null = null;

function getGroundGrads(ctx: CanvasRenderingContext2D, h: number): [CanvasGradient, CanvasGradient] {
  if (!_gFarGrad || _gCtx !== ctx || _gH !== h) {
    _gFarGrad = ctx.createLinearGradient(0, h - 55, 0, h);
    _gFarGrad.addColorStop(0, GROUND_FAR_TOP);
    _gFarGrad.addColorStop(1, GROUND_FAR);
    _gNearGrad = ctx.createLinearGradient(0, h - 35, 0, h);
    _gNearGrad.addColorStop(0, GROUND_NEAR_TOP);
    _gNearGrad.addColorStop(1, GROUND_NEAR);
    _gCtx = ctx;
    _gH = h;
  }
  return [_gFarGrad, _gNearGrad!];
}

// ─── Fluffy cloud shape (5 overlapping arcs) ────────
function drawFluffyCloud(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
): void {
  ctx.beginPath();
  ctx.arc(x, y, s * 0.50, 0, PI2);
  ctx.arc(x - s * 0.38, y + s * 0.10, s * 0.34, 0, PI2);
  ctx.arc(x + s * 0.42, y + s * 0.06, s * 0.37, 0, PI2);
  ctx.arc(x - s * 0.08, y - s * 0.22, s * 0.30, 0, PI2);
  ctx.arc(x + s * 0.18, y - s * 0.16, s * 0.26, 0, PI2);
  ctx.fill();
}

// ═════════════════════════════════════════════════════
// Main render
// ═════════════════════════════════════════════════════

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: BalloonGameState,
  width: number,
  height: number,
): void {
  const t = performance.now();
  const dist = state.distance;

  ctx.clearRect(0, 0, width, height);

  drawSky(ctx, width, height);
  drawParallaxClouds(ctx, width, height, dist);
  drawGround(ctx, width, height, dist);
  drawDriftMotes(ctx, width, height, dist);
  drawObstacles(ctx, state.obstacles, height, t);
  drawBalloon(ctx, state.balloon, state.smileIntensity, t);
  drawSmileBar(ctx, state.smileIntensity, height);
  drawScore(ctx, state.distance, width);

  if (state.gameOver) {
    if (!_wasGameOver) { _goFrame = 0; _wasGameOver = true; }
    _goFrame++;
    drawGameOverOverlay(ctx, width, height, state.distance, _goFrame);
  } else {
    _wasGameOver = false;
  }
}

// ─── Cached sky gradient (constant colors, created once) ─
let _skyGrad: CanvasGradient | null = null;
let _skyCtx: CanvasRenderingContext2D | null = null;
let _skyH = 0;

function getSkyGradient(ctx: CanvasRenderingContext2D, h: number): CanvasGradient {
  if (!_skyGrad || _skyCtx !== ctx || _skyH !== h) {
    _skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    _skyGrad.addColorStop(0, SKY_TOP);
    _skyGrad.addColorStop(0.25, SKY_UPPER);
    _skyGrad.addColorStop(0.50, SKY_MID);
    _skyGrad.addColorStop(0.75, SKY_LOWER);
    _skyGrad.addColorStop(1, SKY_BOT);
    _skyCtx = ctx;
    _skyH = h;
  }
  return _skyGrad;
}

// ─── Sky gradient + sun glow + horizon haze ──────────
function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = getSkyGradient(ctx, h);
  ctx.fillRect(0, 0, w, h);

  // Sun glow — upper-left (consistent light direction)
  ctx.drawImage(getSunGlow(), -SUN_R * 0.3, -SUN_R * 0.3);

  // Horizon haze — warmer bottom third
  ctx.fillStyle = getHazeGrad(ctx, h);
  ctx.fillRect(0, h * 0.7, w, h * 0.3);
}

// ─── Parallax clouds ─────────────────────────────────
function drawParallaxClouds(
  ctx: CanvasRenderingContext2D,
  w: number, _h: number, dist: number,
): void {
  for (const layer of PARALLAX_LAYERS) {
    const shift = (dist * layer.speed) % TILE_W;

    for (const c of layer.clouds) {
      let sx = ((c.x - shift) % TILE_W + TILE_W) % TILE_W;
      if (sx > w + c.size) sx -= TILE_W;

      if (sx > -c.size && sx < w + c.size) {
        // Bottom-right shadow on nearest layer only (upper-left light)
        if (layer.shadow) {
          ctx.fillStyle = 'rgba(0,0,0,0.04)';
          drawFluffyCloud(ctx, sx + 2, c.y + 4, c.size);
        }
        ctx.fillStyle = `rgba(255,255,255,${layer.alpha})`;
        drawFluffyCloud(ctx, sx, c.y, c.size);
        // Inner highlight for cloud volume
        ctx.fillStyle = `rgba(255,255,255,${(layer.alpha * 0.5).toFixed(2)})`;
        drawFluffyCloud(ctx, sx - 2, c.y - 2, c.size * 0.7);
      }
    }
  }
}

// ─── Scrolling ground hills (gradient fills) ─────────
function drawGround(
  ctx: CanvasRenderingContext2D,
  w: number, h: number, dist: number,
): void {
  const [farGrad, nearGrad] = getGroundGrads(ctx, h);

  // Far hills (darker, slower)
  ctx.fillStyle = farGrad;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) {
    const off = dist * 40;
    const y = h - 40
      + Math.sin((x + off) * 0.006) * 14
      + Math.sin((x + off) * 0.014) * 7;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Near hills (lighter, faster)
  ctx.fillStyle = nearGrad;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) {
    const off = dist * 60;
    const y = h - 22
      + Math.sin((x + off) * 0.008) * 9
      + Math.sin((x + off) * 0.018) * 4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

// ─── Drift motes (depth-varied floating particles) ───
function drawDriftMotes(
  ctx: CanvasRenderingContext2D,
  w: number, h: number, dist: number,
): void {
  for (let i = 0; i < 22; i++) {
    const seed = i * 7 + 3;
    const tileX = prand(seed, 7919) * TILE_W;
    const baseY = prand(seed, 6271) * (h - 70) + 15;
    const speed = 15 + prand(seed, 3571) * 25;

    // Depth-varied: upper motes are smaller/fainter, lower are larger/brighter
    const depthT = baseY / h; // 0 = top, 1 = bottom
    const size = 0.5 + depthT * 2.5;           // 0.5–3px
    const alpha = 0.25 + depthT * 0.35;        // 0.25–0.60

    // 3-4 warm motes near ground
    const isWarm = i >= 18;
    ctx.fillStyle = isWarm
      ? `rgba(255,240,200,${(alpha * 0.7).toFixed(2)})`
      : `rgba(255,255,255,${alpha.toFixed(2)})`;

    const shift = (dist * speed) % TILE_W;
    let sx = ((tileX - shift) % TILE_W + TILE_W) % TILE_W;
    if (sx > w + 5) sx -= TILE_W;

    if (sx > -5 && sx < w + 5) {
      ctx.beginPath();
      ctx.arc(sx, isWarm ? h - 20 - prand(seed, 4091) * 40 : baseY, size, 0, PI2);
      ctx.fill();
    }
  }
}

// ─── Obstacles ───────────────────────────────────────
function drawObstacles(
  ctx: CanvasRenderingContext2D,
  obstacles: Obstacle[],
  canvasH: number,
  time: number,
): void {
  for (const obs of obstacles) {
    if (obs.type === 'bird' || obs.type === 'bobbingBird') {
      drawBirdObstacle(ctx, obs, time);
    } else if (obs.type === 'windGust') {
      drawWindGustObstacle(ctx, obs, time);
    } else if (obs.type === 'bee') {
      drawBeeObstacle(ctx, obs, time);
    } else {
      drawPipeObstacle(ctx, obs, canvasH);
    }
  }
}

// Organic pipe pillar with bumpy edge facing the gap
function drawPipeObstacle(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  _canvasH: number,
): void {
  const isTop = obs.y < 1;
  const gapEdge = isTop ? obs.y + obs.height : obs.y;
  const dir = isTop ? 1 : -1;

  // Cached gradient: lighter near gap, darker far from gap
  ctx.fillStyle = getObsGradient(ctx, obs.y, obs.height, isTop);

  // Main body (slightly wider than hitbox for visual richness)
  const pad = 3;
  ctx.fillRect(obs.x - pad, obs.y, obs.width + pad * 2, obs.height);

  // Left-edge highlight strip (upper-left light direction)
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(obs.x - pad, obs.y, 6, obs.height);

  // Bumpy cloud edge (5 overlapping circles)
  const w = obs.width + pad * 2;
  const baseX = obs.x - pad;
  const bumps = [
    { frac: 0.08, rFrac: 0.38 },
    { frac: 0.30, rFrac: 0.50 },
    { frac: 0.52, rFrac: 0.58 },
    { frac: 0.74, rFrac: 0.44 },
    { frac: 0.95, rFrac: 0.35 },
  ];

  ctx.fillStyle = getObsGradient(ctx, obs.y, obs.height, isTop);
  for (const b of bumps) {
    const bx = baseX + b.frac * w;
    const r = b.rFrac * w * 0.45;
    ctx.beginPath();
    ctx.arc(bx, gapEdge + dir * r * 0.35, r, 0, PI2);
    ctx.fill();
  }

  // Inner highlight on each bump (upper-left light)
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (const b of bumps) {
    const bx = baseX + b.frac * w;
    const r = b.rFrac * w * 0.45 * 0.8;
    ctx.beginPath();
    ctx.arc(bx - 1, gapEdge + dir * r * 0.35 - 1, r, 0, PI2);
    ctx.fill();
  }

  // Depth shadow on bumps (more visible)
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (const b of bumps) {
    const bx = baseX + b.frac * w;
    const r = b.rFrac * w * 0.38;
    ctx.beginPath();
    ctx.arc(bx, gapEdge + dir * (r * 0.35 + 3), r, 0, PI2);
    ctx.fill();
  }
}

// ─── Bird (polished — rounder body, time-based flap, two-tone beak, cheek blush) ─
function drawBirdObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle, time: number): void {
  const cx = obs.x + obs.width / 2;
  const cy = obs.y + obs.height / 2;
  const r = obs.width / 2;
  const wingFlap = Math.sin(time * 0.008) * 4;

  ctx.save();

  // Body — radial gradient (warm belly → darker back), rounder ellipse
  const bodyGrad = ctx.createRadialGradient(
    cx - r * 0.15, cy + r * 0.1, 0,
    cx, cy, r,
  );
  bodyGrad.addColorStop(0, BIRD_BELLY);
  bodyGrad.addColorStop(1, BIRD_BACK);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.90, r * 0.80, 0, 0, PI2);
  ctx.fill();

  // Belly highlight gradient (soft glow from lower-left)
  const bellyGrad = ctx.createRadialGradient(
    cx - r * 0.1, cy + r * 0.15, 0,
    cx - r * 0.1, cy + r * 0.15, r * 0.5,
  );
  bellyGrad.addColorStop(0, 'rgba(255,255,255,0.30)');
  bellyGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bellyGrad;
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.1, cy + r * 0.1, r * 0.5, r * 0.4, 0, 0, PI2);
  ctx.fill();

  // Tail feathers — bezier curves
  ctx.strokeStyle = BIRD_WING_DARK;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy + i * 3);
    ctx.bezierCurveTo(
      cx - r * 0.8, cy + i * 4 + wingFlap * 0.3,
      cx - r * 0.95, cy + i * 5 + wingFlap * 0.5,
      cx - r * 1.05, cy + i * 5 + wingFlap * 0.5,
    );
    ctx.stroke();
  }

  // Wing — darker fill, time-based flap (positioned on back, below eye)
  const wingX = cx - r * 0.70;
  const wingY = cy + r * 0.15;
  ctx.fillStyle = BIRD_WING_DARK;
  ctx.beginPath();
  ctx.ellipse(wingX, wingY + wingFlap, r * 0.7, r * 0.35, -0.3, 0, PI2);
  ctx.fill();
  // Wing inner highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(wingX - 2, wingY - 2 + wingFlap, r * 0.45, r * 0.2, -0.3, 0, PI2);
  ctx.fill();

  // Cheek blush
  ctx.fillStyle = BIRD_CHEEK;
  ctx.globalAlpha = 0.30;
  ctx.beginPath();
  ctx.arc(cx + r * 0.15, cy + r * 0.2, r * 0.18, 0, PI2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Eye — larger with brown ring
  ctx.strokeStyle = BIRD_EYE_RING;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx + r * 0.3, cy - r * 0.15, r * 0.22, 0, PI2);
  ctx.fill();
  ctx.stroke();
  // Pupil
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath();
  ctx.arc(cx + r * 0.35, cy - r * 0.15, r * 0.12, 0, PI2);
  ctx.fill();
  // Primary highlight (upper-left light)
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx + r * 0.28, cy - r * 0.21, r * 0.06, 0, PI2);
  ctx.fill();
  // Secondary smaller highlight
  ctx.beginPath();
  ctx.arc(cx + r * 0.38, cy - r * 0.10, r * 0.03, 0, PI2);
  ctx.fill();

  // Beak — two-tone (upper coral, lower darker)
  // Upper beak
  ctx.fillStyle = BIRD_BEAK;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.7, cy - 1);
  ctx.quadraticCurveTo(cx + r * 1.15, cy - 1, cx + r * 1.2, cy + 2);
  ctx.lineTo(cx + r * 0.7, cy + 2);
  ctx.closePath();
  ctx.fill();
  // Lower beak
  ctx.fillStyle = BIRD_BEAK_DARK;
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.7, cy + 2);
  ctx.lineTo(cx + r * 1.2, cy + 2);
  ctx.quadraticCurveTo(cx + r * 1.1, cy + 5, cx + r * 0.7, cy + 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ─── Wind gust (semi-transparent barrier with swirl lines) ─
function drawWindGustObstacle(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  time: number,
): void {
  ctx.save();

  // Semi-transparent body with horizontal gradient
  const grad = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.width, obs.y);
  grad.addColorStop(0, WIND_GUST_EDGE);
  grad.addColorStop(0.5, WIND_GUST_CORE);
  grad.addColorStop(1, WIND_GUST_EDGE);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 8);
  ctx.fill();

  // Outer glow for visibility
  ctx.shadowColor = 'rgba(100, 160, 220, 0.4)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 8);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Animated swirl lines (5 curved lines that shift over time)
  ctx.strokeStyle = WIND_GUST_LINE;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  const cx = obs.x + obs.width / 2;
  for (let i = 0; i < 5; i++) {
    const lineY = obs.y + obs.height * (0.12 + i * 0.19);
    const phase = time * 0.005 + i * 1.3;
    const sway = Math.sin(phase) * 8;

    ctx.beginPath();
    ctx.moveTo(obs.x + 4, lineY + sway);
    ctx.bezierCurveTo(
      cx - 6, lineY - 10 + sway,
      cx + 6, lineY + 10 - sway,
      obs.x + obs.width - 4, lineY - sway,
    );
    ctx.stroke();
  }

  // Floating particles within the gust
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (let i = 0; i < 8; i++) {
    const px = obs.x + prand(i, 7919) * obs.width;
    const py = obs.y + prand(i, 6271) * obs.height;
    const drift = Math.sin(time * 0.006 + i * 2) * 4;
    ctx.beginPath();
    ctx.arc(px + drift, py, 2, 0, PI2);
    ctx.fill();
  }

  ctx.restore();
}

// ─── Bee (yellow/black striped body with flapping wings) ─
function drawBeeObstacle(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  time: number,
): void {
  const cx = obs.x + obs.width / 2;
  const cy = obs.y + obs.height / 2;
  const r = obs.width / 2;
  const wingFlap = Math.sin(time * 0.015) * 3;

  ctx.save();

  // Wings (behind body) — two ellipses, flapping
  ctx.fillStyle = BEE_WING;
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.3, cy - r * 0.5 + wingFlap, r * 0.4, r * 0.6, -0.3, 0, PI2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.3, cy - r * 0.5 - wingFlap, r * 0.4, r * 0.6, 0.3, 0, PI2);
  ctx.fill();

  // Body + stripes (clipped to ellipse)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.75, r * 0.6, 0, 0, PI2);
  ctx.clip();

  // Yellow fill
  ctx.fillStyle = BEE_YELLOW;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // Black stripes (3 vertical bands)
  ctx.fillStyle = BEE_DARK;
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(cx + i * r * 0.35 - 2, cy - r, 4, r * 2);
  }
  ctx.restore();

  // Body outline
  ctx.strokeStyle = BEE_DARK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.75, r * 0.6, 0, 0, PI2);
  ctx.stroke();

  // Eye — white circle with black pupil
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx + r * 0.3, cy - r * 0.1, r * 0.15, 0, PI2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(cx + r * 0.33, cy - r * 0.1, r * 0.08, 0, PI2);
  ctx.fill();

  // Stinger — tiny triangle at back
  ctx.fillStyle = BEE_DARK;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.75, cy);
  ctx.lineTo(cx - r * 0.95, cy - 2);
  ctx.lineTo(cx - r * 0.95, cy + 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ─── Balloon (gradient body + ambient occlusion) ─────
function drawBalloon(
  ctx: CanvasRenderingContext2D,
  balloon: BalloonEntity,
  intensity: number,
  time: number,
): void {
  const { x, radius } = balloon;

  // Gentle idle bob
  const bob = Math.sin(time * 0.003) * 1.5;
  const drawY = balloon.y + bob;

  // Tilt based on vertical "velocity" (targetY vs current y)
  const dy = balloon.y - balloon.targetY;
  const tilt = Math.max(-0.12, Math.min(0.12, dy * 0.003));

  // Pulsing glow
  const glowPulse = Math.sin(time * 0.005) * 1.5;

  ctx.save();
  ctx.translate(x, drawY);
  ctx.rotate(tilt);

  // Glow proportional to smile + pulse
  ctx.shadowColor = ACCENT_BALLOON;
  ctx.shadowBlur = Math.min(8 + intensity * 24 + glowPulse, 20);

  // Main body — radial gradient (lighter center → deeper edge)
  const bodyGrad = ctx.createRadialGradient(
    -radius * 0.1, -radius * 0.15, 0,  // inner: slight upper-left offset (light direction)
    0, 0, radius,
  );
  bodyGrad.addColorStop(0, BALLOON_BODY_LIGHT);
  bodyGrad.addColorStop(1, BALLOON_BODY_DEEP);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.85, radius, 0, 0, PI2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Ambient occlusion — dark crescent lower-right (upper-left light casts lower-right shadow)
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.beginPath();
  ctx.arc(radius * 0.15, radius * 0.2, radius * 0.55, 0.3, Math.PI - 0.3);
  ctx.fill();

  // Primary specular highlight — gradient (softer than flat white)
  const hlGrad = ctx.createRadialGradient(
    -radius * 0.2, -radius * 0.3, 0,
    -radius * 0.2, -radius * 0.3, radius * 0.35,
  );
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
  hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hlGrad;
  ctx.beginPath();
  ctx.ellipse(-radius * 0.2, -radius * 0.3, radius * 0.25, radius * 0.35, -0.4, 0, PI2);
  ctx.fill();

  // Small secondary highlight
  ctx.beginPath();
  ctx.ellipse(-radius * 0.35, radius * 0.1, radius * 0.08, radius * 0.12, -0.3, 0, PI2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();

  // Tie point
  ctx.beginPath();
  ctx.moveTo(-4, radius - 2);
  ctx.lineTo(4, radius - 2);
  ctx.lineTo(0, radius + 6);
  ctx.closePath();
  ctx.fillStyle = BALLOON_TIE;
  ctx.fill();

  // String — sway oscillates with bob for "alive" feel
  const sway = Math.sin(time * 0.004) * 3;
  ctx.beginPath();
  ctx.moveTo(0, radius + 6);
  ctx.bezierCurveTo(
    2 + sway, radius + 14,
    -2 - sway * 0.5, radius + 22,
    -3 + sway * 0.3, radius + 30,
  );
  ctx.strokeStyle = BALLOON_STRING;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

// ─── HUD: Smile bar ─────────────────────────────────

function drawSmileBar(
  ctx: CanvasRenderingContext2D,
  intensity: number,
  canvasHeight: number,
): void {
  const barX = 14;
  const barY = 55;
  const barW = 20;
  const barH = canvasHeight - 130;

  // Emoji label
  ctx.font = FONT_EMOJI;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = EMOJI_LABEL;
  ctx.fillText('\u{1F60A}', barX + barW / 2, barY - 6);

  // Track background
  ctx.fillStyle = TRACK_BG;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 8);
  ctx.fill();

  // Track border
  ctx.strokeStyle = TRACK_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 8);
  ctx.stroke();

  // Fill (gradient cached, invalidated when bar height changes by ≥1px)
  const fillH = barH * Math.min(intensity, 1);
  if (fillH > 1) {
    ctx.save();
    const barBot = barY + barH;
    const roundedH = Math.round(fillH);
    if (!_smileGrad || _smileGradCtx !== ctx || roundedH !== _smileFillH || barBot !== _smileBarBot) {
      _smileGrad = ctx.createLinearGradient(0, barBot - fillH, 0, barBot);
      _smileGrad.addColorStop(0, ACCENT_TETRIS);
      _smileGrad.addColorStop(1, ACCENT_BALLOON);
      _smileGradCtx = ctx;
      _smileFillH = roundedH;
      _smileBarBot = barBot;
    }
    ctx.fillStyle = _smileGrad;

    if (intensity > 0.5) {
      ctx.shadowColor = ACCENT_BALLOON;
      ctx.shadowBlur = Math.min(6 + (intensity - 0.5) * 12, 8);
    }

    ctx.beginPath();
    ctx.roundRect(barX, barY + barH - fillH, barW, fillH, 8);
    ctx.fill();
    ctx.restore();

    // Level indicator dot
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(barX + barW / 2, barY + barH - fillH + 3, 3.5, 0, PI2);
    ctx.fill();
  }
}

// ─── HUD: Score ──────────────────────────────────────

function drawScore(
  ctx: CanvasRenderingContext2D,
  distance: number,
  canvasWidth: number,
): void {
  const score = Math.floor(distance);

  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';

  // "SCORE" label
  ctx.font = FONT_SCORE_LABEL;
  ctx.fillStyle = TEXT_MUTED;
  ctx.fillText('SCORE', canvasWidth - 16, 12);

  // Number with subtle white shadow for readability
  ctx.font = FONT_SCORE_VALUE;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.shadowColor = 'rgba(255,255,255,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(score.toLocaleString(), canvasWidth - 16, 26);

  ctx.restore();
}

// ─── Game over animation state ───────────────────────
let _goFrame = 0;
let _wasGameOver = false;

// ─── Game over overlay (vignette + score slide-up) ────

function drawGameOverOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  distance: number,
  frame: number,
): void {
  // Vignette fades in over first 10 frames
  const vigAlpha = Math.min(frame / 10, 1);
  ctx.globalAlpha = vigAlpha;
  const vigGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
  vigGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
  vigGrad.addColorStop(1, 'rgba(200,200,215,0.75)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Heading — quick fade in (frames 0-8)
  const headT = Math.min(frame / 8, 1);
  ctx.globalAlpha = headT;
  ctx.shadowColor = 'rgba(255,255,255,0.8)';
  ctx.shadowBlur = 8;
  ctx.font = FONT_GAME_OVER;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText('GAME OVER', w / 2, h / 2 - 20);

  ctx.shadowBlur = 0;

  // Score — slide up over 12 frames, delayed by 8 frames
  const scoreT = Math.min(Math.max(frame - 8, 0) / 12, 1);
  const ease = 1 - (1 - scoreT) * (1 - scoreT); // ease-out quadratic
  const slideY = (1 - ease) * 20;
  ctx.globalAlpha = ease;
  const score = Math.floor(distance);
  ctx.font = FONT_GAME_OVER_SCORE;
  ctx.fillStyle = TEXT_MUTED;
  ctx.fillText(score.toLocaleString(), w / 2, h / 2 + 20 + slideY);

  ctx.globalAlpha = 1;
  ctx.restore();
}

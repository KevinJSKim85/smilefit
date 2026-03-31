import type { TetrisGameState, TetrisPiece, TetrisBoard, TetrisCell } from '../../types/tetris';
import { BOARD_COLS, BOARD_ROWS, CELL_SIZE, TETROMINO_COLORS } from '../../constants/tetris';
import { getGhostRow } from './tetrisEngine';
import {
  TEXT_PRIMARY, TEXT_MUTED,
  GRID_BORDER,
  CELL_FALLBACK,
  HUD_SUBTLE,
  ACCENT_TEAL, ACCENT_BALLOON, ACCENT_TETRIS,
  SURFACE_PANEL,
  TETRIS_BG_TOP, TETRIS_BG_MID, TETRIS_BG_BOT,
} from '../../constants/theme';

// ─── Action feedback ────────────────────────────────────────
export interface ActionFeedback {
  type: string; // 'left' | 'right' | 'rotate' | 'drop' | ''
  time: number; // performance.now() when action fired
}

// ─── Tutorial overlay (hold bar, tutorial-only) ─────────────
export interface TutorialOverlay {
  gaugeProgress: number; // 0-1
  phase: number;         // 0-3
  gaugeLabel?: string;   // label text shown above the bar
}

// ─── Line clear flash (tutorial-only) ───────────────────────
export interface LineClearOverlay {
  rows: number[];   // board row indices that are clearing
  progress: number; // 0-1 (animation progress)
}

// ─── Lock flash (passed from component on piece lock) ───────
export interface LockFlashOverlay {
  cells: { x: number; y: number }[];
  startTime: number;
}

const FEEDBACK_DURATION_MS = 400;

// Maps action type to hint index (order matches the hints array)
const ACTION_TO_HINT_INDEX: Record<string, number> = {
  left: 0,
  right: 1,
  rotate: 2,
  drop: 3,
};

const ACTION_COLORS: Record<string, string> = {
  left: ACCENT_TEAL,
  right: ACCENT_TEAL,
  rotate: ACCENT_BALLOON,
  drop: ACCENT_TETRIS,
};

// ─── Layout ─────────────────────────────────────────────
const BOARD_X = 20;
const BOARD_Y = 20;
const BOARD_W = BOARD_COLS * CELL_SIZE;
const BOARD_H = BOARD_ROWS * CELL_SIZE;
const SIDEBAR_X = BOARD_X + BOARD_W + 20;
const SIDEBAR_W = 180;

export const CANVAS_WIDTH = SIDEBAR_X + SIDEBAR_W + 10;
export const CANVAS_HEIGHT = BOARD_Y + BOARD_H + 20;

/** Build lock flash cell positions from a piece at a given row. */
export function buildLockFlashCells(
  piece: TetrisPiece,
  lockRow: number,
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      cells.push({
        x: BOARD_X + (piece.col + c) * CELL_SIZE,
        y: BOARD_Y + (lockRow + r) * CELL_SIZE,
      });
    }
  }
  return cells;
}

// ─── Font constants (avoid re-parsing inline strings) ────
const FONT_LABEL = '600 13px system-ui, sans-serif';
const FONT_STAT = 'bold 30px system-ui, sans-serif';
const FONT_HINT = '12px system-ui, sans-serif';
const FONT_GAME_OVER = 'bold 48px system-ui, sans-serif';
const FONT_GAME_OVER_SCORE = '600 24px system-ui, sans-serif';

// ─── Main render ────────────────────────────────────────

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: TetrisGameState,
  controlHints?: string[],
  actionFeedback?: ActionFeedback,
  tutorialOverlay?: TutorialOverlay,
  lineClearOverlay?: LineClearOverlay,
  lockFlash?: LockFlashOverlay,
): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background gradient
  drawBackground(ctx);
  drawMotes(ctx);

  drawBoardPanel(ctx);
  drawGrid(ctx);
  drawBoardAtmosphere(ctx);
  drawBoard(ctx, state.board);
  drawGhostPiece(ctx, state.board, state.currentPiece);
  drawPiece(ctx, state.currentPiece, BOARD_X, BOARD_Y, 1);
  drawActiveOverlay(ctx, state.currentPiece);

  // Lock flash (driven by component, not self-detected)
  if (lockFlash) {
    drawLockFlash(ctx, lockFlash);
  }

  drawSidebar(ctx, state, controlHints, actionFeedback);

  // Tutorial hold bar (phases 0-2 only, not smile phase 3)
  if (tutorialOverlay) {
    drawHoldBar(ctx, tutorialOverlay);
  }

  // Line clear flash overlay (tutorial only)
  if (lineClearOverlay && lineClearOverlay.rows.length > 0) {
    drawLineClearFlash(ctx, lineClearOverlay);
  }

  // Line clear particles
  spawnLineClearParticles(state.linesCleared);
  drawParticles(ctx);

  if (state.gameOver) {
    if (!_wasGameOver) { _goFrame = 0; _wasGameOver = true; }
    _goFrame++;
    drawGameOverOverlay(ctx, state.score, _goFrame);
  } else {
    _wasGameOver = false;
  }
}

/** Reset all module-level animation state. Call on component mount. */
export function resetRendererState(): void {
  _goFrame = 0;
  _wasGameOver = false;
  _prevLinesCleared = 0;
  _prevScore = -1;
  _scorePopStart = 0;
  _particles.length = 0;
}

// ─── Game over animation state ──────────────────────────
let _goFrame = 0;
let _wasGameOver = false;

// ─── Cached gradients (created once, reused every frame) ─
let _bgGrad: CanvasGradient | null = null;
let _bgCtx: CanvasRenderingContext2D | null = null;

function getBgGradient(ctx: CanvasRenderingContext2D): CanvasGradient {
  if (!_bgGrad || _bgCtx !== ctx) {
    _bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    _bgGrad.addColorStop(0, TETRIS_BG_TOP);
    _bgGrad.addColorStop(0.5, TETRIS_BG_MID);
    _bgGrad.addColorStop(1, TETRIS_BG_BOT);
    _bgCtx = ctx;
  }
  return _bgGrad;
}

// ─── Background gradient ────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = getBgGradient(ctx);
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// ─── Board panel (elevated white surface) ───────────────

function drawBoardPanel(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = SURFACE_PANEL;
  ctx.beginPath();
  ctx.roundRect(BOARD_X - 3, BOARD_Y - 3, BOARD_W + 6, BOARD_H + 6, 10);
  ctx.fill();
  ctx.restore();

  // Left-edge highlight strip (upper-left light source)
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(BOARD_X - 3, BOARD_Y + 4, 4, BOARD_H - 8);
}

// ─── Grid ───────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D): void {
  // Grid lines (reduced alpha — dots are the primary grid now)
  ctx.strokeStyle = 'rgba(0,0,0,0.03)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < BOARD_COLS; c++) {
    const x = BOARD_X + c * CELL_SIZE;
    ctx.moveTo(x, BOARD_Y);
    ctx.lineTo(x, BOARD_Y + BOARD_H);
  }
  for (let r = 1; r < BOARD_ROWS; r++) {
    const y = BOARD_Y + r * CELL_SIZE;
    ctx.moveTo(BOARD_X, y);
    ctx.lineTo(BOARD_X + BOARD_W, y);
  }
  ctx.stroke();

  // Grid intersection dots (single batched path)
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.beginPath();
  for (let r = 1; r < BOARD_ROWS; r++) {
    for (let c = 1; c < BOARD_COLS; c++) {
      const x = BOARD_X + c * CELL_SIZE;
      const y = BOARD_Y + r * CELL_SIZE;
      ctx.moveTo(x + 1.5, y);
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    }
  }
  ctx.fill();

  // Board border (rounded)
  ctx.strokeStyle = GRID_BORDER;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H, 6);
  ctx.stroke();
}

// ─── Board atmosphere (vignette, cached) ────────────────
let _atmosCanvas: OffscreenCanvas | null = null;

function getBoardAtmosphere(): OffscreenCanvas {
  if (!_atmosCanvas) {
    _atmosCanvas = new OffscreenCanvas(BOARD_W, BOARD_H);
    const c = _atmosCanvas.getContext('2d')!;

    // Inner vignette — darkening at edges for depth
    const vigGrad = c.createRadialGradient(
      BOARD_W / 2, BOARD_H / 2, Math.min(BOARD_W, BOARD_H) * 0.35,
      BOARD_W / 2, BOARD_H / 2, Math.max(BOARD_W, BOARD_H) * 0.7,
    );
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.06)');
    c.fillStyle = vigGrad;
    c.fillRect(0, 0, BOARD_W, BOARD_H);
  }
  return _atmosCanvas;
}

function drawBoardAtmosphere(ctx: CanvasRenderingContext2D): void {
  ctx.drawImage(getBoardAtmosphere(), BOARD_X, BOARD_Y);
}

// ─── Locked cells on board ──────────────────────────────

function drawBoard(ctx: CanvasRenderingContext2D, board: TetrisBoard): void {
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = board[r][c];
      if (cell) {
        drawCell(ctx, BOARD_X + c * CELL_SIZE, BOARD_Y + r * CELL_SIZE, cell, 1);
      }
    }
  }
}

// ─── Ghost piece (dashed outline) ────────────────────────

function drawGhostPiece(
  ctx: CanvasRenderingContext2D,
  board: TetrisBoard,
  piece: TetrisPiece,
): void {
  const ghostRow = getGhostRow(board, piece);
  if (ghostRow === piece.row) return;

  const color = TETROMINO_COLORS[piece.type] || CELL_FALLBACK;
  const pad = 2;
  const inner = CELL_SIZE - pad * 2;

  ctx.save();
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1.5;

  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const x = BOARD_X + (piece.col + c) * CELL_SIZE + pad;
      const y = BOARD_Y + (ghostRow + r) * CELL_SIZE + pad;

      // Faint fill
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, inner, inner, 3);
      ctx.fill();

      // Dashed outline
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, inner, inner, 3);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ─── Active piece ───────────────────────────────────────

function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: TetrisPiece,
  offsetX: number,
  offsetY: number,
  alpha: number,
): void {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const x = offsetX + (piece.col + c) * CELL_SIZE;
      const y = offsetY + (piece.row + r) * CELL_SIZE;
      drawCell(ctx, x, y, piece.type, alpha);
    }
  }
}

// ─── Bevel constants ────
const BEVEL_HIGHLIGHT = 'rgba(255,255,255,0.22)';
const BEVEL_SHADOW = 'rgba(0,0,0,0.14)';

// ─── Cached cell images (one OffscreenCanvas per color) ──
// Eliminates ~200 gradient creations per frame on a full board.
const _cellCanvases = new Map<string, OffscreenCanvas>();

function getCellCanvas(color: string): OffscreenCanvas {
  let oc = _cellCanvases.get(color);
  if (!oc) {
    oc = new OffscreenCanvas(CELL_SIZE, CELL_SIZE);
    const c = oc.getContext('2d')!;
    const pad = 1;
    const inner = CELL_SIZE - pad * 2;

    // Base gradient fill
    const grad = c.createLinearGradient(0, 0, 0, CELL_SIZE);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + 'CC');
    c.fillStyle = grad;
    c.beginPath();
    c.roundRect(pad, pad, inner, inner, 4);
    c.fill();

    // Softer bevel strips
    c.fillStyle = BEVEL_HIGHLIGHT;
    c.fillRect(pad + 2, pad + 1, inner - 4, 2);
    c.fillRect(pad + 1, pad + 3, 2, inner - 5);
    c.fillStyle = BEVEL_SHADOW;
    c.fillRect(pad + 2, pad + inner - 3, inner - 4, 2);
    c.fillRect(pad + inner - 3, pad + 2, 2, inner - 5);

    // 1px inner edge for smooth falloff
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(pad + 1, pad + 1, inner - 2, inner - 2, 3);
    c.stroke();

    // Specular highlight dot (upper-left, matching balloon's lighting)
    const specGrad = c.createRadialGradient(
      pad + 6, pad + 5, 0,
      pad + 6, pad + 5, 7,
    );
    specGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
    specGrad.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = specGrad;
    c.fillRect(pad, pad, inner, inner);

    // Ambient occlusion arc (bottom-right dark crescent)
    const aoGrad = c.createRadialGradient(
      pad + inner - 4, pad + inner - 4, 0,
      pad + inner - 4, pad + inner - 4, inner * 0.6,
    );
    aoGrad.addColorStop(0, 'rgba(0,0,0,0.12)');
    aoGrad.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = aoGrad;
    c.beginPath();
    c.roundRect(pad, pad, inner, inner, 4);
    c.fill();

    _cellCanvases.set(color, oc);
  }
  return oc;
}

// ─── Single cell (pre-rendered, drawn via drawImage) ─────

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: TetrisCell,
  alpha: number,
): void {
  if (!type) return;
  const color = TETROMINO_COLORS[type] || CELL_FALLBACK;
  ctx.globalAlpha = alpha;
  ctx.drawImage(getCellCanvas(color), x, y);
  ctx.globalAlpha = 1;
}

// ─── Active piece pulse glow ─────────────────────────────

function drawActiveOverlay(ctx: CanvasRenderingContext2D, piece: TetrisPiece): void {
  const now = performance.now();
  const pulse = 0.08 + Math.sin(now * 0.006) * 0.03; // 5-11% opacity
  const color = TETROMINO_COLORS[piece.type] || CELL_FALLBACK;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 4 + Math.sin(now * 0.006) * 2;
  ctx.fillStyle = `rgba(255,255,255,${pulse})`;

  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const x = BOARD_X + (piece.col + c) * CELL_SIZE;
      const y = BOARD_Y + (piece.row + r) * CELL_SIZE;
      ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }
  }
  ctx.restore();
}

// ─── Piece lock flash (driven by component) ─────────────
const LOCK_FLASH_MS = 150;

function drawLockFlash(ctx: CanvasRenderingContext2D, flash: LockFlashOverlay): void {
  const elapsed = performance.now() - flash.startTime;
  if (elapsed > LOCK_FLASH_MS || flash.cells.length === 0) return;

  const alpha = 0.5 * (1 - elapsed / LOCK_FLASH_MS);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (const cell of flash.cells) {
    ctx.fillRect(cell.x + 1, cell.y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  }
}

// ─── Line clear particles ───────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  birth: number;
  life: number;
  size: number;
}

const MAX_PARTICLES = 50;
const _particles: Particle[] = [];
let _prevLinesCleared = 0;
const GRAVITY = 0.0004; // px/ms²

// Tetromino color values for random particle coloring
const PIECE_COLORS = Object.values(TETROMINO_COLORS);

function spawnLineClearParticles(linesCleared: number): void {
  const newClears = linesCleared - _prevLinesCleared;
  _prevLinesCleared = linesCleared;
  if (newClears <= 0) return;

  const now = performance.now();
  for (let i = 0; i < newClears; i++) {
    const rowY = BOARD_Y + (BOARD_ROWS - 1 - i) * CELL_SIZE + CELL_SIZE / 2;
    for (let col = 0; col < BOARD_COLS; col += 2) {
      if (_particles.length >= MAX_PARTICLES) break;
      _particles.push({
        x: BOARD_X + col * CELL_SIZE + CELL_SIZE / 2,
        y: rowY,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(0.1 + Math.random() * 0.15),
        color: PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)],
        birth: now,
        life: 400 + Math.random() * 200,
        size: 2 + Math.random() * 2,
      });
    }
  }
}

function drawParticles(ctx: CanvasRenderingContext2D): void {
  const now = performance.now();
  let writeIdx = 0;

  for (let i = 0; i < _particles.length; i++) {
    const p = _particles[i];
    const t = now - p.birth;
    if (t > p.life) continue; // dead

    const x = p.x + p.vx * t;
    const y = p.y + p.vy * t + 0.5 * GRAVITY * t * t;
    const alpha = 1 - t / p.life;

    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = p.color;
    ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);

    // Compact alive particles
    _particles[writeIdx++] = p;
  }
  _particles.length = writeIdx;
  ctx.globalAlpha = 1;
}

// ─── Background motes ───────────────────────────────────
const NUM_MOTES = 6;

// Deterministic pseudo-random (like balloon's prand)
function prand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface Mote {
  baseX: number; baseY: number;
  radius: number;
  orbitR: number;
  speedX: number; speedY: number;
  alpha: number;
}

const _motes: Mote[] = [];
for (let i = 0; i < NUM_MOTES; i++) {
  _motes.push({
    baseX: prand(i * 3 + 1) * CANVAS_WIDTH,
    baseY: prand(i * 3 + 2) * CANVAS_HEIGHT,
    radius: 2 + prand(i * 3 + 3) * 3,
    orbitR: 10 + prand(i * 3 + 4) * 20,
    speedX: 0.0003 + prand(i * 3 + 5) * 0.0004,
    speedY: 0.0004 + prand(i * 3 + 6) * 0.0003,
    alpha: 0.04 + prand(i * 3 + 7) * 0.06,
  });
}

function drawMotes(ctx: CanvasRenderingContext2D): void {
  const now = performance.now();
  for (const m of _motes) {
    const x = m.baseX + Math.sin(now * m.speedX) * m.orbitR;
    const y = m.baseY + Math.cos(now * m.speedY) * m.orbitR;
    ctx.globalAlpha = m.alpha;
    ctx.fillStyle = ACCENT_TETRIS;
    ctx.beginPath();
    ctx.arc(x, y, m.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Score pop animation ────────────────────────────────
let _prevScore = -1;
let _scorePopStart = 0;
const SCORE_POP_MS = 300;

// ─── Sidebar ────────────────────────────────────────────

function drawSidebar(
  ctx: CanvasRenderingContext2D,
  state: TetrisGameState,
  controlHints?: string[],
  actionFeedback?: ActionFeedback,
): void {
  const x = SIDEBAR_X;

  // ── Next preview card ──
  const nextY = BOARD_Y;
  const nextH = 125;
  drawCard(ctx, x, nextY, SIDEBAR_W, nextH);

  ctx.fillStyle = TEXT_MUTED;
  ctx.font = FONT_LABEL;
  ctx.textAlign = 'left';
  ctx.fillText('NEXT', x + 12, nextY + 20);

  // Next preview glow (faint radial glow of piece color behind preview)
  const previewColor = TETROMINO_COLORS[state.nextPiece.type] || CELL_FALLBACK;
  const glowCx = x + SIDEBAR_W / 2;
  const glowCy = nextY + 60;
  const glowGrad = ctx.createRadialGradient(glowCx, glowCy, 0, glowCx, glowCy, 40);
  glowGrad.addColorStop(0, previewColor + '18'); // ~10% alpha
  glowGrad.addColorStop(1, previewColor + '00');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(glowCx, glowCy, 40, 0, Math.PI * 2);
  ctx.fill();

  drawNextPreview(ctx, state.nextPiece, x + 10, nextY + 28, SIDEBAR_W - 20);

  // ── Stats card ──
  const statsY = nextY + nextH + 12;
  const statsH = 200;
  drawCard(ctx, x, statsY, SIDEBAR_W, statsH);

  // Score pop detection
  const now2 = performance.now();
  if (_prevScore >= 0 && state.score > _prevScore) {
    _scorePopStart = now2;
  }
  _prevScore = state.score;

  // Score with pop animation
  const scoreElapsed = now2 - _scorePopStart;
  let scoreFontSize = 30;
  if (scoreElapsed < SCORE_POP_MS) {
    const t = scoreElapsed / SCORE_POP_MS;
    const ease = 1 - (1 - t) * (1 - t); // ease-out quadratic
    scoreFontSize = 30 + 4 * (1 - ease); // 34 → 30
  }

  let iy = statsY + 22;
  drawSidebarStat(ctx, x + 14, iy, 'SCORE', state.score.toLocaleString(), scoreFontSize);
  iy += 60;
  drawSidebarStat(ctx, x + 14, iy, 'LEVEL', `${state.level}`);
  iy += 60;
  drawSidebarStat(ctx, x + 14, iy, 'LINES', `${state.linesCleared}`);

  // ── Control hints with action feedback ──
  const hintsY = statsY + statsH + 16;
  const hints = controlHints ?? [
    'L wink: Left',
    'R wink: Right',
    'Smile: Rotate',
    'Both: Drop',
  ];

  // Compute active feedback state
  const now = performance.now();
  const activeIndex = actionFeedback && actionFeedback.type
    ? ACTION_TO_HINT_INDEX[actionFeedback.type] ?? -1
    : -1;
  const elapsed = actionFeedback ? now - actionFeedback.time : FEEDBACK_DURATION_MS;
  const feedbackAlpha = activeIndex >= 0 && elapsed < FEEDBACK_DURATION_MS
    ? 0.6 * (1 - elapsed / FEEDBACK_DURATION_MS)
    : 0;

  ctx.font = FONT_HINT;
  ctx.textAlign = 'left';

  for (let i = 0; i < hints.length; i++) {
    const rowY = hintsY + i * 18;

    // Draw highlight pill behind the active hint
    if (i === activeIndex && feedbackAlpha > 0) {
      const color = ACTION_COLORS[actionFeedback!.type] || ACCENT_TEAL;
      ctx.globalAlpha = feedbackAlpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, rowY - 11, SIDEBAR_W, 16, 4);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Active hint text is drawn slightly bolder
      ctx.fillStyle = TEXT_PRIMARY;
    } else {
      ctx.fillStyle = HUD_SUBTLE;
    }

    ctx.fillText(hints[i], x + 4, rowY, SIDEBAR_W - 8);
  }
}

// ─── Card background ────────────────────────────────────

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.05)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.stroke();
}

// ─── Sidebar stat (label + value) ───────────────────────

function drawSidebarStat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  fontSize?: number,
): void {
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = FONT_LABEL;
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);

  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = fontSize ? `bold ${fontSize}px system-ui, sans-serif` : FONT_STAT;
  ctx.fillText(value, x, y + 26);
}

// ─── Next piece preview ────────────────────────────────

function drawNextPreview(
  ctx: CanvasRenderingContext2D,
  piece: TetrisPiece,
  boxX: number,
  boxY: number,
  boxW: number,
): void {
  const cellSize = 18;
  const shape = piece.shape;
  const shapeW = shape[0].length * cellSize;
  const shapeH = shape.length * cellSize;
  const startX = boxX + (boxW - shapeW) / 2;
  const startY = boxY + (76 - shapeH) / 2;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const cx = startX + c * cellSize;
      const cy = startY + r * cellSize;
      drawPreviewCell(ctx, cx, cy, cellSize, piece.type);
    }
  }
}

// ─── Preview cell (matches board quality via scaled drawImage) ─

function drawPreviewCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  type: string,
): void {
  const color = TETROMINO_COLORS[type] || CELL_FALLBACK;
  ctx.drawImage(getCellCanvas(color), x, y, size, size);
}

// ─── Tutorial hold bar (horizontal progress) ────────────

const GAUGE_TRACK = 'rgba(0,0,0,0.06)';

const GAUGE_PHASE_COLORS: string[] = [
  ACCENT_TEAL,    // phase 0: left wink
  ACCENT_TEAL,    // phase 1: right wink
  ACCENT_TETRIS,  // phase 2: double blink
  ACCENT_BALLOON, // phase 3: smile (not shown)
];

const FONT_GAUGE_LABEL = '600 11px system-ui, sans-serif';

function drawHoldBar(
  ctx: CanvasRenderingContext2D,
  overlay: TutorialOverlay,
): void {
  const { gaugeProgress, phase, gaugeLabel } = overlay;
  // No bar for smile phase or when no progress
  if (phase === 3 || gaugeProgress <= 0) return;

  const barX = BOARD_X;
  const barY = BOARD_Y - 14;
  const barW = BOARD_W;
  const barH = 8;
  const radius = 4;

  // Gauge label above bar
  if (gaugeLabel) {
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = FONT_GAUGE_LABEL;
    ctx.textAlign = 'left';
    ctx.fillText(gaugeLabel, barX, barY - 4);
  }

  // Track background
  ctx.fillStyle = GAUGE_TRACK;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, radius);
  ctx.fill();

  // Progress fill
  const color = GAUGE_PHASE_COLORS[phase] ?? ACCENT_TEAL;
  const fillW = barW * Math.min(gaugeProgress, 1);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(barX, barY, fillW, barH, radius);
  ctx.fill();

  // Glow when full
  if (gaugeProgress >= 1) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, radius);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Line clear flash overlay ────────────────────────────

function drawLineClearFlash(
  ctx: CanvasRenderingContext2D,
  overlay: LineClearOverlay,
): void {
  const { rows, progress } = overlay;
  // Pulsing white flash that fades out
  const alpha = (1 - progress) * 0.7 * (0.5 + 0.5 * Math.sin(progress * Math.PI * 4));

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  for (const row of rows) {
    ctx.fillRect(BOARD_X, BOARD_Y + row * CELL_SIZE, BOARD_W, CELL_SIZE);
  }
}

// ─── Game Over ──────────────────────────────────────────

function drawGameOverOverlay(
  ctx: CanvasRenderingContext2D,
  score: number,
  frame: number,
): void {
  // Vignette fades in over first 10 frames
  const vigAlpha = Math.min(frame / 10, 1);
  ctx.globalAlpha = vigAlpha;
  const vigGrad = ctx.createRadialGradient(
    BOARD_X + BOARD_W / 2, BOARD_Y + BOARD_H / 2, 0,
    BOARD_X + BOARD_W / 2, BOARD_Y + BOARD_H / 2, Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.6,
  );
  vigGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
  vigGrad.addColorStop(1, 'rgba(200,200,215,0.75)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.globalAlpha = 1;

  ctx.save();
  const centerX = BOARD_X + BOARD_W / 2;
  const centerY = BOARD_Y + BOARD_H / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Heading — quick fade in (frames 0-8)
  const headT = Math.min(frame / 8, 1);
  ctx.globalAlpha = headT;
  ctx.shadowColor = 'rgba(255,255,255,0.8)';
  ctx.shadowBlur = 8;
  ctx.font = FONT_GAME_OVER;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText('GAME OVER', centerX, centerY - 20);

  ctx.shadowBlur = 0;

  // Score — slide up over 12 frames, delayed by 8 frames
  const scoreT = Math.min(Math.max(frame - 8, 0) / 12, 1);
  const ease = 1 - (1 - scoreT) * (1 - scoreT); // ease-out quadratic
  const slideY = (1 - ease) * 20;
  ctx.globalAlpha = ease;
  ctx.font = FONT_GAME_OVER_SCORE;
  ctx.fillStyle = TEXT_MUTED;
  ctx.fillText(score.toLocaleString(), centerX, centerY + 16 + slideY);

  ctx.globalAlpha = 1;
  ctx.restore();
}

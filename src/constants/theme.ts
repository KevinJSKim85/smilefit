/**
 * Central color constants for the entire app.
 *
 * CSS variables in index.css mirror these values for Tailwind/React usage.
 * Canvas renderers and JS code import directly from here.
 *
 * To change a color: update it here AND in src/index.css.
 */

// ─── Surfaces ────────────────────────────────────────────
export const BG = '#F8F6F2';
export const SURFACE_PANEL = '#FFFFFF';
export const SURFACE_CARD = '#F0EDE8';
export const SURFACE_CARD_HOVER = '#E8E4DD';

// ─── Text ────────────────────────────────────────────────
export const TEXT_PRIMARY = '#1A1A2E';
export const TEXT_SECONDARY = '#5C5C6F';
export const TEXT_MUTED = '#9C9CA8';

// ─── Accents ─────────────────────────────────────────────
export const ACCENT_BALLOON = '#E9557E';
export const ACCENT_TETRIS = '#7C5CC4';
export const ACCENT_TEAL = '#2BA89A';

// ─── Feedback ────────────────────────────────────────────
export const SUCCESS = '#2D9F5E';
export const WARNING = '#D19A00';
export const DANGER = '#D94452';

// ─── Balloon game canvas ─────────────────────────────────
export const SKY_TOP = '#8EC8F0';
export const SKY_UPPER = '#B3DCFA';
export const SKY_MID = '#D6ECFD';
export const SKY_LOWER = '#EEE8DC';
export const SKY_BOT = '#F5E6CE';
export const BALLOON_TIE = '#C4456A';
export const OBS_FILL_START = '#E5EAF0';
export const OBS_FILL_END = '#C8D0DA';
export const BIRD_BEAK = '#FF7043';
export const GROUND_FAR = '#8BB576';
export const GROUND_NEAR = '#B8DC9E';

// ─── Balloon atmosphere (gradient upgrades) ─────────────
export const BALLOON_BODY_LIGHT = '#F06A8D';
export const BALLOON_BODY_DEEP = '#D44870';
export const BIRD_BELLY = '#FFD54F';
export const BIRD_BACK = '#F4A623';
export const BIRD_WING_DARK = '#E08C1A';
export const BIRD_BEAK_DARK = '#E65100';
export const BIRD_CHEEK = '#FFAB91';
export const BIRD_EYE_RING = '#5D4037';
export const GROUND_FAR_TOP = '#A0C88E';
export const GROUND_NEAR_TOP = '#CCEAB5';

// ─── Wind gust obstacle ─────────────────────────────────
export const WIND_GUST_CORE = 'rgba(140, 180, 220, 0.70)';
export const WIND_GUST_EDGE = 'rgba(120, 160, 210, 0.40)';
export const WIND_GUST_LINE = 'rgba(80, 130, 190, 0.80)';

// ─── Bee obstacle ───────────────────────────────────────
export const BEE_YELLOW = '#FFD700';
export const BEE_DARK = '#2C2C2C';
export const BEE_WING = 'rgba(220, 240, 255, 0.6)';

// ─── Tetris game canvas ─────────────────────────────────
export const TETRIS_BG_TOP = '#F5F0FF';   // faint lavender
export const TETRIS_BG_MID = '#F8F6F2';   // matches BG (seamless midpoint)
export const TETRIS_BG_BOT = '#FFF8F0';   // warm peach

export const TETROMINO_COLORS: Record<string, string> = {
  I: '#3ABDC8',
  O: '#D4B830',
  T: '#9B5CC8',
  S: '#4CB870',
  Z: '#D45050',
  J: '#5068C8',
  L: '#D49830',
};
export const GHOST_ALPHA = 0.15;
export const CELL_FALLBACK = '#888';

// ─── Shared canvas ──────────────────────────────────────
export const GRID_LINE = 'rgba(0,0,0,0.05)';
export const GRID_BORDER = 'rgba(0,0,0,0.12)';

// ─── HUD / overlays ────────────────────────────────────
export const HUD_SUBTLE = 'rgba(0,0,0,0.3)';
export const TRACK_BG = 'rgba(0,0,0,0.06)';
export const TRACK_BORDER = 'rgba(0,0,0,0.10)';
export const BALLOON_STRING = 'rgba(0,0,0,0.15)';
export const EMOJI_LABEL = 'rgba(0,0,0,0.35)';

// Board dimensions
export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;
export const CELL_SIZE = 30; // pixels per cell

// Scoring (standard Tetris)
export const LINE_SCORES: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

// Speed (drop interval in ms per level) — capped at level 5 (800ms) for wink-friendly pacing
export const LEVEL_SPEEDS: number[] = [
  1000, // (unused — game starts at level 1)
  1000, // level 1
  950,  // level 2
  900,  // level 3
  850,  // level 4
  800,  // level 5 (max)
];

// Lines per level
export const LINES_PER_LEVEL = 10;

// Tetromino colors (re-exported from central theme)
export { TETROMINO_COLORS } from './theme';

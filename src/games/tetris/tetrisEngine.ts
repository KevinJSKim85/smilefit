import type { TetrisGameState, TetrisBoard, TetrisPiece, TetrisCell } from '../../types/tetris';
import {
  BOARD_COLS,
  BOARD_ROWS,
  LINE_SCORES,
  LEVEL_SPEEDS,
  LINES_PER_LEVEL,
} from '../../constants/tetris';
import { getShape, getWallKicks, type PieceBag, createPiece } from './pieceManager';

// ─── Board helpers ──────────────────────────────────────

function createEmptyBoard(): TetrisBoard {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array<TetrisCell>(BOARD_COLS).fill(null)
  );
}

export function fits(board: TetrisBoard, shape: number[][], row: number, col: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = row + r;
      const bc = col + c;
      if (br < 0 || br >= BOARD_ROWS || bc < 0 || bc >= BOARD_COLS) return false;
      if (board[br][bc] !== null) return false;
    }
  }
  return true;
}

export function lockPiece(board: TetrisBoard, piece: TetrisPiece): TetrisBoard {
  const newBoard = board.map((row) => [...row]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const br = piece.row + r;
      const bc = piece.col + c;
      if (br >= 0 && br < BOARD_ROWS && bc >= 0 && bc < BOARD_COLS) {
        newBoard[br][bc] = piece.type;
      }
    }
  }
  return newBoard;
}

export function clearLines(board: TetrisBoard): [TetrisBoard, number] {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = BOARD_ROWS - remaining.length;
  if (cleared === 0) return [board, 0];

  const emptyRows: TetrisCell[][] = Array.from({ length: cleared }, () =>
    Array<TetrisCell>(BOARD_COLS).fill(null)
  );
  return [[...emptyRows, ...remaining], cleared];
}

// ─── Public API ─────────────────────────────────────────

export function createInitialState(bag: PieceBag): TetrisGameState {
  const currentType = bag.next();
  const nextType = bag.next();
  return {
    board: createEmptyBoard(),
    currentPiece: createPiece(currentType, BOARD_COLS),
    nextPiece: createPiece(nextType, BOARD_COLS),
    score: 0,
    level: 1,
    linesCleared: 0,
    gameOver: false,
    dropTimer: 0,
    dropInterval: LEVEL_SPEEDS[1],
  };
}

/** Where the current piece would land if hard-dropped. */
export function getGhostRow(board: TetrisBoard, piece: TetrisPiece): number {
  let row = piece.row;
  while (fits(board, piece.shape, row + 1, piece.col)) {
    row++;
  }
  return row;
}

/** Move piece left (-1) or right (+1). */
export function movePiece(state: TetrisGameState, direction: -1 | 1): TetrisGameState {
  if (state.gameOver) return state;
  const newCol = state.currentPiece.col + direction;
  if (fits(state.board, state.currentPiece.shape, state.currentPiece.row, newCol)) {
    return {
      ...state,
      currentPiece: { ...state.currentPiece, col: newCol },
    };
  }
  return state;
}

/** Rotate piece clockwise with SRS wall kicks. */
export function rotatePiece(state: TetrisGameState): TetrisGameState {
  if (state.gameOver) return state;
  const piece = state.currentPiece;
  if (piece.type === 'O') return state;

  const newRotation = (piece.rotation + 1) % 4;
  const newShape = getShape(piece.type, newRotation);
  const kicks = getWallKicks(piece.type, piece.rotation, newRotation);

  for (const [dx, dy] of kicks) {
    const newCol = piece.col + dx;
    const newRow = piece.row - dy; // SRS dy is inverted for screen coords
    if (fits(state.board, newShape, newRow, newCol)) {
      return {
        ...state,
        currentPiece: {
          ...piece,
          shape: newShape,
          rotation: newRotation,
          row: newRow,
          col: newCol,
        },
      };
    }
  }
  return state; // all kicks failed
}

/** Hard drop — teleport to ghost row, lock, spawn next. */
export function hardDrop(state: TetrisGameState, bag: PieceBag): TetrisGameState {
  if (state.gameOver) return state;
  const ghostRow = getGhostRow(state.board, state.currentPiece);
  const droppedPiece = { ...state.currentPiece, row: ghostRow };
  return lockAndSpawn({ ...state, currentPiece: droppedPiece }, bag);
}

/** Gravity — accumulate timer, drop one row when interval reached. */
export function updateGravity(
  state: TetrisGameState,
  deltaMs: number,
  bag: PieceBag
): TetrisGameState {
  if (state.gameOver) return state;
  const newTimer = state.dropTimer + deltaMs;
  if (newTimer >= state.dropInterval) {
    return gravityDrop({ ...state, dropTimer: newTimer - state.dropInterval }, bag);
  }
  return { ...state, dropTimer: newTimer };
}

// ─── Internal ───────────────────────────────────────────

function gravityDrop(state: TetrisGameState, bag: PieceBag): TetrisGameState {
  const piece = state.currentPiece;
  if (fits(state.board, piece.shape, piece.row + 1, piece.col)) {
    return { ...state, currentPiece: { ...piece, row: piece.row + 1 } };
  }
  return lockAndSpawn(state, bag);
}

function lockAndSpawn(state: TetrisGameState, bag: PieceBag): TetrisGameState {
  const boardAfterLock = lockPiece(state.board, state.currentPiece);
  const [boardAfterClear, lines] = clearLines(boardAfterLock);

  const newLinesCleared = state.linesCleared + lines;
  const newLevel = Math.min(Math.floor(newLinesCleared / LINES_PER_LEVEL) + 1, LEVEL_SPEEDS.length - 1);
  const lineScore = LINE_SCORES[lines] || 0;
  const newScore = state.score + lineScore * state.level;
  const newDropInterval = LEVEL_SPEEDS[Math.min(newLevel, LEVEL_SPEEDS.length - 1)];

  const newCurrent = state.nextPiece;
  const newNext = createPiece(bag.next(), BOARD_COLS);

  // Game over if new piece doesn't fit at spawn
  if (!fits(boardAfterClear, newCurrent.shape, newCurrent.row, newCurrent.col)) {
    return {
      ...state,
      board: boardAfterClear,
      currentPiece: newCurrent,
      nextPiece: newNext,
      score: newScore,
      level: newLevel,
      linesCleared: newLinesCleared,
      dropInterval: newDropInterval,
      dropTimer: 0,
      gameOver: true,
    };
  }

  return {
    board: boardAfterClear,
    currentPiece: newCurrent,
    nextPiece: newNext,
    score: newScore,
    level: newLevel,
    linesCleared: newLinesCleared,
    dropInterval: newDropInterval,
    dropTimer: 0,
    gameOver: false,
  };
}

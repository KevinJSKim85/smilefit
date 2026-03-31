import type { TetrominoType, TetrisPiece } from '../../types/tetris';

/**
 * SRS (Super Rotation System) shapes — 4 rotation states per piece.
 * Each state is a 2D grid where 1 = filled cell.
 */
const SHAPES: Record<TetrominoType, number[][][]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
};

// ─── SRS Wall Kick Data ────────────────────────────────

/** Wall kicks for J, L, S, T, Z pieces. */
const WALL_KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0>1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
  '1>2': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
  '2>3': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
  '3>0': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
};

/** Wall kicks for I piece. */
const WALL_KICKS_I: Record<string, [number, number][]> = {
  '0>1': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
  '1>2': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
  '2>3': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
  '3>0': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
};

// ─── Public API ─────────────────────────────────────────

export function getShape(type: TetrominoType, rotation: number): number[][] {
  return SHAPES[type][rotation % 4];
}

export function getWallKicks(
  type: TetrominoType,
  fromRotation: number,
  toRotation: number
): [number, number][] {
  if (type === 'O') return [[0, 0]];
  const key = `${fromRotation % 4}>${toRotation % 4}`;
  const table = type === 'I' ? WALL_KICKS_I : WALL_KICKS_JLSTZ;
  return table[key] || [[0, 0]];
}

/** 7-bag randomizer — guarantees all 7 pieces appear before any repeats. */
export class PieceBag {
  private bag: TetrominoType[] = [];

  next(): TetrominoType {
    if (this.bag.length === 0) {
      this.bag = this.refill();
    }
    return this.bag.pop()!;
  }

  private refill(): TetrominoType[] {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    // Fisher-Yates shuffle
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    return types;
  }

  reset(): void {
    this.bag = [];
  }
}

/** Create a piece at the spawn position (top-center of board). */
export function createPiece(type: TetrominoType, boardCols: number): TetrisPiece {
  const shape = getShape(type, 0);
  const col = Math.floor((boardCols - shape[0].length) / 2);
  return { type, shape, row: 0, col, rotation: 0 };
}

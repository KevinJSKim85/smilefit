export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface TetrisPiece {
  type: TetrominoType;
  shape: number[][];
  row: number;
  col: number;
  rotation: number;
}

export type TetrisCell = TetrominoType | null;
export type TetrisBoard = TetrisCell[][];

export interface TetrisGameState {
  board: TetrisBoard;
  currentPiece: TetrisPiece;
  nextPiece: TetrisPiece;
  score: number;
  level: number;
  linesCleared: number;
  gameOver: boolean;
  dropTimer: number;
  dropInterval: number;
}

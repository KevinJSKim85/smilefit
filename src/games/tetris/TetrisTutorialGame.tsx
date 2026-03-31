import { useRef, useEffect, useCallback } from 'react';
import { useGameLoop } from '../../hooks/useGameLoop';
import {
  movePiece,
  rotatePiece,
  getGhostRow,
  fits,
  lockPiece,
  clearLines,
} from './tetrisEngine';
import { createPiece, getShape } from './pieceManager';
import { renderFrame, resetRendererState, CANVAS_WIDTH, CANVAS_HEIGHT } from './tetrisRenderer';
import type { LineClearOverlay } from './tetrisRenderer';
import type { TetrisGameState, TetrisBoard, TetrisCell, TetrominoType } from '../../types/tetris';
import { BOARD_COLS, BOARD_ROWS } from '../../constants/tetris';
import { SMILE_AFTER_WINK_GRACE_MS, SMILE_REPEAT_MS, WINK_HOLD_MS, DOUBLE_WINK_HOLD_MS } from '../../constants/detection';

interface TetrisTutorialGameProps {
  leftWink: boolean;
  rightWink: boolean;
  doubleWink: boolean;
  isSmiling: boolean;
  holdMs: number;
  holdSide: 'left' | 'right' | null;
  doubleHoldMs: number;
  smileScore: number;
  isRunning: boolean;
  onPhaseChange: (phase: number) => void;
  onPhaseClear: (phase: number) => void;
  onSuccess: (remaining: number) => void;
  onRetry: () => void;
  onComplete: () => void;
  advanceSignal: number;
  resetKey: number;
  controlHints?: string[];
  gaugeLabels?: string[];
}

const TUTORIAL_DROP_INTERVAL = 2000;
const TOTAL_PHASES = 4;
const SUCCESSES_REQUIRED = 3;
const AUTO_DROP_DELAY = 400;      // ms after reaching target before auto hard-drop
const LINE_CLEAR_ANIM_MS = 500;   // line clear flash duration
const RESET_AFTER_CLEAR_MS = 400; // pause after clear before resetting board

// Piece types per phase: I for move phases, O for drop, T for rotate
const PHASE_PIECES: TetrominoType[] = ['I', 'I', 'O', 'T'];

// Fill colors for pre-filled board (varied to look natural)
const FILL_TYPES: TetrominoType[] = ['Z', 'L', 'S', 'J', 'T', 'O', 'I'];
function fillType(col: number, row: number): TetrominoType {
  return FILL_TYPES[(col + row * 3) % FILL_TYPES.length];
}

// ─── Board pre-fill per phase ────────────────────────────

function createTutorialBoard(phase: number): TetrisBoard {
  const board: TetrisBoard = Array.from({ length: BOARD_ROWS }, () =>
    Array<TetrisCell>(BOARD_COLS).fill(null)
  );

  if (phase === 0) {
    // Row 19: cols 4-9 filled, cols 0-3 empty (gap on left for I-piece)
    for (let c = 4; c < BOARD_COLS; c++) {
      board[BOARD_ROWS - 1][c] = fillType(c, BOARD_ROWS - 1);
    }
  } else if (phase === 1) {
    // Row 19: cols 0-5 filled, cols 6-9 empty (gap on right for I-piece)
    for (let c = 0; c <= 5; c++) {
      board[BOARD_ROWS - 1][c] = fillType(c, BOARD_ROWS - 1);
    }
  } else if (phase === 2) {
    // Rows 18-19: cols 0-3 & 6-9 filled, cols 4-5 empty (2x2 gap for O-piece)
    for (const r of [BOARD_ROWS - 2, BOARD_ROWS - 1]) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (c >= 4 && c <= 5) continue;
        board[r][c] = fillType(c, r);
      }
    }
  } else if (phase === 3) {
    // T-piece spawns at state 3 (ㅓ, pointing left): [[0,1,0],[1,1,0],[0,1,0]]
    // 3 CW rotations → state 2 (ㅜ, pointing down): [[0,0,0],[1,1,1],[0,1,0]]
    // At col 3, state 2 fills: (r+1,3), (r+1,4), (r+1,5), (r+2,4)
    // Ghost row = 17 → fills (18,3), (18,4), (18,5), (19,4) → 2 full rows clear
    // Row 18: cols 0-2 filled, cols 3-5 empty, cols 6-9 filled
    for (let c = 0; c < BOARD_COLS; c++) {
      if (c >= 3 && c <= 5) continue;
      board[BOARD_ROWS - 2][c] = fillType(c, BOARD_ROWS - 2);
    }
    // Row 19: cols 0-3 filled, col 4 empty, cols 5-9 filled
    for (let c = 0; c < BOARD_COLS; c++) {
      if (c === 4) continue;
      board[BOARD_ROWS - 1][c] = fillType(c, BOARD_ROWS - 1);
    }
  }

  return board;
}

function createTutorialState(phase: number): TetrisGameState {
  const pieceType = PHASE_PIECES[phase];
  const basePiece = createPiece(pieceType, BOARD_COLS);
  // Phase 3: spawn T at rotation 3 (ㅓ) so user rotates 3x CW → ㅜ
  const currentPiece = phase === 3
    ? { ...basePiece, rotation: 3, shape: getShape('T', 3) }
    : basePiece;
  return {
    board: createTutorialBoard(phase),
    currentPiece,
    nextPiece: createPiece(pieceType, BOARD_COLS),
    score: 0,
    level: 1,
    linesCleared: 0,
    gameOver: false,
    dropTimer: 0,
    dropInterval: TUTORIAL_DROP_INTERVAL,
  };
}

function findFullRows(board: TetrisBoard): number[] {
  const rows: number[] = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    if (board[r].every(cell => cell !== null)) rows.push(r);
  }
  return rows;
}

export function TetrisTutorialGame({
  leftWink,
  rightWink,
  doubleWink,
  isSmiling,
  holdMs,
  holdSide,
  doubleHoldMs,
  smileScore: _smileScore,
  isRunning,
  onPhaseChange,
  onPhaseClear,
  onSuccess,
  onRetry,
  onComplete,
  advanceSignal,
  resetKey,
  controlHints,
  gaugeLabels,
}: TetrisTutorialGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<TetrisGameState>(createTutorialState(0));

  const phaseRef = useRef(0);
  const completedRef = useRef(false);
  const successCountRef = useRef(0);

  // Input refs
  const leftWinkRef = useRef(leftWink);
  const rightWinkRef = useRef(rightWink);
  const doubleWinkRef = useRef(doubleWink);
  const isSmilingRef = useRef(isSmiling);
  const holdMsRef = useRef(holdMs);
  const holdSideRef = useRef(holdSide);
  const doubleHoldMsRef = useRef(doubleHoldMs);

  useEffect(() => { leftWinkRef.current = leftWink; }, [leftWink]);
  useEffect(() => { rightWinkRef.current = rightWink; }, [rightWink]);
  useEffect(() => { doubleWinkRef.current = doubleWink; }, [doubleWink]);
  useEffect(() => { isSmilingRef.current = isSmiling; }, [isSmiling]);
  useEffect(() => { holdMsRef.current = holdMs; }, [holdMs]);
  useEffect(() => { holdSideRef.current = holdSide; }, [holdSide]);
  useEffect(() => { doubleHoldMsRef.current = doubleHoldMs; }, [doubleHoldMs]);

  const prevInputsRef = useRef({
    leftWink: false,
    rightWink: false,
    doubleWink: false,
    isSmiling: false,
  });

  const lastWinkTimeRef = useRef(0);
  const lastSmileFireRef = useRef(0); // cooldown for smile repeat while holding
  const actionFeedbackRef = useRef<{ type: string; time: number }>({ type: '', time: 0 });

  // Phase 3 rotation counter (need 3 rotations before auto-drop)
  const rotationCountRef = useRef(0);

  // Auto-drop state: after piece reaches target, wait then hard drop
  const autoDropPendingRef = useRef(false);
  const autoDropTimerRef = useRef(0);

  // Line clear animation state
  const lineClearRef = useRef<{
    rows: number[];
    startTime: number;
    board: TetrisBoard; // board state with piece locked (before clear)
  } | null>(null);

  // Post-clear pause
  const postClearRef = useRef<{ startTime: number } | null>(null);

  // Waiting for parent to advance (after phase clear toast)
  const waitingForAdvanceRef = useRef(false);

  // Reset on mount or resetKey change
  useEffect(() => {
    stateRef.current = createTutorialState(0);
    ctxRef.current = null;
    phaseRef.current = 0;
    resetRendererState();
    completedRef.current = false;
    successCountRef.current = 0;
    rotationCountRef.current = 0;
    waitingForAdvanceRef.current = false;
    autoDropPendingRef.current = false;
    autoDropTimerRef.current = 0;
    lineClearRef.current = null;
    postClearRef.current = null;
    prevInputsRef.current = { leftWink: false, rightWink: false, doubleWink: false, isSmiling: false };
    onPhaseChange(0);
  }, [resetKey, onPhaseChange]);

  // Advance phase when parent signals (after toast timeout)
  useEffect(() => {
    if (advanceSignal === 0) return;
    if (!waitingForAdvanceRef.current) return;
    waitingForAdvanceRef.current = false;

    const nextPhase = phaseRef.current + 1;
    if (nextPhase >= TOTAL_PHASES) {
      completedRef.current = true;
      onPhaseChange(TOTAL_PHASES);
      onComplete();
    } else {
      phaseRef.current = nextPhase;
      successCountRef.current = 0;
      rotationCountRef.current = 0;
      stateRef.current = createTutorialState(nextPhase);
      autoDropPendingRef.current = false;
      autoDropTimerRef.current = 0;
      lineClearRef.current = null;
      postClearRef.current = null;
      onPhaseChange(nextPhase);
    }
  }, [advanceSignal, onPhaseChange, onComplete]);

  // Handle success after line clear animation
  const handleSuccess = useCallback((phase: number) => {
    successCountRef.current++;
    const remaining = SUCCESSES_REQUIRED - successCountRef.current;
    onSuccess(remaining);

    if (successCountRef.current >= SUCCESSES_REQUIRED) {
      waitingForAdvanceRef.current = true;
      onPhaseClear(phase);
    } else {
      // Reset board for next rep
      stateRef.current = createTutorialState(phase);
      autoDropPendingRef.current = false;
      autoDropTimerRef.current = 0;
      rotationCountRef.current = 0;
    }
  }, [onSuccess, onPhaseClear]);

  // Lock the current piece and check for line clears
  const lockAndCheck = useCallback((now: number) => {
    const state = stateRef.current;
    const ghostRow = getGhostRow(state.board, state.currentPiece);
    const droppedPiece = { ...state.currentPiece, row: ghostRow };
    const boardAfterLock = lockPiece(state.board, droppedPiece);
    const fullRows = findFullRows(boardAfterLock);

    // Update state to show locked piece
    stateRef.current = {
      ...state,
      currentPiece: droppedPiece,
      board: boardAfterLock,
    };

    if (fullRows.length > 0) {
      // Start line clear animation
      lineClearRef.current = {
        rows: fullRows,
        startTime: now,
        board: boardAfterLock,
      };
    } else {
      // Piece locked but no lines cleared — wrong position, show retry message
      const phase = phaseRef.current;
      onRetry();
      stateRef.current = createTutorialState(phase);
      rotationCountRef.current = 0;
    }

    autoDropPendingRef.current = false;
    autoDropTimerRef.current = 0;
  }, [onRetry]);

  const tick = useCallback(
    (deltaMs: number) => {
      if (completedRef.current || waitingForAdvanceRef.current) return;

      const now = performance.now();
      const phase = phaseRef.current;

      // ── Line clear animation in progress ──
      if (lineClearRef.current) {
        const elapsed = now - lineClearRef.current.startTime;
        if (elapsed >= LINE_CLEAR_ANIM_MS) {
          // Animation done — clear the lines and start post-clear pause
          const [clearedBoard] = clearLines(lineClearRef.current.board);
          stateRef.current = { ...stateRef.current, board: clearedBoard };
          lineClearRef.current = null;
          postClearRef.current = { startTime: now };
        }
        // Render with flash overlay
        if (!ctxRef.current) {
          ctxRef.current = canvasRef.current?.getContext('2d') ?? null;
        }
        if (ctxRef.current) {
          const progress = lineClearRef.current
            ? Math.min((now - lineClearRef.current.startTime) / LINE_CLEAR_ANIM_MS, 1)
            : 1;
          const lcOverlay: LineClearOverlay | undefined = lineClearRef.current
            ? { rows: lineClearRef.current.rows, progress }
            : undefined;
          renderFrame(ctxRef.current, stateRef.current, controlHints, actionFeedbackRef.current, { gaugeProgress: 0, phase }, lcOverlay);
        }
        return;
      }

      // ── Post-clear pause ──
      if (postClearRef.current) {
        const elapsed = now - postClearRef.current.startTime;
        if (elapsed >= RESET_AFTER_CLEAR_MS) {
          postClearRef.current = null;
          handleSuccess(phase);
        }
        // Render current state during pause
        if (!ctxRef.current) {
          ctxRef.current = canvasRef.current?.getContext('2d') ?? null;
        }
        if (ctxRef.current) {
          renderFrame(ctxRef.current, stateRef.current, controlHints, actionFeedbackRef.current, { gaugeProgress: 0, phase });
        }
        return;
      }

      // ── Auto-drop pending (piece reached target) ──
      if (autoDropPendingRef.current) {
        autoDropTimerRef.current += deltaMs;
        if (autoDropTimerRef.current >= AUTO_DROP_DELAY) {
          lockAndCheck(now);
        }
        // Still render during the wait
        if (!ctxRef.current) {
          ctxRef.current = canvasRef.current?.getContext('2d') ?? null;
        }
        if (ctxRef.current) {
          renderFrame(ctxRef.current, stateRef.current, controlHints, actionFeedbackRef.current, { gaugeProgress: 0, phase });
        }
        return;
      }

      // ── Normal gameplay: accept inputs ──
      const inputs = {
        leftWink: leftWinkRef.current,
        rightWink: rightWinkRef.current,
        doubleWink: doubleWinkRef.current,
        isSmiling: isSmilingRef.current,
      };
      const prev = prevInputsRef.current;

      if (phase === 0 && inputs.leftWink && !prev.leftWink) {
        stateRef.current = movePiece(stateRef.current, -1);
        lastWinkTimeRef.current = now;
        actionFeedbackRef.current = { type: 'left', time: now };
        // Check if piece reached target col
        if (stateRef.current.currentPiece.col === 0) {
          autoDropPendingRef.current = true;
          autoDropTimerRef.current = 0;
        }
      } else if (phase === 1 && inputs.rightWink && !prev.rightWink) {
        stateRef.current = movePiece(stateRef.current, 1);
        lastWinkTimeRef.current = now;
        actionFeedbackRef.current = { type: 'right', time: now };
        // I-piece at col=6 fills cols 6,7,8,9
        if (stateRef.current.currentPiece.col === 6) {
          autoDropPendingRef.current = true;
          autoDropTimerRef.current = 0;
        }
      } else if (phase === 2 && inputs.doubleWink && !prev.doubleWink) {
        // Double blink — hard drop immediately
        lastWinkTimeRef.current = now;
        actionFeedbackRef.current = { type: 'drop', time: now };
        lockAndCheck(now);
      } else if (
        phase === 3 &&
        inputs.isSmiling &&
        now - lastWinkTimeRef.current > SMILE_AFTER_WINK_GRACE_MS &&
        (!prev.isSmiling || now - lastSmileFireRef.current >= SMILE_REPEAT_MS)
      ) {
        // Smile — rotate; fires on edge + repeats every 400ms while held
        lastSmileFireRef.current = now;
        const prevRotation = stateRef.current.currentPiece.rotation;
        stateRef.current = rotatePiece(stateRef.current);
        actionFeedbackRef.current = { type: 'rotate', time: now };
        if (stateRef.current.currentPiece.rotation !== prevRotation) {
          rotationCountRef.current++;
          if (rotationCountRef.current >= 3) {
            autoDropPendingRef.current = true;
            autoDropTimerRef.current = 0;
          }
        }
      }

      prev.leftWink = inputs.leftWink;
      prev.rightWink = inputs.rightWink;
      prev.doubleWink = inputs.doubleWink;
      prev.isSmiling = inputs.isSmiling;

      // ── Gravity (only when not auto-dropping) ──
      if (!autoDropPendingRef.current) {
        const newTimer = stateRef.current.dropTimer + deltaMs;
        if (newTimer >= TUTORIAL_DROP_INTERVAL) {
          const piece = stateRef.current.currentPiece;
          if (fits(stateRef.current.board, piece.shape, piece.row + 1, piece.col)) {
            stateRef.current = {
              ...stateRef.current,
              currentPiece: { ...piece, row: piece.row + 1 },
              dropTimer: newTimer - TUTORIAL_DROP_INTERVAL,
            };
          } else {
            // Piece can't move down — lock it
            lockAndCheck(now);
          }
        } else {
          stateRef.current = { ...stateRef.current, dropTimer: newTimer };
        }
      }

      // ── Compute gauge progress ──
      let gaugeProgress = 0;
      if (phase === 0 && holdSideRef.current === 'left') {
        gaugeProgress = Math.min(holdMsRef.current / WINK_HOLD_MS, 1);
      } else if (phase === 1 && holdSideRef.current === 'right') {
        gaugeProgress = Math.min(holdMsRef.current / WINK_HOLD_MS, 1);
      } else if (phase === 2) {
        gaugeProgress = Math.min(doubleHoldMsRef.current / DOUBLE_WINK_HOLD_MS, 1);
      }
      // Phase 3 (smile): no gauge

      const gaugeLabel = gaugeLabels?.[phase];

      // ── Render ──
      if (!ctxRef.current) {
        ctxRef.current = canvasRef.current?.getContext('2d') ?? null;
      }
      if (ctxRef.current) {
        renderFrame(
          ctxRef.current,
          stateRef.current,
          controlHints,
          actionFeedbackRef.current,
          { gaugeProgress, phase, gaugeLabel },
        );
      }
    },
    [onSuccess, onPhaseClear, controlHints, gaugeLabels, handleSuccess, lockAndCheck],
  );

  useGameLoop(tick, isRunning);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="block rounded-xl"
      style={{ maxHeight: '70vh', width: 'auto' }}
    />
  );
}

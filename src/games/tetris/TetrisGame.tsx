import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameLoop } from '../../hooks/useGameLoop';
import {
  createInitialState,
  movePiece,
  rotatePiece,
  hardDrop,
  updateGravity,
} from './tetrisEngine';
import { PieceBag } from './pieceManager';
import { renderFrame, resetRendererState, buildLockFlashCells, CANVAS_WIDTH, CANVAS_HEIGHT } from './tetrisRenderer';
import type { LockFlashOverlay } from './tetrisRenderer';
import { getGhostRow } from './tetrisEngine';
import { soundManager } from '../../audio/SoundManager';
import type { TetrisGameState } from '../../types/tetris';
import { SMILE_AFTER_WINK_GRACE_MS, SMILE_REPEAT_MS } from '../../constants/detection';

interface TetrisGameProps {
  leftWink: boolean;
  rightWink: boolean;
  doubleWink: boolean;
  isSmiling: boolean;
  isRunning: boolean;
  onGameOver: (score: number) => void;
  controlHints?: string[];
}

export function TetrisGame({
  leftWink,
  rightWink,
  doubleWink,
  isSmiling,
  isRunning,
  onGameOver,
  controlHints,
}: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [initials] = useState(() => {
    const bag = new PieceBag();
    return { bag, state: createInitialState(bag) };
  });
  const bagRef = useRef(initials.bag);
  const stateRef = useRef<TetrisGameState>(initials.state);
  const gameOverFiredRef = useRef(false);
  const gameOverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [ended, setEnded] = useState(false);

  // ─── Input refs (avoid stale closures) ──────────────
  const leftWinkRef = useRef(leftWink);
  const rightWinkRef = useRef(rightWink);
  const doubleWinkRef = useRef(doubleWink);
  const isSmilingRef = useRef(isSmiling);

  useEffect(() => { leftWinkRef.current = leftWink; }, [leftWink]);
  useEffect(() => { rightWinkRef.current = rightWink; }, [rightWink]);
  useEffect(() => { doubleWinkRef.current = doubleWink; }, [doubleWink]);
  useEffect(() => { isSmilingRef.current = isSmiling; }, [isSmiling]);

  // Previous input values for rising-edge detection
  const prevInputsRef = useRef({
    leftWink: false,
    rightWink: false,
    doubleWink: false,
    isSmiling: false,
  });

  // Grace period: ignore smile rising edge shortly after a wink
  // (priority suppression releases isSmiling which causes false rotation)
  const lastWinkTimeRef = useRef(0);
  const lastSmileFireRef = useRef(0);

  // Action feedback for visual indicators (ref = no re-renders)
  const actionFeedbackRef = useRef<{ type: string; time: number }>({ type: '', time: 0 });

  // Lock flash overlay (set on lock, fades over 150ms)
  const lockFlashRef = useRef<LockFlashOverlay | undefined>(undefined);

  // Reset on mount; clean up timer on unmount
  useEffect(() => {
    bagRef.current.reset();
    stateRef.current = createInitialState(bagRef.current);
    gameOverFiredRef.current = false;
    resetRendererState();
    return () => {
      clearTimeout(gameOverTimerRef.current);
    };
  }, []);

  const tick = useCallback(
    (deltaMs: number) => {
      if (gameOverFiredRef.current) return;

      const now = performance.now();
      const inputs = {
        leftWink: leftWinkRef.current,
        rightWink: rightWinkRef.current,
        doubleWink: doubleWinkRef.current,
        isSmiling: isSmilingRef.current,
      };
      const prev = prevInputsRef.current;

      // ─── Process inputs (rising edges only) ───────
      // Priority: doubleWink > wink > smile

      if (inputs.doubleWink && !prev.doubleWink) {
        const preDrop = stateRef.current;
        const dropRow = getGhostRow(preDrop.board, preDrop.currentPiece);
        stateRef.current = hardDrop(stateRef.current, bagRef.current);
        lockFlashRef.current = {
          cells: buildLockFlashCells(preDrop.currentPiece, dropRow),
          startTime: now,
        };
        lastWinkTimeRef.current = now;
        actionFeedbackRef.current = { type: 'drop', time: now };
        soundManager.play('pieceLock');
      } else if (inputs.leftWink && !prev.leftWink) {
        const prevCol = stateRef.current.currentPiece.col;
        stateRef.current = movePiece(stateRef.current, -1);
        lastWinkTimeRef.current = now;
        actionFeedbackRef.current = { type: 'left', time: now };
        if (stateRef.current.currentPiece.col !== prevCol) soundManager.play('pieceMove');
      } else if (inputs.rightWink && !prev.rightWink) {
        const prevCol = stateRef.current.currentPiece.col;
        stateRef.current = movePiece(stateRef.current, 1);
        lastWinkTimeRef.current = now;
        actionFeedbackRef.current = { type: 'right', time: now };
        if (stateRef.current.currentPiece.col !== prevCol) soundManager.play('pieceMove');
      }

      // Smile → rotate (with grace period after winks, repeats while held)
      if (
        inputs.isSmiling &&
        now - lastWinkTimeRef.current > SMILE_AFTER_WINK_GRACE_MS &&
        (!prev.isSmiling || now - lastSmileFireRef.current >= SMILE_REPEAT_MS)
      ) {
        lastSmileFireRef.current = now;
        const prevRot = stateRef.current.currentPiece.rotation;
        stateRef.current = rotatePiece(stateRef.current);
        actionFeedbackRef.current = { type: 'rotate', time: now };
        if (stateRef.current.currentPiece.rotation !== prevRot) soundManager.play('pieceRotate');
      }

      // Direct assignment (avoids object spread allocation per frame)
      prev.leftWink = inputs.leftWink;
      prev.rightWink = inputs.rightWink;
      prev.doubleWink = inputs.doubleWink;
      prev.isSmiling = inputs.isSmiling;

      // ─── Gravity ──────────────────────────────────
      const preGravity = stateRef.current;
      stateRef.current = updateGravity(stateRef.current, deltaMs, bagRef.current);

      // Detect gravity-triggered lock (nextPiece changes only on spawn)
      if (stateRef.current.nextPiece !== preGravity.nextPiece) {
        soundManager.play('pieceLock');
        lockFlashRef.current = {
          cells: buildLockFlashCells(preGravity.currentPiece, preGravity.currentPiece.row),
          startTime: now,
        };
      }
      // Detect line clears
      if (stateRef.current.linesCleared > preGravity.linesCleared) {
        const cleared = stateRef.current.linesCleared - preGravity.linesCleared;
        soundManager.play(cleared >= 3 ? 'tetrisClear' : 'lineClear');
      }
      // Detect level up
      if (stateRef.current.level > preGravity.level) {
        soundManager.play('levelUp');
      }

      // ─── Render (ctx cached in ref) ────────────────
      if (!ctxRef.current) {
        ctxRef.current = canvasRef.current?.getContext('2d') ?? null;
      }
      if (ctxRef.current) {
        renderFrame(ctxRef.current, stateRef.current, controlHints, actionFeedbackRef.current, undefined, undefined, lockFlashRef.current);
      }

      // ─── Game over ───────────────────────────────
      if (stateRef.current.gameOver && !gameOverFiredRef.current) {
        gameOverFiredRef.current = true;
        setEnded(true);
        const score = stateRef.current.score;
        gameOverTimerRef.current = setTimeout(() => onGameOver(score), 600);
      }
    },
    [onGameOver]
  );

  useGameLoop(tick, isRunning && !ended);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="block rounded-xl"
      style={{ maxHeight: '85vh', width: 'auto' }}
    />
  );
}

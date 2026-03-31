import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameLoop } from '../../hooks/useGameLoop';
import { createInitialState, update } from './balloonEngine';
import { ObstacleManager } from './obstacleManager';
import { renderFrame } from './balloonRenderer';
import { soundManager } from '../../audio/SoundManager';
import type { BalloonGameState } from '../../types/balloon';
import { BALLOON_START_X, INITIAL_SCROLL_SPEED, MAX_SCROLL_SPEED } from '../../constants/balloon';

interface BalloonGameProps {
  smileIntensity: number;
  isRunning: boolean;
  onGameOver: (score: number) => void;
}

// Proportional scale — game logic stays in the original coordinate space,
// canvas renders 1.2× bigger via ctx.scale. Difficulty is identical.
const SCALE = 1.2;
const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 500;
const CANVAS_WIDTH = Math.round(LOGICAL_WIDTH * SCALE);   // 960
const CANVAS_HEIGHT = Math.round(LOGICAL_HEIGHT * SCALE);  // 600

export function BalloonGame({ smileIntensity, isRunning, onGameOver }: BalloonGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<BalloonGameState>(createInitialState(LOGICAL_HEIGHT));
  const managerRef = useRef(new ObstacleManager());
  const gameOverFiredRef = useRef(false);
  const smileRef = useRef(smileIntensity);
  const gameOverTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [ended, setEnded] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const debugRef = useRef(INITIAL_SCROLL_SPEED);
  const lastMilestoneRef = useRef(0);
  const passedCountRef = useRef(0);

  // Keep smile ref in sync (avoids stale closure in tick)
  useEffect(() => {
    smileRef.current = smileIntensity;
  }, [smileIntensity]);

  // Reset everything when the component mounts; clean up timer on unmount
  useEffect(() => {
    stateRef.current = createInitialState(LOGICAL_HEIGHT);
    managerRef.current.reset();
    gameOverFiredRef.current = false;
    return () => {
      clearTimeout(gameOverTimerRef.current);
    };
  }, []);

  // Debug overlay toggle: Ctrl+Shift+Alt+D
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.altKey && e.code === 'KeyD') {
        e.preventDefault();
        setShowDebug((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const tick = useCallback(
    (deltaMs: number) => {
      if (gameOverFiredRef.current) return;

      // Spawn obstacles (logical coordinates)
      const scrollPixels = stateRef.current.scrollSpeed * deltaMs;
      const spawned = managerRef.current.update(
        scrollPixels,
        stateRef.current.distance,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT
      );

      // Update game state (logical coordinates)
      stateRef.current = update(
        stateRef.current,
        smileRef.current,
        spawned,
        deltaMs,
        LOGICAL_HEIGHT
      );

      // Score milestone sound (every 50 distance)
      const currentMilestone = Math.floor(stateRef.current.distance / 50);
      if (currentMilestone > lastMilestoneRef.current && lastMilestoneRef.current > 0) {
        soundManager.play('scoreMilestone', 0.5);
      }
      lastMilestoneRef.current = currentMilestone;

      // Obstacle pass sound — count obstacles whose right edge is behind the balloon
      let passed = 0;
      for (const obs of stateRef.current.obstacles) {
        if (obs.x + obs.width < BALLOON_START_X) passed++;
      }
      if (passed > passedCountRef.current) {
        soundManager.play('obstaclePass', 0.4);
      }
      passedCountRef.current = passed;

      // Update debug data
      debugRef.current = stateRef.current.scrollSpeed;

      // Render — scale the canvas context so the game draws bigger
      if (!ctxRef.current) {
        ctxRef.current = canvasRef.current?.getContext('2d') ?? null;
      }
      if (ctxRef.current) {
        ctxRef.current.setTransform(SCALE, 0, 0, SCALE, 0, 0);
        renderFrame(ctxRef.current, stateRef.current, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        ctxRef.current.setTransform(1, 0, 0, 1, 0, 0);
      }

      // Detect game over
      if (stateRef.current.gameOver) {
        gameOverFiredRef.current = true;
        setEnded(true);
        soundManager.play('balloonPop');
        const score = Math.floor(stateRef.current.distance);
        gameOverTimerRef.current = setTimeout(() => onGameOver(score), 600);
      }
    },
    [onGameOver]
  );

  useGameLoop(tick, isRunning && !ended);

  const speed = debugRef.current;
  const speedPct = ((speed - INITIAL_SCROLL_SPEED) / (MAX_SCROLL_SPEED - INITIAL_SCROLL_SPEED) * 100).toFixed(0);

  return (
    <div className="inline-flex flex-col items-start">
      {showDebug && (
        <div className="mb-1 bg-black/70 text-white text-[11px] font-mono px-2.5 py-1 rounded-lg">
          speed: {speed.toFixed(3)} px/ms ({speedPct}%)
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block rounded-xl"
        style={{ maxHeight: '80vh', width: 'auto', maxWidth: '100%', aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
      />
    </div>
  );
}

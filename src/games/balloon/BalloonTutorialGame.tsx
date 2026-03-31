import { useRef, useEffect, useCallback } from 'react';
import { useGameLoop } from '../../hooks/useGameLoop';
import { renderFrame } from './balloonRenderer';
import { lerp, clamp } from '../../utils/math';
import type { BalloonGameState, BalloonEntity, Obstacle } from '../../types/balloon';
import {
  BALLOON_RADIUS,
  BALLOON_START_X,
  BALLOON_LERP_SPEED,
  INITIAL_SCROLL_SPEED,
  OBSTACLE_WIDTH,
  MIN_OBSTACLE_GAP,
  DISTANCE_MULTIPLIER,
} from '../../constants/balloon';

export type TutorialStage = 'fly' | 'pipe' | 'bird';

interface BalloonTutorialGameProps {
  smileIntensity: number;
  isRunning: boolean;
  onStageClear: (stage: TutorialStage) => void;
  onComplete: () => void;
  onHit: () => void;
  advanceSignal: number;
  resetKey: number;
}

const SCALE = 1.2;
const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 500;
const CANVAS_WIDTH = Math.round(LOGICAL_WIDTH * SCALE);
const CANVAS_HEIGHT = Math.round(LOGICAL_HEIGHT * SCALE);

const SCROLL_SPEED = INITIAL_SCROLL_SPEED;
const INVINCIBILITY_MS = 500;
const RESPAWN_DELAY_MS = 800;
const FLY_THRESHOLD = 0.60; // balloon must rise above bottom 40% of canvas
const FLY_LINGER_MS = 5000; // keep flying for 5s after condition met

type InternalStage = 'fly' | 'fly-clear' | 'pipe' | 'pipe-clear' | 'bird' | 'bird-clear' | 'done';

function createTutorialState(): BalloonGameState {
  return {
    balloon: {
      x: BALLOON_START_X,
      y: LOGICAL_HEIGHT / 2,
      targetY: LOGICAL_HEIGHT / 2,
      radius: BALLOON_RADIUS,
    },
    obstacles: [],
    distance: 0,
    scrollSpeed: SCROLL_SPEED,
    gameOver: false,
    smileIntensity: 0,
  };
}

function updateBalloon(
  balloon: BalloonEntity,
  smileIntensity: number,
  canvasHeight: number,
  deltaMs: number,
): BalloonEntity {
  const padding = balloon.radius + 10;
  const targetY = canvasHeight - padding - smileIntensity * (canvasHeight - 2 * padding);
  const t = 1 - Math.pow(1 - BALLOON_LERP_SPEED, deltaMs / 16.67);
  const newY = lerp(balloon.y, targetY, t);
  return {
    ...balloon,
    y: clamp(newY, padding, canvasHeight - padding),
    targetY,
  };
}

function checkCollision(balloon: BalloonEntity, obstacles: Obstacle[]): boolean {
  const r = balloon.radius * 0.8;
  for (const obs of obstacles) {
    const closestX = clamp(balloon.x, obs.x, obs.x + obs.width);
    const closestY = clamp(balloon.y, obs.y, obs.y + obs.height);
    const dx = balloon.x - closestX;
    const dy = balloon.y - closestY;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

function spawnPipePair(canvasWidth: number, canvasHeight: number): Obstacle[] {
  const gapSize = MIN_OBSTACLE_GAP + 40; // generous gap for tutorial
  const gapCenter = canvasHeight * 0.4; // upper-center gap
  const topHeight = gapCenter - gapSize / 2;
  const bottomY = gapCenter + gapSize / 2;
  const bottomHeight = canvasHeight - bottomY;
  return [
    { x: canvasWidth, y: 0, width: OBSTACLE_WIDTH, height: topHeight, type: 'pipe' as const },
    { x: canvasWidth, y: bottomY, width: OBSTACLE_WIDTH, height: bottomHeight, type: 'pipe' as const },
  ];
}

function spawnBird(canvasWidth: number, canvasHeight: number): Obstacle[] {
  const birdSize = 40;
  const y = canvasHeight * 0.5 - birdSize / 2;
  return [{ x: canvasWidth, y, width: birdSize, height: birdSize, type: 'bird' as const }];
}

export function BalloonTutorialGame({
  smileIntensity,
  isRunning,
  onStageClear,
  onComplete,
  onHit,
  advanceSignal,
  resetKey,
}: BalloonTutorialGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stateRef = useRef<BalloonGameState>(createTutorialState());
  const smileRef = useRef(smileIntensity);

  const stageRef = useRef<InternalStage>('fly');
  const invincibleUntilRef = useRef(0);
  const respawnAtRef = useRef(0); // timestamp to respawn after hit
  const stageClearFiredRef = useRef(false); // prevent double-firing onStageClear
  const flyConditionMetAtRef = useRef(0); // timestamp when fly threshold was first reached

  useEffect(() => {
    smileRef.current = smileIntensity;
  }, [smileIntensity]);

  // Reset on mount or when resetKey changes
  useEffect(() => {
    stateRef.current = createTutorialState();
    ctxRef.current = null;
    stageRef.current = 'fly';
    invincibleUntilRef.current = 0;
    respawnAtRef.current = 0;
    stageClearFiredRef.current = false;
    flyConditionMetAtRef.current = 0;
  }, [resetKey]);

  // Advance from *-clear stages when parent signals
  useEffect(() => {
    if (advanceSignal === 0) return;
    const stage = stageRef.current;
    if (stage === 'fly-clear') {
      stageRef.current = 'pipe';
      stageClearFiredRef.current = false;
      // Spawn pipe immediately
      stateRef.current = {
        ...stateRef.current,
        obstacles: spawnPipePair(LOGICAL_WIDTH, LOGICAL_HEIGHT),
      };
    } else if (stage === 'pipe-clear') {
      stageRef.current = 'bird';
      stageClearFiredRef.current = false;
      // Spawn bird immediately
      stateRef.current = {
        ...stateRef.current,
        obstacles: spawnBird(LOGICAL_WIDTH, LOGICAL_HEIGHT),
      };
    } else if (stage === 'bird-clear') {
      stageRef.current = 'done';
      onComplete();
    }
  }, [advanceSignal, onComplete]);

  const tick = useCallback(
    (deltaMs: number) => {
      const stage = stageRef.current;
      if (stage === 'done') return;

      const state = stateRef.current;
      const now = performance.now();
      const isPaused = stage.endsWith('-clear');

      // Update balloon (always — even during clear, so scene stays alive)
      const balloon = updateBalloon(state.balloon, smileRef.current, LOGICAL_HEIGHT, deltaMs);

      // Move obstacles only when not paused
      let obstacles = state.obstacles;
      let distance = state.distance;
      if (!isPaused) {
        const scrollPixels = SCROLL_SPEED * deltaMs;
        obstacles = obstacles
          .map((obs) => ({ ...obs, x: obs.x - scrollPixels }))
          .filter((obs) => obs.x + obs.width > -100);
        distance = state.distance + scrollPixels * DISTANCE_MULTIPLIER;
      }

      // Handle respawn delay after hit
      if (respawnAtRef.current > 0 && now >= respawnAtRef.current) {
        respawnAtRef.current = 0;
        if (stage === 'pipe') {
          obstacles = spawnPipePair(LOGICAL_WIDTH, LOGICAL_HEIGHT);
        } else if (stage === 'bird') {
          obstacles = spawnBird(LOGICAL_WIDTH, LOGICAL_HEIGHT);
        }
      }

      // --- Stage-specific logic ---

      // FLY: record when threshold reached, then linger for 5s before clearing
      if (stage === 'fly') {
        if (balloon.y < LOGICAL_HEIGHT * FLY_THRESHOLD && flyConditionMetAtRef.current === 0) {
          flyConditionMetAtRef.current = now;
        }
        if (flyConditionMetAtRef.current > 0 && now - flyConditionMetAtRef.current >= FLY_LINGER_MS) {
          stageRef.current = 'fly-clear';
          if (!stageClearFiredRef.current) {
            stageClearFiredRef.current = true;
            onStageClear('fly');
          }
        }
      }

      // PIPE / BIRD: collision check
      if ((stage === 'pipe' || stage === 'bird') && obstacles.length > 0) {
        const invincible = now < invincibleUntilRef.current;
        if (!invincible && checkCollision(balloon, obstacles)) {
          // Hit — reset balloon, clear obstacles, schedule respawn
          balloon.y = LOGICAL_HEIGHT / 2;
          balloon.targetY = LOGICAL_HEIGHT / 2;
          invincibleUntilRef.current = now + INVINCIBILITY_MS;
          respawnAtRef.current = now + RESPAWN_DELAY_MS;
          obstacles = [];
          onHit();
        }
      }

      // PIPE: pass when all obstacles off-screen (and not waiting to respawn)
      if (stage === 'pipe' && obstacles.length === 0 && respawnAtRef.current === 0) {
        // Only transition if pipe was actually spawned (obstacles existed at some point)
        if (state.obstacles.length > 0) {
          stageRef.current = 'pipe-clear';
          if (!stageClearFiredRef.current) {
            stageClearFiredRef.current = true;
            onStageClear('pipe');
          }
        }
      }

      // BIRD: pass when all obstacles off-screen
      if (stage === 'bird' && obstacles.length === 0 && respawnAtRef.current === 0) {
        if (state.obstacles.length > 0) {
          stageRef.current = 'bird-clear';
          if (!stageClearFiredRef.current) {
            stageClearFiredRef.current = true;
            onStageClear('bird');
          }
        }
      }

      stateRef.current = {
        balloon,
        obstacles,
        distance,
        scrollSpeed: SCROLL_SPEED,
        gameOver: false,
        smileIntensity: smileRef.current,
      };

      // Render
      if (!ctxRef.current) {
        ctxRef.current = canvasRef.current?.getContext('2d') ?? null;
      }
      if (ctxRef.current) {
        ctxRef.current.setTransform(SCALE, 0, 0, SCALE, 0, 0);
        renderFrame(ctxRef.current, stateRef.current, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        ctxRef.current.setTransform(1, 0, 0, 1, 0, 0);
      }
    },
    [onStageClear, onComplete, onHit],
  );

  useGameLoop(tick, isRunning);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="block rounded-xl"
      style={{ maxHeight: '70vh', width: 'auto', maxWidth: '100%', aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
    />
  );
}

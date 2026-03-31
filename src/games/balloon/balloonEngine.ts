import type { BalloonGameState, BalloonEntity, Obstacle } from '../../types/balloon';
import {
  BALLOON_RADIUS,
  BALLOON_START_X,
  BALLOON_LERP_SPEED,
  INITIAL_SCROLL_SPEED,
  SCROLL_SPEED_INCREMENT,
  MAX_SCROLL_SPEED,
  DISTANCE_MULTIPLIER,
  BOB_AMPLITUDE,
  BOB_PERIOD,
} from '../../constants/balloon';
import { lerp, clamp } from '../../utils/math';

export function createInitialState(canvasHeight: number): BalloonGameState {
  return {
    balloon: {
      x: BALLOON_START_X,
      y: canvasHeight / 2,
      targetY: canvasHeight / 2,
      radius: BALLOON_RADIUS,
    },
    obstacles: [],
    distance: 0,
    scrollSpeed: INITIAL_SCROLL_SPEED,
    gameOver: false,
    smileIntensity: 0,
  };
}

/**
 * Core update — takes current state + inputs, returns next state.
 * Pure function (no side effects).
 */
export function update(
  state: BalloonGameState,
  smileIntensity: number,
  newObstacles: Obstacle[],
  deltaMs: number,
  canvasHeight: number
): BalloonGameState {
  if (state.gameOver) return state;

  // 1. Update balloon position from smile input
  const balloon = updateBalloon(state.balloon, smileIntensity, canvasHeight, deltaMs);

  // 2. Move existing obstacles + append new spawns, cull offscreen
  // Skip array spread on frames where no new obstacles spawned (most frames)
  const combined = newObstacles.length > 0
    ? [...state.obstacles, ...newObstacles]
    : state.obstacles;
  const obstacles = moveObstacles(combined, state.scrollSpeed, deltaMs);

  // 3. Collision check
  if (checkCollision(balloon, obstacles)) {
    return { ...state, balloon, obstacles, gameOver: true, smileIntensity };
  }

  // 4. Advance distance + scroll speed
  const scrollPixels = state.scrollSpeed * deltaMs;
  const distance = state.distance + scrollPixels * DISTANCE_MULTIPLIER;
  const scrollSpeed = Math.min(
    state.scrollSpeed + SCROLL_SPEED_INCREMENT * deltaMs,
    MAX_SCROLL_SPEED
  );

  return { balloon, obstacles, distance, scrollSpeed, gameOver: false, smileIntensity };
}

function updateBalloon(
  balloon: BalloonEntity,
  smileIntensity: number,
  canvasHeight: number,
  deltaMs: number
): BalloonEntity {
  const padding = balloon.radius + 10;
  // smile 0 → bottom, smile 1 → top (lower Y in canvas coords)
  const targetY =
    canvasHeight - padding - smileIntensity * (canvasHeight - 2 * padding);

  // Frame-rate-independent lerp
  const t = 1 - Math.pow(1 - BALLOON_LERP_SPEED, deltaMs / 16.67);
  const newY = lerp(balloon.y, targetY, t);

  return {
    ...balloon,
    y: clamp(newY, padding, canvasHeight - padding),
    targetY,
  };
}

function moveObstacles(
  obstacles: Obstacle[],
  scrollSpeed: number,
  deltaMs: number
): Obstacle[] {
  const dx = scrollSpeed * deltaMs;
  return obstacles
    .map((obs) => {
      const newX = obs.x - dx;
      if (obs.type === 'bobbingBird' && obs.baseY != null) {
        const newY = obs.baseY + BOB_AMPLITUDE * Math.sin(newX * 2 * Math.PI / BOB_PERIOD);
        return { ...obs, x: newX, y: newY };
      }
      return { ...obs, x: newX };
    })
    .filter((obs) => obs.x + obs.width > -100);
}

/** Circle-rect collision with a slightly forgiving hitbox (80% radius). */
function checkCollision(balloon: BalloonEntity, obstacles: Obstacle[]): boolean {
  const r = balloon.radius * 0.8;
  for (const obs of obstacles) {
    const closestX = clamp(balloon.x, obs.x, obs.x + obs.width);
    const closestY = clamp(balloon.y, obs.y, obs.y + obs.height);
    const dx = balloon.x - closestX;
    const dy = balloon.y - closestY;
    if (dx * dx + dy * dy < r * r) {
      return true;
    }
  }
  return false;
}

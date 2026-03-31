import type { Obstacle } from '../../types/balloon';
import {
  OBSTACLE_WIDTH,
  OBSTACLE_MIN_HEIGHT,
  MIN_OBSTACLE_GAP,
  SPATIAL_SPAWN_GAP,
  BIRD_SCORE,
  WIND_GUST_SCORE,
  BOBBING_BIRD_SCORE,
  BEE_SWARM_SCORE,
  WIND_GUST_WIDTH,
  WIND_GUST_HEIGHT_MIN,
  WIND_GUST_HEIGHT_MAX,
  BEE_SIZE,
  BEE_SPACING,
} from '../../constants/balloon';

/**
 * Spawns obstacles with progressive type unlocks and difficulty scaling.
 * Uses a fixed spatial gap so obstacle density stays constant regardless of speed.
 * Difficulty comes from increasing scroll speed (less reaction time)
 * plus harder obstacle types that unlock at score milestones.
 *
 * When a new obstacle type unlocks, it is guaranteed to spawn first
 * so the player is introduced to it before it mixes into the pool.
 */
export class ObstacleManager {
  private distanceSinceSpawn = 0;
  /** Tracks which milestone obstacle types have been introduced. */
  private introduced = new Set<string>();

  /**
   * Call every frame. Returns newly spawned obstacles (0 or more).
   */
  update(
    scrollPixels: number,
    distance: number,
    canvasWidth: number,
    canvasHeight: number
  ): Obstacle[] {
    this.distanceSinceSpawn += scrollPixels;

    if (this.distanceSinceSpawn < SPATIAL_SPAWN_GAP) {
      return [];
    }

    this.distanceSinceSpawn = 0;
    return this.spawn(distance, canvasWidth, canvasHeight);
  }

  private spawn(distance: number, canvasWidth: number, canvasHeight: number): Obstacle[] {
    // Guaranteed first-spawn for newly unlocked types (check hardest first)
    if (distance >= BOBBING_BIRD_SCORE && !this.introduced.has('bobbingBird')) {
      this.introduced.add('bobbingBird');
      return this.spawnBobbingBird(canvasWidth, canvasHeight);
    }
    if (distance >= BEE_SWARM_SCORE && !this.introduced.has('bee')) {
      this.introduced.add('bee');
      return this.spawnBeeSwarm(canvasWidth, canvasHeight);
    }
    if (distance >= WIND_GUST_SCORE && !this.introduced.has('windGust')) {
      this.introduced.add('windGust');
      return this.spawnWindGust(canvasWidth, canvasHeight);
    }
    if (distance >= BIRD_SCORE && !this.introduced.has('bird')) {
      this.introduced.add('bird');
      return this.spawnBird(canvasWidth, canvasHeight);
    }

    // Probability-based spawn — harder types are rarer, each drops by 5%
    const roll = Math.random();

    if (distance >= BOBBING_BIRD_SCORE) {
      // 5 types: Bobbing 10%, Bees 15%, Wind 20%, Birds 25%, Pipes 30%
      if (roll < 0.10) return this.spawnBobbingBird(canvasWidth, canvasHeight);
      if (roll < 0.25) return this.spawnBeeSwarm(canvasWidth, canvasHeight);
      if (roll < 0.45) return this.spawnWindGust(canvasWidth, canvasHeight);
      if (roll < 0.70) return this.spawnBird(canvasWidth, canvasHeight);
      return this.spawnPipes(canvasWidth, canvasHeight);
    }

    if (distance >= BEE_SWARM_SCORE) {
      // 4 types: Bees 15%, Wind 20%, Birds 25%, Pipes 40%
      if (roll < 0.15) return this.spawnBeeSwarm(canvasWidth, canvasHeight);
      if (roll < 0.35) return this.spawnWindGust(canvasWidth, canvasHeight);
      if (roll < 0.60) return this.spawnBird(canvasWidth, canvasHeight);
      return this.spawnPipes(canvasWidth, canvasHeight);
    }

    if (distance >= WIND_GUST_SCORE) {
      // 3 types: Wind 20%, Birds 30%, Pipes 50%
      if (roll < 0.20) return this.spawnWindGust(canvasWidth, canvasHeight);
      if (roll < 0.50) return this.spawnBird(canvasWidth, canvasHeight);
      return this.spawnPipes(canvasWidth, canvasHeight);
    }

    if (distance >= BIRD_SCORE) {
      // 2 types: Birds 35%, Pipes 65%
      if (roll < 0.35) return this.spawnBird(canvasWidth, canvasHeight);
      return this.spawnPipes(canvasWidth, canvasHeight);
    }

    // Score 0-49: pipes only
    return this.spawnPipes(canvasWidth, canvasHeight);
  }

  private spawnPipes(canvasWidth: number, canvasHeight: number): Obstacle[] {
    const gapSize = MIN_OBSTACLE_GAP + Math.random() * 100;
    const edgePad = 60;
    const minCenter = edgePad + gapSize / 2;
    const maxCenter = canvasHeight - edgePad - gapSize / 2;
    const gapCenter = minCenter + Math.random() * (maxCenter - minCenter);

    const topHeight = gapCenter - gapSize / 2;
    const bottomY = gapCenter + gapSize / 2;
    const bottomHeight = canvasHeight - bottomY;

    const obstacles: Obstacle[] = [];

    if (topHeight > OBSTACLE_MIN_HEIGHT) {
      obstacles.push({
        x: canvasWidth,
        y: 0,
        width: OBSTACLE_WIDTH,
        height: topHeight,
        type: 'pipe',
      });
    }

    if (bottomHeight > OBSTACLE_MIN_HEIGHT) {
      obstacles.push({
        x: canvasWidth,
        y: bottomY,
        width: OBSTACLE_WIDTH,
        height: bottomHeight,
        type: 'pipe',
      });
    }

    return obstacles;
  }

  private spawnBird(canvasWidth: number, canvasHeight: number): Obstacle[] {
    const birdSize = 40;
    const padding = 60;
    const y = padding + Math.random() * (canvasHeight - 2 * padding - birdSize);
    return [{
      x: canvasWidth,
      y,
      width: birdSize,
      height: birdSize,
      type: 'bird',
    }];
  }

  private spawnBobbingBird(canvasWidth: number, canvasHeight: number): Obstacle[] {
    const birdSize = 40;
    const padding = 60 + 60; // extra padding for bob amplitude
    const baseY = padding + Math.random() * (canvasHeight - 2 * padding - birdSize);
    return [{
      x: canvasWidth,
      y: baseY,
      width: birdSize,
      height: birdSize,
      type: 'bobbingBird',
      baseY,
    }];
  }

  private spawnWindGust(canvasWidth: number, canvasHeight: number): Obstacle[] {
    const height = WIND_GUST_HEIGHT_MIN + Math.random() * (WIND_GUST_HEIGHT_MAX - WIND_GUST_HEIGHT_MIN);
    const padding = 60;
    const y = padding + Math.random() * (canvasHeight - 2 * padding - height);
    return [{
      x: canvasWidth,
      y,
      width: WIND_GUST_WIDTH,
      height,
      type: 'windGust',
    }];
  }

  private spawnBeeSwarm(canvasWidth: number, canvasHeight: number): Obstacle[] {
    const padding = 80;
    const centerY = padding + Math.random() * (canvasHeight - 2 * padding);
    const topY = centerY - BEE_SPACING / 2 - BEE_SIZE / 2;
    const botY = centerY + BEE_SPACING / 2 - BEE_SIZE / 2;

    // 5 bees: 2 top (centered), 3 bottom — total ~70px wide
    return [
      // Top row — 2 bees
      { x: canvasWidth + BEE_SPACING / 2, y: topY, width: BEE_SIZE, height: BEE_SIZE, type: 'bee' },
      { x: canvasWidth + BEE_SPACING / 2 + BEE_SPACING, y: topY, width: BEE_SIZE, height: BEE_SIZE, type: 'bee' },
      // Bottom row — 3 bees
      { x: canvasWidth, y: botY, width: BEE_SIZE, height: BEE_SIZE, type: 'bee' },
      { x: canvasWidth + BEE_SPACING, y: botY, width: BEE_SIZE, height: BEE_SIZE, type: 'bee' },
      { x: canvasWidth + 2 * BEE_SPACING, y: botY, width: BEE_SIZE, height: BEE_SIZE, type: 'bee' },
    ];
  }

  reset(): void {
    this.distanceSinceSpawn = 0;
    this.introduced.clear();
  }
}

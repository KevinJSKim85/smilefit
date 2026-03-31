export interface BalloonEntity {
  x: number;
  y: number;
  targetY: number;
  radius: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'pipe' | 'bird' | 'bobbingBird' | 'windGust' | 'bee';
  /** Center of vertical oscillation (bobbingBird only) */
  baseY?: number;
}

export interface BalloonGameState {
  balloon: BalloonEntity;
  obstacles: Obstacle[];
  distance: number;
  scrollSpeed: number;
  gameOver: boolean;
  smileIntensity: number;
}

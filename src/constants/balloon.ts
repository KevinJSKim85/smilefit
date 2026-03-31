// Balloon game physics and spawning constants
export const BALLOON_RADIUS = 25;
export const BALLOON_START_X = 120;
export const BALLOON_LERP_SPEED = 0.1; // smooth follow factor

// Scrolling
export const INITIAL_SCROLL_SPEED = 0.25; // pixels per ms
export const SCROLL_SPEED_INCREMENT = 0.000008; // acceleration per ms
export const MAX_SCROLL_SPEED = 1.25;

// Obstacles
export const MIN_OBSTACLE_GAP = 200; // min vertical gap between top/bottom pipes
export const OBSTACLE_WIDTH = 55;
export const OBSTACLE_MIN_HEIGHT = 40;
export const SPATIAL_SPAWN_GAP = 600; // fixed horizontal pixels between obstacle spawns

// Obstacle unlock milestones (score thresholds)
export const BIRD_SCORE = 50;
export const WIND_GUST_SCORE = 100;
export const BEE_SWARM_SCORE = 150;
export const BOBBING_BIRD_SCORE = 200;

// Bobbing bird physics
export const BOB_AMPLITUDE = 60; // px above/below baseY
export const BOB_PERIOD = 450; // px of horizontal travel per full oscillation

// Wind gust obstacle
export const WIND_GUST_WIDTH = 50;
export const WIND_GUST_HEIGHT_MIN = 120;
export const WIND_GUST_HEIGHT_MAX = 150;

// Bee swarm obstacle
export const BEE_SIZE = 20; // individual bee hitbox
export const BEE_SPACING = 25; // formation spacing (total width ~70px)

// Scoring
export const DISTANCE_MULTIPLIER = 0.01; // convert pixels to score units

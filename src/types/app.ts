export const AppScreen = {
  Start: 'start',
  Nickname: 'nickname',
  Calibration: 'calibration',
  GameSelect: 'gameSelect',
  Tutorial: 'tutorial',
  Countdown: 'countdown',
  Gameplay: 'gameplay',
  GameOver: 'gameOver',
  Leaderboard: 'leaderboard',
  Debug: 'debug',
  About: 'about',
} as const;
export type AppScreen = (typeof AppScreen)[keyof typeof AppScreen];

export const GameType = {
  Balloon: 'balloon',
  Tetris: 'tetris',
} as const;
export type GameType = (typeof GameType)[keyof typeof GameType];

export type Language = 'ko' | 'en';

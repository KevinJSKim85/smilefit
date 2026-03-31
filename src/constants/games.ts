import { GameType } from '../types/app';
import { ACCENT_BALLOON, ACCENT_TETRIS } from './theme';

export interface GameMeta {
  type: GameType;
  nameKey: string;
  descriptionKey: string;
  difficultyKey: string;
  color: string;
  iconName: string;
}

export const GAMES: GameMeta[] = [
  {
    type: GameType.Balloon,
    nameKey: 'game.balloon.name',
    descriptionKey: 'game.balloon.description',
    difficultyKey: 'game.balloon.difficulty',
    color: ACCENT_BALLOON,
    iconName: 'game.balloon',
  },
  {
    type: GameType.Tetris,
    nameKey: 'game.tetris.name',
    descriptionKey: 'game.tetris.description',
    difficultyKey: 'game.tetris.difficulty',
    color: ACCENT_TETRIS,
    iconName: 'game.tetris',
  },
];

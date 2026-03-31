import { GameType } from './app';

export type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'allTime';
export type LocationFilter = 'country' | 'global';

export interface ScoreEntry {
  id?: string;
  nickname: string;
  score: number;
  country: string;
  timestamp: Date;
}

export interface LeaderboardQuery {
  game: GameType;
  timeFilter: TimeFilter;
  locationFilter: LocationFilter;
  countryCode?: string;
}

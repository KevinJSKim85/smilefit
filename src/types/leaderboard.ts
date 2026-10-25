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

export interface PlayerStats {
  gamesPlayed: number;
  cumulativeScore: number;
  personalBest: number;
  recentScores: ScoreEntry[];
}

export interface ScoreSubmissionResult {
  id: string;
  personalBest: number;
  isNewBest: boolean;
}

export interface LeaderboardQuery {
  game: GameType;
  timeFilter: TimeFilter;
  locationFilter: LocationFilter;
  countryCode?: string;
}

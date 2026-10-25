import { GameType } from '../types/app';
import type {
  LocationFilter,
  PlayerStats,
  ScoreEntry,
  ScoreSubmissionResult,
  TimeFilter,
} from '../types/leaderboard';
import { getDateKey, getMonthKey, getWeekKey } from '../utils/time';

interface LeaderboardResponse {
  scores: ScoreEntry[];
  playerStats: PlayerStats | null;
}

function toScoreEntry(entry: Omit<ScoreEntry, 'timestamp'> & { timestamp: string | Date }): ScoreEntry {
  return { ...entry, timestamp: new Date(entry.timestamp) };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || `Score service returned ${response.status}`);
  return body as T;
}

/** Save a game result through the server-side Google Sheets API. */
export async function submitScore(
  game: GameType,
  nickname: string,
  score: number,
  country: string,
  requestId: string
): Promise<ScoreSubmissionResult> {
  const now = new Date();
  return request<ScoreSubmissionResult>('/api/scores', {
    method: 'POST',
    body: JSON.stringify({
      game,
      nickname,
      score,
      country,
      requestId,
      playedAt: now.toISOString(),
      dayKey: getDateKey(now),
      weekKey: getWeekKey(now),
      monthKey: getMonthKey(now),
    }),
  });
}

/** Read the filtered leaderboard and this nickname's all-time summary/history. */
export async function getLeaderboard(
  game: GameType,
  timeFilter: TimeFilter,
  locationFilter: LocationFilter,
  countryCode: string,
  nickname: string
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({
    game,
    timeFilter,
    locationFilter,
    countryCode,
    nickname,
  });
  const now = new Date();
  if (timeFilter === 'daily') params.set('currentKey', getDateKey(now));
  if (timeFilter === 'weekly') params.set('currentKey', getWeekKey(now));
  if (timeFilter === 'monthly') params.set('currentKey', getMonthKey(now));
  const result = await request<{
    scores: Array<Omit<ScoreEntry, 'timestamp'> & { timestamp: string }>;
    playerStats: (Omit<PlayerStats, 'recentScores'> & {
      recentScores: Array<Omit<ScoreEntry, 'timestamp'> & { timestamp: string }>;
    }) | null;
  }>(`/api/scores?${params.toString()}`);

  return {
    scores: result.scores.map(toScoreEntry),
    playerStats: result.playerStats
      ? { ...result.playerStats, recentScores: result.playerStats.recentScores.map(toScoreEntry) }
      : null,
  };
}

export { GameType };

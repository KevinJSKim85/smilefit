import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import { GameType } from '../types/app';
import type { ScoreEntry, TimeFilter, LocationFilter } from '../types/leaderboard';
import { getDateKey, getWeekKey, getMonthKey } from '../utils/time';

/** Firestore collection name per game. */
function getCollection(game: GameType) {
  return game === GameType.Balloon ? 'scores_balloon' : 'scores_tetris';
}

/** Submit a score to the leaderboard. */
export async function submitScore(
  game: GameType,
  nickname: string,
  score: number,
  country: string
): Promise<string> {
  const now = new Date();
  const docRef = await addDoc(collection(db, getCollection(game)), {
    nickname,
    score,
    country,
    timestamp: serverTimestamp(),
    dateKey: getDateKey(now),
    weekKey: getWeekKey(now),
    monthKey: getMonthKey(now),
  });
  return docRef.id;
}

/** Map time filter to the Firestore field name for the date key. */
const TIME_FILTER_FIELD: Record<Exclude<TimeFilter, 'allTime'>, string> = {
  daily: 'dateKey',
  weekly: 'weekKey',
  monthly: 'monthKey',
};

/** Get the current key value for a time filter. */
function getCurrentKeyValue(timeFilter: Exclude<TimeFilter, 'allTime'>): string {
  const now = new Date();
  switch (timeFilter) {
    case 'daily':
      return getDateKey(now);
    case 'weekly':
      return getWeekKey(now);
    case 'monthly':
      return getMonthKey(now);
  }
}

/** Fetch top scores with time + location filters. */
export async function getLeaderboard(
  game: GameType,
  timeFilter: TimeFilter,
  locationFilter: LocationFilter,
  countryCode: string
): Promise<ScoreEntry[]> {
  const colRef = collection(db, getCollection(game));
  const constraints: QueryConstraint[] = [];

  // Time filter: equality on the date key field
  if (timeFilter !== 'allTime') {
    const field = TIME_FILTER_FIELD[timeFilter];
    const value = getCurrentKeyValue(timeFilter);
    constraints.push(where(field, '==', value));
  }

  // Location filter
  if (locationFilter === 'country' && countryCode) {
    constraints.push(where('country', '==', countryCode));
  }

  // Always order by score descending — no range filter conflicts
  constraints.push(orderBy('score', 'desc'), limit(50));

  const q = query(colRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      nickname: data.nickname,
      score: data.score,
      country: data.country,
      timestamp: data.timestamp?.toDate?.() ?? new Date(),
    };
  });
}

import { appendScores, getScores, normalizeNickname } from '../server/googleSheets.js';

const GAME_TYPES = new Set(['balloon', 'tetris']);
const TIME_FILTERS = new Set(['daily', 'weekly', 'monthly', 'allTime']);
const LOCATION_FILTERS = new Set(['global', 'country']);

function respond(res, statusCode, payload) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(statusCode).json(payload);
}

function scoreEntry(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    score: row.score,
    country: row.country,
    timestamp: row.timestamp,
  };
}

function getPlayerStats(rows) {
  if (rows.length === 0) {
    return { gamesPlayed: 0, cumulativeScore: 0, personalBest: 0, recentScores: [] };
  }
  const byRecency = [...rows].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  return {
    gamesPlayed: rows.length,
    cumulativeScore: rows.reduce((sum, row) => sum + row.score, 0),
    personalBest: Math.max(...rows.map((row) => row.score)),
    recentScores: byRecency.slice(0, 5).map(scoreEntry),
  };
}

function isValidKey(value, pattern) {
  return typeof value === 'string' && pattern.test(value);
}

function parseBody(body) {
  if (typeof body === 'string') return JSON.parse(body);
  if (body && typeof body === 'object') return body;
  return {};
}

function validScoreSubmission(body) {
  const nickname = typeof body.nickname === 'string' ? body.nickname.normalize('NFKC').trim() : '';
  const country = typeof body.country === 'string' ? body.country.trim().toUpperCase() : '';
  const score = Number(body.score);
  const timestamp = typeof body.playedAt === 'string' ? body.playedAt : '';
  const playedAt = Date.parse(timestamp);

  if (!GAME_TYPES.has(body.game)) return { error: 'Choose a valid game.' };
  if (!nickname || nickname.length > 32) return { error: 'Nickname must be between 1 and 32 characters.' };
  if (!Number.isSafeInteger(score) || score < 0 || score > 1_000_000_000) {
    return { error: 'Score must be a whole number between 0 and 1,000,000,000.' };
  }
  if (country && !/^[A-Z]{2,3}$/.test(country)) return { error: 'Country code is invalid.' };
  if (typeof body.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.requestId)) {
    return { error: 'Request ID is invalid.' };
  }
  if (!Number.isFinite(playedAt)) return { error: 'Play time is invalid.' };
  if (!isValidKey(body.dayKey, /^\d{4}-\d{2}-\d{2}$/)
    || !isValidKey(body.weekKey, /^\d{4}-\d{2}-\d{2}$/)
    || !isValidKey(body.monthKey, /^\d{4}-\d{2}$/)) {
    return { error: 'Date filter keys are invalid.' };
  }

  return {
    value: {
      id: body.requestId,
      nickname,
      nicknameKey: normalizeNickname(nickname),
      score,
      country,
      timestamp: new Date(playedAt).toISOString(),
      dayKey: body.dayKey,
      weekKey: body.weekKey,
      monthKey: body.monthKey,
    },
  };
}

async function handleGet(req, res) {
  const url = new URL(req.url || '/api/scores', 'https://smilefit.invalid');
  const game = url.searchParams.get('game') || '';
  const timeFilter = url.searchParams.get('timeFilter') || 'allTime';
  const locationFilter = url.searchParams.get('locationFilter') || 'global';
  const countryCode = (url.searchParams.get('countryCode') || '').toUpperCase();
  const nicknameKey = normalizeNickname(url.searchParams.get('nickname') || '');
  const currentKey = url.searchParams.get('currentKey') || '';

  if (!GAME_TYPES.has(game)) return respond(res, 400, { error: 'Choose a valid game.' });
  if (!TIME_FILTERS.has(timeFilter)) return respond(res, 400, { error: 'Time filter is invalid.' });
  if (!LOCATION_FILTERS.has(locationFilter)) return respond(res, 400, { error: 'Location filter is invalid.' });
  if (timeFilter !== 'allTime') {
    const keyPattern = timeFilter === 'monthly' ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/;
    if (!keyPattern.test(currentKey)) return respond(res, 400, { error: 'Current date key is invalid.' });
  }

  const rows = await getScores(game);
  const timeKeyField = {
    daily: 'dayKey',
    weekly: 'weekKey',
    monthly: 'monthKey',
  }[timeFilter];
  const filtered = rows.filter((row) => {
    const matchesTime = !timeKeyField || row[timeKeyField] === currentKey;
    const matchesCountry = locationFilter !== 'country' || !countryCode || row.country === countryCode;
    return matchesTime && matchesCountry;
  });
  filtered.sort((a, b) => b.score - a.score || Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const playerRecords = nicknameKey ? rows.filter((row) => row.nicknameKey === nicknameKey) : [];
  return respond(res, 200, {
    scores: filtered.slice(0, 50).map(scoreEntry),
    playerStats: nicknameKey ? getPlayerStats(playerRecords) : null,
  });
}

async function handlePost(req, res) {
  let body;
  try {
    body = parseBody(req.body);
  } catch {
    return respond(res, 400, { error: 'Request body must be valid JSON.' });
  }

  const validated = validScoreSubmission(body);
  if (validated.error) return respond(res, 400, { error: validated.error });

  const entry = validated.value;
  const records = await getScores(entry.game);
  const duplicate = records.find((row) => row.id === entry.id);
  const previousBest = Math.max(
    0,
    ...records
      .filter((row) => row.nicknameKey === entry.nicknameKey && row.id !== entry.id)
      .map((row) => row.score)
  );

  if (!duplicate) {
    await appendScores(entry.game, [entry]);
    records.push(entry);
  }

  const playerRecords = records.filter((row) => row.nicknameKey === entry.nicknameKey);
  const personalBest = Math.max(0, ...playerRecords.map((row) => row.score));
  return respond(res, 200, {
    id: entry.id,
    personalBest,
    isNewBest: !duplicate && entry.score > previousBest,
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST') return await handlePost(req, res);
    res.setHeader('Allow', 'GET, POST');
    return respond(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('Score API request failed:', error instanceof Error ? error.message : error);
    return respond(res, 500, { error: 'The score service is temporarily unavailable.' });
  }
}

import { GoogleAuth } from 'google-auth-library';

const API_ROOT = 'https://sheets.googleapis.com/v4';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const GAME_TABS = Object.freeze({ balloon: 'BalloonScores', tetris: 'TetrisScores' });
const HEADERS = Object.freeze([
  'recordId',
  'nicknameKey',
  'nickname',
  'score',
  'country',
  'playedAt',
  'dayKey',
  'weekKey',
  'monthKey',
]);

let authClientPromise;
let readyPromise;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function spreadsheetPath(suffix = '') {
  const id = encodeURIComponent(requiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID'));
  return `/spreadsheets/${id}${suffix}`;
}

async function getAuthClient() {
  if (!authClientPromise) {
    authClientPromise = new GoogleAuth({
      credentials: {
        client_email: requiredEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
        private_key: requiredEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n'),
      },
      scopes: [SHEETS_SCOPE],
    }).getClient().catch((error) => {
      authClientPromise = undefined;
      throw error;
    });
  }
  return authClientPromise;
}

async function sheetsRequest(path, init = {}) {
  const authClient = await getAuthClient();
  let response;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const headers = new Headers(await authClient.getRequestHeaders());
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    headers.set('Content-Type', 'application/json');
    response = await fetch(`${API_ROOT}${path}`, {
      ...init,
      headers,
    });
    // A 429 is rejected before the request is applied, so retrying an append is safe.
    if (response.status !== 429 || attempt === 3) break;
    await response.arrayBuffer();
    await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
  }
  if (!response.ok) {
    // Keep Google response bodies and credentials out of the public API response.
    throw new Error(`Google Sheets API request failed (${response.status}).`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function listSheetTitles() {
  const fields = encodeURIComponent('sheets.properties(sheetId,title)');
  const result = await sheetsRequest(`${spreadsheetPath()}?fields=${fields}`);
  return new Set((result.sheets || []).map((sheet) => sheet.properties?.title).filter(Boolean));
}

async function readRange(range) {
  const query = new URLSearchParams({ majorDimension: 'ROWS' });
  const result = await sheetsRequest(`${spreadsheetPath(`/values/${encodeURIComponent(range)}`)}?${query}`);
  return result.values || [];
}

async function writeRange(range, values) {
  const query = new URLSearchParams({ valueInputOption: 'RAW' });
  return sheetsRequest(`${spreadsheetPath(`/values/${encodeURIComponent(range)}`)}?${query}`, {
    method: 'PUT',
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
}

async function ensureSheetsReady() {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    const expectedTabs = Object.values(GAME_TABS);
    let titles = await listSheetTitles();
    const missingTabs = expectedTabs.filter((title) => !titles.has(title));

    if (missingTabs.length > 0) {
      try {
        await sheetsRequest(`${spreadsheetPath()}:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({
            requests: missingTabs.map((title) => ({ addSheet: { properties: { title } } })),
          }),
        });
      } catch (error) {
        // A concurrent cold start can create the same tab; accept that only if it now exists.
        titles = await listSheetTitles();
        if (missingTabs.some((title) => !titles.has(title))) throw error;
      }
      titles = await listSheetTitles();
    }

    for (const title of expectedTabs) {
      if (!titles.has(title)) throw new Error(`Required Google Sheet tab is missing: ${title}`);
      const firstRow = (await readRange(`${title}!A1:I1`))[0] || [];
      if (firstRow.length === 0) {
        await writeRange(`${title}!A1:I1`, [HEADERS]);
      } else if (HEADERS.some((header, index) => firstRow[index] !== header)) {
        throw new Error(`Unexpected header row in Google Sheet tab: ${title}`);
      }
    }
  })().catch((error) => {
    readyPromise = undefined;
    throw error;
  });

  return readyPromise;
}

function getTab(game) {
  const tab = GAME_TABS[game];
  if (!tab) throw new Error('Unsupported game.');
  return tab;
}

export function normalizeNickname(nickname) {
  return String(nickname || '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

function rowToScore(row) {
  const [id, nicknameKey, nickname, rawScore, country, playedAt, dayKey, weekKey, monthKey] = row;
  const score = Number(rawScore);
  if (!id || !nickname || !Number.isSafeInteger(score) || score < 0) return null;
  return {
    id: String(id),
    nicknameKey: String(nicknameKey || normalizeNickname(nickname)),
    nickname: String(nickname),
    score,
    country: String(country || ''),
    timestamp: String(playedAt || ''),
    dayKey: String(dayKey || ''),
    weekKey: String(weekKey || ''),
    monthKey: String(monthKey || ''),
  };
}

export async function getScores(game) {
  await ensureSheetsReady();
  const rows = await readRange(`${getTab(game)}!A2:I`);
  return rows.map(rowToScore).filter(Boolean);
}

export async function appendScores(game, entries) {
  if (entries.length === 0) return;
  await ensureSheetsReady();
  const tab = getTab(game);
  const values = entries.map((entry) => [
    entry.id,
    entry.nicknameKey || normalizeNickname(entry.nickname),
    entry.nickname,
    Number(entry.score),
    entry.country || '',
    entry.timestamp,
    entry.dayKey || '',
    entry.weekKey || '',
    entry.monthKey || '',
  ]);
  const range = `${tab}!A:I`;
  const query = new URLSearchParams({ valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' });
  await sheetsRequest(`${spreadsheetPath(`/values/${encodeURIComponent(range)}:append`)}?${query}`, {
    method: 'POST',
    body: JSON.stringify({ majorDimension: 'ROWS', values }),
  });
}

/** Idempotently import legacy Firestore rows, in bounded append batches. */
export async function importScoreRows(game, entries) {
  const existingIds = new Set((await getScores(game)).map((entry) => entry.id));
  const missing = entries.filter((entry) => !existingIds.has(entry.id));
  for (let index = 0; index < missing.length; index += 250) {
    await appendScores(game, missing.slice(index, index + 250));
  }
  return { imported: missing.length, alreadyPresent: entries.length - missing.length };
}

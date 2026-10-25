import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { importScoreRows, normalizeNickname } from '../server/googleSheets.js';

const shouldApply = process.argv.includes('--apply');
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in the environment first.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getDateKeys(date) {
  const day = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = monday.getDay();
  monday.setDate(monday.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return {
    dayKey: day,
    weekKey: `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`,
    monthKey: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`,
  };
}

function mapLegacyScore(document, collectionName) {
  const data = document.data();
  const nickname = typeof data.nickname === 'string' ? data.nickname.normalize('NFKC').trim() : '';
  const score = Number(data.score);
  if (!nickname || !Number.isSafeInteger(score) || score < 0) return null;

  let date;
  try {
    date = data.timestamp?.toDate?.() ?? new Date(data.timestamp);
  } catch {
    date = new Date();
  }
  if (!Number.isFinite(date.getTime())) date = new Date();

  const keys = getDateKeys(date);
  return {
    id: `firestore:${collectionName}:${document.id}`,
    nickname,
    nicknameKey: normalizeNickname(nickname),
    score,
    country: typeof data.country === 'string' ? data.country.toUpperCase() : '',
    timestamp: date.toISOString(),
    dayKey: typeof data.dateKey === 'string' ? data.dateKey : keys.dayKey,
    weekKey: typeof data.weekKey === 'string' ? data.weekKey : keys.weekKey,
    monthKey: typeof data.monthKey === 'string' ? data.monthKey : keys.monthKey,
  };
}

for (const [game, collectionName] of [
  ['balloon', 'scores_balloon'],
  ['tetris', 'scores_tetris'],
]) {
  const snapshot = await getDocs(collection(db, collectionName));
  const mapped = snapshot.docs.map((document) => mapLegacyScore(document, collectionName));
  const entries = mapped.filter(Boolean);
  const skipped = mapped.length - entries.length;

  if (shouldApply) {
    const result = await importScoreRows(game, entries);
    console.log(`${game}: found ${snapshot.size}, imported ${result.imported}, already present ${result.alreadyPresent}, skipped ${skipped}`);
  } else {
    console.log(`${game}: found ${snapshot.size}, eligible ${entries.length}, skipped ${skipped} (dry run)`);
  }
}

if (!shouldApply) {
  console.log('Dry run only. Add --apply to append eligible rows to the Google Sheet. Existing IDs are skipped on repeat runs.');
}

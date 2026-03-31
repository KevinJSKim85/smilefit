/** Pad a number to 2 digits. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// ─── Key generators (used at score submit time) ─────────
// All use LOCAL timezone so "today" matches the user's perspective.

/** Returns "YYYY-MM-DD" in local timezone. */
export function getDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Returns "YYYY-MM-DD" of Monday of the current week (local timezone, Monday-start). */
export function getWeekKey(d: Date = new Date()): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return `${copy.getFullYear()}-${pad2(copy.getMonth() + 1)}-${pad2(copy.getDate())}`;
}

/** Returns "YYYY-MM" in local timezone. */
export function getMonthKey(d: Date = new Date()): string {
  const now = d;
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

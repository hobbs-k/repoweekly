import { fileURLToPath } from 'node:url';

// A week is named by the ISO week it covers (see DATA_SPEC.md). All math in UTC.
const DAY = 86400000;

export function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

function parseDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`bad date "${s}", expected YYYY-MM-DD`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`bad date "${s}"`);
  return d;
}

// ISO week id like "2026-W45" for a Date or YYYY-MM-DD string.
export function isoWeek(input) {
  const d = typeof input === 'string' ? parseDate(input) : new Date(input);
  // Move to the Thursday of this week; its year is the ISO year.
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursday - yearStart) / DAY + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Monday and Sunday (YYYY-MM-DD) of a week id.
export function weekRange(week) {
  const m = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!m) throw new Error(`bad week "${week}", expected YYYY-Www`);
  const jan4 = new Date(Date.UTC(Number(m[1]), 0, 4));
  const week1Monday = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * DAY;
  const start = new Date(week1Monday + (Number(m[2]) - 1) * 7 * DAY);
  const end = new Date(start.getTime() + 6 * DAY);
  return { start: toDateString(start), end: toDateString(end) };
}

// The last complete Monday-to-Sunday week before the given date.
export function lastFullWeek(input = new Date()) {
  const d = typeof input === 'string' ? parseDate(input) : new Date(input);
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const thisMonday = day - ((new Date(day).getUTCDay() + 6) % 7) * DAY;
  return isoWeek(new Date(thisMonday - 7 * DAY));
}

// Display helpers shared by the site and notify.js. UTC, so every machine prints the same text.
const long = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const dayMonth = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long' });
export const weekNumber = (week) => Number(week.slice(-2));

// "2 to 8 November 2026", "28 December 2026 to 3 January 2027"
export function formatRange(start, end) {
  const s = parseDate(start);
  const e = parseDate(end);
  if (s.getUTCFullYear() !== e.getUTCFullYear()) return `${long.format(s)} to ${long.format(e)}`;
  if (s.getUTCMonth() !== e.getUTCMonth()) return `${dayMonth.format(s)} to ${long.format(e)}`;
  return `${s.getUTCDate()} to ${long.format(e)}`;
}

// Console check: node scripts/lib/weeks.js [YYYY-MM-DD]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const date = process.argv[2] || '2026-11-09';
  const week = lastFullWeek(date);
  const { start, end } = weekRange(week);
  console.log(`[weeks] last full week before ${date}: ${week} (${start} to ${end})`);
  console.log(`[weeks] done: isoWeek(2026-11-09)=${isoWeek('2026-11-09')}`);
}

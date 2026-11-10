// Display helpers. Dates are UTC so a build in any time zone prints the same text.
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const long = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
const short = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
const dayMonth = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long' });
const asDate = (s) => new Date(`${s}T00:00:00Z`);

// Links work under a sub-path such as https://user.github.io/repoweekly (GitHub Pages).
export const href = (p) => import.meta.env.BASE_URL.replace(/\/$/, '') + p;

export const fmt = (n) => (n == null ? 'n/a' : Number(n).toLocaleString('en-US'));
export const fmtDate = (s) => short.format(asDate(s));
export const weekNumber = (week) => Number(week.slice(-2));

// "2 to 8 November 2026", "28 December 2026 to 3 January 2027"
export function formatRange(start, end) {
  const s = asDate(start);
  const e = asDate(end);
  if (s.getUTCFullYear() !== e.getUTCFullYear()) return `${long.format(s)} to ${long.format(e)}`;
  if (s.getUTCMonth() !== e.getUTCMonth()) return `${dayMonth.format(s)} to ${long.format(e)}`;
  return `${s.getUTCDate()} to ${long.format(e)}`;
}

export function fmtAge(days) {
  if (days < 60) return `${days} days`;
  if (days < 730) return `${Math.round(days / 30.4)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

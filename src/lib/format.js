// Display helpers. Dates are UTC so a build in any time zone prints the same text.
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const short = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
const asDate = (s) => new Date(`${s}T00:00:00Z`);

// Links work under a sub-path such as https://user.github.io/repoweekly (GitHub Pages).
export const href = (p) => import.meta.env.BASE_URL.replace(/\/$/, '') + p;

export const fmt = (n) => (n == null ? 'n/a' : Number(n).toLocaleString('en-US'));
export const fmtDate = (s) => short.format(asDate(s));

export { formatRange, weekNumber } from '../../scripts/lib/weeks.js';

export function fmtAge(days) {
  if (days < 60) return `${days} days`;
  if (days < 730) return `${Math.round(days / 30.4)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

// "C++" -> "cpp", "C#" -> "csharp"
export const langSlug = (l) => l.toLowerCase().replace(/\+/g, 'p').replace(/#/g, 'sharp').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const repoPath = (fullName) => href(`/repo/${fullName.toLowerCase()}/`);
export const weekPath = (week) => href(`/weeks/${week}/`);

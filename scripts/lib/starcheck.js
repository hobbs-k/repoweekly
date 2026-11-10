import { hashText } from './cache.js';

const DAY = 86400000;
export const THRESHOLDS = { check: 20, suspicious: 40 }; // percent of sampled accounts

// A "throwaway" account: made shortly before it starred, no repositories, almost no followers.
export function isThrowaway(user, starredAt) {
  const ageDays = (Date.parse(starredAt) - Date.parse(user.created_at)) / DAY;
  return ageDays < 60 && user.public_repos === 0 && user.followers <= 1;
}

// pairs: [{ user, starred_at }]. A signal for the reader, never proof, and it does not change the ranking.
// shortcut: the 20 and 40 percent cut-offs are rough guesses, calibrate them against real weeks.
export function classify(pairs) {
  const sampled = pairs.length;
  const throwaway = pairs.filter((p) => isThrowaway(p.user, p.starred_at)).length;
  const pct = sampled ? Math.round((100 * throwaway) / sampled) : 0;
  const level = sampled < 10 ? 'unknown' : pct >= THRESHOLDS.suspicious ? 'suspicious' : pct >= THRESHOLDS.check ? 'check' : 'normal';
  return { sampled, throwaway, pct, level };
}

// The same accounts are picked on every run for the same seed.
export function pickSample(entries, n, seed) {
  return entries
    .map((e) => [hashText(seed + e.user.login), e])
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([, e]) => e);
}

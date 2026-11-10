import { config } from './config.js';
import { weekRange } from './weeks.js';

const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

// 8 snapshot dates: the Sunday before the week, then Monday to Sunday.
// Snapshot D holds stars at the end of day D, so 8 snapshots give 7 daily gains.
export function snapshotDatesForWeek(week) {
  const first = Date.parse(`${weekRange(week).start}T00:00:00Z`) - DAY;
  return Array.from({ length: 8 }, (_, i) => iso(first + i * DAY));
}

// Snapshots are usable when at least 7 of 8 exist, including both ends.
export function snapshotsUsable(dates, snaps) {
  return dates.filter((d) => snaps[d]).length >= 7 && Boolean(snaps[dates[0]]) && Boolean(snaps[dates[7]]);
}

// Growth per repo present in the last snapshot.
export function growthFromSnapshots(dates, snaps) {
  const out = {};
  for (const [name, meta] of Object.entries(snaps[dates[7]].repos)) {
    const series = dates.map((d) => snaps[d]?.repos[name]?.stars ?? null);
    const firstKnown = series.find((v) => v !== null);
    const created = Date.parse(meta.created_at);
    let prev = null;
    // Leading gap: a repo created after that day had 0 stars. A gap in the middle carries
    // the previous value forward, so the next present day holds the whole gain.
    const filled = series.map((v, i) => {
      if (v !== null) return (prev = v);
      if (prev === null) return created > Date.parse(`${dates[i]}T23:59:59Z`) ? 0 : firstKnown;
      return prev;
    });
    const daily = filled.slice(1).map((v, i) => Math.max(0, v - filled[i]));
    out[name] = {
      stars_total: filled[7],
      stars_gained: Math.max(0, filled[7] - filled[0]),
      daily_gains: daily,
      unique_days: daily.filter((g) => g > 0).length,
      meta,
    };
  }
  return out;
}

// Fallback for the first weeks: numbers from the trending page, no daily detail.
export function growthFromBootstrap(bootstrap, latestSnapshot) {
  const out = {};
  for (const r of bootstrap.repos) {
    const meta = latestSnapshot?.repos[r.full_name] ?? null;
    out[r.full_name] = {
      stars_total: meta?.stars ?? null,
      stars_gained: r.stars_this_week,
      daily_gains: [],
      unique_days: 0,
      meta,
    };
  }
  return out;
}

// More than spikeShare of the weekly gain on one day. null when daily data is missing.
export function spikeFlag(daily) {
  if (!daily.length) return null;
  const total = daily.reduce((a, b) => a + b, 0);
  return total > 0 && Math.max(...daily) / total > config.ranking.spikeShare;
}

// Gain, then more days with gains, then fewer total stars (surfaces newer projects).
export function compareCandidates(a, b) {
  return (
    b.stars_gained - a.stars_gained ||
    b.unique_days - a.unique_days ||
    (a.stars_total ?? Infinity) - (b.stars_total ?? Infinity) ||
    a.name.localeCompare(b.name)
  );
}

export function isHiddenGem(c) {
  return c.stars_total !== null && c.stars_total < config.ranking.gemMaxStars && c.stars_gained >= config.ranking.gemMinGain;
}

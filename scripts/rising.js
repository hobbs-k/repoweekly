// Repos outside this week's list whose stars are speeding up: the last two days against the two
// days before, from our daily snapshots. Writes data/rising.json for the /rising/ page.
// Usage: node scripts/rising.js [--dry-run] [--offline] [--date YYYY-MM-DD]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { readJson, writeJson } from './lib/cache.js';
import { isBreakout, twoDayGains } from './lib/breakout.js';
import { config } from './lib/config.js';
import { ghGet } from './lib/github.js';
import { run } from './lib/logger.js';
import { growthFromSnapshots } from './lib/scoring.js';
import { toDateString } from './lib/weeks.js';

const DAY = 86400000;
const MIN_SNAPSHOTS = 5; // of the last 8 days

await run('rising', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const offline = Boolean(args.offline);
  const dir = config.paths.snapshots;
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort() : [];
  if (!files.length) throw new Error('no snapshots, run snapshot.js first');

  const date = args.date || files.at(-1).slice(0, 10);
  const dates = Array.from({ length: 8 }, (_, i) => toDateString(new Date(Date.parse(date) - (7 - i) * DAY)));
  const snaps = Object.fromEntries(dates.map((d) => [d, readJson(path.join(dir, `${d}.json`))]));
  if (!snaps[date]) throw new Error(`no snapshot for ${date}`);
  const have = dates.filter((d) => snaps[d]).length;

  const out = { date, generated: new Date().toISOString(), license: config.licenseNote, window_days: 2, items: [] };
  const save = () => { if (!dry) writeJson(path.join(config.paths.data, 'rising.json'), out); };
  if (have < MIN_SNAPSHOTS) {
    out.reason = `needs ${MIN_SNAPSHOTS} daily snapshots in the last 8 days, has ${have}`;
    save();
    log.done(`not enough history: ${out.reason}${dry ? ' (dry run, nothing written)' : ''}`);
    return;
  }

  // Repos already in this week's list are not "rising", they have risen.
  const latest = readJson(config.paths.latest);
  const week = latest && readJson(path.join(config.paths.data, latest.path));
  const inWeek = new Set(week ? [...week.top, ...week.gems].map((i) => i.full_name) : []);
  const blocked = new Set(readJson(config.paths.blocklist)?.repos ?? []);
  // shortcut: same exclusion rules as rank.js, copied, merge them if a third caller appears.
  const excluded = (name, m) =>
    inWeek.has(name) || blocked.has(name) || m.archived || m.fork ||
    /^awesome([-_]|$)/i.test(name.split('/')[1]) || (m.topics ?? []).includes('awesome-list');

  const rule = config.rising;
  const picked = Object.entries(growthFromSnapshots(dates, snaps))
    .filter(([name, g]) => !excluded(name, g.meta) && isBreakout(g.daily_gains, rule))
    .map(([name, g]) => ({ name, g, ...twoDayGains(g.daily_gains) }))
    .sort((a, b) => b.now - a.now || a.g.stars_total - b.g.stars_total || a.name.localeCompare(b.name))
    .slice(0, rule.count);

  for (const [i, { name, g, now, before }] of picked.entries()) {
    let description = null;
    let url = `https://github.com/${name}`;
    if (!offline) {
      try {
        const r = (await ghGet(`/repos/${name}`)).data;
        description = r.description;
        url = r.html_url;
      } catch (err) {
        log.warn(`${name}: no description (${err.message})`);
      }
    }
    out.items.push({
      rank: i + 1, full_name: name, url, description,
      language: g.meta.language, topics: g.meta.topics, license: g.meta.license,
      stars_total: g.stars_total, gained_2d: now, gained_prev_2d: before,
      age_days: Math.floor((Date.parse(`${date}T23:59:59Z`) - Date.parse(g.meta.created_at)) / DAY),
      days: dates.slice(1), daily_gains: g.daily_gains,
    });
    log.log(`#${i + 1} ${name} +${now} in two days (${before} in the two days before)`);
  }
  save();
  log.done(`${out.items.length} rising as of ${date}${dry ? ' (dry run, nothing written)' : ''}`);
});

// Star check: samples the most recent stargazers of each ranked repo and counts new accounts
// with no repositories and almost no followers. It is a signal shown next to the gain.
// It never changes the ranking. This step is optional: if it cannot run it warns and leaves
// the weeks without a star_check.
// Usage: node scripts/stars.js [--dry-run] [--week YYYY-Www]
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { readJson, writeJson } from './lib/cache.js';
import { config } from './lib/config.js';
import { getRateLimit, ghGet } from './lib/github.js';
import { run } from './lib/logger.js';
import { classify, pickSample } from './lib/starcheck.js';

const STAR_JSON = 'application/vnd.github.star+json';
const CONCURRENCY = 3;

// The most recent stargazers of one repo (the API lists oldest first, so read the last pages).
async function recentStars(name, pages) {
  const first = await ghGet(`/repos/${name}/stargazers?per_page=100`, { accept: STAR_JSON });
  const last = Number(/[?&]page=(\d+)>; rel="last"/.exec(first.headers.get('link') ?? '')?.[1] ?? 1);
  let stars = last === 1 ? first.data : [];
  for (let p = last; p > Math.max(0, last - pages) && last > 1; p--) {
    stars.push(...(await ghGet(`/repos/${name}/stargazers?per_page=100&page=${p}`, { accept: STAR_JSON })).data);
  }
  return stars.filter((s) => s.user?.login);
}

await run('stars', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const week = args.week || readJson(config.paths.latest)?.week;
  if (!week) throw new Error('no week given and no latest.json, run rank.js first');
  const weekFile = path.join(config.paths.weeks, `${week}.json`);
  const data = readJson(weekFile);
  if (!data) throw new Error(`${weekFile} not found, run rank.js first`);

  const items = [...data.top, ...data.gems];
  const { pages, sample } = config.starCheck;
  const need = items.length * (1 + pages + sample);
  const core = await getRateLimit();
  if (core.remaining < need) {
    log.warn(`needs about ${need} GitHub requests and only ${core.remaining} are left, skipping the star check (set a GITHUB_TOKEN)`);
    log.done('skipped');
    return;
  }

  const counts = { normal: 0, check: 0, suspicious: 0, unknown: 0, failed: 0 };
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next++];
      try {
        const stars = await recentStars(item.full_name, pages);
        // Stars from this week when there are any, otherwise the latest few.
        const weekly = stars.filter((s) => s.starred_at >= data.start);
        const pool = pickSample(weekly.length >= 10 ? weekly : stars, sample, `${item.full_name}:${week}`);
        const pairs = [];
        for (const s of pool) {
          try {
            pairs.push({ user: (await ghGet(`/users/${s.user.login}`)).data, starred_at: s.starred_at });
          } catch {
            // a deleted or private account is left out of the sample
          }
        }
        item.star_check = classify(pairs);
        counts[item.star_check.level]++;
        log.log(`${item.full_name}: ${item.star_check.level} (${item.star_check.throwaway} of ${item.star_check.sampled} sampled accounts are new and empty)`);
      } catch (err) {
        counts.failed++;
        log.warn(`${item.full_name}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (!dry) writeJson(weekFile, data);
  log.done(`${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}${dry ? ' (dry run, nothing written)' : ''}`);
});

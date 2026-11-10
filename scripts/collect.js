// Finds candidate repos with the GitHub search API and merges them into data/tracked.json.
// Usage: node scripts/collect.js [--dry-run] [--pages N] [--today YYYY-MM-DD]
import fs from 'node:fs';
import { parseArgs } from './lib/args.js';
import { readJson, writeJson } from './lib/cache.js';
import { config } from './lib/config.js';
import { ghGet } from './lib/github.js';
import { run } from './lib/logger.js';
import { capTracked, pruneTracked } from './lib/tracking.js';
import { toDateString } from './lib/weeks.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const daysAgo = (today, n) => toDateString(new Date(Date.parse(today) - n * 86400000));

await run('collect', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const today = args.today || toDateString(new Date());
  // A dry run reads one page per query so it stays quick and polite.
  const pages = Number(args.pages) || (dry ? 1 : config.collect.pages);
  const c = config.collect;

  const tracked = readJson(config.paths.tracked) ?? { updated: today, repos: {} };
  const before = Object.keys(tracked.repos).length;

  // fork:false and archived:false here save API calls later; rank.js checks again.
  const queries = [
    `pushed:>=${daysAgo(today, c.pushedWithinDays)} stars:>=${c.minStarsPushed} fork:false archived:false`,
    `created:>=${daysAgo(today, c.createdWithinDays)} stars:>=${c.minStarsCreated} fork:false archived:false`,
  ];

  const found = new Set();
  for (const q of queries) {
    let got = 0;
    for (let page = 1; page <= pages; page++) {
      const url = `/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${c.perPage}&page=${page}`;
      const { data } = await ghGet(url);
      for (const item of data.items) found.add(item.full_name);
      got += data.items.length;
      if (data.items.length < c.perPage) break;
      await sleep(config.github.searchDelayMs);
    }
    log.log(`query "${q}" returned ${got} repos`);
  }

  // Repos on the trending page are strong candidates, so track them too.
  const bootDir = config.paths.bootstrap;
  const bootFiles = fs.existsSync(bootDir) ? fs.readdirSync(bootDir).filter((f) => f.endsWith('.json')).sort() : [];
  if (bootFiles.length) {
    const boot = readJson(`${bootDir}/${bootFiles.at(-1)}`);
    for (const r of boot.repos) found.add(r.full_name);
    log.log(`added ${boot.repos.length} repos from bootstrap ${bootFiles.at(-1)}`);
  }

  if (found.size === 0) throw new Error('search returned no repos, API response looks wrong');

  let added = 0;
  for (const name of found) {
    if (!tracked.repos[name]) {
      tracked.repos[name] = { first_seen: today, last_in_top200: null };
      added++;
    }
  }

  const pruned = pruneTracked(tracked.repos, today, config.tracking.dropAfterDays);
  const capped = capTracked(pruned.kept, config.tracking.maxTracked);
  if (pruned.dropped.length) log.log(`dropped ${pruned.dropped.length} stale repos`);
  if (capped.dropped.length) log.warn(`over MAX_TRACKED (${config.tracking.maxTracked}), dropped ${capped.dropped.length} least recent repos`);

  const next = { updated: today, repos: capped.kept };
  if (!dry) writeJson(config.paths.tracked, next);
  log.done(`${found.size} found, ${added} new, ${before} before, ${Object.keys(next.repos).length} tracked${dry ? ' (dry run, nothing written)' : ''}`);
});

// Stores one snapshot of stars and metadata for every tracked repo.
// The date means "end of that day": a run at 02:00 UTC labels its data with yesterday.
// Usage: node scripts/snapshot.js [--dry-run] [--date YYYY-MM-DD] [--limit N]
import { parseArgs } from './lib/args.js';
import { readJson, writeJson } from './lib/cache.js';
import { config } from './lib/config.js';
import { getRateLimit, ghGet } from './lib/github.js';
import { run } from './lib/logger.js';
import { toDateString } from './lib/weeks.js';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CONCURRENCY = 5;
const MAX_FAIL_SHARE = 0.2;

function toSnapshotEntry(r) {
  return {
    stars: r.stargazers_count,
    forks: r.forks_count,
    open_issues: r.open_issues_count,
    pushed_at: r.pushed_at,
    created_at: r.created_at,
    language: r.language ?? null,
    license: r.license ? (r.license.spdx_id === 'NOASSERTION' ? 'Other' : r.license.spdx_id) : null,
    topics: r.topics ?? [],
    archived: r.archived,
    fork: r.fork,
  };
}

await run('snapshot', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const date = args.date || toDateString(new Date(Date.now() - 86400000));
  const tracked = readJson(config.paths.tracked);
  if (!tracked) throw new Error(`${config.paths.tracked} not found, run collect.js first`);

  let names = Object.keys(tracked.repos);
  // A dry run only samples a few repos so it stays within the anonymous rate limit.
  const limit = Number(args.limit) || (dry ? 3 : Infinity);
  names = names.slice(0, limit);
  if (names.length === 0) throw new Error('no tracked repos');

  const core = await getRateLimit();
  log.log(`rate limit ${core.remaining}/${core.limit}, need about ${names.length} requests`);
  if (core.remaining < names.length) {
    const wait = core.reset * 1000 - Date.now();
    if (wait > 15 * 60 * 1000) throw new Error(`not enough rate limit (${core.remaining}), resets in ${Math.round(wait / 60000)} min`);
    log.warn(`waiting ${Math.ceil(wait / 1000)}s for the rate limit to reset`);
    await sleep(wait + 1000);
  }

  const repos = {};
  const failed = [];
  let next = 0;
  async function worker() {
    while (next < names.length) {
      const name = names[next++];
      try {
        const { data } = await ghGet(`/repos/${name}`);
        repos[name] = toSnapshotEntry(data);
      } catch (err) {
        // 404 means deleted or private; skip it, the next collect run prunes it.
        failed.push(name);
        log.warn(`skipped ${name}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  if (failed.length / names.length > MAX_FAIL_SHARE) throw new Error(`${failed.length} of ${names.length} repos failed, not writing a bad snapshot`);

  const file = path.join(config.paths.snapshots, `${date}.json`);
  if (!dry) writeJson(file, { date, repos });
  log.done(`${Object.keys(repos).length} repos, ${failed.length} skipped, date ${date}${dry ? ' (dry run, nothing written)' : ` -> ${path.relative('.', file)}`}`);
});

// Builds the weekly result: growth, exclusions, ranking, gems, extra signals.
// Usage: node scripts/rank.js [--dry-run] [--week YYYY-Www] [--today YYYY-MM-DD] [--keep-awesome] [--offline]
// --offline skips every GitHub call and fills placeholder text from snapshot data.
// It is for fixtures only (DATA_DIR must be set) and its output must never be published.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { readJson, summaryFileName, writeJson } from './lib/cache.js';
import { config } from './lib/config.js';
import { ghGet } from './lib/github.js';
import { run } from './lib/logger.js';
import { compareCandidates, growthFromBootstrap, growthFromSnapshots, isHiddenGem, snapshotDatesForWeek, snapshotsUsable, spikeFlag } from './lib/scoring.js';
import { lastFullWeek, toDateString, weekRange } from './lib/weeks.js';

const DAY = 86400000;
const MAX_ATTEMPTS = 40; // API lookups allowed while looking for 10 valid repos
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readmePath(name) {
  return path.join(config.paths.readmes, summaryFileName(name).replace('.json', '.md'));
}

await run('rank', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const offline = Boolean(args.offline);
  if (offline && !process.env.DATA_DIR) throw new Error('--offline needs DATA_DIR set (use DATA_DIR=<copy of fixtures/data>)');
  const today = args.today || toDateString(new Date());
  const week = args.week || lastFullWeek(today);
  const { start, end } = weekRange(week);
  const rk = config.ranking;

  // 1. Growth: our own snapshots if we have enough, otherwise the trending page.
  const dates = snapshotDatesForWeek(week);
  const snaps = Object.fromEntries(dates.map((d) => [d, readJson(path.join(config.paths.snapshots, `${d}.json`))]));
  const have = dates.filter((d) => snaps[d]).length;
  const bootstrap = readJson(path.join(config.paths.bootstrap, `${week}.json`));
  let growth;
  let source;
  if (snapshotsUsable(dates, snaps)) {
    growth = growthFromSnapshots(dates, snaps);
    source = 'snapshots';
  } else {
    if (!bootstrap) throw new Error(`only ${have} of 8 snapshots for ${week} and no bootstrap file, run bootstrap-trending.js first`);
    const files = fs.existsSync(config.paths.snapshots) ? fs.readdirSync(config.paths.snapshots).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f <= `${end}.json`).sort() : [];
    const latest = files.length ? readJson(path.join(config.paths.snapshots, files.at(-1))) : null;
    growth = growthFromBootstrap(bootstrap, latest);
    source = 'bootstrap';
  }
  log.log(`week ${week} (${start} to ${end}), growth from ${source} (${have} of 8 snapshots), ${Object.keys(growth).length} repos`);

  // 2. Exclusions that need no API call.
  const blocklist = new Set(readJson(config.paths.blocklist)?.repos ?? []);
  const dropped = { blocklist: 0, archived: 0, fork: 0, awesome: 0 };
  const filtered = Object.entries(growth)
    .map(([name, g]) => ({ name, ...g }))
    .filter((c) => {
      if (blocklist.has(c.name)) return void dropped.blocklist++;
      if (c.meta?.archived) return void dropped.archived++;
      if (c.meta?.fork) return void dropped.fork++;
      const isAwesome = /^awesome([-_]|$)/i.test(c.name.split('/')[1]) || (c.meta?.topics ?? []).includes('awesome-list');
      if (isAwesome && !args['keep-awesome']) return void dropped.awesome++;
      return true;
    })
    .sort(compareCandidates);
  log.log(`excluded: ${Object.entries(dropped).map(([k, v]) => `${v} ${k}`).join(', ')}; ${filtered.length} candidates left`);

  // 3. Extra data for the repos that might make the list.
  async function enrich(c) {
    if (offline) {
      if (!c.meta) throw new Error(`--offline needs snapshot data for ${c.name}`);
      const file = readmePath(c.name);
      return {
        url: `https://github.com/${c.name}`,
        avatar: `https://avatars.githubusercontent.com/${c.name.split('/')[0]}`,
        description: `Offline fixture for ${c.name}`,
        readme: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '',
        language: c.meta.language, topics: c.meta.topics, license: c.meta.license,
        pushed_at: c.meta.pushed_at, created_at: c.meta.created_at, open_issues: c.meta.open_issues,
        stars: c.meta.stars, archived: c.meta.archived, fork: c.meta.fork,
        contributors: (c.meta.stars % 17) + 3, good_first_issues: c.meta.stars % 4,
      };
    }
    const { data: r } = await ghGet(`/repos/${c.name}`);
    let readme = '';
    try {
      readme = (await ghGet(`/repos/${c.name}/readme`, { raw: true })).data;
    } catch (err) {
      if (err.status !== 404) throw err;
    }
    let contributors = null;
    try {
      const res = await ghGet(`/repos/${c.name}/contributors?per_page=1&anon=true`);
      const last = /[?&]page=(\d+)>; rel="last"/.exec(res.headers.get('link') ?? '');
      contributors = last ? Number(last[1]) : res.data.length;
    } catch (err) {
      log.warn(`contributors for ${c.name} unavailable: ${err.message}`);
    }
    await sleep(config.github.searchDelayMs);
    const q = encodeURIComponent(`repo:${c.name} label:"good first issue" state:open is:issue`);
    const gfi = (await ghGet(`/search/issues?q=${q}&per_page=1`)).data.total_count;
    return {
      url: r.html_url, avatar: r.owner.avatar_url, description: r.description, readme,
      language: r.language, topics: r.topics ?? [], license: r.license ? (r.license.spdx_id === 'NOASSERTION' ? 'Other' : r.license.spdx_id) : null,
      pushed_at: r.pushed_at, created_at: r.created_at, open_issues: r.open_issues_count,
      stars: r.stargazers_count, archived: r.archived, fork: r.fork,
      contributors, good_first_issues: gfi,
    };
  }

  const rejectedReason = (e) => (e.archived ? 'archived' : e.fork ? 'fork' : !e.description && !e.readme.trim() ? 'no description and no README' : null);
  const readmes = {};
  const rejected = new Set();

  function toItem(rank, c, e) {
    readmes[c.name] = e.readme.slice(0, config.summarize.readmeMaxChars);
    return {
      rank,
      full_name: c.name,
      url: e.url,
      avatar: e.avatar,
      description: e.description ?? '',
      language: e.language,
      topics: e.topics,
      stars_total: c.stars_total ?? e.stars,
      stars_gained: c.stars_gained,
      daily_gains: c.daily_gains,
      spike: spikeFlag(c.daily_gains),
      signals: {
        license: e.license,
        last_push: e.pushed_at.slice(0, 10),
        open_issues: e.open_issues,
        contributors: e.contributors,
        good_first_issues: e.good_first_issues,
        age_days: Math.floor((Date.parse(`${end}T23:59:59Z`) - Date.parse(e.created_at)) / DAY),
      },
    };
  }

  async function pick(list, count) {
    const items = [];
    let attempts = 0;
    for (const c of list) {
      if (items.length >= count || attempts >= MAX_ATTEMPTS) break;
      attempts++;
      const e = await enrich(c);
      const why = rejectedReason(e);
      if (why) {
        rejected.add(c.name);
        log.log(`rejected ${c.name}: ${why}`);
        continue;
      }
      items.push(toItem(items.length + 1, c, e));
    }
    return items;
  }

  const top = await pick(filtered, rk.topCount);
  if (top.length < rk.topCount) throw new Error(`only ${top.length} valid repos ranked, need ${rk.topCount}`);
  const topNames = new Set(top.map((i) => i.full_name));
  const gems = await pick(filtered.filter((c) => !topNames.has(c.name) && !rejected.has(c.name) && isHiddenGem(c)), rk.gemCount);

  // 4. Cross-check against the trending page when we used our own numbers.
  if (source === 'snapshots' && bootstrap) {
    const theirs = new Map(bootstrap.repos.map((r) => [r.full_name, r.stars_this_week]));
    const both = top.filter((i) => theirs.has(i.full_name));
    const far = both.filter((i) => Math.abs(i.stars_gained - theirs.get(i.full_name)) / theirs.get(i.full_name) > 0.3);
    log.log(`cross-check: ${both.length} of ${top.length} top repos are on the trending page, ${far.length} differ by more than 30 percent`);
    for (const i of far) log.warn(`${i.full_name}: ours ${i.stars_gained}, trending page ${theirs.get(i.full_name)}`);
  }

  for (const i of top) log.log(`#${i.rank} ${i.full_name} +${i.stars_gained} (${i.stars_total} total)${i.spike ? ' SPIKE' : ''}`);
  for (const i of gems) log.log(`gem ${i.full_name} +${i.stars_gained} (${i.stars_total} total)`);

  // 5. Save.
  if (!dry) {
    const weekFile = path.join(config.paths.weeks, `${week}.json`);
    writeJson(weekFile, { week, start, end, generated: new Date().toISOString(), growth_source: source, license: config.licenseNote, top, gems });
    writeJson(config.paths.latest, { week, path: `weeks/${week}.json` });
    for (const [name, text] of Object.entries(readmes)) {
      fs.mkdirSync(config.paths.readmes, { recursive: true });
      fs.writeFileSync(readmePath(name), text, 'utf8');
    }
    // last_in_top200 is owned by rank.js (see DATA_SPEC.md).
    const tracked = readJson(config.paths.tracked) ?? { updated: today, repos: {} };
    for (const c of filtered.filter((x) => x.stars_gained > 0).slice(0, config.tracking.top)) {
      tracked.repos[c.name] = { first_seen: tracked.repos[c.name]?.first_seen ?? today, last_in_top200: today };
    }
    tracked.updated = today;
    writeJson(config.paths.tracked, tracked);
  }
  log.done(`${top.length} ranked, ${gems.length} gems, week ${week}${dry ? ' (dry run, nothing written)' : ''}`);
});

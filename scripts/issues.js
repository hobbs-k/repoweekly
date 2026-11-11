// Open "good first issue" and "help wanted" tickets from every repository we have ranked, plus
// the ones on the rising page. Writes data/issues.json for the /contribute/ page. The matching
// to a visitor's skills happens in their browser, so nothing about them reaches us.
// Usage: node scripts/issues.js [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { readJson, writeJson } from './lib/cache.js';
import { config } from './lib/config.js';
import { ghGet } from './lib/github.js';
import { run } from './lib/logger.js';

const DAY = 86400000;

// Every repo in any week file or on the rising page, newest week first, with the facts the page filters on.
function collectRepos() {
  const dir = config.paths.weeks;
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{4}-W\d{2}\.json$/.test(f)).sort().reverse() : [];
  if (!files.length) throw new Error('no week files, run rank.js first');
  const repos = new Map();
  for (const [n, f] of files.entries()) {
    const w = readJson(path.join(dir, f));
    for (const i of [...w.top, ...w.gems]) {
      if (repos.has(i.full_name)) continue;
      repos.set(i.full_name, {
        language: i.language ?? null, topics: i.topics ?? [], stars: i.stars_total,
        difficulty: i.summary?.difficulty ?? null, beginner: Boolean(i.summary?.beginner_friendly),
        week: w.week, latest: n === 0,
      });
    }
  }
  const rising = readJson(path.join(config.paths.data, 'rising.json'));
  for (const i of rising?.items ?? []) {
    if (!repos.has(i.full_name)) repos.set(i.full_name, { language: i.language ?? null, topics: i.topics ?? [], stars: i.stars_total, difficulty: null, beginner: false, week: null, latest: true });
  }
  return repos;
}

await run('issues', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const rule = config.issues;
  const repos = [...collectRepos()].slice(0, rule.maxRepos);
  const oldest = Date.now() - rule.maxAgeDays * DAY;

  const items = [];
  const meta = {};
  let failed = 0;

  // Open, unassigned, fresh tickets of one repo, the two labels merged.
  async function fetchIssues(name) {
    const found = new Map();
    for (const label of rule.labels) {
      const { data } = await ghGet(`/repos/${name}/issues?state=open&labels=${encodeURIComponent(label)}&sort=updated&per_page=30`);
      for (const x of data) {
        // The issues endpoint also lists pull requests. Skip those, anything already taken, and stale tickets.
        if (x.pull_request || x.locked || x.assignee || x.assignees?.length) continue;
        if (Date.parse(x.updated_at) < oldest) continue;
        const row = found.get(x.number) ?? {
          repo: name, number: x.number, title: x.title, url: x.html_url,
          labels: x.labels.map((l) => (typeof l === 'string' ? l : l.name)),
          created: x.created_at, updated: x.updated_at, comments: x.comments, beginner: false,
        };
        if (label === 'good first issue') row.beginner = true;
        found.set(x.number, row);
      }
    }
    return [...found.values()].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, rule.perRepo);
  }

  async function take(name, m) {
    try {
      const rows = await fetchIssues(name);
      if (rows.length) { items.push(...rows); meta[name] = m; }
      log.log(`${name}: ${rows.length} open`);
    } catch (err) {
      failed++;
      // 404 and 410 mean the repo moved or switched issues off. That is normal, not an error.
      log.warn(`${name}: skipped (${err.message})`);
    }
  }

  for (const [name, m] of repos) await take(name, { ...m, ranked: true });
  if (failed === repos.length) throw new Error('every repository failed, check the token and the rate limit');

  // A second list from outside our rankings, because the ranked repos are huge and rarely have easy tickets.
  const w = rule.wider;
  const since = new Date(Date.now() - w.pushedDays * DAY).toISOString().slice(0, 10);
  for (const lang of w.languages) {
    try {
      const q = `language:"${lang}" good-first-issues:>=${w.minBeginnerIssues} stars:${w.minStars}..${w.maxStars} pushed:>${since} archived:false fork:false`;
      const { data } = await ghGet(`/search/repositories?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=${w.perLanguage}`);
      for (const r of data.items ?? []) {
        if (meta[r.full_name] || repos.some(([n]) => n === r.full_name)) continue;
        await take(r.full_name, { language: r.language ?? lang, topics: r.topics ?? [], stars: r.stargazers_count, difficulty: null, beginner: false, week: null, latest: false, ranked: false });
      }
    } catch (err) {
      log.warn(`search for ${lang} failed (${err.message})`);
    }
  }

  const out = { generated: new Date().toISOString(), license: config.licenseNote, repos: meta, items };
  if (!dry) writeJson(path.join(config.paths.data, 'issues.json'), out);
  log.done(`${items.length} issues in ${Object.keys(meta).length} repos${dry ? ' (dry run, nothing written)' : ''}`);
});

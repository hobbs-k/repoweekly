// Builds the fake dataset in fixtures/data. Deterministic: same output every run.
// Usage: node fixtures/generate.js [--dry-run]
// Owners start with "fx-" so nothing here is mistaken for a real repo.
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from '../scripts/lib/cache.js';
import { run } from '../scripts/lib/logger.js';

const OUT = path.resolve('fixtures/data');
const DAYS = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];

// Small seeded generator so gains look natural but never change between runs.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

// Splits a weekly total over 7 days; no single day gets more than ~35%.
function spread(total) {
  const w = Array.from({ length: 7 }, () => 0.5 + rand());
  const sum = w.reduce((a, b) => a + b, 0);
  const gains = w.map((x) => Math.round((x / sum) * total));
  gains[3] += total - gains.reduce((a, b) => a + b, 0);
  return gains;
}

const repos = [];
const add = (name, o) => repos.push({ name, language: 'Python', license: 'MIT', topics: [], baseStars: 3000, ageDays: 400, forks: 100, issues: 20, archived: false, fork: false, ...o });

// Normal repos, strongest first.
const normal = [
  ['fx-alpha/agent-runner', 'Python', ['ai', 'agents'], 6200, 41000],
  ['fx-beta/edge-db', 'Rust', ['database', 'wasm'], 5400, 22000],
  ['fx-gamma/pixel-ui', 'TypeScript', ['ui', 'react'], 4700, 18500],
  ['fx-delta/shell-pal', 'Go', ['cli', 'terminal'], 4100, 9800],
  ['fx-epsilon/model-lens', 'Python', ['ai', 'visualization'], 3600, 7400],
  ['fx-zeta/paper-sync', 'TypeScript', ['notes', 'sync'], 3000, 12600],
  ['fx-eta/tiny-queue', 'Zig', ['queue'], 2500, 5200],
  ['fx-theta/form-kit', 'JavaScript', ['forms'], 2100, 15300],
  ['fx-iota/log-tail', 'Rust', ['cli', 'logging'], 1800, 6100],
  ['fx-kappa/learn-rust-by-doing', 'Rust', ['education', 'rust'], 1600, 8900],
  ['fx-lambda/map-tiles', 'C++', ['maps'], 1300, 3400],
  ['fx-mu/chat-widget', 'JavaScript', ['chat'], 1100, 2900],
  ['fx-nu/py-notebook-tools', 'Python', ['notebook', 'data'], 950, 4600],
  ['fx-xi/cron-view', 'Go', ['cron', 'cli'], 800, 2200],
  ['fx-omicron/quiet-theme', 'CSS', ['theme'], 700, 6800],
];
normal.forEach(([name, language, topics, gain, stars], i) => add(name, { language, topics, gains: spread(gain), baseStars: stars, ageDays: 60 + i * 25, license: i % 5 === 4 ? null : 'MIT' }));

// Tie on weekly gain (1500). The second has gains on only 4 days, so it loses the tie-break.
add('fx-pi/tie-many-days', { topics: ['tie'], gains: [214, 214, 214, 214, 214, 215, 215], baseStars: 4000 });
add('fx-rho/tie-few-days', { topics: ['tie'], gains: [0, 600, 0, 500, 0, 400, 0], baseStars: 3900 });

// Spike: 4000 of 4150 stars on one day, still ranked, spike flag true.
add('fx-sigma/viral-one-day', { language: 'TypeScript', topics: ['spike'], gains: [20, 30, 4000, 40, 30, 20, 10], baseStars: 5000, ageDays: 20 });

// Hidden gems: under 500 stars, gain of 40 or more. Six, so the top-5 cut is tested.
[['fx-tau/small-parser', 300], ['fx-upsilon/cli-snippets', 210], ['fx-phi/budget-tracker', 150], ['fx-chi/rss-reader', 110], ['fx-psi/kata-pack', 80], ['fx-omega/tiny-gem-sixth', 45]]
  .forEach(([name, gain], i) => add(name, { language: i % 2 ? 'Go' : 'Python', topics: ['gem'], gains: spread(gain), baseStars: 120 + i * 60, ageDays: 12 + i * 3, forks: 8, issues: 3 }));

// Excluded repos with big gains: each must be filtered out by a different rule.
add('fx-arch/old-but-loud', { archived: true, gains: spread(9000), baseStars: 20000 });
add('fx-forkd/copycat', { fork: true, gains: spread(8000), baseStars: 1500 });
add('fx-farm/bought-stars', { gains: spread(7000), baseStars: 900, ageDays: 15 });

// Stale repo: not seen in a top 200 for 30+ days, so collect.js should drop it.
add('fx-stale/forgotten', { gains: [0, 0, 0, 0, 0, 0, 0], baseStars: 700, stale: true });

// Breakouts for rising.js: both are outside the weekly top. The first is speeding up in the last
// two days; the second gains as much but steadily, so it must not qualify.
add('fx-rise/late-bloomer', { language: 'Go', topics: ['rising'], gains: [10, 10, 10, 10, 60, 120, 200], baseStars: 2000, ageDays: 50 });
add('fx-flat/steady', { gains: [30, 30, 30, 30, 30, 30, 30], baseStars: 3000 });

function snapshot(dayIndex) {
  const out = { date: DAYS[dayIndex], repos: {} };
  for (const r of repos) {
    let stars = r.baseStars;
    for (let d = 0; d < dayIndex; d++) stars += r.gains[d];
    const created = new Date(Date.parse('2026-11-08T00:00:00Z') - r.ageDays * 86400000).toISOString();
    out.repos[r.name] = {
      stars,
      forks: r.forks,
      open_issues: r.issues,
      pushed_at: `${DAYS[dayIndex]}T0${(dayIndex % 8) + 1}:14:00Z`,
      created_at: created,
      language: r.language,
      license: r.license,
      topics: r.topics,
      archived: r.archived,
      fork: r.fork,
    };
  }
  return out;
}

await run('fixtures', async (log) => {
  const dry = process.argv.includes('--dry-run');
  const files = [];

  const tracked = { updated: '2026-11-08', repos: {} };
  for (const r of repos) {
    tracked.repos[r.name] = r.stale
      ? { first_seen: '2026-08-20', last_in_top200: '2026-09-15' }
      : { first_seen: '2026-10-20', last_in_top200: null };
  }
  files.push(['tracked.json', tracked]);

  DAYS.forEach((d, i) => files.push([`snapshots/${d}.json`, snapshot(i)]));

  // Trending-page numbers differ a little from ours on purpose, to test the cross-check.
  const eligible = repos.filter((r) => !r.stale).map((r) => ({ r, gain: r.gains.reduce((a, b) => a + b, 0) }));
  eligible.sort((a, b) => b.gain - a.gain);
  const bootRepos = eligible.slice(0, 14).map(({ r, gain }, i) => ({ full_name: r.name, stars_this_week: Math.round(gain * (0.96 + 0.01 * (i % 5))), language: r.language }));
  bootRepos.push({ full_name: 'fx-ghost/not-tracked', stars_this_week: 1200, language: 'Go' });
  files.push(['bootstrap/2026-W45.json', { week: '2026-W45', source: 'github.com/trending?since=weekly', fetched: '2026-11-09T04:00:00Z', repos: bootRepos }]);

  files.push(['blocklist.json', { repos: ['fx-farm/bought-stars'], reasons: { 'fx-farm/bought-stars': 'star farming' } }]);

  for (const [rel, data] of files) if (!dry) writeJson(path.join(OUT, rel), data);

  // Short fake READMEs so summarize.js has text to work with offline.
  for (const r of repos.filter((x) => !x.stale)) {
    const file = path.join(OUT, 'readmes', `${r.name.replace('/', '__')}.md`);
    const text = `# ${r.name.split('/')[1]}

A fake ${r.language} project used only for testing.

## Setup

1. Install it.
2. Run it.

## Contributing

See CONTRIBUTING.md.
`;
    if (!dry) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text, 'utf8');
    }
  }
  log.log(`${dry ? 'would write' : 'wrote'} ${files.length} files to ${path.relative('.', OUT)} (${repos.length} repos, ${DAYS.length} snapshots)`);
  log.done(dry ? 'dry run, nothing written' : 'ok');
});

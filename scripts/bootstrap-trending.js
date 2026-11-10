// Reads github.com/trending?since=weekly. Used until we have 7 days of snapshots,
// and as a cross-check afterwards. GitHub has no API for this, so we parse the page.
// Usage: node scripts/bootstrap-trending.js [--dry-run] [--week YYYY-Www] [--from-file page.html]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { writeJson } from './lib/cache.js';
import { config } from './lib/config.js';
import { run } from './lib/logger.js';
import { lastFullWeek } from './lib/weeks.js';

// Throws a clear error when the page structure changed, so nothing bad gets saved.
function parseTrending(html) {
  const articles = html.split('<article').slice(1);
  if (articles.length === 0) throw new Error('no <article> entries found, the trending page structure has changed');
  return articles.map((a, i) => {
    const name = /<h2[^>]*>\s*<a[^>]*href="\/([^"\/]+\/[^"\/]+)"/.exec(a)?.[1];
    const stars = /([\d,]+)\s+stars\s+this\s+week/i.exec(a)?.[1];
    const language = /itemprop="programmingLanguage">([^<]+)</.exec(a)?.[1] ?? null;
    if (!name) throw new Error(`entry ${i + 1}: repo name not found, the page structure has changed`);
    if (!stars) throw new Error(`entry ${i + 1} (${name}): "stars this week" not found, the page structure has changed`);
    return { full_name: name, stars_this_week: Number(stars.replace(/,/g, '')), language };
  });
}

await run('bootstrap', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const week = args.week || lastFullWeek();

  let html;
  if (args['from-file']) {
    html = fs.readFileSync(args['from-file'], 'utf8');
  } else {
    const res = await fetch('https://github.com/trending?since=weekly', { headers: { 'User-Agent': 'repoweekly' } });
    if (!res.ok) throw new Error(`trending page returned ${res.status}`);
    html = await res.text();
  }

  const repos = parseTrending(html);
  const file = path.join(config.paths.bootstrap, `${week}.json`);
  const data = { week, source: 'github.com/trending?since=weekly', fetched: new Date().toISOString(), repos };
  if (!dry) writeJson(file, data);
  log.log(`top entry: ${repos[0].full_name} (${repos[0].stars_this_week} stars this week)`);
  log.done(`${repos.length} repos for ${week}${dry ? ' (dry run, nothing written)' : ` -> ${path.relative('.', file)}`}`);
});

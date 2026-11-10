// Builds the public files from data/weeks: RSS feed and the static JSON API.
// Usage: node scripts/feeds.js [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { readJson, writeJson } from './lib/cache.js';
import { config } from './lib/config.js';
import { run } from './lib/logger.js';

const FEED_WEEKS = 10;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hasSummaries = (w) => [...w.top, ...w.gems].every((i) => i.summary);

function feedItem(w) {
  const site = config.site.url;
  const list = w.top
    .map((i) => `<li><a href="${esc(i.url)}">${esc(i.full_name)}</a> (+${i.stars_gained} stars): ${esc(i.summary.what_it_is)}</li>`)
    .join('');
  return `    <item>
      <title>${esc(`Top ${w.top.length} GitHub repos, ${w.week} (${w.start} to ${w.end})`)}</title>
      <link>${esc(`${site}/weeks/${w.week}/`)}</link>
      <guid isPermaLink="false">${esc(`repoweekly-${w.week}`)}</guid>
      <pubDate>${new Date(w.generated).toUTCString()}</pubDate>
      <description>${esc(`<ol>${list}</ol>`)}</description>
    </item>`;
}

await run('feeds', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const latestRef = readJson(config.paths.latest);
  if (!latestRef) throw new Error('latest.json not found, run rank.js first');

  const files = fs.readdirSync(config.paths.weeks).filter((f) => /^\d{4}-W\d{2}\.json$/.test(f)).sort().reverse();
  const weeks = [];
  for (const f of files) {
    const w = readJson(path.join(config.paths.weeks, f));
    if (hasSummaries(w)) weeks.push(w);
    else if (w.week === latestRef.week) throw new Error(`latest week ${w.week} has items without summaries, run summarize.js`);
    else log.warn(`${w.week} has items without summaries, leaving it out of the public files`);
  }
  const latest = weeks.find((w) => w.week === latestRef.week);
  if (!latest) throw new Error(`latest week ${latestRef.week} not found in ${config.paths.weeks}`);
  if (latest.top.length < config.ranking.topCount) throw new Error(`latest week has only ${latest.top.length} ranked repos`);

  const pub = config.paths.publicDir;
  const index = { license: config.licenseNote, weeks: weeks.map((w) => ({ week: w.week, path: `weeks/${w.week}.json` })) };
  // One flat record per repo, from the newest week it appeared in. The compare page and the
  // browser extension read this file.
  const repos = {};
  for (const w of weeks) {
    for (const i of [...w.top, ...w.gems]) {
      repos[i.full_name.toLowerCase()] ??= {
        full_name: i.full_name, week: w.week, place: w.top.includes(i) ? i.rank : null, gem: !w.top.includes(i),
        stars_total: i.stars_total, stars_gained: i.stars_gained, language: i.language, ...i.signals,
        star_check: i.star_check?.level ?? null, difficulty: i.summary.difficulty, beginner_friendly: i.summary.beginner_friendly, tags: i.summary.tags, what_it_is: i.summary.what_it_is,
      };
    }
  }
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(config.site.title)}</title>
    <link>${esc(config.site.url)}/</link>
    <description>The top 10 trending GitHub repositories of the week, explained in plain language.</description>
    <language>en</language>
    <lastBuildDate>${new Date(latest.generated).toUTCString()}</lastBuildDate>
    <atom:link href="${esc(config.site.url)}/feed.xml" rel="self" type="application/rss+xml" />
${weeks.slice(0, FEED_WEEKS).map(feedItem).join('\n')}
  </channel>
</rss>
`;

  if (!dry) {
    writeJson(path.join(pub, 'api', 'latest.json'), latest);
    for (const w of weeks) writeJson(path.join(pub, 'api', 'weeks', `${w.week}.json`), w);
    writeJson(path.join(pub, 'api', 'index.json'), index);
    writeJson(path.join(pub, 'api', 'repos.json'), { license: config.licenseNote, repos });
    const rising = readJson(path.join(config.paths.data, 'rising.json'));
    if (rising) writeJson(path.join(pub, 'api', 'rising.json'), rising);
    fs.mkdirSync(pub, { recursive: true });
    fs.writeFileSync(path.join(pub, 'feed.xml'), feed, 'utf8');
  }
  log.done(`${weeks.length} weeks, latest ${latest.week}${dry ? ' (dry run, nothing written)' : ' -> public/feed.xml, public/api/'}`);
});

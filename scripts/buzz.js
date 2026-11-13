// What people say about the skill repositories on the Skills page (the top ten and the rising list).
// Hacker News quotes come from its free search API, daily. X posts are picked by hand: put post links
// in data/x-posts.json as { "owner/name": ["https://x.com/user/status/123"] } and we fetch the text
// through X's free embed service. Visitors never contact either site: the quotes are saved here.
// Usage: node scripts/buzz.js [--dry-run]
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { readJson, writeJson } from './lib/cache.js';
import { hnBuzz, X_POST, xQuote } from './lib/buzz.js';
import { config } from './lib/config.js';
import { run } from './lib/logger.js';

const HN = process.env.HN_API_BASE || 'https://hn.algolia.com/api/v1';
const XE = process.env.X_OEMBED_BASE || 'https://publish.x.com/oembed';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'repoweekly' } });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

await run('buzz', async (log) => {
  const dry = Boolean(parseArgs()['dry-run']);
  const skills = readJson(path.join(config.paths.data, 'skills.json'));
  if (!skills) throw new Error('skills.json not found, run skills.js first');
  const names = [...new Set([...skills.repos.slice(0, 10), ...(skills.rising ?? [])].map((r) => r.full_name))];
  const picked = readJson(path.join(config.paths.data, 'x-posts.json')) ?? {};
  const outFile = path.join(config.paths.data, 'buzz.json');
  const old = readJson(outFile)?.repos ?? {};

  const repos = {};
  for (const name of names) {
    let hn;
    try {
      const data = await getJson(`${HN}/search?query=${encodeURIComponent(name)}&hitsPerPage=50`);
      hn = hnBuzz(name, data.hits ?? []);
    } catch (err) {
      log.warn(`${name}: Hacker News search failed (${err.message}), keeping yesterday's`);
      hn = { story: old[name]?.story ?? null, quotes: (old[name]?.quotes ?? []).filter((q) => q.source === 'hn') };
    }
    const xs = [];
    for (const url of (picked[name] ?? []).slice(0, 3)) {
      if (!X_POST.test(url)) { log.warn(`${name}: not an X post link, skipped: ${url}`); continue; }
      try {
        const q = xQuote(url, await getJson(`${XE}?url=${encodeURIComponent(url)}&omit_script=1&dnt=true`));
        if (q) xs.push(q);
      } catch (err) {
        const kept = old[name]?.quotes?.find((q) => q.url === url.replace('twitter.com', 'x.com'));
        if (kept) xs.push(kept);
        log.warn(`${name}: X post not fetched (${err.message}) ${url}`);
      }
    }
    if (hn.story || hn.quotes.length || xs.length) repos[name] = { story: hn.story, quotes: [...xs, ...hn.quotes] };
    await sleep(300); // be gentle with the free search API
  }

  const out = { generated: new Date().toISOString(), repos };
  if (!dry) writeJson(outFile, out);
  log.done(`${Object.keys(repos).length} of ${names.length} repos have something said about them${dry ? ' (dry run, nothing written)' : ''}`);
});

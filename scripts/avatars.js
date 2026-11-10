// Saves owner avatars into public/avatars at build time. Visitors then never contact
// GitHub's image host, which keeps "no tracking" true. Files are committed so older
// weeks keep their avatars.
// Usage: node scripts/avatars.js [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { readJson } from './lib/cache.js';
import { config } from './lib/config.js';
import { run } from './lib/logger.js';

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const KNOWN = Object.values(EXT);

await run('avatars', async (log) => {
  const dry = Boolean(parseArgs()['dry-run']);
  const ref = readJson(config.paths.latest);
  if (!ref) throw new Error('latest.json not found, run rank.js first');
  const week = readJson(path.join(config.paths.data, ref.path));
  const dir = path.join(config.paths.publicDir, 'avatars');

  let saved = 0;
  let had = 0;
  let failed = 0;
  const seen = new Set();
  for (const item of [...week.top, ...week.gems]) {
    const owner = item.full_name.split('/')[0].toLowerCase();
    if (seen.has(owner)) continue;
    seen.add(owner);
    if (KNOWN.some((e) => fs.existsSync(path.join(dir, `${owner}.${e}`)))) {
      had++;
      continue;
    }
    if (dry) {
      log.log(`would save avatar for ${owner}`);
      continue;
    }
    try {
      const url = item.avatar + (item.avatar.includes('?') ? '&' : '?') + 's=80';
      const res = await fetch(url, { headers: { 'User-Agent': 'repoweekly' } });
      if (!res.ok) throw new Error(`${res.status}`);
      const ext = EXT[(res.headers.get('content-type') ?? '').split(';')[0]];
      if (!ext) throw new Error(`unexpected type ${res.headers.get('content-type')}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${owner}.${ext}`), Buffer.from(await res.arrayBuffer()));
      saved++;
    } catch (err) {
      // Not fatal: the card simply has no avatar.
      failed++;
      log.warn(`no avatar for ${owner}: ${err.message}`);
    }
  }
  log.done(`${saved} saved, ${had} already there, ${failed} failed${dry ? ' (dry run, nothing written)' : ''}`);
});

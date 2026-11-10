// Checks that the latest week is safe to publish. The weekly workflow runs this before it
// commits data or deploys, so a bad week never replaces the live site (CLAUDE.md rule 6).
// Usage: node scripts/validate.js [--skip-public]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { readJson } from './lib/cache.js';
import { config } from './lib/config.js';
import { run } from './lib/logger.js';

const TEXT_FIELDS = ['what_it_is', 'why_trending', 'who_its_for'];

await run('validate', async (log) => {
  const args = parseArgs();
  const ref = readJson(config.paths.latest);
  if (!ref) throw new Error(`${config.paths.latest} not found`);
  const w = readJson(path.join(config.paths.data, ref.path));
  if (!w) throw new Error(`${ref.path} not found`);

  const errors = [];
  if (w.week !== ref.week) errors.push(`latest.json says ${ref.week} but the file is ${w.week}`);
  if (!['snapshots', 'bootstrap'].includes(w.growth_source)) errors.push(`bad growth_source "${w.growth_source}"`);
  if (w.top.length < config.ranking.topCount) errors.push(`only ${w.top.length} ranked repos, need ${config.ranking.topCount}`);
  if (w.gems.length > config.ranking.gemCount) errors.push(`${w.gems.length} gems, at most ${config.ranking.gemCount}`);

  for (const item of [...w.top, ...w.gems]) {
    const s = item.summary;
    if (!s) {
      errors.push(`${item.full_name}: no summary`);
      continue;
    }
    for (const f of TEXT_FIELDS) if (typeof s[f] !== 'string' || !s[f].trim()) errors.push(`${item.full_name}: empty summary.${f}`);
    if (!['easy', 'medium', 'hard'].includes(s.difficulty)) errors.push(`${item.full_name}: bad difficulty`);
    // urdu is optional until Phase 3, so it is not checked here.
    if (![0, 7].includes(item.daily_gains.length)) errors.push(`${item.full_name}: daily_gains has ${item.daily_gains.length} values`);
    if (w.growth_source === 'bootstrap' && item.spike !== null) errors.push(`${item.full_name}: spike must be null in bootstrap mode`);
  }

  if (!args['skip-public']) {
    for (const f of ['feed.xml', 'api/latest.json', 'api/index.json', `api/weeks/${w.week}.json`]) {
      if (!fs.existsSync(path.join(config.paths.publicDir, f))) errors.push(`public/${f} is missing, run feeds.js`);
    }
  }

  if (errors.length) throw new Error(`${errors.length} problem(s): ${errors.join('; ')}`);
  log.done(`${w.week} is publishable: ${w.top.length} ranked, ${w.gems.length} gems, growth from ${w.growth_source}`);
});

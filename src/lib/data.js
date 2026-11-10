// Reads the latest week at build time. Fails the build if the data is not publishable
// (see CLAUDE.md rule 6): fewer than 10 ranked repos, or any item without a summary.
import path from 'node:path';
import { readJson } from '../../scripts/lib/cache.js';
import { config } from '../../scripts/lib/config.js';

export function loadLatestWeek() {
  const ref = readJson(config.paths.latest);
  if (!ref) throw new Error(`${config.paths.latest} not found. Run the data pipeline first (npm run build:data).`);
  const week = readJson(path.join(config.paths.data, ref.path));
  if (!week) throw new Error(`${ref.path} listed in latest.json but not found.`);
  if (week.top.length < config.ranking.topCount) {
    throw new Error(`${week.week} has only ${week.top.length} ranked repos, need ${config.ranking.topCount}.`);
  }
  const missing = [...week.top, ...week.gems].filter((i) => !i.summary).map((i) => i.full_name);
  if (missing.length) throw new Error(`${week.week} has items without summaries: ${missing.join(', ')}`);
  return week;
}

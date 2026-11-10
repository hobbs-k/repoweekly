// Reads the latest week at build time. Fails the build if the data is not publishable
// (see CLAUDE.md rule 6): fewer than 10 ranked repos, or any item without a summary.
import fs from 'node:fs';
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

// Every week that is complete (all summaries present), newest first.
export function loadAllWeeks() {
  const files = fs.readdirSync(config.paths.weeks).filter((f) => /^\d{4}-W\d{2}\.json$/.test(f)).sort().reverse();
  return files.map((f) => readJson(path.join(config.paths.weeks, f))).filter((w) => [...w.top, ...w.gems].every((i) => i.summary));
}

// One record per repo, with its appearances across weeks, newest first.
export function loadRepos() {
  const repos = new Map();
  for (const w of loadAllWeeks()) {
    for (const [kind, list] of [['top', w.top], ['gem', w.gems]]) {
      for (const item of list) {
        const key = item.full_name.toLowerCase();
        if (!repos.has(key)) repos.set(key, { key, full_name: item.full_name, latest: { week: w, item, kind }, appearances: [] });
        repos.get(key).appearances.push({ week: w.week, start: w.start, kind, item, source: w.growth_source });
      }
    }
  }
  return repos;
}

// The daily breakouts from rising.js. null until the first run.
export const loadRising = () => readJson(path.join(config.paths.data, 'rising.json'));

// The optional "Learn from this repo" guide that guide.js writes for a week.
export const loadGuide = (week) => readJson(path.join(config.paths.data, 'guides', `${week}.json`));

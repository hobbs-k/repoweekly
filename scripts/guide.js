// "Learn from this repo": a short AI guide for one featured repo (default: this week's number 1).
// Optional content. The weekly workflow lets this step fail without failing the week.
// Usage: node scripts/guide.js [--dry-run] [--week YYYY-Www] [--repo owner/name] [--force]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { readJson, summaryFileName, writeJson } from './lib/cache.js';
import { askJson, requireKey } from './lib/claude.js';
import { config } from './lib/config.js';
import { run } from './lib/logger.js';

const SYSTEM = `You write a short "learn from this project" guide for students and beginners, about one open-source GitHub project.

Rules:
- Use only the README text and metadata provided. If something is not in them, leave it out. Never guess file names, commands or features.
- Short, plain sentences. No hype words.
- overview: two or three sentences on what the project is and what a learner gets from it.
- how_to_start: 3 to 5 steps to get it running, taken from the README. If the README has no setup steps, give one step saying so.
- read_these: 3 to 5 things to read or try first. "what" must name something the README mentions (a section, a folder, a command, an example). "why" is one short sentence.
- first_contributions: 2 to 4 ideas for a first contribution that follow from the README or the open good-first-issue count. No invented issue numbers.
- watch_out: 2 to 4 honest cautions (young project, few contributors, missing license, spike in stars, and so on) based on the metadata.

Return one JSON object with exactly these keys: overview, how_to_start, read_these, first_contributions, watch_out. No text before or after it.`;

const list = (raw, key, min, max) => {
  if (!Array.isArray(raw[key]) || raw[key].length < min || raw[key].length > max) throw new Error(`"${key}" must have ${min} to ${max} items`);
  return raw[key];
};
const strings = (raw, key, min, max) => list(raw, key, min, max).map((t) => {
  if (typeof t !== 'string' || !t.trim()) throw new Error(`"${key}" has an empty item`);
  return t.trim();
});

function validate(raw) {
  if (typeof raw.overview !== 'string' || !raw.overview.trim()) throw new Error('"overview" is missing');
  return {
    overview: raw.overview.trim(),
    how_to_start: strings(raw, 'how_to_start', 1, 5),
    read_these: list(raw, 'read_these', 3, 5).map((r) => {
      if (typeof r?.what !== 'string' || typeof r?.why !== 'string' || !r.what.trim() || !r.why.trim()) throw new Error('"read_these" items need what and why');
      return { what: r.what.trim(), why: r.why.trim() };
    }),
    first_contributions: strings(raw, 'first_contributions', 2, 4),
    watch_out: strings(raw, 'watch_out', 2, 4),
  };
}

await run('guide', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const week = args.week || readJson(config.paths.latest)?.week;
  if (!week) throw new Error('no week given and no latest.json, run rank.js first');
  const data = readJson(path.join(config.paths.weeks, `${week}.json`));
  if (!data) throw new Error(`week ${week} not found`);
  const item = typeof args.repo === 'string' ? data.top.find((i) => i.full_name === args.repo) : data.top[0];
  if (!item) throw new Error(`${args.repo} is not in the top list of ${week}`);

  const out = path.join(config.paths.data, 'guides', `${week}.json`);
  if (fs.existsSync(out) && !args.force) {
    log.done(`${week} already has a guide (use --force to write it again)`);
    return;
  }

  const readmeFile = path.join(config.paths.readmes, summaryFileName(item.full_name).replace('.json', '.md'));
  const readme = fs.existsSync(readmeFile) ? fs.readFileSync(readmeFile, 'utf8') : '';
  if (!readme.trim()) throw new Error(`no saved README for ${item.full_name}, run rank.js first`);
  const s = item.signals;
  const user = [
    `Repository: ${item.full_name}`,
    `Description: ${item.description || '(none)'}`,
    `Language: ${item.language ?? 'unknown'}`,
    `License: ${s.license ?? 'none listed'}`,
    `Age in days: ${s.age_days}`,
    `Contributors: ${s.contributors ?? 'unknown'}`,
    `Open good-first-issue count: ${s.good_first_issues ?? 'unknown'}`,
    `Summary: ${item.summary?.what_it_is ?? '(none)'}`,
    '',
    'README (trimmed):',
    '"""',
    readme,
    '"""',
  ].join('\n');

  if (dry) {
    log.log(`--- system prompt ---\n${SYSTEM}\n--- user prompt ---\n${user}\n--- end ---`);
    log.done(`would write a guide for ${item.full_name} (dry run, no API call, nothing written)`);
    return;
  }
  requireKey();
  const guide = await askJson({ system: SYSTEM, user, validate, label: item.full_name, log });
  writeJson(out, { week, full_name: item.full_name, generated: new Date().toISOString(), model: config.summarize.model, ...guide });
  log.done(`guide for ${item.full_name} -> ${path.relative('.', out)}`);
});

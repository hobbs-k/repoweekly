// Adds AI summaries to the weekly file. Uses only the README and metadata that rank.js saved.
// Usage: node scripts/summarize.js [--dry-run] [--week YYYY-Www] [--only owner/repo]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { hashText, readJson, summaryFileName, writeJson } from './lib/cache.js';
import { askJson, requireKey } from './lib/claude.js';
import { config } from './lib/config.js';
import { run } from './lib/logger.js';

const urdu = config.summarize.urduEnabled;

const SYSTEM = `You write short summaries of open-source GitHub projects for a website that helps students and beginners find good projects.

Rules:
- Use only the README text and metadata provided. If something is not in them, leave it out. Never guess.
- Write short, plain sentences. No hype words like "revolutionary" or "game-changing".
- what_it_is: what the project does, in plain words a student can follow. One or two sentences.
- why_trending: a likely reason based on the supplied text (new release, new feature, a topic that is hot). One or two sentences. If the text gives no clue, write exactly: "No clear reason in the project's own text."
- who_its_for: one short sentence.
- beginner_friendly: true only if the README has setup steps and the project has good-first-issue labels or a contributing guide.
- difficulty: one of "easy", "medium", "hard", for a newcomer who wants to use or contribute.
- tags: 2 to 5 short lowercase tags.
${urdu ? '- urdu: an Urdu version of what_it_is and why_trending, 2 to 3 sentences.\n' : ''}
Return one JSON object with exactly these keys: what_it_is, why_trending, who_its_for, beginner_friendly, difficulty, tags${urdu ? ', urdu' : ''}. No text before or after it.`;

function buildPrompt(item, readme) {
  const s = item.signals;
  return [
    `Repository: ${item.full_name}`,
    `Description: ${item.description || '(none)'}`,
    `Language: ${item.language ?? 'unknown'}`,
    `Topics: ${item.topics.join(', ') || '(none)'}`,
    `License: ${s.license ?? 'none listed'}`,
    `Stars gained this week: ${item.stars_gained}`,
    `Total stars: ${item.stars_total}`,
    `Age in days: ${s.age_days}`,
    `Open good-first-issue count: ${s.good_first_issues ?? 'unknown'}`,
    `Most of the weekly gain came in one day: ${item.spike === null ? 'unknown' : item.spike ? 'yes' : 'no'}`,
    '',
    'README (trimmed):',
    '"""',
    readme || '(no README available)',
    '"""',
  ].join('\n');
}

function validate(raw) {
  const str = (k) => {
    if (typeof raw[k] !== 'string' || !raw[k].trim()) throw new Error(`"${k}" is missing or empty`);
    return raw[k].trim();
  };
  if (typeof raw.beginner_friendly !== 'boolean') throw new Error('"beginner_friendly" must be true or false');
  if (!['easy', 'medium', 'hard'].includes(raw.difficulty)) throw new Error('"difficulty" must be easy, medium or hard');
  if (!Array.isArray(raw.tags) || raw.tags.length === 0) throw new Error('"tags" must be a non-empty array');
  const out = {
    what_it_is: str('what_it_is'),
    why_trending: str('why_trending'),
    who_its_for: str('who_its_for'),
    beginner_friendly: raw.beginner_friendly,
    difficulty: raw.difficulty,
    tags: raw.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 5),
  };
  if (urdu) out.urdu = str('urdu');
  return out;
}

await run('summarize', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const week = args.week || readJson(config.paths.latest)?.week;
  if (!week) throw new Error('no week given and no latest.json, run rank.js first');
  const weekFile = path.join(config.paths.weeks, `${week}.json`);
  const data = readJson(weekFile);
  if (!data) throw new Error(`${weekFile} not found, run rank.js first`);

  let items = [...data.top, ...data.gems];
  if (typeof args.only === 'string') {
    items = items.filter((i) => i.full_name === args.only);
    if (!items.length) throw new Error(`${args.only} is not in ${week}`);
  }

  if (!dry) requireKey();

  function generate(item, readme) {
    return askJson({
      system: SYSTEM,
      user: buildPrompt(item, readme),
      label: item.full_name,
      log,
      maxTokens: 1500,
      validate(raw) {
        const summary = validate(raw);
        // Keep the beginner flag honest: it needs good-first-issues or a contributing guide.
        if (summary.beginner_friendly && !(item.signals.good_first_issues > 0 || /contribut/i.test(readme))) summary.beginner_friendly = false;
        return summary;
      },
    });
  }

  let cached = 0;
  let generated = 0;
  let shownPrompt = false;
  for (const item of items) {
    const readmeFile = path.join(config.paths.readmes, summaryFileName(item.full_name).replace('.json', '.md'));
    const readme = fs.existsSync(readmeFile) ? fs.readFileSync(readmeFile, 'utf8') : '';
    const hash = hashText(readme || item.description);
    const cacheFile = path.join(config.paths.summaries, summaryFileName(item.full_name));
    const cache = readJson(cacheFile);
    if (cache && cache.readme_hash === hash && (!urdu || cache.summary.urdu)) {
      item.summary = cache.summary;
      cached++;
      continue;
    }
    if (dry) {
      generated++;
      if (!shownPrompt) {
        shownPrompt = true;
        log.log(`--- system prompt ---\n${SYSTEM}\n--- user prompt for ${item.full_name} ---\n${buildPrompt(item, readme)}\n--- end ---`);
      }
      continue;
    }
    if (!readme) log.warn(`${item.full_name}: no saved README, summarizing from the description only`);
    item.summary = await generate(item, readme);
    // Cache right away so a later failure does not waste free-tier quota.
    writeJson(cacheFile, { readme_hash: hash, generated: new Date().toISOString(), model: config.summarize.models[0], summary: item.summary });
    generated++;
    log.log(`summarized ${item.full_name}`);
  }

  if (dry) {
    log.done(`${cached} cached, ${generated} would be generated (dry run, no API call, nothing written)`);
    return;
  }
  if (!args.only) {
    const missing = [...data.top, ...data.gems].filter((i) => !i.summary).map((i) => i.full_name);
    if (missing.length) throw new Error(`missing summaries: ${missing.join(', ')}`);
  }
  writeJson(weekFile, data);
  log.done(`${generated} generated, ${cached} from cache, week ${week}`);
});

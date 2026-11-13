// Finds the best repositories of agent skills (folders with a SKILL.md file) and ranks them by the
// stars they gained, over up to 30 days. Writes data/skills.json for the /skills/ page.
// Candidates come from GitHub topic searches. Each is checked for real SKILL.md files, so a repo that
// only uses the topic is dropped. Star counts are saved daily in data/skills-history.json.
// Usage: node scripts/skills.js [--dry-run] [--no-summaries]
import path from 'node:path';
import { parseArgs } from './lib/args.js';
import { hashText, readJson, writeJson } from './lib/cache.js';
import { askJson, requireKey } from './lib/claude.js';
import { config } from './lib/config.js';
import { ghGet, rateRemaining } from './lib/github.js';
import { run } from './lib/logger.js';
import { detectAgents, parseFrontmatter, skillFiles, skillsFromTree } from './lib/skillparse.js';
import { extractGuide, marketplaceCommands } from './lib/guide.js';
import { buildInstall } from './lib/install.js';
import { checkSkill, repoCompat } from './lib/compat.js';
import { pickRising } from './lib/rising.js';
import { toDateString } from './lib/weeks.js';

const DAY = 86400000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SYSTEM = `You write short summaries of open-source GitHub repositories that hold "skills" (SKILL.md files that teach an AI coding agent how to do a task), for a website that helps developers and students find good ones.

Rules:
- Use only the README text and metadata provided. If something is not in them, leave it out. Never guess.
- Write short, plain sentences. No hype words.
- what_it_is: what the skills in this repository help an agent do. One or two sentences.
- who_its_for: one short sentence.
- Return one JSON object with exactly these keys: what_it_is, who_its_for. No text before or after it.`;

function validate(raw) {
  for (const k of ['what_it_is', 'who_its_for']) if (typeof raw[k] !== 'string' || !raw[k].trim()) throw new Error(`"${k}" is missing or empty`);
  return { what_it_is: raw.what_it_is.trim(), who_its_for: raw.who_its_for.trim() };
}

const summaryPrompt = (r, readme) => [`Repository: ${r.full_name}`, `Description: ${r.description ?? '(none)'}`, `Skills found: ${r.skill_count} (${r.skills.slice(0, 15).map((s) => s.name).join(', ')})`, '', 'README (trimmed):', '"""', readme, '"""'].join('\n');

await run('skills', async (log) => {
  const args = parseArgs();
  const dry = Boolean(args['dry-run']);
  const left = await rateRemaining();
  if (left !== null && left < config.minRateLeft) {
    log.done(`skipped: only ${left} GitHub requests left this hour, keeping them for the snapshot`);
    return;
  }
  const rule = config.skills;
  const today = toDateString(new Date());
  const blocked = new Set(readJson(config.paths.blocklist)?.repos ?? []);

  // 1. Candidates from topic searches, newest activity only. GitHub allows 30 searches a minute.
  const since = toDateString(new Date(Date.now() - rule.pushedDays * DAY));
  const found = new Map();
  for (const topic of rule.topics) {
    for (let page = 1; page <= rule.pages; page++) {
      try {
        const q = `topic:${topic} stars:>=${rule.minStars} pushed:>${since} archived:false fork:false`;
        const { data } = await ghGet(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=100&page=${page}`);
        for (const r of data.items ?? []) if (!found.has(r.full_name)) found.set(r.full_name, r);
        if ((data.items ?? []).length < 100) break;
      } catch (err) {
        log.warn(`search topic:${topic} page ${page} failed (${err.message})`);
        break;
      }
      await sleep(config.skills.searchDelayMs);
    }
  }
  if (!found.size) throw new Error('no candidates found, check the token and the rate limit');
  const candidates = [...found.values()]
    .filter((r) => !blocked.has(r.full_name))
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, rule.maxRepos);
  log.log(`${found.size} found by topic, checking the ${candidates.length} with most stars`);

  // 2. Which of them really hold SKILL.md files. A tree is only read again when the repo was pushed to.
  const treesFile = path.join(config.paths.data, 'skills-trees.json');
  const trees = readJson(treesFile) ?? {};
  const repos = [];
  for (const r of candidates) {
    let entry = trees[r.full_name];
    if (!entry || entry.pushed_at !== r.pushed_at) {
      try {
        const { data } = await ghGet(`/repos/${r.full_name}/git/trees/${encodeURIComponent(r.default_branch)}?recursive=1`);
        const all = skillsFromTree(data.tree ?? [], r.name);
        // Only the first few are kept, with the real count, so the saved file stays small.
        entry = { pushed_at: r.pushed_at, count: all.length, skills: all.slice(0, rule.maxSkillsListed) };
        trees[r.full_name] = entry;
      } catch (err) {
        log.warn(`${r.full_name}: tree not read (${err.message})`);
        continue;
      }
    }
    const count = entry.count ?? entry.skills.length;
    if (!count) continue;
    repos.push({
      full_name: r.full_name, url: r.html_url, description: r.description, language: r.language,
      topics: r.topics ?? [], stars: r.stargazers_count, pushed_at: r.pushed_at, created_at: r.created_at,
      license: r.license?.spdx_id ?? null, default_branch: r.default_branch, avatar: r.owner?.avatar_url ?? null,
      skill_count: count, skills: entry.skills.slice(0, rule.maxSkillsListed).map((s) => ({ name: s.name, path: s.path })),
      agents: detectAgents([r.full_name, r.description ?? '', ...(r.topics ?? []), ...entry.skills.slice(0, 10).map((x) => x.path)].join(' ')),
    });
  }
  log.log(`${repos.length} of ${candidates.length} hold SKILL.md files`);

  // 3. Star history, then the gain over the longest span we have, up to 30 days.
  const histFile = path.join(config.paths.data, 'skills-history.json');
  const history = readJson(histFile) ?? {};
  history[today] = Object.fromEntries(repos.map((r) => [r.full_name, r.stars]));
  for (const d of Object.keys(history)) if (Date.parse(d) < Date.now() - 45 * DAY) delete history[d];
  const dates = Object.keys(history).sort();
  const base = dates.find((d) => (Date.parse(today) - Date.parse(d)) / DAY <= rule.gainDays) ?? today;
  const span = Math.round((Date.parse(today) - Date.parse(base)) / DAY);
  const mode = span >= rule.minSpanDays ? 'gain' : 'recent';
  for (const r of repos) {
    const before = history[base]?.[r.full_name];
    r.gained = mode === 'gain' && before != null ? r.stars - before : null;
  }
  const ranked = [...repos].sort((a, b) => mode === 'gain'
    ? (b.gained ?? -1) - (a.gained ?? -1) || b.stars - a.stars
    : b.stars - a.stars);
  ranked.forEach((r, i) => { r.rank = i + 1; });
  log.log(`ranking by ${mode === 'gain' ? `stars gained in ${span} days` : `total stars (only ${span} days of history so far)`}`);

  // 4. Names and one-line descriptions of the skills in the top repos, and an AI summary for the top ten.
  const cacheFile = path.join(config.paths.data, 'skills-cache.json');
  const cache = readJson(cacheFile) ?? { descriptions: {}, summaries: {} };
  const top = ranked.slice(0, rule.detailRepos);
  for (const r of top) {
    for (const s of r.skills.slice(0, rule.detailSkills)) {
      const key = `${r.full_name}:${s.path}:${r.pushed_at}`;
      if (!(key in cache.descriptions)) {
        try {
          const { data } = await ghGet(`/repos/${r.full_name}/contents/${s.path.split('/').map(encodeURIComponent).join('/')}`, { raw: true });
          const fm = parseFrontmatter(data);
          cache.descriptions[key] = (fm.description ?? '').slice(0, 300);
          if (fm.name) s.title = fm.name;
        } catch { cache.descriptions[key] = ''; }
      }
      if (cache.descriptions[key]) s.description = cache.descriptions[key];
    }
  }

  const withKey = Boolean(process.env.LLM_API_KEY) && !args['no-summaries'];
  if (!withKey) log.warn('no AI summaries (LLM_API_KEY not set or --no-summaries)');
  for (const r of ranked.slice(0, rule.summaryRepos)) {
    const cached = cache.summaries[r.full_name];
    if (cached && cached.pushed_at === r.pushed_at) { r.summary = cached.summary; continue; }
    if (!withKey || dry) continue;
    try {
      requireKey();
      const readme = (await ghGet(`/repos/${r.full_name}/readme`, { raw: true })).data.slice(0, config.summarize.readmeMaxChars);
      r.summary = await askJson({ system: SYSTEM, user: summaryPrompt(r, readme), validate, label: r.full_name, log, maxTokens: 600 });
      cache.summaries[r.full_name] = { pushed_at: r.pushed_at, hash: hashText(readme), summary: r.summary };
      log.log(`summarized ${r.full_name}`);
    } catch (err) {
      log.warn(`${r.full_name}: no summary (${err.message})`);
    }
  }

  // 5. Rising repos: the ones not yet famous. Each gets install commands pinned to one commit, and the
  // install steps copied from its own README. The commands come from fixed templates, never from the AI.
  const guidesFile = path.join(config.paths.data, 'skills-guides.json');
  const guides = readJson(guidesFile) ?? {};
  const rising = pickRising(ranked, today, rule.rising);
  for (const r of rising) {
    let g = guides[r.full_name];
    if (!g || g.v !== 3 || g.pushed_at !== r.pushed_at) {
      try {
        const { data: commit } = await ghGet(`/repos/${r.full_name}/commits/${encodeURIComponent(r.default_branch)}`);
        const sha = commit.sha;
        const { data: tree } = await ghGet(`/repos/${r.full_name}/git/trees/${sha}?recursive=1`);
        const skills = skillsFromTree(tree.tree ?? [], r.full_name.split('/')[1]);
        if (!skills.length) throw new Error('no SKILL.md at this commit');
        let readme = '';
        try { readme = (await ghGet(`/repos/${r.full_name}/readme?ref=${sha}`, { raw: true })).data; } catch { /* no README */ }
        // Each tool's documented rules, tested on the real SKILL.md of up to 12 skills at this commit.
        const checks = [];
        for (const s of skills.slice(0, 12)) {
          try {
            const text = (await ghGet(`/repos/${r.full_name}/contents/${s.path.split('/').map(encodeURIComponent).join('/')}?ref=${sha}`, { raw: true })).data;
            checks.push({ skill: s.name, result: checkSkill({ folder: s.name, file: s.path.split('/').pop(), fm: parseFrontmatter(text) }) });
          } catch { /* unreadable file: left out of the check */ }
        }
        let market = null;
        if ((tree.tree ?? []).some((e) => e.path === '.claude-plugin/marketplace.json')) {
          try { market = marketplaceCommands(r.full_name, (await ghGet(`/repos/${r.full_name}/contents/.claude-plugin/marketplace.json?ref=${sha}`, { raw: true })).data); } catch { /* unreadable */ }
        }
        g = { v: 3, pushed_at: r.pushed_at, sha, compat: repoCompat(checks), files: skillFiles(tree.tree ?? [], skills), ...buildInstall({ full_name: r.full_name, sha, skills }), guide: extractGuide(readme), marketplace: market };
        guides[r.full_name] = g;
      } catch (err) {
        log.warn(`${r.full_name}: no install guide (${err.message})`);
        continue;
      }
    }
    r.install = { sha: g.sha, skill: g.skill, agents: g.install, guide: g.guide, marketplace: g.marketplace, files: g.files, compat: g.compat };
    const cached = cache.summaries[r.full_name];
    if (cached && cached.pushed_at === r.pushed_at) r.summary = cached.summary;
    else if (withKey && !dry) {
      try {
        requireKey();
        const readme = (await ghGet(`/repos/${r.full_name}/readme`, { raw: true })).data.slice(0, config.summarize.readmeMaxChars);
        r.summary = await askJson({ system: SYSTEM, user: summaryPrompt(r, readme), validate, label: r.full_name, log, maxTokens: 600 });
        cache.summaries[r.full_name] = { pushed_at: r.pushed_at, hash: hashText(readme), summary: r.summary };
        log.log(`summarized ${r.full_name}`);
      } catch (err) { log.warn(`${r.full_name}: no summary (${err.message})`); }
    }
  }
  const risingOut = rising.filter((r) => r.install);
  log.log(`${risingOut.length} rising repos with install guides`);

  const out = {
    generated: new Date().toISOString(), date: today, license: config.licenseNote,
    mode, span_days: span, searched: found.size, repos: ranked, rising: risingOut,
  };
  if (!dry) {
    writeJson(treesFile, trees);
    writeJson(histFile, history);
    writeJson(cacheFile, cache);
    writeJson(guidesFile, guides);
    writeJson(path.join(config.paths.data, 'skills.json'), out);
  }
  log.done(`${ranked.length} skill repos, mode ${mode}${dry ? ' (dry run, nothing written)' : ''}`);
});

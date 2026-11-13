// The /terminal/ page. Type a command, get answers from the public JSON files. It all runs in the
// browser, so nothing you type is sent anywhere.
const HELP = [
  'help                      this list',
  'top [--lang X] [--n 10]   ranked repos, most stars gained first',
  'rising                    repos climbing fastest in the last two days',
  'skills [word]             skill repositories, optionally matching a word',
  "skills --agent cursor     rising skills that pass that tool's SKILL.md rules",
  'install <owner/name>      install commands for a rising skill (add --agent codex)',
  'find <word>               search names, tags and summaries',
  'repo <owner/name>         everything we know about one repo',
  'langs                     languages in our rankings, with counts',
  'clear                     empty the screen',
];

const num = (n) => Number(n).toLocaleString('en-US');
// Tool names people type, mapped to the ids the Skills data uses.
const AGENTS = { claude: 'claude', 'claude-code': 'claude', codex: 'codex', cursor: 'cursor', copilot: 'copilot', 'github-copilot': 'copilot', gemini: 'gemini', 'gemini-cli': 'gemini', opencode: 'opencode', windsurf: 'windsurf', claudeai: 'claudeai', 'claude.ai': 'claudeai' };
const AGENT_LIST = 'claude, codex, cursor, copilot, gemini, opencode, windsurf, claudeai';

// Splits "top --lang rust --n 5" into { cmd: 'top', args: [], flags: { lang: 'rust', n: '5' } }.
function parseCommand(line) {
  const parts = line.trim().split(/\s+/).filter(Boolean);
  const out = { cmd: (parts.shift() ?? '').toLowerCase(), args: [], flags: {} };
  while (parts.length) {
    const p = parts.shift();
    if (p.startsWith('--')) out.flags[p.slice(2).toLowerCase()] = parts.length && !parts[0].startsWith('--') ? parts.shift() : 'true';
    else out.args.push(p);
  }
  return out;
}

// Runs one command over { repos, rising, skills } and returns lines of plain text.
function execute(line, data) {
  const { cmd, args, flags } = parseCommand(line);
  const repos = Object.values(data.repos?.repos ?? {});
  const word = args.join(' ').toLowerCase();
  const row = (r, i) => `${String(i + 1).padStart(2)}. ${r.full_name}  +${num(r.stars_gained)} stars  ${r.language ?? '-'}`;
  switch (cmd) {
    case '': return [];
    case 'help': return HELP;
    case 'top': {
      const n = Math.min(Math.max(parseInt(flags.n, 10) || 10, 1), 50);
      const lang = flags.lang?.toLowerCase();
      const rows = repos.filter((r) => !lang || (r.language ?? '').toLowerCase() === lang).sort((a, b) => b.stars_gained - a.stars_gained).slice(0, n);
      return rows.length ? rows.map(row) : [`No repos found${lang ? ` for language "${flags.lang}"` : ''}. Try "langs".`];
    }
    case 'rising': {
      const items = data.rising?.items ?? [];
      return items.length ? items.slice(0, 15).map((r, i) => `${String(i + 1).padStart(2)}. ${r.full_name}  +${num(r.gained_2d)} stars in 2 days`) : ['Nothing is rising yet. Check back after a few daily runs.'];
    }
    case 'skills': {
      if (flags.agent) {
        const id = AGENTS[flags.agent.toLowerCase()];
        if (!id) return [`Unknown tool "${flags.agent}". Try one of: ${AGENT_LIST}.`];
        const ready = (data.skills?.rising ?? []).filter((r) => r.install?.compat?.[id]?.status === 'ready' && (!word || r.full_name.toLowerCase().includes(word)));
        if (id === 'gemini' || id === 'windsurf') return [`We could not confirm ${flags.agent}'s SKILL.md rules, so no skill is marked ready for it. "install <owner/name> --agent ${id}" still shows how to install.`];
        return ready.length
          ? [`Rising skills that pass ${flags.agent}'s documented SKILL.md rules:`, ...ready.map((r) => `${String(r.rising_rank).padStart(3)}. ${r.full_name}  ${num(r.stars)} stars  ${r.skill_count} ${r.skill_count === 1 ? "skill" : "skills"}`), 'Type "install <owner/name> --agent ' + id + '" for the commands.']
          : [`No rising skill passes ${flags.agent}'s rules right now.`];
      }
      const all = data.skills?.repos ?? [];
      const rows = all.filter((r) => !word || [r.full_name, r.description ?? '', ...(r.topics ?? []), ...r.skills.map((s) => s.name)].join(' ').toLowerCase().includes(word)).slice(0, 15);
      return rows.length ? rows.map((r) => `${String(r.rank).padStart(3)}. ${r.full_name}  ${num(r.stars)} stars  ${r.skill_count} ${r.skill_count === 1 ? "skill" : "skills"}`) : ['No skill repositories match.'];
    }
    case 'install': {
      if (!word) return ['Usage: install <owner/name> [--agent claude]'];
      const id = AGENTS[(flags.agent ?? 'claude').toLowerCase()];
      if (!id) return [`Unknown tool "${flags.agent}". Try one of: ${AGENT_LIST}.`];
      const r = (data.skills?.rising ?? []).find((x) => x.full_name.toLowerCase() === word);
      if (!r?.install) return [`Install commands are only prepared for the rising skills. Type "skills --agent ${id}" to list them.`];
      const a = r.install.agents[id];
      const out = [`${r.full_name} for ${a.label}, version ${r.install.sha.slice(0, 7)}${a.verified ? '' : ' (not verified)'}`];
      if (id === 'claude' && r.install.marketplace) out.push('', "# Claude Code plugin (from the repo's own plugin file)", r.install.marketplace.add, ...r.install.marketplace.install);
      for (const m of a.methods) {
        out.push('', `# ${m.title}`);
        if (m.code) out.push(...m.code.split('\n'));
        if (m.note) out.push(`# ${m.note}`);
      }
      out.push('', 'Read the skill before you install it. A skill can run commands on your computer.');
      return out;
    }
    case 'find': {
      if (!word) return ['Usage: find <word>'];
      const rows = repos.filter((r) => [r.full_name, r.what_it_is ?? '', ...(r.tags ?? [])].join(' ').toLowerCase().includes(word)).slice(0, 15);
      return rows.length ? rows.map(row) : ['Nothing found.'];
    }
    case 'repo': {
      const r = data.repos?.repos?.[word];
      if (!r) return [`Not in our rankings: ${word || '(no name given)'}. Try "find".`];
      return [
        r.full_name, r.what_it_is ?? '',
        `stars ${num(r.stars_total)} (+${num(r.stars_gained)} that week)   language ${r.language ?? '-'}   license ${r.license ?? '-'}`,
        `last push ${r.last_push}   open issues ${num(r.open_issues)}   contributors ${num(r.contributors)}   difficulty ${r.difficulty ?? '-'}`,
        `week ${r.week}   ${r.place ? `place ${r.place}` : 'hidden gem'}   tags ${(r.tags ?? []).join(', ')}`,
        `https://github.com/${r.full_name}`,
      ];
    }
    case 'langs': {
      const counts = {};
      for (const r of repos) if (r.language) counts[r.language] = (counts[r.language] ?? 0) + 1;
      const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return rows.length ? rows.map(([l, c]) => `${l}  ${c}`) : ['No data.'];
    }
    default: return [`Unknown command: ${cmd}. Type "help".`];
  }
}

if (typeof module !== 'undefined') module.exports = { parseCommand, execute };

if (typeof document !== 'undefined') (async () => {
  const box = document.querySelector('.term');
  if (!box) return;
  box.hidden = false;
  const scroller = box.querySelector('.term-out');
  const out = box.querySelector('.term-lines');
  const form = box.querySelector('.term-form');
  const input = form.elements.cmd;
  const src = box.dataset.src;
  const get = async (f) => { try { const r = await fetch(`${src}/${f}`); return r.ok ? await r.json() : null; } catch { return null; } };
  const [repos, rising, skills] = await Promise.all([get('repos.json'), get('rising.json'), get('skills.json')]);
  const data = { repos, rising, skills };

  const print = (text, cls) => { const p = document.createElement('p'); if (cls) p.className = cls; p.textContent = text; out.append(p); };
  scroller.addEventListener('click', (e) => { if (!getSelection().toString() && e.target.tagName !== 'INPUT') input.focus(); });
  const mark = form.querySelector('svg');
  const history = [];
  let at = 0;
  box.querySelector('.term-hint').textContent = repos ? 'RepoWeekly terminal. Type "help" for commands.' : 'The data is not published yet. Try again later.';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const line = input.value;
    input.value = '';
    if (!line.trim()) return;
    history.push(line);
    at = history.length;
    if (line.trim().toLowerCase() === 'clear') { out.replaceChildren(); return; }
    print(line, 'term-cmd');
    out.lastChild.prepend(mark.cloneNode(true), ' ');
    for (const l of execute(line, data)) print(l);
    scroller.scrollTop = scroller.scrollHeight;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && at > 0) { input.value = history[--at]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { input.value = history[++at] ?? ''; at = Math.min(at, history.length); e.preventDefault(); }
  });
})();

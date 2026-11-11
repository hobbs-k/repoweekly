// The "Find a skill" search on /skills/. It looks through /api/skills.json in the browser, so what
// you type is never sent anywhere.
const AGENT_LABEL = { claude: 'Claude', codex: 'Codex', cursor: 'Cursor', gemini: 'Gemini', copilot: 'Copilot', windsurf: 'Windsurf', opencode: 'OpenCode' };

function parseWords(text) {
  const parts = text.includes(',') ? text.split(',') : text.split(/\s+/);
  const out = [];
  for (const p of parts) {
    const t = p.trim().toLowerCase();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

// Rows for the words typed and the agent chosen. A repo needs every word to match somewhere.
// Skill names count most, then a skill's description, topics and the repo's own name and text.
function searchSkills(data, words, agent) {
  const rows = [];
  for (const repo of data.repos) {
    if (agent && !repo.agents.includes(agent)) continue;
    let score = 0;
    const hits = new Set();
    let all = true;
    for (const w of words) {
      let pts = 0;
      for (const s of repo.skills) {
        if (s.name.toLowerCase().includes(w)) { pts += 4; hits.add(s.name); }
        else if ((s.description ?? '').toLowerCase().includes(w)) { pts += 2; hits.add(s.name); }
      }
      if (repo.full_name.toLowerCase().includes(w)) pts += 2;
      if ((repo.topics ?? []).some((t) => t.toLowerCase().includes(w))) pts += 2;
      if ((repo.description ?? '').toLowerCase().includes(w)) pts += 1;
      if (!pts) { all = false; break; }
      score += pts;
    }
    if (!all) continue;
    rows.push({ repo, score, hits: [...hits].slice(0, 5) });
  }
  return rows.sort((a, b) => b.score - a.score || b.repo.stars - a.repo.stars);
}

if (typeof module !== 'undefined') module.exports = { parseWords, searchSkills };

if (typeof document !== 'undefined') (async () => {
  const form = document.querySelector('.skill-finder');
  if (!form) return;
  const status = document.querySelector('.issues-status');
  const list = document.querySelector('.skill-results');
  const more = document.querySelector('.more');
  const chips = form.querySelector('.chips');
  const box = form.elements.q;

  let data;
  try {
    const res = await fetch(form.dataset.src);
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch {
    status.textContent = 'The skill list is not published yet. Try again later.';
    return;
  }
  form.hidden = false;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const num = (n) => Number(n).toLocaleString('en-US');

  let agent = '';
  const present = Object.keys(AGENT_LABEL).filter((a) => data.repos.some((r) => r.agents.includes(a)));
  for (const a of ['', ...present]) {
    const b = el('button', null, a ? AGENT_LABEL[a] : 'Any agent');
    b.type = 'button';
    b.dataset.agent = a;
    b.setAttribute('aria-pressed', String(a === ''));
    b.addEventListener('click', () => { agent = a; render(true); });
    chips.append(b);
  }

  let shown = 20;
  function render(reset) {
    if (reset) shown = 20;
    for (const b of chips.children) b.setAttribute('aria-pressed', String(b.dataset.agent === agent));
    const rows = searchSkills(data, parseWords(box.value), agent);
    list.replaceChildren();
    for (const { repo, hits } of rows.slice(0, shown)) {
      if (!/^https:\/\/github\.com\//.test(repo.url)) continue;
      const li = el('li', 'issue');
      li.append(el('p', 'issue-repo', '#' + repo.rank + ' / ' + num(repo.stars) + ' stars / ' + num(repo.skill_count) + (repo.skill_count === 1 ? ' skill' : ' skills')));
      const a = el('a', 'issue-title', repo.full_name);
      a.href = repo.url;
      a.rel = 'noopener';
      li.append(a);
      if (repo.description) li.append(el('p', 'issue-meta', repo.description));
      const tags = el('ul', 'meta');
      for (const x of repo.agents) tags.append(el('li', null, AGENT_LABEL[x] ?? x));
      if (repo.language) tags.append(el('li', null, repo.language));
      li.append(tags);
      if (hits.length) li.append(el('p', 'issue-why', 'Skills that match: ' + hits.join(', ')));
      list.append(li);
    }
    list.hidden = rows.length === 0;
    more.hidden = rows.length <= shown;
    status.textContent = rows.length
      ? 'Showing ' + Math.min(shown, rows.length) + ' of ' + rows.length + ' repositories.'
      : 'Nothing matches. Try one word, or choose "Any agent".';
  }

  form.addEventListener('input', () => render(true));
  form.addEventListener('submit', (e) => e.preventDefault());
  more.addEventListener('click', () => { shown += 20; render(false); });
  render(true);
})();

// "I use: Claude Code / Cursor / ..." on the rising skills: opens that tool's install steps on every card and hides the others.
if (typeof document !== 'undefined') (() => {
  const pick = document.querySelector('.agent-pick');
  if (!pick) return;
  pick.hidden = false;
  const panels = document.querySelectorAll('.agent-panel');
  const buttons = pick.querySelectorAll('button');
  const apply = (id) => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.agent === id));
    for (const p of panels) { p.hidden = Boolean(id) && p.dataset.agent !== id; p.open = Boolean(id) && p.dataset.agent === id; }
    try { id ? localStorage.setItem('rw-agent', id) : localStorage.removeItem('rw-agent'); } catch { /* storage blocked */ }
  };
  for (const b of buttons) b.addEventListener('click', () => apply(b.getAttribute('aria-pressed') === 'true' ? '' : b.dataset.agent));
  try { const saved = localStorage.getItem('rw-agent'); if (saved) apply(saved); } catch { /* storage blocked */ }
  for (const pre of document.querySelectorAll('.rising-entry pre')) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy';
    b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(pre.textContent); b.textContent = 'Copied'; } catch { b.textContent = 'Select and copy'; } setTimeout(() => { b.textContent = 'Copy'; }, 1500); });
    pre.after(b);
  }
})();

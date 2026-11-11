// Matches a visitor's skills to open tickets from /api/issues.json. Everything runs in the browser.
// The skills text is kept only in this browser's localStorage, if it lets us.
const SYNONYMS = { js: 'javascript', ts: 'typescript', py: 'python', golang: 'go', cpp: 'c++', csharp: 'c#', docs: 'documentation', doc: 'documentation', readme: 'documentation', tests: 'test', testing: 'test', bugs: 'bug', fixes: 'bug', features: 'feature' };
const KIND_WORDS = { documentation: ['documentation', 'docs', 'typo', 'readme'], test: ['test', 'tests', 'testing'], bug: ['bug', 'fix'], feature: ['feature', 'enhancement'] };

function parseSkills(text) {
  const parts = text.includes(',') || text.includes('\n') ? text.split(/[,\n]/) : text.split(/\s+/);
  const out = [];
  for (const p of parts) {
    const t = p.trim().toLowerCase();
    const key = SYNONYMS[t] ?? t;
    if (t && !out.includes(key)) out.push(key);
  }
  return out;
}

// Score one ticket against the skills. Returns { score, why }, why being the skills that matched.
function score(issue, repo, skills) {
  let total = 0;
  const why = [];
  const title = issue.title.toLowerCase();
  const labels = issue.labels.map((l) => l.toLowerCase());
  const topics = (repo.topics ?? []).map((t) => t.toLowerCase());
  for (const s of skills) {
    const words = KIND_WORDS[s] ?? [s];
    let pts = 0;
    if ((repo.language ?? '').toLowerCase() === s) pts += 6;
    if (topics.includes(s)) pts += 4;
    if (labels.some((l) => words.some((w) => l.includes(w)))) pts += 3;
    if (words.some((w) => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(title))) pts += 2;
    if (issue.repo.toLowerCase().includes(s)) pts += 1;
    if (pts) { total += pts; why.push(s); }
  }
  return { score: total, why };
}

function rank(data, skills, opts) {
  const rows = [];
  for (const issue of data.items) {
    const repo = data.repos[issue.repo];
    if (!repo || (opts.beginner && !issue.beginner) || (opts.ranked && !repo.ranked)) continue;
    const r = score(issue, repo, skills);
    if (skills.length && r.score === 0) continue;
    rows.push({ issue, repo, why: r.why, s: r.score + (repo.ranked ? 0.5 : 0) });
  }
  return rows.sort((a, b) => b.s - a.s || b.issue.updated.localeCompare(a.issue.updated));
}

if (typeof module !== 'undefined') module.exports = { parseSkills, score, rank };

if (typeof document !== 'undefined') (async () => {
  const form = document.querySelector('.skills-form');
  if (!form) return;
  const status = document.querySelector('.issues-status');
  const list = document.querySelector('.issues');
  const more = document.querySelector('.more');
  const chips = form.querySelector('.chips');
  const box = form.elements.skills;

  let data;
  try {
    const res = await fetch(form.dataset.src);
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch {
    status.textContent = 'The ticket list is not published yet. It appears after the next daily run, or try again later.';
    return;
  }

  try { box.value = localStorage.getItem('rw-skills') ?? ''; } catch { /* private window: fine */ }
  form.hidden = false;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const ago = (iso) => {
    const d = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000));
    return d === 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago';
  };

  // Language buttons, most common first.
  const counts = {};
  for (const i of data.items) { const l = data.repos[i.repo]?.language; if (l) counts[l] = (counts[l] ?? 0) + 1; }
  for (const lang of Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 10)) {
    const b = el('button', null, lang);
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      const have = parseSkills(box.value);
      const key = lang.toLowerCase();
      box.value = (have.includes(key) ? have.filter((x) => x !== key) : [...have, key]).join(', ');
      render(true);
    });
    chips.append(b);
  }

  let shown = 30;
  function render(reset) {
    if (reset) shown = 30;
    const skills = parseSkills(box.value);
    try { localStorage.setItem('rw-skills', box.value); } catch { /* ignore */ }
    for (const b of chips.children) b.setAttribute('aria-pressed', String(skills.includes(b.textContent.toLowerCase())));
    const rows = rank(data, skills, { beginner: form.elements.beginner.checked, ranked: form.elements.ranked.checked });

    list.replaceChildren();
    for (const { issue, repo, why } of rows.slice(0, shown)) {
      // Titles come from GitHub, so they go in as text, never as markup. Only github.com links are used.
      if (!/^https:\/\/github\.com\//.test(issue.url)) continue;
      const li = el('li', 'issue');
      const a = el('a', 'issue-title', issue.title);
      a.href = issue.url;
      a.rel = 'noopener';
      li.append(el('p', 'issue-repo', issue.repo + (repo.ranked ? '' : ' (not ranked)')), a);
      li.append(el('p', 'issue-meta', [repo.language, 'updated ' + ago(issue.updated), issue.comments + (issue.comments === 1 ? ' comment' : ' comments')].filter(Boolean).join(' / ')));
      const tags = el('ul', 'meta');
      const names = [issue.beginner ? 'good first issue' : null, ...issue.labels.filter((l) => l.toLowerCase() !== 'good first issue')].filter(Boolean).slice(0, 5);
      for (const l of names) tags.append(el('li', null, l));
      li.append(tags);
      if (why.length) li.append(el('p', 'issue-why', 'Matches: ' + why.join(', ')));
      list.append(li);
    }
    list.hidden = rows.length === 0;
    more.hidden = rows.length <= shown;
    const when = new Date(data.generated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    status.textContent = rows.length
      ? 'Showing ' + Math.min(shown, rows.length) + ' of ' + rows.length + ' tickets. Collected ' + when + '.'
      : 'Nothing matches. Try other words, a language name, or turn off "Beginner tickets only".';
  }

  form.addEventListener('input', () => render(true));
  form.addEventListener('submit', (e) => e.preventDefault());
  more.addEventListener('click', () => { shown += 30; render(false); });
  render(true);
})();

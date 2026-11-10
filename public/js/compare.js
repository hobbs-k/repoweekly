// Side-by-side comparison from /api/repos.json. The choice is kept in ?a=owner/name&b=owner/name.
(async () => {
  const form = document.querySelector('.compare-form');
  if (!form) return;
  const status = document.querySelector('.compare-status');
  const table = document.querySelector('.cmp');

  let repos;
  try {
    const res = await fetch(form.dataset.src);
    if (!res.ok) throw new Error(res.status);
    repos = (await res.json()).repos;
  } catch {
    status.textContent = 'Could not load the repository list. Try again later.';
    return;
  }

  const keys = Object.keys(repos).sort();
  for (const sel of [form.elements.a, form.elements.b]) {
    for (const k of keys) sel.add(new Option(repos[k].full_name, k));
  }
  const q = new URLSearchParams(location.search);
  form.elements.a.value = repos[q.get('a')?.toLowerCase()] ? q.get('a').toLowerCase() : keys[0];
  form.elements.b.value = repos[q.get('b')?.toLowerCase()] ? q.get('b').toLowerCase() : keys[1] ?? keys[0];
  form.hidden = false;

  const num = (n) => (n == null ? 'n/a' : Number(n).toLocaleString('en-US'));
  const rows = [
    ['Week ranked', (r) => r.week],
    ['Place that week', (r) => (r.gem ? 'Hidden gem' : `#${r.place}`)],
    ['Stars gained that week', (r) => `+${num(r.stars_gained)}`, (r) => r.stars_gained],
    ['Total stars', (r) => num(r.stars_total), (r) => r.stars_total],
    ['Language', (r) => r.language ?? 'n/a'],
    ['License', (r) => r.license ?? 'None listed'],
    ['Last push', (r) => r.last_push],
    ['Age in days', (r) => num(r.age_days)],
    ['Open issues', (r) => num(r.open_issues)],
    ['Contributors', (r) => num(r.contributors), (r) => r.contributors],
    ['Good first issues', (r) => num(r.good_first_issues), (r) => r.good_first_issues],
    ['Star check', (r) => r.star_check ?? 'not checked'],
    ['Difficulty', (r) => r.difficulty],
    ['Good for beginners', (r) => (r.beginner_friendly ? 'Yes' : 'No')],
  ];

  const cell = (tag, text) => {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  };

  // A name may wrap after its slash, never in the middle of a word.
  const nameCell = (full) => {
    const th = document.createElement('th');
    th.scope = 'col';
    full.split('/').forEach((part, i) => th.append(...(i ? ['/', document.createElement('wbr'), part] : [part])));
    return th;
  };

  const render = () => {
    const a = repos[form.elements.a.value];
    const b = repos[form.elements.b.value];
    table.replaceChildren();
    const head = table.createTHead().insertRow();
    head.append(cell('th', ''), nameCell(a.full_name), nameCell(b.full_name));
    const body = table.createTBody();
    for (const [label, get, count] of rows) {
      const tr = body.insertRow();
      const th = cell('th', label);
      th.scope = 'row';
      const ta = cell('td', get(a));
      const tb = cell('td', get(b));
      if (count && count(a) !== count(b)) (count(a) > count(b) ? ta : tb).classList.add('is-more');
      tr.append(th, ta, tb);
    }
    table.hidden = false;
    status.textContent = '';
    history.replaceState(null, '', `?a=${a.full_name}&b=${b.full_name}`);
  };

  form.addEventListener('change', render);
  render();
})();

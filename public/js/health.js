// "Dead or alive?": a rough health score for any public GitHub repo, computed in the browser.
// This is the one page that calls GitHub from the visitor's browser, because the repo is not known in advance.
const DAY = 86400000;
const WINDOW_DAYS = 90;

function parseRepo(input) {
  const text = input.trim();
  const m =
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?(?:[?#].*)?$/i.exec(text) ||
    /^([\w.-]+)\/([\w.-]+)$/.exec(text);
  return m ? `${m[1]}/${m[2]}` : null;
}

// repo is GitHub's /repos response; commits is the number of commits in the last 90 days (max 100).
function scoreRepo(repo, commits, now = Date.now()) {
  const reasons = [];
  if (repo.archived) {
    return { score: 0, verdict: 'Archived', reasons: ['The owner archived this repository. It is read-only.'] };
  }
  let points = 0;
  const idle = Math.floor((now - Date.parse(repo.pushed_at)) / DAY);
  const pushPoints = idle <= 30 ? 40 : idle <= 90 ? 30 : idle <= 180 ? 15 : idle <= 365 ? 5 : 0;
  points += pushPoints;
  reasons.push(`Last push ${idle} ${idle === 1 ? 'day' : 'days'} ago (${pushPoints} of 40).`);

  const commitPoints = commits >= 30 ? 30 : commits >= 10 ? 22 : commits >= 3 ? 12 : commits >= 1 ? 5 : 0;
  points += commitPoints;
  reasons.push(`${commits >= 100 ? '100 or more' : commits} ${commits === 1 ? 'commit' : 'commits'} in the last ${WINDOW_DAYS} days (${commitPoints} of 30).`);

  const licensePoints = repo.license ? 10 : 0;
  points += licensePoints;
  reasons.push(repo.license ? `Has a license, ${repo.license.spdx_id} (10 of 10).` : 'No license listed (0 of 10).');

  const score = Math.round((points / 80) * 100);
  const verdict = score >= 70 ? 'Alive' : score >= 40 ? 'Slowing down' : 'Probably dead';
  return { score, verdict, reasons };
}

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: { Accept: 'application/vnd.github+json' } });
  if (res.status === 404) throw new Error('That repository was not found. Check the address and that it is public.');
  if (res.status === 403 || res.status === 429) throw new Error('GitHub is limiting requests from your network (60 an hour). Try again later.');
  if (!res.ok) throw new Error(`GitHub answered with an error (${res.status}).`);
  return res.json();
}

function init() {
  const form = document.querySelector('.health-form');
  if (!form) return;
  form.hidden = false;
  const out = document.querySelector('.health-out');
  const button = form.querySelector('button');

  const note = (text) => {
    out.className = 'health-out';
    out.replaceChildren(Object.assign(document.createElement('p'), { className: 'note', textContent: text }));
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const full = parseRepo(form.elements.repo.value);
    if (!full) {
      note('That does not look like a GitHub repository address. Try https://github.com/owner/name');
      return;
    }
    button.disabled = true;
    button.textContent = 'Checking…';
    try {
      const since = new Date(Date.now() - WINDOW_DAYS * DAY).toISOString();
      const [repo, commits] = await Promise.all([gh(`/repos/${full}`), gh(`/repos/${full}/commits?since=${since}&per_page=100`)]);
      const r = scoreRepo(repo, commits.length);
      const h2 = document.createElement('h2');
      h2.textContent = `${repo.full_name}: ${r.verdict}${repo.archived ? '' : ` (${r.score} of 100)`}`;
      const ul = document.createElement('ul');
      for (const text of r.reasons) ul.append(Object.assign(document.createElement('li'), { textContent: text }));
      out.className = r.verdict === 'Alive' || r.verdict === 'Slowing down' ? 'health-out' : 'health-out is-bad';
      out.replaceChildren(h2, ul);
    } catch (err) {
      note(err.message);
    } finally {
      button.disabled = false;
      button.textContent = 'Check';
    }
  });
}

if (typeof document !== 'undefined') init();
if (typeof module !== 'undefined') module.exports = { parseRepo, scoreRepo };

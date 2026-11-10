// Shows a small badge on github.com/owner/name when RepoWeekly has ranked that repository.
const RESERVED = new Set(['orgs', 'settings', 'marketplace', 'features', 'topics', 'collections', 'sponsors', 'notifications', 'explore', 'login', 'pulls', 'issues', 'search']);
let shown = '';

function repoFromPath() {
  const [owner, name] = location.pathname.split('/').filter(Boolean);
  return owner && name && !RESERVED.has(owner) ? `${owner}/${name}` : null;
}

function removeBadge() {
  document.getElementById('repoweekly-badge')?.remove();
}

async function update() {
  const name = repoFromPath();
  if (name === shown) return;
  shown = name ?? '';
  removeBadge();
  if (!name) return;
  const { repo, site } = await chrome.runtime.sendMessage({ type: 'repo', name });
  if (!repo || shown !== name) return;

  const a = document.createElement('a');
  a.id = 'repoweekly-badge';
  a.href = `${site}/repo/${repo.full_name.toLowerCase()}/`;
  a.textContent = `RepoWeekly: +${repo.stars_gained.toLocaleString('en-US')} stars, ${repo.gem ? 'hidden gem' : `#${repo.place}`}, week ${Number(repo.week.slice(-2))}`;
  Object.assign(a.style, {
    position: 'fixed', right: '16px', bottom: '16px', zIndex: 9999, padding: '8px 12px',
    background: '#0c2236', color: '#e3eef3', font: '600 13px system-ui, sans-serif', textDecoration: 'none', border: '1px solid #ff7db4',
  });
  document.body.append(a);
}

// GitHub changes pages without a reload, so the address is checked once a second.
update();
setInterval(update, 1000);

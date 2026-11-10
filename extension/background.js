// Fetches RepoWeekly's repos.json and keeps it for six hours. A service worker is used
// because it can read the site without needing the site to allow cross-origin requests.
// Set SITE to your own address, and match it in manifest.json (host_permissions).
const SITE = 'https://repoweekly.example';
const MAX_AGE = 6 * 60 * 60 * 1000;

async function loadRepos() {
  const { cache } = await chrome.storage.local.get('cache');
  if (cache && Date.now() - cache.at < MAX_AGE) return cache.repos;
  const res = await fetch(`${SITE}/api/repos.json`);
  if (!res.ok) throw new Error(`repos.json returned ${res.status}`);
  const { repos } = await res.json();
  await chrome.storage.local.set({ cache: { at: Date.now(), repos } });
  return repos;
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type !== 'repo') return false;
  loadRepos()
    .then((repos) => reply({ repo: repos[String(msg.name).toLowerCase()] ?? null, site: SITE }))
    .catch(() => reply({ repo: null, site: SITE }));
  return true; // the reply is sent after the fetch
});

// Which skill repositories are rising: not yet famous, and picking up stars fast.
// With enough daily history we use stars gained relative to size. Before that we use stars per day
// of the repo's life, and say so on the page.
const DAY = 86400000;
const BLOCKED = /\b(nsfw|porn|hentai|erotic|xxx|onlyfans)\b/i;

export function pickRising(repos, today, rule) {
  const now = Date.parse(today);
  const rows = [];
  for (const r of repos) {
    if (r.stars < rule.minStars || r.stars > rule.maxStars) continue;
    if (BLOCKED.test([r.full_name, r.description ?? '', ...(r.topics ?? [])].join(' '))) continue;
    const age = Math.max(1, Math.round((now - Date.parse(r.created_at)) / DAY));
    const byGain = r.gained != null && r.gained > 0;
    if (!byGain && age > rule.maxAgeDays) continue; // old and no measured growth: not rising
    const score = byGain ? r.gained / Math.max(r.stars - r.gained, rule.minStars) : r.stars / age;
    rows.push({ r, age, score, basis: byGain ? 'growth' : 'pace' });
  }
  rows.sort((a, b) => b.score - a.score || b.r.stars - a.r.stars);
  return rows.slice(0, rule.count).map(({ r, age, basis }, i) => ({ ...r, rising_rank: i + 1, age_days: age, rising_basis: basis }));
}

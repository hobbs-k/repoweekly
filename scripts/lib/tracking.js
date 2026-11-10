const DAY = 86400000;

export function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY);
}

// The newer of first_seen and last_in_top200 (see DATA_SPEC.md, tracked.json).
export function lastActive(entry) {
  return entry.last_in_top200 && entry.last_in_top200 > entry.first_seen ? entry.last_in_top200 : entry.first_seen;
}

// Drops repos whose newest activity date is more than dropAfterDays old.
export function pruneTracked(repos, today, dropAfterDays) {
  const kept = {};
  const dropped = [];
  for (const [name, entry] of Object.entries(repos)) {
    if (daysBetween(lastActive(entry), today) > dropAfterDays) dropped.push(name);
    else kept[name] = entry;
  }
  return { kept, dropped };
}

// Keeps the maxTracked most recently active repos.
export function capTracked(repos, maxTracked) {
  const names = Object.keys(repos);
  if (names.length <= maxTracked) return { kept: repos, dropped: [] };
  names.sort((a, b) => lastActive(repos[b]).localeCompare(lastActive(repos[a])) || a.localeCompare(b));
  const kept = {};
  for (const n of names.slice(0, maxTracked)) kept[n] = repos[n];
  return { kept, dropped: names.slice(maxTracked) };
}

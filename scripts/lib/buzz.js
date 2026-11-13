// Pure helpers for buzz.js: turn Hacker News search hits and X embed replies into short quotes.

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…' };

// HTML to plain text: tags out, entities decoded, spaces collapsed.
export function cleanText(s) {
  return String(s ?? '')
    .replace(/<p>/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ').trim();
}

// Cut at a word boundary so a quote never ends mid-word.
export function clip(text, max = 280) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : max).trimEnd()}…`;
}

// The sentence that names the repo, plus the next one when it is short, so the quote is about this repo.
export function excerpt(text, key) {
  const parts = text.split(/(?<=[.!?])\s+/);
  const i = parts.findIndex((p) => p.toLowerCase().includes(key));
  if (i < 0) return text;
  const pick = [parts[i]];
  if (pick[0].length < 140 && parts[i + 1]) pick.push(parts[i + 1]);
  if (i > 0 && pick.join(' ').length < 90) pick.unshift(parts[i - 1]);
  return pick.join(' ');
}

// Mostly links is not a quote anyone can read.
const linky = (t) => (t.match(/https?:\/\/\S+/g) ?? []).join('').length > t.length * 0.35;

// Hits from hn.algolia.com. A hit only counts when it names the repo exactly ("owner/name" or its
// GitHub link), because a search on the name alone also matches unrelated posts.
export function hnBuzz(fullName, hits, { maxQuotes = 3 } = {}) {
  const key = fullName.toLowerCase();
  const names = (h) => cleanText([h.title, h.url, h.story_text, h.comment_text].filter(Boolean).join(' ')).toLowerCase();
  const real = hits.filter((h) => names(h).includes(key));
  const stories = real.filter((h) => h.title).sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const comments = real.filter((h) => h.comment_text && !linky(excerpt(cleanText(h.comment_text), key))).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const top = stories[0];
  return {
    story: top ? { title: cleanText(top.title), points: top.points ?? 0, comments: top.num_comments ?? 0, url: `https://news.ycombinator.com/item?id=${top.objectID}` } : null,
    quotes: comments.slice(0, maxQuotes).map((h) => ({
      source: 'hn', author: h.author, text: clip(excerpt(cleanText(h.comment_text), key)),
      url: `https://news.ycombinator.com/item?id=${h.objectID}`, date: h.created_at.slice(0, 10),
    })),
  };
}

export const X_POST = /^https:\/\/(x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d{5,25})\/?$/;

// A reply from publish.x.com/oembed. The post text is the first <p> of the blockquote it returns.
export function xQuote(url, oembed) {
  const m = X_POST.exec(url);
  const p = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(oembed?.html ?? '');
  if (!m || !p) return null;
  const date = /<a [^>]*>([^<]+)<\/a>\s*<\/blockquote>/i.exec(oembed.html)?.[1] ?? null;
  return { source: 'x', author: cleanText(oembed.author_name) || m[2], handle: m[2], text: clip(cleanText(p[1])), url: `https://x.com/${m[2]}/status/${m[3]}`, date };
}

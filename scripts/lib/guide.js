// Pulls the install and usage steps out of a README, word for word. Nothing here is written by an AI:
// we only find the right headings and copy their code blocks, so the commands are the repo's own.
const HEADING = /^(#{1,4})\s+(.+?)\s*#*\s*$/;
const WANTED = /\b(install(ation)?|getting started|quick ?start|set ?up|usage|how to use|use it|using)\b/i;
const SKIP = /\b(contribut|licen[cs]e|changelog|sponsor|star history|acknowledg|credits|faq|roadmap)\b/i;

const clean = (s) => s
  .replace(/<[^>]+>/g, '')                       // html tags
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')          // images
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')       // links keep their text
  .replace(/[*_`]{1,3}/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// Returns up to `maxSections` sections, each { heading, steps: [{ text, code }] } with at most
// `maxSteps` code blocks, and no code block longer than `maxCode` characters.
export function extractGuide(readme, { maxSections = 2, maxSteps = 6, maxCode = 600 } = {}) {
  const lines = String(readme ?? '').replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let cur = null, fence = null, text = [];
  for (const line of lines) {
    const f = line.match(/^\s*(```+|~~~+)\s*([\w+-]*)/);
    if (fence) {
      if (f && line.trim().startsWith(fence.mark) && !f[2]) {
        if (cur && fence.code.trim() && fence.code.length <= maxCode) cur.steps.push({ text: clean(text.join(' ')).slice(0, 220), code: fence.code.trimEnd(), lang: fence.lang });
        if (cur) text = [];
        fence = null;
      } else fence.code += `${line}\n`;
      continue;
    }
    if (f) { fence = { mark: f[1], lang: f[2], code: '' }; continue; }
    const h = line.match(HEADING);
    if (h) {
      const title = clean(h[2]);
      cur = WANTED.test(title) && !SKIP.test(title) ? { heading: title, level: h[1].length, steps: [] } : null;
      if (cur) sections.push(cur);
      text = [];
      continue;
    }
    if (cur && line.trim()) text.push(line.trim());
  }
  return sections.filter((s) => s.steps.length).slice(0, maxSections).map((s) => ({ heading: s.heading, steps: s.steps.slice(0, maxSteps) }));
}

// The Claude Code plugin marketplace file, if the repo has one: gives the exact two commands.
export function marketplaceCommands(fullName, json) {
  let m;
  try { m = typeof json === 'string' ? JSON.parse(json) : json; } catch { return null; }
  const name = typeof m?.name === 'string' ? m.name : null;
  const plugins = (Array.isArray(m?.plugins) ? m.plugins : []).map((p) => p?.name).filter((n) => typeof n === 'string');
  if (!name || !plugins.length) return null;
  return { marketplace: name, plugins, add: `/plugin marketplace add ${fullName}`, install: plugins.slice(0, 5).map((p) => `/plugin install ${p}@${name}`) };
}

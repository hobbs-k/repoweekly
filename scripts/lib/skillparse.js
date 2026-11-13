// Small pure helpers for skills.js, kept apart so tests can import them.

// Which agents a repo mentions, from its name, description and topics. A guide, not a test.
const AGENTS = {
  claude: /claude/i, codex: /codex|openai/i, cursor: /cursor/i, gemini: /gemini|antigravity/i,
  copilot: /copilot/i, windsurf: /windsurf/i, opencode: /opencode/i,
};
export function detectAgents(text) {
  return Object.keys(AGENTS).filter((a) => AGENTS[a].test(text));
}

// Pulls name and description out of the "---" block at the top of a SKILL.md. Handles the common
// shapes: "key: value", quoted values, and ">" or "|" blocks continued on indented lines.
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  const out = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_-]+):\s*(.*)$/.exec(line);
    if (kv) {
      key = kv[1].toLowerCase();
      out[key] = /^[>|][+-]?$/.test(kv[2]) ? '' : kv[2].replace(/^["']|["']$/g, '');
    } else if (key && /^\s+\S/.test(line)) {
      out[key] = `${out[key]} ${line.trim()}`.trim();
    }
  }
  return out;
}

// Folder name of each SKILL.md in a git tree, one skill each. A SKILL.md at the root is the repo itself.
// Exactly "SKILL.md": the tools look for that name, and a lowercase skill.md is usually a docs page.
export function skillsFromTree(tree, repoName) {
  return tree
    .filter((e) => e.type === 'blob' && /(^|\/)SKILL\.md$/.test(e.path))
    .map((e) => ({ path: e.path, name: e.path.includes('/') ? e.path.split('/').slice(-2, -1)[0] : repoName }));
}

// Files that sit inside the skill folders (a skill at the repo root counts the whole repo), and which
// of them are scripts, so people know whether a skill can run code. Judged by file extension only.
const SCRIPT = /\.(py|sh|bash|zsh|js|mjs|cjs|ts|rb|ps1|bat|cmd|pl|php|go|rs)$/i;
export function skillFiles(tree, skills) {
  const folders = skills.map((s) => (s.path.includes('/') ? `${s.path.slice(0, s.path.lastIndexOf('/'))}/` : ''));
  const inside = tree.filter((e) => e.type === 'blob' && folders.some((f) => e.path.startsWith(f)));
  const scripts = inside.filter((e) => SCRIPT.test(e.path)).map((e) => e.path);
  return { total: inside.length, scripts: scripts.slice(0, 8), script_count: scripts.length };
}

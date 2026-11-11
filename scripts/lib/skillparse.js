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
export function skillsFromTree(tree, repoName) {
  return tree
    .filter((e) => e.type === 'blob' && /(^|\/)SKILL\.md$/i.test(e.path))
    .map((e) => ({ path: e.path, name: e.path.includes('/') ? e.path.split('/').slice(-2, -1)[0] : repoName }));
}

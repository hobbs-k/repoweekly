// "Works with" checks for a skill: each tool's documented SKILL.md rules (checked 2026-11-11, the
// same doc pages as install.js), tested against the skill's real frontmatter. Nothing is guessed:
// a tool whose rules we could not confirm is reported as "not checked".
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// One skill. folder: its folder name. file: the file name as stored ("SKILL.md"). fm: parsed frontmatter.
export function checkSkill({ folder, file, fm }) {
  const name = fm.name?.trim();
  const desc = fm.description?.trim();
  const need = (cond, why) => (cond ? null : why);
  const rules = {
    claude: [], // Claude Code: all frontmatter fields are optional
    codex: [need(name, 'needs a name'), need(desc, 'needs a description')],
    cursor: [need(name, 'needs a name'), need(!name || KEBAB.test(name), `name "${name}" must be lowercase letters, digits and hyphens`), need(!name || name === folder, `name "${name}" must match the folder "${folder}"`), need(desc, 'needs a description')],
    copilot: [need(file === 'SKILL.md', `the file must be named exactly SKILL.md, not ${file}`), need(desc, 'needs a description')],
    opencode: [need(desc, 'needs a description, or the agent never sees it')],
    claudeai: [need(name, 'needs a name'), need(!name || (name.length <= 64 && KEBAB.test(name)), `name "${name}" must be at most 64 lowercase letters, digits and hyphens`), need(!name || !/anthropic|claude/.test(name), `name "${name}" may not contain "anthropic" or "claude"`), need(!name || name === folder, `name "${name}" must match the folder "${folder}" for upload`), need(desc && desc.length <= 1024, 'needs a description of at most 1,024 characters')],
  };
  return Object.fromEntries(Object.entries(rules).map(([id, r]) => [id, r.filter(Boolean)]));
}

// All checked skills of a repo: "ready" when every one passes, "partial" when some do, "no" when none.
export function repoCompat(checks) {
  const out = {};
  for (const id of ['claude', 'codex', 'cursor', 'copilot', 'opencode', 'claudeai']) {
    const fails = checks.map((c) => ({ skill: c.skill, why: c.result[id] })).filter((f) => f.why.length);
    const status = !checks.length ? 'unchecked' : !fails.length ? 'ready' : fails.length < checks.length ? 'partial' : 'no';
    out[id] = { status, checked: checks.length, fails: fails.slice(0, 3).map((f) => `${f.skill}: ${f.why.join('; ')}`) };
  }
  out.gemini = { status: 'unchecked', checked: 0, fails: [] };
  out.windsurf = { status: 'unchecked', checked: 0, fails: [] };
  return out;
}

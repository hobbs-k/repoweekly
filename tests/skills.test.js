import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { detectAgents, parseFrontmatter, skillsFromTree } from '../scripts/lib/skillparse.js';

test('parseFrontmatter reads plain, quoted and folded values', () => {
  const md = '---\nname: pdf-tools\ndescription: "Fill and merge PDF files"\nlicense: MIT\n---\n# Body';
  assert.deepEqual(parseFrontmatter(md), { name: 'pdf-tools', description: 'Fill and merge PDF files', license: 'MIT' });
  const folded = '---\nname: a\ndescription: >\n  First line\n  second line\n---\n';
  assert.equal(parseFrontmatter(folded).description, 'First line second line');
  assert.deepEqual(parseFrontmatter('no block here'), {});
});

test('skillsFromTree names each SKILL.md after its folder, the root one after the repo, and skips lowercase skill.md', () => {
  const tree = [
    { path: 'SKILL.md', type: 'blob' }, { path: 'skills/pdf/SKILL.md', type: 'blob' },
    { path: 'skills/pdf/notes.md', type: 'blob' }, { path: 'docs', type: 'tree' }, { path: 'a/skill.md', type: 'blob' },
  ];
  assert.deepEqual(skillsFromTree(tree, 'my-repo').map((s) => s.name), ['my-repo', 'pdf']); // a/skill.md is not a skill
});

test('detectAgents finds the tools a repo names', () => {
  assert.deepEqual(detectAgents('Skills for Claude Code and Cursor'), ['claude', 'cursor']);
  assert.deepEqual(detectAgents('plain utilities'), []);
});

// A fake GitHub: two candidates, one with SKILL.md files and one without.
const repo = (name, stars) => ({ full_name: name, name: name.split('/')[1], html_url: `https://github.com/${name}`, description: 'Skills for Claude', language: 'Python', topics: ['agent-skills'], stargazers_count: stars, pushed_at: new Date().toISOString(), created_at: new Date(Date.now() - 10 * 864e5).toISOString(), default_branch: 'main', license: { spdx_id: 'MIT' } });
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/search/repositories') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ items: [repo('a/skills', 900), repo('b/plain', 500)] })); }
  if (u.pathname === '/repos/a/skills/git/trees/main') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ truncated: false, tree: [{ path: 'skills/pdf/SKILL.md', type: 'blob' }, { path: 'skills/xlsx/SKILL.md', type: 'blob' }] })); }
  if (u.pathname === '/repos/a/skills/commits/main') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ sha: 'abc1230000000000000000000000000000000000' })); }
  if (u.pathname === '/repos/a/skills/git/trees/abc1230000000000000000000000000000000000') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ truncated: false, tree: [{ path: 'skills/pdf/SKILL.md', type: 'blob' }, { path: 'skills/xlsx/SKILL.md', type: 'blob' }] })); }
  if (u.pathname === '/repos/a/skills/readme') return res.end(['# Skills', '', '## Install', '', 'Run this:', '', '```bash', 'npx skills add a/skills', '```', ''].join(String.fromCharCode(10)));
  if (u.pathname === '/repos/b/plain/git/trees/main') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ truncated: false, tree: [{ path: 'README.md', type: 'blob' }] })); }
  if (u.pathname.startsWith('/repos/a/skills/contents/')) return res.end('---\nname: pdf\ndescription: Work with PDF files\n---\n');
  res.statusCode = 404;
  res.end('{}');
});
await new Promise((r) => server.listen(0, r));

test('skills.js keeps repos that hold SKILL.md, lists their skills and writes skills.json', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-skills-'));
  const code = await new Promise((resolve) => {
    const p = spawn(process.execPath, ['scripts/skills.js', '--no-summaries'], {
      env: { ...process.env, DATA_DIR: dir, GITHUB_API_BASE: `http://127.0.0.1:${server.address().port}`, LLM_API_KEY: '' }, stdio: 'ignore',
    });
    p.on('close', resolve);
  });
  assert.equal(code, 0);
  const out = JSON.parse(fs.readFileSync(path.join(dir, 'skills.json'), 'utf8'));
  assert.deepEqual(out.repos.map((r) => r.full_name), ['a/skills']); // b/plain has no SKILL.md
  assert.equal(out.mode, 'recent'); // one day of history is not enough for a gain
  assert.equal(out.repos[0].skill_count, 2);
  assert.deepEqual(out.repos[0].agents, ['claude']);
  assert.equal(out.repos[0].skills.find((s) => s.name === 'pdf').description, 'Work with PDF files');
  assert.ok(fs.existsSync(path.join(dir, 'skills-history.json')));
  // The repo is young and under 5,000 stars, so it is rising. Its commands are pinned to the commit.
  const rise = out.rising[0];
  assert.equal(rise.full_name, 'a/skills');
  assert.equal(rise.install.sha, 'abc1230000000000000000000000000000000000');
  assert.match(rise.install.agents.claude.methods.at(-1).code, /git -C skill-src checkout abc1230000000000000000000000000000000000/);
  assert.equal(rise.install.guide[0].steps[0].code, 'npx skills add a/skills');
  server.close();
});

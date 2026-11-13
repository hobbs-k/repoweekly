import assert from 'node:assert/strict';
import test from 'node:test';
import { checkSkill, repoCompat } from '../scripts/lib/compat.js';

test('a well-formed skill passes every checked tool', () => {
  const r = checkSkill({ folder: 'pdf-tools', file: 'SKILL.md', fm: { name: 'pdf-tools', description: 'Fill PDF forms' } });
  assert.ok(Object.values(r).every((why) => why.length === 0));
});

test('a mismatched name fails Cursor and Claude.ai but not Claude Code or Codex', () => {
  const r = checkSkill({ folder: 'pdf', file: 'SKILL.md', fm: { name: 'PDF Tools', description: 'Fill PDF forms' } });
  assert.equal(r.claude.length, 0);
  assert.equal(r.codex.length, 0);
  assert.ok(r.cursor.some((w) => w.includes('lowercase')) && r.cursor.some((w) => w.includes('match the folder')));
  assert.ok(r.claudeai.length > 0);
});

test('no frontmatter still works in Claude Code, not in Codex', () => {
  const r = checkSkill({ folder: 'x', file: 'skill.md', fm: {} });
  assert.equal(r.claude.length, 0);
  assert.deepEqual(r.codex, ['needs a name', 'needs a description']);
  assert.ok(r.copilot[0].includes('exactly SKILL.md'));
});

test('repoCompat: ready, partial, and unchecked tools', () => {
  const good = { skill: 'a', result: checkSkill({ folder: 'a', file: 'SKILL.md', fm: { name: 'a', description: 'd' } }) };
  const bad = { skill: 'b', result: checkSkill({ folder: 'b', file: 'SKILL.md', fm: { name: 'B', description: 'd' } }) };
  const c = repoCompat([good, bad]);
  assert.equal(c.claude.status, 'ready');
  assert.equal(c.cursor.status, 'partial');
  assert.match(c.cursor.fails[0], /^b: /);
  assert.equal(c.gemini.status, 'unchecked');
  assert.equal(repoCompat([]).codex.status, 'unchecked');
});

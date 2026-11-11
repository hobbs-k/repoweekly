import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// public/js/skills.js is a plain browser script; without a `document` it hands its pure functions to `module`.
const m = { exports: {} };
new Function('module', 'document', fs.readFileSync('public/js/skills.js', 'utf8'))(m, undefined);
const { parseWords, searchSkills } = m.exports;

const data = { repos: [
  { rank: 1, full_name: 'a/office', stars: 900, description: 'Office file skills', topics: [], agents: ['claude'], skills: [{ name: 'pdf', description: 'Fill PDF forms' }, { name: 'xlsx' }] },
  { rank: 2, full_name: 'b/sec', stars: 500, description: 'Security reviews', topics: ['security'], agents: ['codex'], skills: [{ name: 'audit', description: 'Check a PDF parser for bugs' }] },
  { rank: 3, full_name: 'c/misc', stars: 100, description: '', topics: [], agents: [], skills: [{ name: 'notes' }] },
] };

test('parseWords splits on commas, or on spaces when there is no comma', () => {
  assert.deepEqual(parseWords('PDF, security audit'), ['pdf', 'security audit']);
  assert.deepEqual(parseWords('pdf forms pdf'), ['pdf', 'forms']);
  assert.deepEqual(parseWords(' '), []);
});

test('searchSkills ranks skill-name hits first, needs every word, and filters by agent', () => {
  const r = searchSkills(data, ['pdf'], '');
  assert.deepEqual(r.map((x) => x.repo.full_name), ['a/office', 'b/sec']); // name hit (4) before description hit (2)
  assert.deepEqual(r[0].hits, ['pdf']);
  assert.deepEqual(searchSkills(data, ['pdf', 'security'], '').map((x) => x.repo.full_name), ['b/sec']);
  assert.deepEqual(searchSkills(data, ['pdf'], 'codex').map((x) => x.repo.full_name), ['b/sec']);
  assert.equal(searchSkills(data, [], '').length, 3); // no words: everything, in the given order
  assert.equal(searchSkills(data, ['zzz'], '').length, 0);
});

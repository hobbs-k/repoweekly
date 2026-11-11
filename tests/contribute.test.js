import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// The page script is a plain browser script that exports its pure functions through `module` when there is no `document`.
const m = { exports: {} };
new Function('module', 'document', fs.readFileSync('public/js/contribute.js', 'utf8'))(m, undefined);
const { parseSkills, score, rank } = m.exports;

const data = {
  repos: {
    'a/web': { language: 'JavaScript', topics: ['react'], ranked: true },
    'b/lib': { language: 'Python', topics: ['cli'], ranked: false },
  },
  items: [
    { repo: 'a/web', title: 'Fix typo in README', labels: ['documentation'], beginner: true, updated: '2026-11-01T00:00:00Z' },
    { repo: 'b/lib', title: 'Add a --json flag', labels: ['enhancement'], beginner: true, updated: '2026-11-05T00:00:00Z' },
    { repo: 'b/lib', title: 'Rewrite the parser', labels: ['help wanted'], beginner: false, updated: '2026-11-06T00:00:00Z' },
  ],
};

test('parseSkills splits on commas or spaces, lowercases, and maps short names', () => {
  assert.deepEqual(parseSkills('JS, Py, docs'), ['javascript', 'python', 'documentation']);
  assert.deepEqual(parseSkills('python cli python'), ['python', 'cli']);
  assert.deepEqual(parseSkills('  '), []);
});

test('score counts language, topic, label and title, and names what matched', () => {
  const r = score(data.items[1], data.repos['b/lib'], ['python', 'cli', 'rust']);
  assert.deepEqual(r.why, ['python', 'cli']);
  assert.equal(r.score, 6 + 4);
});

test('rank filters by beginner and ranked, drops non-matches, and puts the best first', () => {
  assert.deepEqual(rank(data, ['python'], { beginner: true, ranked: false }).map((r) => r.issue.title), ['Add a --json flag']);
  assert.deepEqual(rank(data, ['python'], { beginner: false, ranked: false }).map((r) => r.issue.title), ['Rewrite the parser', 'Add a --json flag']); // newer first on a tie
  assert.deepEqual(rank(data, parseSkills('docs'), { beginner: true, ranked: false }).map((r) => r.issue.title), ['Fix typo in README']);
  assert.equal(rank(data, [], { beginner: false, ranked: true }).length, 1); // no skills: everything that passes the switches
  assert.equal(rank(data, ['python'], { beginner: false, ranked: true }).length, 0);
});

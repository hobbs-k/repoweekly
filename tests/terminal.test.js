import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// public/js/terminal.js is a plain browser script; without a `document` it hands its pure functions to `module`.
const m = { exports: {} };
new Function('module', 'document', fs.readFileSync('public/js/terminal.js', 'utf8'))(m, undefined);
const { parseCommand, execute } = m.exports;

const r = (full_name, stars_gained, language) => ({ full_name, stars_gained, stars_total: 100, language, tags: ['cli'], what_it_is: 'A fast tool', week: 'W1', place: 1, last_push: 'x', open_issues: 1, contributors: 2 });
const data = {
  repos: { repos: { 'a/one': r('a/one', 50, 'Rust'), 'b/two': r('b/two', 90, 'Python') } },
  rising: { items: [] },
  skills: { repos: [{ rank: 1, full_name: 'c/skills', stars: 10, skill_count: 1, topics: [], skills: [{ name: 'pdf' }] }] },
};

test('parseCommand splits words and flags', () => {
  assert.deepEqual(parseCommand('top --lang rust --n 5'), { cmd: 'top', args: [], flags: { lang: 'rust', n: '5' } });
  assert.equal(parseCommand('FIND  cli').cmd, 'find');
});

test('top sorts by stars gained and filters by language', () => {
  assert.match(execute('top', data)[0], /b\/two/);
  assert.equal(execute('top --lang rust', data).length, 1);
  assert.match(execute('top --lang go', data)[0], /No repos/);
});

test('find, repo, skills, rising and unknown commands answer sensibly', () => {
  assert.equal(execute('find cli', data).length, 2);
  assert.match(execute('repo a/one', data)[0], /a\/one/);
  assert.match(execute('repo nope/x', data)[0], /Not in our rankings/);
  assert.match(execute('skills pdf', data)[0], /c\/skills/);
  assert.match(execute('rising', data)[0], /Nothing is rising/);
  assert.match(execute('wat', data)[0], /Unknown command/);
});

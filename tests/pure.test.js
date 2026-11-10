import assert from 'node:assert/strict';
import test from 'node:test';
import { isBreakout, twoDayGains } from '../scripts/lib/breakout.js';
import { classify, isThrowaway, pickSample } from '../scripts/lib/starcheck.js';
import { isoWeek, lastFullWeek, weekRange } from '../scripts/lib/weeks.js';

const empty = { created_at: '2026-11-01T00:00:00Z', public_repos: 0, followers: 0 };
const real = { created_at: '2019-01-01T00:00:00Z', public_repos: 12, followers: 30 };

test('throwaway needs a new account, no repos and almost no followers', () => {
  assert.equal(isThrowaway(empty, '2026-11-03T00:00:00Z'), true);
  assert.equal(isThrowaway(real, '2026-11-03T00:00:00Z'), false);
  assert.equal(isThrowaway({ ...empty, public_repos: 1 }, '2026-11-03T00:00:00Z'), false);
  assert.equal(isThrowaway({ ...empty, created_at: '2025-01-01T00:00:00Z' }, '2026-11-03T00:00:00Z'), false);
});

test('classify levels and the small-sample guard', () => {
  const mk = (bad, total) => Array.from({ length: total }, (_, i) => ({ user: i < bad ? empty : real, starred_at: '2026-11-03T00:00:00Z' }));
  assert.equal(classify(mk(0, 30)).level, 'normal');
  assert.equal(classify(mk(6, 30)).level, 'check'); // 20 percent
  assert.equal(classify(mk(12, 30)).level, 'suspicious'); // 40 percent
  assert.equal(classify(mk(5, 5)).level, 'unknown'); // too few to say
  assert.deepEqual(classify(mk(3, 30)), { sampled: 30, throwaway: 3, pct: 10, level: 'normal' });
});

test('pickSample is repeatable and respects n', () => {
  const entries = Array.from({ length: 50 }, (_, i) => ({ user: { login: `u${i}` } }));
  const a = pickSample(entries, 10, 'x/y:W45').map((e) => e.user.login);
  assert.equal(a.length, 10);
  assert.deepEqual(a, pickSample(entries, 10, 'x/y:W45').map((e) => e.user.login));
  assert.notDeepEqual(a, pickSample(entries, 10, 'other').map((e) => e.user.login));
});

test('breakout needs both size and acceleration', () => {
  const rule = { minGain: 50, accelerate: 2 };
  assert.deepEqual(twoDayGains([0, 0, 0, 10, 60, 120, 200]), { now: 320, before: 70 });
  assert.equal(isBreakout([10, 10, 10, 10, 60, 120, 200], rule), true);
  assert.equal(isBreakout([30, 30, 30, 30, 30, 30, 30], rule), false); // steady, not speeding up
  assert.equal(isBreakout([0, 0, 0, 0, 0, 10, 20], rule), false); // fast but tiny
  assert.equal(isBreakout([0, 0, 0, 0, 0, 30, 30], rule), true); // from nothing counts
});

test('ISO week helpers around year boundaries', () => {
  assert.equal(isoWeek('2026-11-09'), '2026-W46');
  assert.equal(lastFullWeek('2026-11-09'), '2026-W45');
  assert.equal(lastFullWeek('2027-01-04'), '2026-W53');
  assert.deepEqual(weekRange('2026-W01'), { start: '2025-12-29', end: '2026-01-04' });
});

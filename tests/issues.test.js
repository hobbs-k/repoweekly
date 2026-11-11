import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// A fake GitHub: repo a/one has a good ticket, a pull request, an assigned ticket and a stale one;
// repo b/gone is missing (404).
const fresh = new Date().toISOString();
const stale = new Date(Date.now() - 400 * 86400000).toISOString();
const t = (n, extra = {}) => ({ number: n, title: `ticket ${n}`, html_url: `https://github.com/a/one/issues/${n}`, labels: [{ name: 'good first issue' }], created_at: fresh, updated_at: fresh, comments: 1, ...extra });
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  res.setHeader('content-type', 'application/json');
  if (u.pathname === '/repos/a/one/issues') {
    const label = u.searchParams.get('labels');
    return res.end(JSON.stringify(label === 'good first issue'
      ? [t(1), t(2, { pull_request: {} }), t(3, { assignee: { login: 'x' } }), t(4, { updated_at: stale })]
      : [t(1, { labels: [{ name: 'help wanted' }] }), t(5, { labels: [{ name: 'help wanted' }] })]));
  }
  if (u.pathname === '/search/repositories') {
    return res.end(JSON.stringify({ items: [
      { full_name: 'a/one', language: 'Python', topics: [], stargazers_count: 99 }, // already ranked, must not be listed twice
      { full_name: 'c/small', language: 'Python', topics: ['cli'], stargazers_count: 80 },
    ] }));
  }
  if (u.pathname === '/repos/c/small/issues') return res.end(JSON.stringify([t(9, { html_url: 'https://github.com/c/small/issues/9' })]));
  res.statusCode = 404;
  res.end('{}');
});
await new Promise((r) => server.listen(0, r));

test('issues.js keeps open, free, fresh tickets and merges the two labels', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-issues-'));
  const week = (names) => ({ week: '2026-W45', start: '2026-11-02', end: '2026-11-08', top: names.map((full_name) => ({ full_name, language: 'Python', topics: ['ai'], stars_total: 10, summary: { difficulty: 'easy', beginner_friendly: true } })), gems: [] });
  fs.mkdirSync(path.join(dir, 'weeks'));
  fs.writeFileSync(path.join(dir, 'weeks', '2026-W45.json'), JSON.stringify(week(['a/one', 'b/gone'])));
  const code = await new Promise((resolve) => {
    const p = spawn(process.execPath, ['scripts/issues.js'], { env: { ...process.env, DATA_DIR: dir, GITHUB_API_BASE: `http://127.0.0.1:${server.address().port}` }, stdio: 'ignore' });
    p.on('close', resolve);
  });
  assert.equal(code, 0);
  const out = JSON.parse(fs.readFileSync(path.join(dir, 'issues.json'), 'utf8'));
  assert.deepEqual(out.items.map((i) => i.number).sort(), [1, 5, 9]); // no pull request, assigned or stale ticket; 9 is from the wider list
  assert.equal(out.items.find((i) => i.number === 1).beginner, true);
  assert.equal(out.items.find((i) => i.number === 5).beginner, false);
  assert.deepEqual(Object.keys(out.repos).sort(), ['a/one', 'c/small']);
  assert.equal(out.repos['a/one'].ranked, true);
  assert.equal(out.repos['c/small'].ranked, false);
  assert.equal(out.items.filter((i) => i.repo === 'a/one').length, 2); // not fetched twice
  server.close();
});

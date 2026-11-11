import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// A fake GitHub that says only 100 requests are left. Any other call would be a bug, so it is counted.
let other = 0;
const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/rate_limit') return res.end(JSON.stringify({ resources: { core: { remaining: 100, limit: 5000, reset: 0 } } }));
  other++;
  res.statusCode = 500;
  res.end('{}');
});
await new Promise((r) => server.listen(0, r));

for (const script of ['issues', 'skills']) {
  test(`${script}.js skips itself when few requests are left`, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rw-guard-'));
    const code = await new Promise((resolve) => {
      const p = spawn(process.execPath, [`scripts/${script}.js`], { env: { ...process.env, DATA_DIR: dir, GITHUB_API_BASE: `http://127.0.0.1:${server.address().port}` }, stdio: 'ignore' });
      p.on('close', resolve);
    });
    assert.equal(code, 0); // skipping is not a failure, the daily run must go on
    assert.equal(other, 0); // and it made no other call
    assert.deepEqual(fs.readdirSync(dir), []); // and wrote nothing
  });
}
test('close the fake server', () => server.close());

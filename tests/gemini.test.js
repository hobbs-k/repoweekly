import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

// A fake Gemini server: first call is rate limited, second is not JSON, third is good.
const seen = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    seen.push({ url: req.url, key: req.headers['x-goog-api-key'], body: JSON.parse(body) });
    if (seen.length === 1) { res.statusCode = 429; return res.end('slow down'); }
    const text = seen.length === 2 ? 'no json here' : '```json\n{"ok": true}\n```';
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
  });
});
await new Promise((r) => server.listen(0, r));
process.env.GEMINI_API_BASE = `http://127.0.0.1:${server.address().port}/v1beta`;
process.env.GEMINI_API_KEY = 'test-key';
process.env.GEMINI_RETRY_WAIT_MS = '1';
const { askJson } = await import('../scripts/lib/claude.js');

test('askJson waits on 429, retries a bad reply once, and sends key and prompts', async () => {
  const warnings = [];
  const out = await askJson({
    system: 'SYS', user: 'USR', label: 't', log: { warn: (m) => warnings.push(m) },
    validate: (raw) => { if (raw.ok !== true) throw new Error('not ok'); return raw; },
  });
  assert.deepEqual(out, { ok: true });
  assert.equal(seen.length, 3);
  assert.equal(warnings.length, 1);
  assert.equal(seen[0].key, 'test-key');
  assert.match(seen[0].url, /models\/.+:generateContent$/);
  assert.equal(seen[0].body.systemInstruction.parts[0].text, 'SYS');
  assert.match(seen[2].body.contents[0].parts[0].text, /rejected/); // the retry carries the reason
  server.close();
});

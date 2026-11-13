import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanText, clip, excerpt, hnBuzz, xQuote } from '../scripts/lib/buzz.js';

test('cleanText strips tags and decodes entities', () => {
  assert.equal(cleanText('I&#x27;ve used <i>this</i>.<p>Works &amp; fast'), "I've used this. Works & fast");
});

test('clip cuts long text at a word boundary', () => {
  const t = 'word '.repeat(100).trim();
  const c = clip(t, 50);
  assert.ok(c.length <= 51 && c.endsWith('…') && !c.includes('wor…'));
  assert.equal(clip('short', 50), 'short');
});

test('hnBuzz keeps only hits that name the repo exactly, newest comments first', () => {
  const hits = [
    { objectID: '1', author: 'a', created_at: '2026-10-01T00:00:00Z', comment_text: 'I tried <a href="https://github.com/o/skill">github.com/o/skill</a>, great.' },
    { objectID: '2', author: 'b', created_at: '2026-11-01T00:00:00Z', comment_text: 'o/skill helped me a lot' },
    { objectID: '3', author: 'c', created_at: '2026-11-05T00:00:00Z', comment_text: 'some other skill entirely' },
    { objectID: '4', author: 'd', created_at: '2026-09-01T00:00:00Z', title: 'Show HN: skill', url: 'https://github.com/o/skill', points: 120, num_comments: 40 },
  ];
  const b = hnBuzz('o/skill', hits);
  assert.deepEqual(b.quotes.map((q) => q.author), ['b', 'a']);
  assert.equal(b.quotes[0].url, 'https://news.ycombinator.com/item?id=2');
  assert.deepEqual(b.story, { title: 'Show HN: skill', points: 120, comments: 40, url: 'https://news.ycombinator.com/item?id=4' });
  assert.deepEqual(hnBuzz('o/skill', [hits[2]]), { story: null, quotes: [] });
});

test('xQuote reads the post text and author from an embed reply, and rejects other links', () => {
  const oembed = { author_name: 'Jane', html: '<blockquote class="twitter-tweet"><p lang="en">This skill made my UI so much better &amp; faster</p>&mdash; Jane (@jane) <a href="https://x.com/jane/status/12345">November 1, 2026</a></blockquote>' };
  assert.deepEqual(xQuote('https://x.com/jane/status/12345', oembed), { source: 'x', author: 'Jane', handle: 'jane', text: 'This skill made my UI so much better & faster', url: 'https://x.com/jane/status/12345', date: 'November 1, 2026' });
  assert.equal(xQuote('https://evil.example/jane/status/12345', oembed), null);
});

test('excerpt keeps the sentence that names the repo, and link dumps are dropped', () => {
  const t = 'I tried lots of things this year. The best was o/skill for UI work. It fixed my layouts. Unrelated ending here.';
  assert.equal(excerpt(t, 'o/skill'), 'I tried lots of things this year. The best was o/skill for UI work. It fixed my layouts.');
  const dump = { objectID: '9', author: 'z', created_at: '2026-11-01T00:00:00Z', comment_text: 'https://github.com/o/skill https://a.example/x https://b.example/y' };
  assert.deepEqual(hnBuzz('o/skill', [dump]).quotes, []);
});

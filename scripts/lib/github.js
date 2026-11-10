import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { createLogger } from './logger.js';

const logger = createLogger('github');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function headers() {
  const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'repoweekly' };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

// GET with retry. Backs off on 403/429 and 5xx; returns { data, rate }.
export async function ghGet(pathOrUrl, { raw = false, accept } = {}) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : config.github.apiBase + pathOrUrl;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: raw ? { ...headers(), Accept: 'application/vnd.github.raw+json' } : accept ? { ...headers(), Accept: accept } : headers() });
    const rate = {
      remaining: Number(res.headers.get('x-ratelimit-remaining')),
      limit: Number(res.headers.get('x-ratelimit-limit')),
      reset: Number(res.headers.get('x-ratelimit-reset')),
    };
    if (res.ok) return { data: raw ? await res.text() : await res.json(), rate, headers: res.headers };
    const retryable = res.status === 403 || res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= config.github.maxRetries) {
      const err = new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
      err.status = res.status;
      throw err;
    }
    const retryAfter = Number(res.headers.get('retry-after'));
    const untilReset = rate.reset ? rate.reset * 1000 - Date.now() : 0;
    const wait = retryAfter ? retryAfter * 1000 : rate.remaining === 0 && untilReset > 0 ? untilReset + 1000 : 2 ** attempt * 1000;
    if (wait > 15 * 60 * 1000) throw new Error(`rate limited, reset in ${Math.round(wait / 60000)} min`);
    logger.warn(`${res.status} on ${url}, waiting ${Math.round(wait / 1000)}s (attempt ${attempt + 1})`);
    await sleep(wait);
  }
}

export async function getRateLimit() {
  const { data } = await ghGet('/rate_limit');
  return data.resources.core;
}

// Console check: node scripts/lib/github.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (!process.env.GITHUB_TOKEN) logger.warn('GITHUB_TOKEN not set, using the anonymous limit');
    const core = await getRateLimit();
    logger.log(`rate limit: ${core.remaining}/${core.limit} remaining, resets ${new Date(core.reset * 1000).toISOString()}`);
    logger.done('ok');
  } catch (err) {
    logger.error(`FAILED: ${err.message}`);
    process.exit(1);
  }
}

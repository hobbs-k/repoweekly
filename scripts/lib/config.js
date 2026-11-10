import path from 'node:path';

// All data paths resolve from DATA_DIR so scripts can run against fixtures.
const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');

export const config = {
  licenseNote: 'Data is free to use. A link back to RepoWeekly is appreciated.',
  site: { url: process.env.SITE_URL || 'https://repoweekly.example', title: 'RepoWeekly' },
  paths: {
    data: DATA_DIR,
    tracked: path.join(DATA_DIR, 'tracked.json'),
    snapshots: path.join(DATA_DIR, 'snapshots'),
    bootstrap: path.join(DATA_DIR, 'bootstrap'),
    weeks: path.join(DATA_DIR, 'weeks'),
    summaries: path.join(DATA_DIR, 'summaries'),
    // Trimmed READMEs passed from rank.js to summarize.js. Not committed.
    readmes: path.join(DATA_DIR, 'readmes'),
    latest: path.join(DATA_DIR, 'latest.json'),
    blocklist: path.join(DATA_DIR, 'blocklist.json'),
    publicDir: path.resolve(process.env.PUBLIC_DIR || 'public'),
  },
  github: {
    apiBase: process.env.GITHUB_API_BASE || 'https://api.github.com', // the override is for tests with a mock server
    searchDelayMs: 300,
    maxRetries: 4,
  },
  collect: {
    pushedWithinDays: 7,
    minStarsPushed: 50,
    createdWithinDays: 30,
    minStarsCreated: 20,
    pages: 10,
    perPage: 100,
  },
  tracking: {
    dropAfterDays: 30,
    maxTracked: 3000,
    top: 200,
  },
  ranking: {
    topCount: 10,
    gemCount: 5,
    extraSignalsCount: 15,
    spikeShare: 0.7,
    gemMaxStars: 500,
    gemMinGain: 40,
  },
  rising: { minGain: 50, accelerate: 2, count: 10 },
  starCheck: { pages: 3, sample: 30 },
  summarize: {
    readmeMaxChars: 6000,
    // Tried in order when one is busy. Names from OpenRouter's free list on 2026-11-11; LLM_MODEL goes first.
    models: [
      ...(process.env.LLM_MODEL ? [process.env.LLM_MODEL] : []),
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'nvidia/nemotron-3.5-super-vl:free',
      'nvidia/nemotron-3.5-lightning:free',
      'openrouter/free',
    ],
    apiBase: process.env.LLM_API_BASE || 'https://openrouter.ai/api/v1',
    retryWaitMs: Number(process.env.LLM_RETRY_WAIT_MS) || 10000,
    urduEnabled: process.env.URDU_ENABLED === 'true',
  },
};

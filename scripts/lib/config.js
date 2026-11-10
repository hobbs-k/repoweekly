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
    apiBase: 'https://api.github.com',
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
  summarize: {
    readmeMaxChars: 6000,
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    urduEnabled: process.env.URDU_ENABLED === 'true',
  },
};

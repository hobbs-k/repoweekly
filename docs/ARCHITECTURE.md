# ARCHITECTURE.md

## Overview

```
GitHub Actions (cron)
   │
   ├─ daily  → scripts/collect.js → scripts/snapshot.js → commit /data
   │
   └─ weekly → scripts/rank.js → scripts/summarize.js → scripts/feeds.js
                    │                    │
                    └── /data/weeks/*.json ◄──┘
                                   │
                         validate → commit /data → astro build → /dist → deploy
```

No server. No database in v1. Everything is files in git.

## Scripts

### scripts/collect.js
Finds candidate repos and updates the tracked set.
- Runs the search queries from PLAN.md (pushed in last 7 days, created in last 30 days).
- Paginates up to 10 pages of 100 results per query, with a 300 ms delay.
- Merges new repos into `data/tracked.json` (keyed by `full_name`).
- Drops a repo when both `first_seen` and `last_in_top200` are more than 30 days old (see DATA_SPEC.md). collect.js never sets `last_in_top200`; rank.js owns it.
- Caps the tracked set at `MAX_TRACKED` (in `config.js`, default 3000). If over the cap after merging, drop the repos with the oldest `last_in_top200` (then oldest `first_seen`) and log how many were dropped.
- Flags: `--dry-run`.

### scripts/snapshot.js
Stores today's numbers for every tracked repo.
- For each tracked repo, fetch stars, forks, open issues, pushed_at, license, topics, language.
- One REST call per repo. Check the rate limit before starting: if the remaining quota is lower than the tracked count, wait for the reset when it is under 15 minutes away, otherwise fail with a clear message.
- Use GraphQL batching (about 100 repos per query) if the tracked set grows past what REST can do in one run.
- Write `data/snapshots/YYYY-MM-DD.json`. The default date is yesterday (UTC), because the file holds stars at the end of that day.
- Skips repos that return 404. Fails if more than 20 percent of repos fail.
- Flags: `--dry-run` (samples 3 repos), `--date YYYY-MM-DD`, `--limit N`.

### scripts/bootstrap-trending.js
Used only until 7 days of snapshots exist, and as a weekly cross-check.
- Fetch `https://github.com/trending?since=weekly` and parse repo names and "stars this week".
- Wrap parsing in a function that throws a clear error if the page structure changed.
- Write `data/bootstrap/YYYY-Www.json`.

### scripts/rank.js
Builds the weekly result.
- Reads the last 7 to 8 snapshots. If fewer than 7 exist, fills growth from bootstrap data.
- Applies exclusions, scoring, spike flag, hidden gems (see PLAN.md).
- Fetches extra signals for the final 15 repos: contributors count, good-first-issue count, README text.
- Writes `data/weeks/YYYY-Www.json` (without summaries) and updates `data/latest.json`.
- Sets `last_in_top200` in `data/tracked.json` for every repo in the top 200 by weekly gain (or on the bootstrap list in bootstrap mode).
- The week it ranks is the last full Monday-to-Sunday week before the run date (see "Week naming" in DATA_SPEC.md). `--week YYYY-Www` overrides it.
- Exits non-zero if fewer than 10 repos are ranked.
- Writes trimmed READMEs to `data/readmes/` for summarize.js (not committed).
- Flags: `--dry-run`, `--week YYYY-Www`, `--today YYYY-MM-DD`, `--keep-awesome`, `--offline` (fixtures only, needs `DATA_DIR`, makes no GitHub calls and its output must never be published).

### scripts/summarize.js
Adds AI text to the weekly file.
- For each ranked repo and gem, send README (trimmed to about 6000 characters) and metadata to the Anthropic API.
- Model name comes from env `ANTHROPIC_MODEL` (default set in `scripts/lib/config.js`).
- Prompt rules: use only the supplied text, no guessing, no hype, short sentences, beginner-friendly, return strict JSON (see DATA_SPEC.md).
- Cache results in `data/summaries/<owner>__<repo>.json` keyed by a hash of the README. Skip the API call if the hash matches.
- Validate JSON output. Retry once on bad JSON. Fail the run if still bad.
- Adds the `urdu` field only when `URDU_ENABLED=true` (Phase 3). Off by default.
- Flags: `--dry-run` (prints the prompt, makes no call), `--only owner/repo`.

### scripts/feeds.js
Generates public files from the latest week.
- `public/feed.xml` (RSS 2.0 or Atom)
- `public/api/latest.json`
- `public/api/weeks/YYYY-Www.json`
- `public/api/index.json` (list of all weeks)

### scripts/stars.js
Optional star check. For each ranked repo it reads the three newest pages of stargazers (about 300 stars), picks up to 30 accounts (the same ones on every run), and counts those that were under 60 days old when they starred, have no repos and at most one follower. Adds `star_check` to the week file (DATA_SPEC.md). Needs about 500 GitHub requests per week, so it skips with a warning when the rate limit is lower (no `GH_PAT`). A repo that fails is skipped. It never changes the ranking. The 20 and 40 percent cut-offs are rough guesses (`lib/starcheck.js`). Runs inside `npm run build:data`, between summarize and feeds.

### scripts/rising.js
Writes `data/rising.json` for the `/rising/` page: repos not in the latest week that gained at least 50 stars in the last two days, at least twice as fast as in the two days before (`rising` in `lib/config.js`). Reads the last 8 daily snapshots and needs 5. Fetches a description for the ten shown (10 GitHub calls). Flags: `--dry-run`, `--offline`, `--date`. Runs in the daily workflow.

### scripts/avatars.js
Saves each ranked owner's avatar to `public/avatars/<owner>.<ext>` at build time, so visitors never contact GitHub's image host. Files are committed so older weeks keep them. A failed download only warns; the card then has no avatar.

### scripts/guide.js
Optional. Writes `data/guides/YYYY-Www.json`, a short "Learn from this repo" guide for the week's number 1 repo (or `--repo`). Uses only the saved README and metadata. One guide per week; `--force` writes it again. The weekly workflow lets this step fail without failing the week. Week pages show the guide when the file exists.

### scripts/notify.js
Posts the latest week to Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`), Discord (`DISCORD_WEBHOOK_URL`) and a Buttondown email (`BUTTONDOWN_API_KEY`). A channel without credentials is skipped. `data/notified.json` records what was sent per week, so a rerun never posts twice. Refuses a Discord address that is not a Discord webhook. Runs in the `notify` job, after a successful deploy.

### scripts/validate.js
Checks the latest week before the workflow commits or deploys: at least 10 ranked repos, every item has a summary with the required fields, `daily_gains` has 0 or 7 values, `spike` is null in bootstrap mode, and the public files exist (`--skip-public` skips that last check). Exits non-zero with every problem listed. `urdu` is not checked.

### scripts/lib/
- `github.js` client with retry, backoff on 403/429, and rate-limit logging
- `scoring.js` growth, spike detection, hidden-gem rules
- `cache.js` read/write helpers and README hashing
- `logger.js` the `[step]` console format
- `config.js` constants (thresholds, delays, model name, `MAX_TRACKED`, `URDU_ENABLED`) and paths. All data paths resolve from `DATA_DIR` (env, default `data`) so scripts can run against fixtures.
- `weeks.js` ISO week helpers: ISO week id for a date, start and end dates of a week, the last full week before a date

## Fixtures

`fixtures/data/` holds a small fake dataset in the same layout as `/data`: about 30 repos in `tracked.json`, 8 days of snapshots, one bootstrap file, and an empty `summaries/` folder. It lets every script run locally before any real history exists:

```
DATA_DIR=fixtures/data node scripts/rank.js --dry-run --week 2026-W45
```

Fixtures include at least one spike repo, one gem, one archived repo, and one fork, so each rule gets exercised. Scripts that call GitHub still need a token; rank.js should skip the extra-signal fetch when `--dry-run` is set and log that it did.

## Site (Astro)

Pages:
- `/` top 10 of the latest week, gems section
- `/weeks/` archive index
- `/weeks/[week]` any past week
- `/repo/[owner]/[name]` repo page: latest card, star-history chart, weeks it was ranked, similar repos
- `/language/[lang]` languages in the latest week; the week pages also filter in the browser (`public/js/filters.js`)
- `/rising` repos speeding up in the last two days, from `data/rising.json` (the page copes with the file being missing)
- `/compare` two repos side by side (`public/js/compare.js`, reads `/api/repos.json`)
- `/health` "Dead or alive?" score for a pasted repo address (`public/js/health.js`)
- `/about` what this is, how ranking works
- `/api-docs` documentation of the static JSON files

Rules:
- Pages read from `/data` at build time. No client-side API calls to GitHub, with one exception: `/health` asks GitHub from the visitor's browser, because the repo is not known in advance. The page says so.
- Charts, filters and the compare and health tools use scripts in `/public/js` (`history-chart.js`, `filters.js`, `compare.js`, `health.js`). Chart.js is copied to `public/js/vendor` by `scripts/vendor.js`. No inline logic.
- Accessible, mobile first, light and dark mode, no tracking scripts.
- Each card shows: name, owner avatar, one-line description, language, weekly stars gained, total stars, short "why trending" text, tags, and signal badges.

## GitHub Actions

`.github/workflows/daily.yml`
- Cron: `0 2 * * *` (UTC)
- Steps: checkout, setup node, `npm ci`, `npm run collect`, `npm run snapshot`, `npm run rising` (may fail without failing the run), commit and push `/data`.
- Then, only if `data/latest.json` exists and `SITE_URL` is set: `npm run feeds`, `npm run validate`, `npm run build`, upload the Pages artifact. A `deploy` job publishes it. The rising page changes daily, so the site is rebuilt from data already committed. No paid call is made.

`.github/workflows/weekly.yml`
- Cron: `0 4 * * 1` (Monday, UTC)
- Steps: check settings, checkout, setup node, `npm ci`, `npm run bootstrap` (may fail, matters only while we have under 7 snapshots), `npm run build:data`, `npm run validate`, commit and push `/data` (week file, latest.json, tracked.json, summary cache), `npm run build`, upload the Pages artifact.
- A second `deploy` job runs only if the first passed, so a failed week leaves the live site as it was.
- Deploy target: GitHub Pages (decided). Set the repo variable `SITE_URL` to the public address, for example `https://user.github.io/repoweekly`. Astro takes its `site` and `base` from it, so a project site under a sub-path works. In Settings > Pages, set the source to GitHub Actions.
- If validation fails, still commit `data/summaries/` so paid API calls aren't wasted, but don't commit the week file and don't deploy.
- Also has `workflow_dispatch` so it can be run by hand.

Both workflows:
- Use the same `concurrency` group (`data-writes`) so they never push at the same time, and run `git pull --rebase` before pushing.
- Need `permissions: contents: write` to push.

Secrets: `ANTHROPIC_API_KEY` and `GH_PAT` (a fine-grained personal token with public read access). Set the scripts' env as `GITHUB_TOKEN: ${{ secrets.GH_PAT || secrets.GITHUB_TOKEN }}`. The built-in Actions token is limited to 1,000 REST requests per hour, which is too few for the daily snapshot once the tracked set grows, so `GH_PAT` is expected, not optional. The built-in token is still used for `git push`.

## Error handling

- Every script wraps its main function in try/catch, logs `[step] FAILED: reason`, and exits with code 1.
- Weekly workflow must not deploy if data validation fails.
- Keep the previous week's site live if a run fails.

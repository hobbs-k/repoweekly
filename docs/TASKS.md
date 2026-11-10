# TASKS.md

Work top to bottom. Tick each box when done and add a line to the Log at the bottom. Read CLAUDE.md for the rules before starting.

## Phase 0: Setup

- [x] Create folder layout from CLAUDE.md
- [x] `npm init`, install astro, chart.js, @anthropic-ai/sdk
- [x] Add npm scripts from CLAUDE.md
- [x] Add `.gitignore` (node_modules, dist, .env, .astro)
- [x] Add `.env.example` with GITHUB_TOKEN, ANTHROPIC_API_KEY, ANTHROPIC_MODEL, DATA_DIR, URDU_ENABLED
- [x] Add `README.md` with a short description and how to run locally
- [x] Add `scripts/lib/logger.js`, `config.js`, `weeks.js`, `cache.js`, `github.js`
- [x] Console check: `node scripts/lib/github.js` prints remaining rate limit
- [x] Console check: `node scripts/lib/weeks.js` prints `2026-W45` for the last full week before 2026-11-09
- [x] Add `fixtures/data/` (see ARCHITECTURE.md, Fixtures)

## Phase 1: MVP data pipeline

- [x] `collect.js`: search queries, pagination, delay, merge into tracked.json, 30-day drop rule, `MAX_TRACKED` cap, `--dry-run`
- [x] `snapshot.js`: write today's snapshot for all tracked repos, rate-limit check before starting, `--dry-run`
- [x] `bootstrap-trending.js`: parse weekly trending page, throw clear error if structure changes
- [x] `lib/scoring.js`: growth from snapshots, fallback to bootstrap, spike flag (`null` in bootstrap mode), gem rule
- [x] `rank.js`: exclusions, ranking, extra signals for final 15, writes week file and latest.json, sets `last_in_top200`, `--week`
- [x] `summarize.js`: prompt, JSON validation, retry once, README-hash cache, `--dry-run`, `--only`
- [x] `feeds.js`: feed.xml, api/latest.json, api/weeks, api/index.json
- [x] Run rank, summarize (`--dry-run`) and feeds against fixtures with `DATA_DIR=fixtures/data`
- [ ] Run the full pipeline locally once and check `data/weeks/*.json` against DATA_SPEC.md

## Phase 1: MVP site

- [x] Astro base layout, header, footer, light and dark mode, mobile first
- [x] Home page: top 10 cards from `data/latest.json`
- [x] Repo card component with all fields from DATA_SPEC.md
- [x] Hidden gems section on home
- [x] About page explaining ranking rules in plain language
- [x] 404 page
- [x] `astro build` succeeds and output looks right in `astro preview`

## Phase 1: Automation

- [x] `weekly.yml` workflow with `workflow_dispatch`, `concurrency: data-writes`, and a commit-and-push step for `/data`
- [ ] Add `GH_PAT` and `ANTHROPIC_API_KEY` repo secrets (document in README)
- [x] Validation step that fails the run if fewer than 10 ranked repos or any missing summary (`urdu` not required); on failure, commit only `data/summaries/`
- [x] Deploy step for Cloudflare Pages or GitHub Pages (pick one, document in README)
- [ ] Run once by hand and confirm the live site updates

## Phase 2: History and filters

- [x] `daily.yml` workflow for collect and snapshot, commits `/data`, same `concurrency` group as weekly
- [ ] Switch ranking to snapshot growth once 7 days exist; keep bootstrap as cross-check and log differences
- [ ] Weekly archive: `/weeks/` index and `/weeks/[week]` pages
- [ ] Repo detail page with signals and star-history chart (`public/js/history-chart.js`)
- [ ] Language filter (`public/js/filters.js`) and `/language/[lang]` pages
- [x] Spike warning note on cards
- [x] Signal badges: license, last push, open issues, contributors, good-first-issues

## Phase 3: Community features

- [ ] Beginner-friendly badge and difficulty label on cards, plus a beginner-only filter
- [ ] Urdu summaries: turn on `URDU_ENABLED` in summarize.js, plus a toggle on each card
- [ ] Similar repos block (same topics and language, from tracked set)
- [ ] Compare page: pick two repos, show stats side by side
- [ ] `/api-docs` page documenting the static JSON files
- [x] Blocklist file support in rank.js

## Phase 4: Reach

- [ ] Email digest via Buttondown or Resend, sent from the weekly workflow
- [ ] Telegram channel post and Discord webhook step
- [ ] "Learn from this repo" weekly mini guide (new summarize mode, one featured repo)
- [ ] "Dead or alive?" health score page for a pasted repo URL
- [ ] Browser extension: show trend score on github.com repo pages

## Testing checklist (run before ticking any phase)

- [ ] Every script runs with `--dry-run` and writes nothing
- [ ] Every script exits non-zero on bad input
- [ ] No inline scripts in any page
- [ ] No secrets in git history
- [ ] Site works on a narrow phone screen
- [ ] Feed validates in an RSS validator

## Log

(Add one line per finished task: date, what, anything odd.)

- 2026-11-09: Phase 0 done except fixtures (folder exists, data not written yet). Node 24 locally; `weeks.js` checked on 2026-W53 and W01 boundaries. Anonymous GitHub limit is 60/hour, so set GITHUB_TOKEN before real runs.

- 2026-11-09: Docs fixed before coding. Weeks named by the ISO week they cover; weekly workflow commits /data; rank.js owns `last_in_top200`; `spike: null` in bootstrap mode; `GH_PAT` required and `MAX_TRACKED` cap; Urdu off until Phase 3; added fixtures and `DATA_DIR`.
- 2026-11-09: Fixtures done. `node fixtures/generate.js` rebuilds `fixtures/data` (28 repos, 8 snapshots Nov 1 to 8, bootstrap W45, blocklist). Expected top 10 for 2026-W45: agent-runner, edge-db, pixel-ui, viral-one-day (spike), shell-pal, model-lens, paper-sync, tiny-queue, form-kit, log-tail. Excluded on purpose: archived, fork, blocklisted. Tie pair and 6 gems included. Stale repo should be dropped by collect.js.
- 2026-11-09: Pipeline built and tested locally. Snapshot date means end of that day (default yesterday UTC). Tests: rank on fixtures gives the expected top 10, 5 gems, tie-break and prune rules hold; bootstrap parser read the live trending page (14 repos) and rejects bad HTML; rank dry-run on live data worked with real README, contributor and good-first-issue calls; summarize and feeds ran against a mock Anthropic server (retry on bad JSON, cache hit on rerun). Not yet run: a real `summarize` with a paid key, and the full pipeline on live snapshots (needs 7 days of them).
- 2026-11-09: `weekly.yml`, `daily.yml` and `scripts/validate.js` written. Validate tested on good, bad and missing data. The workflows have NOT run on GitHub yet, so "Run once by hand" stays open. Hosting: GitHub Pages; needs the `SITE_URL` variable and the `GH_PAT` and `ANTHROPIC_API_KEY` secrets (see README).
- 2026-11-09: Known limit in collect.js: search sorts by stars and returns at most 1000 repos per query, so very young repos with few stars can be missed. Bootstrap repos are added to the tracked set to help. Revisit when real weekly results can be compared to the trending page.
- 2026-11-09: Site built with Impeccable (direction: pocket tide table, see PRODUCT.md and `.impeccable/surfaces/`). Pages: home, about, 404. No inline scripts, no tracking; the font is self-hosted (`@fontsource-variable/archivo`, the one added dependency); owner avatars are saved at build time by `scripts/avatars.js`. Checked at 390, 768 and 1440 in light and dark with synthetic data (owners `fx-`). Build fails loudly with no data. Links honour a base path from `SITE_URL`. Finish review ran twice; the first round bounced on bad phone captures (headless Chrome clamps to about 500px wide, so use CDP device emulation).
- 2026-11-09: Cards show spike note and signal badges now, so those Phase 2 items are ticked early. Still to do for Phase 2: archive pages, repo pages with chart, language filter. The RSS items link to the home page until archive pages exist.

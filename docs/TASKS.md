# TASKS.md

Work top to bottom. Tick each box when done and add a line to the Log at the bottom. Read CLAUDE.md for the rules before starting.

## Phase 0: Setup

- [x] Create folder layout from CLAUDE.md
- [x] `npm init`, install astro, chart.js
- [x] Add npm scripts from CLAUDE.md
- [x] Add `.gitignore` (node_modules, dist, .env, .astro)
- [x] Add `.env.example` with GITHUB_TOKEN, LLM_API_KEY, LLM_MODEL, DATA_DIR, URDU_ENABLED
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
- [ ] Add `GH_PAT` and `LLM_API_KEY` repo secrets (document in README)
- [x] Validation step that fails the run if fewer than 10 ranked repos or any missing summary (`urdu` not required); on failure, commit only `data/summaries/`
- [x] Deploy step for Cloudflare Pages or GitHub Pages (pick one, document in README)
- [ ] Run once by hand and confirm the live site updates

## Phase 2: History and filters

- [x] `daily.yml` workflow for collect and snapshot, commits `/data`, same `concurrency` group as weekly
- [x] Switch ranking to snapshot growth once 7 days exist; keep bootstrap as cross-check and log differences
- [x] Weekly archive: `/weeks/` index and `/weeks/[week]` pages
- [x] Repo detail page with signals and star-history chart (`public/js/history-chart.js`)
- [x] Language filter (`public/js/filters.js`) and `/language/[lang]` pages
- [x] Spike warning note on cards
- [x] Signal badges: license, last push, open issues, contributors, good-first-issues

## Phase 3: Community features

- [x] Beginner-friendly badge and difficulty label on cards, plus a beginner-only filter
- [x] Urdu summaries: turn on `URDU_ENABLED` in summarize.js, plus a toggle on each card
- [x] Similar repos block (same topics and language, from tracked set)
- [x] Compare page: pick two repos, show stats side by side
- [x] `/api-docs` page documenting the static JSON files
- [x] Blocklist file support in rank.js

## Phase 4: Reach

- [x] Email digest via Buttondown or Resend, sent from the weekly workflow
- [x] Telegram channel post and Discord webhook step
- [x] "Learn from this repo" weekly mini guide (new summarize mode, one featured repo)
- [x] "Dead or alive?" health score page for a pasted repo URL
- [x] Browser extension: show trend score on github.com repo pages

## Phase 5: Trust and early signals

- [x] Star check: `stars.js` samples recent stargazers, cards show a signal (never changes the ranking)
- [x] Rising now: `rising.js`, `/rising/` page, daily workflow rebuilds and deploys
- [x] Unit tests for the pure logic (`npm test`)

## Testing checklist (run before ticking any phase)

- [x] Every script runs with `--dry-run` and writes nothing
- [x] Every script exits non-zero on bad input
- [x] No inline scripts in any page
- [x] No secrets in git history
- [x] Site works on a narrow phone screen
- [ ] Feed validates in an RSS validator

## Log

(Add one line per finished task: date, what, anything odd.)

- 2026-11-09: Phase 0 done except fixtures (folder exists, data not written yet). Node 24 locally; `weeks.js` checked on 2026-W53 and W01 boundaries. Anonymous GitHub limit is 60/hour, so set GITHUB_TOKEN before real runs.

- 2026-11-09: Docs fixed before coding. Weeks named by the ISO week they cover; weekly workflow commits /data; rank.js owns `last_in_top200`; `spike: null` in bootstrap mode; `GH_PAT` required and `MAX_TRACKED` cap; Urdu off until Phase 3; added fixtures and `DATA_DIR`.
- 2026-11-09: Fixtures done. `node fixtures/generate.js` rebuilds `fixtures/data` (28 repos, 8 snapshots Nov 1 to 8, bootstrap W45, blocklist). Expected top 10 for 2026-W45: agent-runner, edge-db, pixel-ui, viral-one-day (spike), shell-pal, model-lens, paper-sync, tiny-queue, form-kit, log-tail. Excluded on purpose: archived, fork, blocklisted. Tie pair and 6 gems included. Stale repo should be dropped by collect.js.
- 2026-11-09: Pipeline built and tested locally. Snapshot date means end of that day (default yesterday UTC). Tests: rank on fixtures gives the expected top 10, 5 gems, tie-break and prune rules hold; bootstrap parser read the live trending page (14 repos) and rejects bad HTML; rank dry-run on live data worked with real README, contributor and good-first-issue calls; summarize and feeds ran against a mock server (retry on bad JSON, cache hit on rerun). Not yet run: a real `summarize` with a Gemini key, and the full pipeline on live snapshots (needs 7 days of them).
- 2026-11-09: `weekly.yml`, `daily.yml` and `scripts/validate.js` written. Validate tested on good, bad and missing data. The workflows have NOT run on GitHub yet, so "Run once by hand" stays open. Hosting: GitHub Pages; needs the `SITE_URL` variable and the `GH_PAT` and `LLM_API_KEY` secrets (see README).
- 2026-11-09: Known limit in collect.js: search sorts by stars and returns at most 1000 repos per query, so very young repos with few stars can be missed. Bootstrap repos are added to the tracked set to help. Revisit when real weekly results can be compared to the trending page.
- 2026-11-09: Site built with Impeccable (direction: pocket tide table, see PRODUCT.md and `.impeccable/surfaces/`). Pages: home, about, 404. No inline scripts, no tracking; the font is self-hosted (`@fontsource-variable/archivo`, the one added dependency); owner avatars are saved at build time by `scripts/avatars.js`. Checked at 390, 768 and 1440 in light and dark with synthetic data (owners `fx-`). Build fails loudly with no data. Links honour a base path from `SITE_URL`. Finish review ran twice; the first round bounced on bad phone captures (headless Chrome clamps to about 500px wide, so use CDP device emulation).
- 2026-11-09: Cards show spike note and signal badges now, so those Phase 2 items are ticked early. Still to do for Phase 2: archive pages, repo pages with chart, language filter. The RSS items link to the home page until archive pages exist.
- 2026-11-10: Phase 2, 3 and 4 code written and tested on a three-week synthetic sample (one bootstrap week) in headless Chrome: archive and week pages, repo pages with a Chart.js history (bootstrap weeks left out), language pages and filters, Urdu details toggle, similar repos, compare, api-docs, `/health`. 31 pages build; no console errors; no horizontal overflow at 390.
- 2026-11-10: `guide.js` and `notify.js` tested against a mock server only (bad-JSON retry, partial failure, no repeat posts, non-Discord URL refused). `health.js` scoring has assert checks and the live check on a real repo worked. NOT tested for real: Telegram, Discord and Buttondown, a paid `guide`, Urdu text from the model (`URDU_ENABLED=true` is off by default), and the extension (syntax-checked, not loaded in Chrome).
- 2026-11-10: Known limits. Language pages exist only for languages in the latest week, so old language URLs stop working (marked `shortcut:` in the code). Similar repos use only repos from ranked weeks. `process.exit` became `process.exitCode` in `lib/logger.js` after a Windows crash on failure.
- 2026-11-10: Testing checklist run. All 12 scripts with a dry run write nothing (md5 of data, public, src, scripts and docs unchanged); 14 bad-input cases exit 1; no script tags without src in the 31 built pages; no secrets in the working tree or history; no horizontal overflow at 390 on any page. The RSS feed passes a local structure check (well-formed, RSS 2.0 elements, unique guids, RFC 822 dates) but has NOT been through the W3C validator, so that box stays open until the site is live.
- 2026-11-10: Finish review of the Phase 2 to 4 pages (impeccable, two rounds). Round 1 found eight material issues (controls inherited label type, placeholder and checkbox, tap targets, compare table on phones, repo page week label and chart finish, crowded home first viewport, six-item nav wrapping, unstyled health result); all fixed. Round 2 scored seven resolved and one partial: the Urdu summary lost its disclosure triangle, fixed with a drawn chevron and checked in my own captures (closed, open, empty input, Checking state, bad input), not by a third review. Changes from the review: the in-page language select was removed (language is plain links to /language pages, so it needs no script) and the beginner-only checkbox is the only JS filter; the masthead nav is four items with API, Feed and Dead or alive? in the footer. DESIGN.md refreshed for the new type steps and the Urdu and code font fallbacks.
- 2026-11-10: Phase 5 built. Star check: `lib/starcheck.js` (pure, 5 unit tests in `tests/`) and `stars.js`, tested against a mock GitHub server: a repo with 60 percent new empty accounts is flagged `suspicious`, normal repos are `normal`, a repo that fails is skipped, a low rate limit skips with exit 0, a dry run writes nothing. Rising: `lib/breakout.js` and `rising.js`, tested on the fixtures (two new fixture repos: one accelerating, one steady): only the accelerating one qualifies; thin history writes an empty list with a reason; bad input exits 1. Site: star-check label and note on cards, `/rising/` page, API and About text, `rising.json` and `star_check` in the public files, nav is This week, Rising, Archive, Compare (About moved to the footer).
- 2026-11-10: NOT tested for real: the star check against real GitHub stargazers (the 20 and 40 percent cut-offs are guesses and need calibrating on real weeks), rising on real snapshots, and the new daily deploy job on GitHub. The star check needs `GH_PAT`; with the built-in token it skips.

- 2026-11-10: Summaries and guide now use the free OpenRouter API (plain fetch in `scripts/lib/claude.js`, key `LLM_API_KEY`, model `LLM_MODEL`, default `gemini-3.8-flash` not checked against Google's current list). The Anthropic SDK was removed. Tested against a mock server (429 wait, bad-JSON retry, key header). Not yet run against the real API.
- 2026-11-10: Gemini was dropped (busy servers, empty replies). Summaries and the guide now use any OpenAI-style chat API through `scripts/lib/claude.js`: secret `LLM_API_KEY`, optional `LLM_MODEL`, `LLM_API_BASE`; default is OpenRouter (`nvidia/nemotron-3-ultra-550b-a55b:free`, workflow also accepts the secret name NVIDIA_API_KEY). Tested against a mock server only.
- 2026-11-11: Contribute page added. `scripts/issues.js` (daily, after `rising`) collects open good-first-issue and help-wanted tickets from every ranked repo plus a wider set of small active repos found by language, into `data/issues.json`; `feeds.js` copies it to `/api/issues.json`. `/contribute/` matches a visitor's typed skills in their browser (nothing sent anywhere, skills kept only in localStorage). Real run found 248 tickets in 36 repos; the 10 ranked repos alone had 1, so the wider list is what fills the page. Tests: mock GitHub for the collector, pure tests for the matcher. Matching is keywords only, no AI.
- 2026-11-11: Skills page added. `scripts/skills.js` (daily) searches GitHub topics (agent-skills, claude-skills, and three more), keeps repos that really hold SKILL.md files (git tree check, cached by push time), saves daily star counts in `data/skills-history.json`, ranks by stars gained over up to 30 days (total stars until 3 days of history exist), reads skill names and descriptions for the top 30, and writes AI summaries for the top 10 (needs LLM_API_KEY, skipped without it). `/skills/` shows the top 10 and a browser-side finder over all tracked repos. Real run: 948 found, 279 kept. Agent labels are guessed from name, description, topics and skill paths. Tests: helpers, collector against a mock GitHub, finder matching.

# CLAUDE.md

Read this file first, then PLAN.md, ARCHITECTURE.md, DATA_SPEC.md and TASKS.md. Start coding from TASKS.md, top to bottom. Don't ask for permission on anything that is already decided in these files.

## What this project is

RepoWeekly (working name, can be renamed) is a free, non-commercial website that shows the top 10 trending GitHub repositories of the week. Each repo gets a plain-language explanation of what it is and why it's trending. The goal is to help developers, students and beginners find good open-source projects. No ads, no paywall, no monetization.

The site is static. A scheduled GitHub Action collects data, ranks repos, generates AI summaries, and rebuilds the site.

## Stack (decided, don't revisit)

- Node.js 20+, ES modules, plain JavaScript (no TypeScript for now)
- Astro for the static site
- Chart.js for star-history graphs
- GitHub REST API (Octokit is fine, or plain fetch)
- an OpenAI-style chat API (plain fetch, NVIDIA free tier by default) for summaries
- GitHub Actions for scheduling
- Hosting: Cloudflare Pages or GitHub Pages (build output in /dist)
- Storage: JSON files committed to /data. No database in v1.

## Folder layout

```
/scripts        data pipeline (Node scripts, run by Actions or locally)
/scripts/lib    shared helpers (github client, scoring, cache, logger)
/data           committed JSON: snapshots, weeks, summaries, tracked set
/fixtures/data  small fake dataset with the same layout as /data, for local runs
/src            Astro site (pages, components, layouts)
/public/js      external JS files used by pages (charts, filters)
/.github/workflows   cron workflows
```

## Working rules

1. Additive changes only. Add new files and functions. Don't rewrite or restructure working code unless a task in TASKS.md says to. If something must change, make the smallest edit and say why.
2. External JS files only. No inline `<script>` blocks with logic in pages. Put browser code in /public/js and load it with a script tag. Pipeline code lives in /scripts.
3. Console-based debugging. Use clear `console.log` / `console.error` with a `[step]` prefix in every script (for example `[collect] fetched 87 repos`). Every script prints what it did and a final summary line. No debugger-only workflows.
4. Never hardcode secrets. Read `GITHUB_TOKEN` and `LLM_API_KEY` from environment variables. In Actions, `GITHUB_TOKEN` is filled from the `GH_PAT` secret (see ARCHITECTURE.md). Provide `.env.example`. Never commit `.env`.
5. Every script must be runnable locally with `node scripts/<name>.js` and support a `--dry-run` flag that writes nothing and calls no paid API. Data paths come from `DATA_DIR` (default `data`), so `DATA_DIR=fixtures/data` runs any script against the fixtures.
6. Fail loudly. If data is missing or an API response looks wrong, exit non-zero. Never publish a week with fewer than 10 ranked repos or with empty summaries.
11. Weeks are named by the ISO week they cover, not the week they are published in (see DATA_SPEC.md).
7. Be polite to APIs: respect rate limits, back off on 403/429, add a small delay (about 300 ms) between search calls.
8. Keep dependencies few. Ask yourself whether a package is really needed before adding it.
9. Write short comments that explain why, not what.
10. Plain, direct writing in all site copy and docs. No filler, no hype words.

## Commands to set up

```
npm init -y
npm i astro chart.js
```

Add these npm scripts:

- `collect` → `node scripts/collect.js`
- `snapshot` → `node scripts/snapshot.js`
- `rank` → `node scripts/rank.js`
- `summarize` → `node scripts/summarize.js`
- `build:data` → runs rank, summarize, stars, feeds, then avatars
- `feeds` → `node scripts/feeds.js`
- `bootstrap` → `node scripts/bootstrap-trending.js`
- `guide` → `node scripts/guide.js`
- `stars` → `node scripts/stars.js`
- `rising` → `node scripts/rising.js`
- `test` → `node --test` (unit tests in `tests/`)
- `notify` → `node scripts/notify.js`
- `vendor` → copies Chart.js into `public/js/vendor` (runs before `dev` and `build`)
- `validate` → `node scripts/validate.js`
- `dev` → `astro dev`
- `build` → `astro build`

## Design tools (for the Astro site tasks)

The `impeccable` plugin and the `design-taste-frontend` skill (in `.claude/skills/`) are installed. Use `impeccable` for design work on the site: layout, cards, dark mode, polish and critique. Use `design-taste-frontend` as a second opinion on the look.

They do not override the working rules above. Where they disagree, these rules win: plain copy with no hype words, no inline `<script>` logic, few dependencies, no tracking, no stock hero photos or decorative effects. Record the design system in `DESIGN.md` when the home page is done.

## Definition of done for any task

- Script or page runs without errors locally.
- Console output shows what happened.
- Dry run works.
- The matching checkbox in TASKS.md is ticked.
- A one-line note is added to the "Log" section at the bottom of TASKS.md.

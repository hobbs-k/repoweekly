# RepoWeekly

A free website that shows the top 10 trending GitHub repositories of the week, with a plain-language explanation of each one. No ads, no paywall, no tracking.

A scheduled GitHub Action collects data, ranks repos, writes summaries with the free OpenRouter API, and rebuilds a static Astro site. Data lives as JSON files in `/data`. Read `docs/CLAUDE.md` first, then the other files in `docs/`.

## Run locally

Needs Node 20 or newer.

```
npm install
cp .env.example .env     # fill in GITHUB_TOKEN and LLM_API_KEY
node scripts/lib/github.js   # prints your remaining GitHub rate limit
```

Every script supports `--dry-run`. Scripts read and write `DATA_DIR` (default `data`).

### Try the site without real data

`fixtures/data` is a small fake dataset. Work on a copy so the originals stay clean:

```
cp -r fixtures/data /tmp/rw-data          # any folder outside the repo
export DATA_DIR=/tmp/rw-data
node scripts/rank.js --offline --week 2026-W45
```

`rank.js --offline` makes no GitHub calls and fills placeholder text. Summaries then need either `LLM_API_KEY` or a hand-edited week file. The site build refuses any week without summaries.

```
npm run feeds && npm run dev
```

### Real data

```
npm run bootstrap        # reads the trending page (first weeks only)
npm run collect
npm run snapshot         # run daily; rank needs 7 snapshots, or a bootstrap file
npm run build:data       # rank, summarize, star check, feeds, avatars
npm run rising           # the daily breakouts (needs 5 daily snapshots)
npm run issues           # open good-first-issue tickets for the Contribute page (daily)
npm test                 # unit tests
npm run guide            # optional: the weekly "Learn from this repo" guide
npm run validate
npm run build            # also copies Chart.js into public/js/vendor
```

## Hosting: GitHub Pages

The weekly workflow deploys to GitHub Pages. One-time setup in the repository settings:

1. Settings > Pages: set the source to **GitHub Actions**.
2. Settings > Secrets and variables > Actions > **Secrets**: add `LLM_API_KEY` and `GH_PAT` (a fine-grained personal token with public read access; the built-in token is too limited for the daily snapshot).
3. Same page > **Variables**: add `SITE_URL`, the public address, for example `https://your-name.github.io/repoweekly`.
4. Run **Weekly build** once by hand from the Actions tab.

Optional secrets for the weekly post (each channel is skipped when its secrets are missing):

- Telegram: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- Discord: `DISCORD_WEBHOOK_URL`
- Email through Buttondown: `BUTTONDOWN_API_KEY` (this sends to your subscribers, so set it last)

Urdu summaries are off by default. Set `URDU_ENABLED=true` in the workflow environment to add them.

The daily workflow collects and snapshots at 02:00 UTC. The weekly workflow runs on Mondays at 04:00 UTC and only deploys if the week passes validation.

## Pages

Home (this week), `/rising/` (repos speeding up, updated daily), `/contribute/` (open tickets matched to your skills, in your browser), `/weeks/` archive and one page per week, `/repo/owner/name/` with a star-history chart, `/language/<name>/`, `/compare/`, `/health/` ("Dead or alive?"), `/about/`, `/api-docs/`, `/feed.xml` and the JSON files under `/api/`.

## Browser extension

`extension/` shows a RepoWeekly badge on GitHub repository pages. Set your site address in two files first. See `extension/README.md`.

## Design

The site follows `PRODUCT.md` and `DESIGN.md` (Impeccable). The look is a pocket tide table: one variable font (Archivo, self-hosted through `@fontsource-variable/archivo`), a chart-blue palette, and no scripts.

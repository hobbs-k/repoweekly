# PLAN.md

## Goal

A free website that tells people which GitHub repos are really taking off this week, explains each one in plain language, and keeps a history so trends can be compared over time. Built for the community, not for money.

## Audience

- Working developers who want to keep up without scrolling GitHub
- Students and beginners looking for projects they can learn from or contribute to
- South Asian developers who would like summaries in Urdu

## What exists already (so we don't just copy it)

Trendshift, gh-trends, Open Source Radar, GitHub Explore newsletter, and many scrapers of the trending page. Most of them show a list with star counts. Few explain why a repo is trending, and almost none keep a clear history or help beginners. That's our gap.

## Principles

- Trend = star growth over the week, not total stars.
- Show real signals (license, activity, issues), not just hype.
- Explain in plain words. A beginner should understand each card.
- Everything is open: public JSON, RSS, and the code.
- Cheap to run. Target cost close to zero.

## Phase 1: MVP (a weekend)

Deliver a working site with this week's top 10.

- Collect candidate repos from the GitHub Search API
- Rank by weekly star growth
- Bootstrap week-one growth from the github.com/trending weekly page ("stars this week"), because we have no history yet
- AI summary per repo (English)
- Static Astro site: home page with top 10, repo cards, about page
- RSS feed and `latest.json`
- Weekly GitHub Action that rebuilds and deploys

## Phase 2: Useful filters and history

- Daily snapshot job that stores star counts for tracked repos
- Growth computed from our own snapshots (replaces the scraper bootstrap)
- Weekly archive: `/weeks/2026-W45` pages, plus an archive index
- Language and topic filters
- Quality signals on each card: license, last commit, open issues, contributors, good-first-issue count
- Spike warning when one day holds most of the weekly gain
- Star history chart per repo (Chart.js)

## Phase 3: Community features

- Hidden gems section (under 500 total stars, strong growth)
- Beginner-friendly tag and difficulty label
- Urdu summaries
- Similar and alternative repos on each repo page
- Compare two repos side by side
- Public API docs page (static JSON under `/api/`)

## Phase 4: Reach

- Email digest via Buttondown or Resend (free tier)
- Telegram channel post and Discord webhook, sent from the weekly Action
- "Learn from this repo" weekly mini guide for one featured project
- Browser extension that shows the trend score on any GitHub repo page
- "Dead or alive?" health score for any pasted repo URL

## Ranking rules (v1)

1. Candidate pool: repos pushed in the last 7 days with at least 50 stars, plus repos created in the last 30 days with at least 20 stars. Pull several pages from the search API per query.
2. Exclude: archived repos, forks, repos with no description and no README, awesome-list style repos when the filter flag is on, and repos on a small blocklist file (`data/blocklist.json`).
3. Score = stars gained in 7 days. Tie-break by number of unique days with gains, then by total stars (lower total wins, to surface newer projects). In bootstrap mode there are no daily gains, so skip the first tie-break.
4. Spike flag: if more than 70 percent of the weekly gain came in one day, mark `spike: true`. Still ranked, but the card shows a note. In bootstrap mode `spike` is `null` (unknown) and the card shows no note.
5. Hidden gems: total stars under 500 and weekly gain at least 40. Top 5 by gain.

## Risks and answers

- GitHub has no official trending API → we compute our own from snapshots, scraper only for bootstrap and cross-check.
- Star farming and fake spikes → spike flag, plus a manual blocklist.
- AI summary mistakes → summaries come only from README and metadata we fetched, the prompt forbids guessing, and each card links to the repo.
- Rate limits → personal token (`GH_PAT`, 5,000 requests per hour), delays, caching, and a cap on the tracked set size. See ARCHITECTURE.md.
- Cost → summarize only repos in the weekly top 10 plus 5 gems, cache by README hash.

## Success checks

- Weekly job runs with no manual step for four weeks in a row
- Site loads fast and passes basic Lighthouse checks
- Each week has 10 ranked repos, all with summaries
- Someone outside the project subscribes to the RSS feed

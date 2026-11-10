# Product

<!-- impeccable:product-schema 1 -->

> Inferred from docs/CLAUDE.md, docs/PLAN.md, docs/ARCHITECTURE.md and docs/DATA_SPEC.md. The user asked to proceed without an interview, so nothing here was confirmed in conversation. Items marked (assumed) are inference.

## Platform

web

## Stack

Astro, static output in `/dist`, plain JavaScript, Chart.js for charts. Decided in docs/CLAUDE.md. Browser code lives in `/public/js`; no inline script logic.

## Users

- Working developers who want to keep up with open source without scrolling GitHub.
- Students and beginners looking for projects to learn from or contribute to.
- South Asian developers who would like Urdu summaries (Phase 3).

They arrive once a week, or from the RSS feed, and scan ten entries to decide which repos are worth opening.

## Product Purpose

A free, non-commercial site showing the top 10 trending GitHub repositories of the week, each explained in plain language, with a history so weeks can be compared. Success: a beginner understands each card, and someone outside the project subscribes to the feed.

## Positioning

Most trending sites list repos with star counts. RepoWeekly ranks by stars gained over the week, says in plain words what each repo is and why it is likely trending, shows honest signals (license, last push, issues, contributors, good-first-issues), flags one-day spikes, and keeps a public archive, JSON API and RSS feed.

## Operating Context

Data comes from GitHub (search API, own daily snapshots, trending page for bootstrap). A weekly GitHub Action ranks, writes AI summaries from the README only, and rebuilds the static site. Pages read JSON from `/data` at build time. No server, no database, no client-side calls to GitHub.

## Capabilities and Constraints

- Home: top 10 cards, hidden gems section. Later phases: archive, repo pages with star-history chart, language filters, Urdu toggle, compare page.
- Each card shows: name, owner avatar, one-line description, language, weekly stars gained, total stars, short "why trending" text, tags, signal badges, spike note when `spike` is true.
- Bootstrap weeks have no daily gains: hide the chart and the spike note.
- No ads, no paywall, no tracking scripts, no monetization.
- Summaries come only from the README and metadata; the card links to the repo so readers can check.

## Brand Commitments

- Name: RepoWeekly (working name, may be renamed; keep it easy to change).
- Voice: plain and direct. Short sentences. No filler, no hype words ("revolutionary", "game-changing").
- Everything is open: public JSON, RSS, code. Public JSON carries a license note.

## Evidence on Hand

- Real pipeline output exists only as synthetic fixtures (`fixtures/data`, owners start with `fx-`). Descriptions there are placeholders.
- No logo, no testimonials, no user numbers. Do not invent any.
- Urdu text is not generated yet.

## Product Principles

- Trend means growth over the week, not total stars.
- Show real signals next to the hype, and mark uncertainty (spike, bootstrap week).
- A beginner should understand every card without opening the repo.
- Cheap and open: static files, no accounts, nothing to track.
- Content leads; the interface stays out of the way.

## Accessibility & Inclusion

Accessible and mobile first, light and dark mode (docs/ARCHITECTURE.md). Target WCAG 2.1 AA (assumed). Urdu is right-to-left, so layout must tolerate RTL text blocks when that phase arrives (assumed).

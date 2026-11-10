# DATA_SPEC.md

All data files are JSON, UTF-8, two-space indent, committed to git.

## Week naming

A week is named by the ISO week it covers, not the week it is published in. The Monday run on 2026-11-09 ranks Monday 2026-11-02 through Sunday 2026-11-08, which is ISO week `2026-W45`. Use ISO week-numbering years (`2026-W01` can start in late December 2025). All week math lives in `scripts/lib/weeks.js`.

## data/tracked.json

```json
{
  "updated": "2026-11-09",
  "repos": {
    "owner/name": {
      "first_seen": "2026-11-02",
      "last_in_top200": "2026-11-09"
    }
  }
}
```

- `first_seen`: set by collect.js when a repo first enters the tracked set.
- `last_in_top200`: set by rank.js. After scoring, every repo in the top 200 by weekly gain gets the date of that run. In bootstrap mode, repos on the bootstrap list count as top 200. `null` until a repo first makes the top 200.
- collect.js drops a repo when both `first_seen` and `last_in_top200` (if set) are more than 30 days old. This gives new repos a 30-day grace period.

## data/snapshots/YYYY-MM-DD.json

```json
{
  "date": "2026-11-09",
  "repos": {
    "owner/name": {
      "stars": 12034,
      "forks": 540,
      "open_issues": 38,
      "pushed_at": "2026-11-08T21:14:00Z",
      "created_at": "2026-09-30T10:00:00Z",
      "language": "Python",
      "license": "MIT",
      "topics": ["ai", "agents"],
      "archived": false,
      "fork": false
    }
  }
}
```

`date` is the end of that day (UTC). A run at 02:00 UTC on 2026-11-09 writes `2026-11-08.json`, so the daily gain for a day is that snapshot minus the one before it. A week needs 8 snapshots: the Sunday before it, then Monday to Sunday. Seven of 8 are accepted if both ends exist; a missing middle day folds its gain into the next present day. A repo missing from early snapshots counts as 0 stars before its creation date.

## data/bootstrap/YYYY-Www.json

```json
{
  "week": "2026-W45",
  "source": "github.com/trending?since=weekly",
  "fetched": "2026-11-09T04:00:00Z",
  "repos": [
    { "full_name": "owner/name", "stars_this_week": 5356, "language": "Python" }
  ]
}
```

## data/weeks/YYYY-Www.json

```json
{
  "week": "2026-W45",
  "start": "2026-11-02",
  "end": "2026-11-08",
  "generated": "2026-11-09T04:10:00Z",
  "growth_source": "snapshots",
  "license": "Data is free to use. A link back to RepoWeekly is appreciated.",
  "top": [
    {
      "rank": 1,
      "full_name": "owner/name",
      "url": "https://github.com/owner/name",
      "avatar": "https://avatars.githubusercontent.com/u/123?v=4",
      "description": "Short description from GitHub",
      "language": "Python",
      "topics": ["ai"],
      "stars_total": 12034,
      "stars_gained": 5356,
      "daily_gains": [120, 300, 900, 1500, 1200, 800, 536],
      "spike": false,
      "signals": {
        "license": "MIT",
        "last_push": "2026-11-08",
        "open_issues": 38,
        "contributors": 22,
        "good_first_issues": 4,
        "age_days": 40
      },
      "summary": {
        "what_it_is": "One or two plain sentences.",
        "why_trending": "One or two sentences, based only on supplied text.",
        "who_its_for": "One short sentence.",
        "beginner_friendly": true,
        "difficulty": "easy",
        "tags": ["ai", "cli"],
        "urdu": "Urdu version of what_it_is and why_trending, 2 to 3 sentences."
      }
    }
  ],
  "gems": []
}
```

Notes:
- `growth_source` is `"snapshots"` or `"bootstrap"`. If `"bootstrap"`, `daily_gains` is an empty array, `spike` is `null`, and the site hides the history chart and spike note for that week.
- `spike` is `true`, `false`, or `null` (unknown, bootstrap only).
- `urdu` is optional. summarize.js adds it only when `URDU_ENABLED=true` (Phase 3). Validation must not require it.
- `gems` uses the same item shape, up to 5 items.
- `difficulty` is one of `easy`, `medium`, `hard`.
- `summary` is absent until summarize.js runs. The weekly build fails if any ranked item lacks it.

## data/readmes/owner__name.md (not committed)

The README trimmed to about 6000 characters. rank.js writes it, summarize.js reads it in the same workflow run. It is in `.gitignore`. Fixtures commit their own copies under `fixtures/data/readmes/`.

## data/summaries/owner__name.json (cache)

```json
{
  "readme_hash": "sha1-of-trimmed-readme",
  "generated": "2026-11-09T04:12:00Z",
  "model": "value of ANTHROPIC_MODEL",
  "summary": { }
}
```

## data/latest.json

```json
{ "week": "2026-W45", "path": "weeks/2026-W45.json" }
```

## data/blocklist.json

```json
{ "repos": ["owner/name"], "reasons": { "owner/name": "star farming" } }
```

## Summary prompt contract

System rules for the summarize step:

- Use only the README text and metadata provided. If something is not in them, leave it out.
- Write short sentences. No hype words like "revolutionary" or "game-changing".
- `what_it_is`: what the project does, in plain words a student can follow.
- `why_trending`: a likely reason based on the supplied text (new release, new feature, a topic that is hot). If the text gives no clue, say "No clear reason in the project's own text."
- `beginner_friendly`: true only if the README has setup steps and the project has good-first-issue labels or a contributing guide.
- Return one JSON object that matches the `summary` shape above, with no extra text.

## Public API (static files)

- `/api/latest.json` same as the latest week file
- `/api/weeks/YYYY-Www.json`
- `/api/index.json` an object: `{ license, weeks: [{ week, path }] }`, newest first
- `/feed.xml` RSS

All public JSON must include a `license` note: data is free to use, link back appreciated.

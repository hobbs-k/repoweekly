# RepoWeekly design

Retro terminal. A weekly printout from an old computer lab, built to feel like a tool for developers and students.

## Look
- **Screen:** dark phosphor by default (`--ground` near black green, `--phos` bright green, `--mark` amber for peaks, spikes and warnings). A cream "paper" version follows the system's light setting. No toggle, no script.
- **Type:** VT323 for the name, page titles and big rank numerals; JetBrains Mono for labels, tags, tables and buttons; Archivo for reading text. All self-hosted through `@fontsource`.
- **Shapes:** square corners, 2px frames, hard offset shadows (no blur), dashed rules.
- **Masthead:** the name with a blinking caret, then a menu bar like an old DOS program (F1 to F4 hints).
- **Repositories** are small windows: a title bar (`rank-01.log`), a big glowing rank, summary lines marked with `>`, tags as bordered chips, and an LED-style meter per day.
- **Headings** read like comments: `// HIDDEN GEMS`, `## HOW IT WORKS`.
- **Status window** beside the home page opening on wide screens.

## Motion
Blinking caret, meters filling in steps, windows stepping in on load, hard-shadow lift on hover and press on click. All of it stops for `prefers-reduced-motion`. Faint scanlines in dark mode only.

## Rules that stay
- `public/js/history-chart.js` reads `--font`, `--ink-soft`, `--bar`, `--mark` and `--rule`. Keep those names.
- Text contrast on both screens; tap targets at least 44px; focus ring in amber.
- The Urdu text keeps `lang="ur"` and `dir="rtl"`.

The older "pocket tide table" brief in `PRODUCT.md` and `.impeccable/` still describes the audience and voice; its colour and type choices are replaced by this file.

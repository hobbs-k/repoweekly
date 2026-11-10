---
name: RepoWeekly
description: A pocket tide table of the week's ten fastest-growing GitHub repositories.
colors:
  ground: "#e3eef3"
  ink: "#0c2236"
  ink-soft: "#3f5668"
  rule: "#9db5c3"
  bar: "#4a7389"
  mark: "#b0105f"
  mast-bg: "#0c2236"
  mast-fg: "#e3eef3"
  mast-mark: "#ff7db4"
  ground-dark: "#0a1826"
  ink-dark: "#dce9f0"
  ink-soft-dark: "#9fb6c6"
  rule-dark: "#2a4256"
  bar-dark: "#5e8da6"
  mark-dark: "#ff7db4"
  mast-bg-dark: "#040c14"
  tick: "#8d9ca7"
  tick-dark: "#5e6c77"
typography:
  display:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "6rem"
    fontWeight: 800
    lineHeight: 0.8
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2.25rem, 7vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.25rem, 3.4vw, 1.625rem)"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: "0.06em"
  rank-tablet:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "4.25rem"
    fontWeight: 800
    lineHeight: 0.8
    letterSpacing: "-0.01em"
  rank-phone:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  rank-gem-wide:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  rank-gem-tablet:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  rank-gem-phone:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  brand-max:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.03em"
  section-head:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.03em"
  section-head-reading:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "0.03em"
  weeks-label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1.6
  body-small:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  control:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label-large:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: "0.06em"
  meta:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: "0.06em"
  label-run:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.6
    letterSpacing: "0.07em"
  urdu:
    fontFamily: "Noto Nastaliq Urdu, Segoe UI, Tahoma, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 2
  code:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: "0"
spacing:
  gutter: "clamp(1rem, 4vw, 2rem)"
  entry-y: "1.75rem"
  section-gap: "3rem"
  measure: "66ch"
components:
  masthead:
    backgroundColor: "{colors.mast-bg}"
    textColor: "{colors.mast-fg}"
    padding: "1rem 0 0.5rem"
  entry:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1.75rem 0"
  note:
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.7rem"
  tide-bar:
    backgroundColor: "{colors.bar}"
    height: "0.4rem"
  tide-bar-peak:
    backgroundColor: "{colors.mark}"
    height: "0.4rem"
---

# Design System: RepoWeekly

## Overview

**Creative North Star: "The Pocket Tide Table"**

A weekly ranking is a table of daily values, so the site reads like a page from a nautical almanac rather than a feed of cards. Pale shallow-water blue ground, chart-ink navy text, and a single chart magenta for whatever needs attention. One variable grotesk does everything, switching between condensed caps for structure and normal width for reading. Surfaces are flat and ruled: hairlines, double rules and dotted row dividers do the work that shadows and boxes do elsewhere.

Density is moderate and content leads. Each repository is a ruled row with a huge condensed rank numeral, a 66ch reading column, and a seven-day tide strip with signals on wide screens. Light and dark follow the system setting; there is no toggle and no script.

**Key Characteristics:**
- Flat, ruled, square: no shadows, no radii, no cards.
- One typeface, expressed through the width axis (62% to 100%).
- Tabular figures everywhere (set on body).
- Magenta is the only alert colour and appears on peaks, focus, notices and hover.
- One motion: the tide-bar entrance.

## Colors

Admiralty-chart palette: cool blue-greys with a deep navy ink and one magenta mark. Dark mode is a night chart, not an inversion: navy ground, chalk ink, softened pink mark.

### Primary
- **Chart Magenta** (`{colors.mark}`; dark: `{colors.mark-dark}`): spikes, peak bars and values, focus ring, hover on links, selection, notice borders.

### Secondary
- **Tide Slate Blue** (`{colors.bar}`; dark: `{colors.bar-dark}`): the daily bars in the tide strip.

### Neutral
- **Shallow Water** (`{colors.ground}`; dark `{colors.ground-dark}`): page ground.
- **Chart Ink** (`{colors.ink}`; dark `{colors.ink-dark}`): text, heavy rules, week total rule.
- **Faded Ink** (`{colors.ink-soft}`; dark `{colors.ink-soft-dark}`): descriptions, owner prefix, labels, signal captions.
- **Hairline Blue** (`{colors.rule}`; dark `{colors.rule-dark}`): row rules, dotted day dividers, avatar border, meta slashes.
- **Masthead Navy** (`{colors.mast-bg}`; dark `{colors.mast-bg-dark}`) with **Masthead Chalk** (`{colors.mast-fg}`) and **Masthead Pink** (`{colors.mast-mark}`): the masthead band, its double rule, current-page underline, and focus ring inside it.
- **Scale Tick** (`{colors.tick}`; dark `{colors.tick-dark}`): the quarter ticks and right edge of each tide track. Defined in CSS as 40% ink mixed into ground (`--tick`); the hex values here are that mix resolved.

### Named Rules
**The One Mark Rule.** Magenta is the only colour that means "look here". If everything is marked, nothing is: peaks and notices only.

**The Own Frame Rule.** The masthead is always dark navy, in both schemes. It is the frame the world owns.

## Typography

**Display, Body and Label Font:** Archivo Variable (self-hosted via @fontsource-variable/archivo; fallbacks ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif)

**Script and code fallbacks (sanctioned, not second voices):** Urdu text (`lang="ur"`, `dir="rtl"`) falls back to the system Noto Nastaliq Urdu (then Segoe UI, Tahoma, serif); it is not self-hosted. The API page's code block and inline code use the system monospace stack led by Cascadia Mono. All Latin text stays in Archivo.

**Character:** A variable grotesk used like a chart legend. Condensed, heavy caps announce structure; normal-width regular text carries the reading.

### Hierarchy
- **Display** (800, 62% width, 6rem at 64rem+, 4.25rem at 44rem+, 2.75rem on phones, line-height 0.8 to 1): rank numerals only. On phones the rank sits inline beside the name. Gem ranks (G1 to G5) are gem-sized: 3.5rem / 3rem / 2.25rem by the same breakpoints.
- **Headline** (800, 70% width, clamp 2.25rem to 3.75rem, 1.02, max 22ch, balanced): page h1.
- **Section title** (800, 70% width, 1.75rem, uppercase, 0.03em): section headings (1.5rem on reading pages). The health verdict heading is 1.75rem, not uppercase. Weeks archive labels are 1.375rem at 75% width, 800.
- **Title** (700, 88% width, clamp 1.25rem to 1.625rem, 1.15): repo name; the owner prefix is weight 400 in Faded Ink.
- **Body** (400, 100% width, 1rem, 1.6, 66ch measure): lede, entry text. Body-small is 0.9375rem: notices, tables, filter status, footer. Form controls are 1rem regular, normal width, no transform.
- **Label** (600, 75% width, 0.75rem to 0.9375rem, 0.06 to 0.08em, uppercase): nav (0.9375rem), toolbar links (0.875rem), form labels and meta line (0.8125rem), day names, signal captions and table heads (0.75rem), inline run-ins and the Urdu toggle (700, 0.75rem). The Learn from this repo sub-heads are 1rem, 800, 0.05em.
- **Urdu text** (400, 1.125rem, line-height 2): Nastaliq needs the tall line.
- **Code** (400, 0.8125rem in the block, 0.9em inline, 1.5): API page only.
- **Masthead brand** (800, 62% width, clamp 1.75rem to 2.5rem, uppercase, 0.03em).

### Named Rules
**The Width Axis Rule.** Hierarchy comes from width and weight on the one family: narrower means more structural. Do not add a second typeface.

**The Tabular Rule.** Figures are always tabular so columns of numbers align like a printed table.

## Layout

A centred wrap up to 76rem with a fluid gutter (clamp 1rem to 2rem, 4vw). Reading text caps at 66ch. Entries are a CSS grid that changes at 44rem and 64rem: phones stack with the rank inline beside the name; tablets use a 4.5rem rank column; wide screens use rank (7rem), reading column, and a 22rem figures column holding the tide strip and a three-column signals grid. Vertical rhythm: 1.75rem inside entries, 3rem before sections and the footer, 2.5rem page top padding. Pages are a flex column so the footer sits at the bottom. A skip link is provided. Links and controls aim for 2.75rem (44px) targets through vertical padding or min-height. Tables cap at 40rem (history) and 52rem (compare); code at 52rem. The weeks archive row is a grid of 14rem, 14rem and the rest from 44rem. The toolbar (Languages links, beginner checkbox) is a wrapping flex row with a 2rem gap.

## Elevation & Depth

None. Depth is conveyed by rules: a 4px double rule under the masthead, over section heads and over the footer; 1px solid row rules between entries; dotted rules between days; a 2px solid rule over the week total. No shadows, no blur.

### Named Rules
**The Rule Not Shadow Rule.** Separation is a ruled line. A weight of rule (hairline, dotted, 2px, double) marks the level of the division.

## Shapes

Square throughout: zero radii, 1px borders. Avatars are 2.5rem squares with a hairline border (a monogram box when no image exists). Notices are 1px magenta-bordered rectangles. The tide scale is an open channel: left and right end ticks and quarter ticks drawn by a 25%-repeating gradient, with a 0.4rem bar inside a 0.8rem track.

## Components

### Masthead and Navigation
Dark navy band with condensed uppercase brand left, uppercase 75%-width nav right (This week, Rising, Archive, Compare; About, API, the RSS feed and Dead or alive? sit in the footer), ending in a 4px double Masthead Pink rule. Links are undecorated; hover turns Masthead Pink; the current page is underlined 2px in Masthead Pink.

### Repository Entry
A ruled list item: rank numeral, avatar plus name, description in Faded Ink, three run-in paragraphs (What it is, Why it is trending, Who it is for), a slash-separated uppercase meta line, then the figures column.

### Tide Table
One row per weekday: day label, bar track on a ruled scale (zero baseline at the left edge, quarter ticks, right edge tick), right-aligned figure; dotted dividers between rows; a ruled week total in the footer row. The peak day on a spike week turns magenta in bar, label and value and the figure gains "(spike)"; a magenta-bordered note explains it. Weeks without daily data show the week total and a muted line instead. Bars enter with a scaleX tide animation (0.8s, cubic-bezier(0.16, 1, 0.3, 1), 60ms stagger per row, backwards fill), only under prefers-reduced-motion: no-preference; bars are fully visible without it.

### Signals
A three-column definition grid with hairline rules: caption label over value (license, last push, age, open issues, contributors, good first issues).

### Form Controls and Toolbar
Select and text input: 1rem regular, 2.75rem minimum height, square, 1px Faded Ink border, ground fill. Button: Chart Ink fill, ground text, condensed uppercase, 2.75rem tall; hover turns Chart Magenta. Checkbox: 1.25rem square, 1px Faded Ink border, fills Chart Magenta with a drawn tick when checked. The toolbar row holds the Languages links and the beginner checkbox.

### Week Archive and Lists
The weeks list is hairline-ruled rows where the whole row is the link (stretched pseudo-element). The similar-repositories list uses the same pattern. Weeks and history tables use 1px row rules and a 2px ink rule under the head.

### Star History Chart
Repo pages draw a Chart.js line: 2px Tide Slate Blue line, no points (magenta on hover only), no animation, Archivo Faded Ink labels, horizontal Hairline Blue rules only, redrawn on a scheme change.

### Compare and Health
The compare table is ruled rows; the higher count in a row is bold, never magenta. The health verdict opens with a 4px double rule and a 1.75rem heading, with ruled reason rows; magenta only for Probably dead and Archived.

### Urdu Details and Avatar
The Urdu toggle is a details row with a drawn chevron (a rotated border corner, no glyph icon) that turns down when open. The avatar is a 2.5rem square; with no image it becomes a monogram box (62% width, 800, 1.5rem, Faded Ink on a hairline border).

### Code Block
A 1px Hairline Blue ruled pre, 0.8125rem, scrolls horizontally, API page only.

### Links and Focus
Links inherit colour, underlined 1px with 0.2em offset; hover turns magenta. Focus is a 3px magenta outline at 2px offset (Masthead Pink inside the masthead).

## Do's and Don'ts

### Do:
- **Do** separate content with rules (hairline, dotted, 2px, 4px double), not boxes.
- **Do** reserve Chart Magenta for peaks, notices, focus and hover.
- **Do** keep figures tabular and mark uncertainty inside the figures themselves (spike, bootstrap week).
- **Do** express hierarchy through Archivo's width axis and weight; keep reading text at normal width and 66ch.
- **Do** keep Urdu in its sanctioned fallback and code in the system mono; Latin stays Archivo.
- **Do** make the whole row the link on list rows, and keep controls at 2.75rem minimum height.
- **Do** write both light and dark values for every colour token, following the system setting.

### Don't:
- **Don't** add shadows, rounded corners, or card containers.
- **Don't** introduce a second typeface or a theme toggle.
- **Don't** add hero blocks, metric tiles, or decorative motion beyond the tide-bar entrance; the chart does not animate.
- **Don't** use cream paper and serif editorial styling, or a card-grid trending list.

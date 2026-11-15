---
name: Signal Fire
description: Registered-mail evidence for who copies a country's news, and when
colors:
  postal-yellow: "#ffcc00"
  yellow-deep: "#f2b700"
  yellow-ink: "#3b2f00"
  ink: "#141414"
  ink-2: "#3d3d3a"
  ink-3: "#62625c"
  stock: "#ffffff"
  ground: "#e9eae6"
  hair: "#c9cac4"
  airmail: "#1d47b0"
  airmail-tint: "#e3e9f8"
  cancel: "#c8231b"
  cancel-tint: "#fbe5e3"
  post-green: "#0b6e3f"
  post-green-tint: "#e0f1e7"
  muted-stamp: "#6c6c66"
typography:
  display:
    fontFamily: "Barlow Condensed, Golos, Arial Narrow, sans-serif"
    fontSize: "clamp(52px, 7.4vw, 108px)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Barlow Condensed, Golos, Arial Narrow, sans-serif"
    fontSize: "clamp(40px, 5vw, 72px)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Barlow Condensed, Golos, Arial Narrow, sans-serif"
    fontSize: "clamp(24px, 2.4vw, 34px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0"
  body:
    fontFamily: "Barlow, Golos, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
  label:
    fontFamily: "Barlow Condensed, Golos, Arial Narrow, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
rounded:
  none: "0px"
  dot: "50%"
spacing:
  page: "clamp(16px, 4vw, 48px)"
  max: "1360px"
  cell: "18px 20px"
  section: "clamp(56px, 8vw, 112px)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.postal-yellow}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 22px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 22px"
    height: "52px"
  button-ghost-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.postal-yellow}"
  field:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "56px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "7px 11px"
  chip-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.postal-yellow}"
  label:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  label-head:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.postal-yellow}"
    typography: "{typography.label}"
    padding: "10px 16px"
  stamp-coordinated:
    textColor: "{colors.cancel}"
    typography: "{typography.label}"
    padding: "5px 9px 4px"
  stamp-organic:
    textColor: "{colors.post-green}"
  stamp-no-data:
    textColor: "{colors.muted-stamp}"
  nav-bar:
    backgroundColor: "{colors.postal-yellow}"
    textColor: "{colors.ink}"
    height: "64px"
---

# Design System: Signal Fire

## Overview

**Creative North Star: "The Registered-Mail Counter"**

Every copy of a story is treated as a forwarded letter: stamped with site, country and minutes-after-original, filed on ruled label stock, and sorted at a sorting-office counter. Postal yellow owns whole fields (top bar, hero, country header, footer); black ink rules everything into boxes; white label stock carries the evidence. The world refuses the dark threat-intel dashboard with a glowing globe. The one dark field is the sorting rack, an ink sheet of country pigeonholes.

Density is clerical and confident: flat, ruled, zero-radius boxes divided by 2px black rules, heavy condensed caps for signage, plain Barlow for reading, monospace only where a clerk would stamp a number. Ink is not perfect: postmarks pass through an SVG turbulence filter, stamps and slips sit a degree or two off square, and postmarks press in on arrival.

**Key Characteristics:**
- Yellow fields, black 2px rules, white label stock.
- Heavy uppercase condensed signage over a quiet sans body.
- Circular postmarks and rotated rubber stamps carry every verdict.
- Square corners everywhere; circles only for postmarks and route/step dots.
- Tabular numerals site-wide; mono reserved for times, lags, codes, URLs.

## Colors

A postal palette: one owning yellow, black ink, white stock, and three ink colours that each mean exactly one thing.

### Primary
- **Postal Yellow** (postal-yellow): fills whole fields: top bar, hero, country/story header, footer, cluster label heads, list hover, the yellow-on-ink button text. Not a highlight; a ground.
- **Deep Yellow** (yellow-deep): only the hazard-stripe of a rack cell still being built.
- **Yellow Ink** (yellow-ink): lede and summary text set on yellow, so black stays for headlines and strong text.

### Secondary
- **Airmail Blue** (airmail): mainstream/original coverage (main postmarks, main lane title) and the universal focus ring.
- **Cancellation Red** (cancel): the coordinated verdict and its evidence: copy postmarks, "Looks coordinated" stamps, added-phrase underlines, reason bullets, hot rack status. Also marks a failed build step.
- **Post Green** (post-green): the "Looks organic" verdict and organic postmarks only.
- Tints (airmail-tint, cancel-tint, post-green-tint) back inline evidence, e.g. the pink wash behind an added phrase.

### Neutral
- **Ink** (ink): text, every rule, primary buttons, label heads, the rack sheet.
- **Ink 2 / Ink 3** (ink-2, ink-3): secondary prose; mono metadata, placeholders, axis labels.
- **Label Stock** (stock): evidence surfaces: labels, slips, ledgers, fields.
- **Sorting Ground** (ground): page background between yellow fields; ledger header band.
- **Hairline** (hair): 1px row dividers inside a ruled box, never the box itself.
- **Muted Stamp** (muted-stamp): the "Not enough data" stamp.

### Named Rules
**The One Meaning Rule.** Blue is mainstream, red is coordinated copying, green is organic. None of them decorates; none crosses into another's verdict.

**The Yellow Field Rule.** Yellow is applied as a full-bleed field bounded by a 2px ink rule, never as a small accent chip on grey.

## Typography

**Display Font:** Barlow Condensed 600/700/800 (Golos for Cyrillic, Arial Narrow fallback)
**Body Font:** Barlow 400-700 (Golos for Cyrillic, system-ui fallback)
**Label/Mono Font:** JetBrains Mono, at .82em inline or 11.5-13px in metadata

**Character:** Sorting-office signage over a plain counter form. The condensed face is loud and uppercase; the body stays neutral so evidence reads cleanly.

### Hierarchy
- **Display** (800, clamp(52px,7.4vw,108px), 0.9, uppercase): the landing hero only. The country code goes larger still (clamp(88px,13vw,180px), 0.78) as a sorting code.
- **Headline** (800, clamp(40px,5vw,72px) section / clamp(34px,4vw,56px) page block, 0.92, uppercase): section and block headings.
- **Title** (700, clamp(24px,2.4vw,34px), 1, sentence case): story and narrative titles, which are real headlines and keep their own case. Route step and lane titles stay uppercase at 20-28px.
- **Body** (400, 17px / 16px under 680px, 1.55, tabular numerals): prose; intros 18-19px at max 40-44em; method prose 18.5px/1.62 at 46em.
- **Label** (800, 13-15px, 0.08-0.1em, uppercase): label heads, field labels, ledger headers, chips, stamps.
- **Figures** (800 condensed, 30-48px, 1): tallies, meta counts, gap stats, ledger counts.
- **Mono** (500, 11.5-13px): timestamps, minutes, routing codes, URLs, axis scales.

### Named Rules
**The Signage Case Rule.** Interface headings are uppercase condensed caps; quoted story headlines are never uppercased.

**The Clerk's Numbers Rule.** Mono only for times, lags, IDs and URLs. Counts are big condensed figures, not mono.

## Layout

Centred wrap at 1360px max with clamp(16px,4vw,48px) side padding. Sections breathe at clamp(56px,8vw,112px); page blocks at clamp(40px,6vw,72px). The hero is a 1.15fr/0.85fr two-column grid (headline, field and chips left; the specimen slip right). Data sits in ruled grids with zero gap: cells are separated by 2px ink borders, not whitespace (route, rack, vocab, tally, meta, gap, cluster body). Breakpoints: 1020px collapses the hero and three/four-column grids to two; 680px goes single column, turns the ledger into stacked rows, shrinks the bar to 56px, and swaps the timeline lanes for a three-up postmark sheet.

## Elevation & Depth

Flat. Depth comes from ruled boxes and colour fields, not shadows. The single exception is the specimen slip on the hero, which lifts off the yellow with one soft paper shadow and a 1.2deg tilt; it flattens below 1020px.

### Shadow Vocabulary
- **Paper lift** (`box-shadow: 0 18px 40px -18px rgba(40,30,0,.45)`): the hero specimen slip only.
- **Focus halo** (`box-shadow: 0 0 0 3px #1d47b0`): a field with focus inside it.

### Named Rules
**The Ruled Not Raised Rule.** Separate things with a 2px ink rule. Do not add a shadow to a card to make it a card.

## Shapes

Square corners throughout (0px). Borders are 2px solid ink for every container and control; 1px hair for rows inside them; 2.5-3px currentColor on stamps. Circles appear only as postmarks (double ring, 56/33 radius in a 120 box, wavy cancel lines on copies) and as 16px route/step dots. Perforated edges (radial-gradient punch holes, 14px pitch) tear the bottom of story slips. Stamps rotate -1.5deg; postmarks take a per-item rotation from a hash.

## Components

### Buttons
- **Shape:** square (0px), 2px ink border, min-height 52px (56px inside a field).
- **Primary:** ink fill, yellow 19px condensed 800 caps, 0.05em tracking.
- **Hover / Focus:** inverts to stock with ink text over 0.15s; focus is the global 3px airmail outline at 3px offset.
- **Ghost:** transparent with ink text; hover fills ink with yellow text. Disabled at 45% opacity. On the ink rack and ink label heads the button flips to a yellow fill.

### Chips
- **Style:** transparent, 2px ink border, 16px condensed 700 caps, mono count inside.
- **State:** hover fills ink, text yellow.

### Cards / Containers (registered-mail labels)
- **Corner Style:** 0px.
- **Background:** stock on ground or yellow.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 2px ink; a label head band (ink with yellow text, or yellow with ink text for clusters) ruled off by 2px ink, with a mono routing code pushed right.
- **Internal Padding:** 18px 20px body; 10px 16px head.

### Inputs / Fields
- **Style:** stock box, 2px ink border, 56px tall, 20px Barlow 600; the submit button docks flush inside with a 2px left rule.
- **Focus:** 3px airmail halo on the whole field. Suggestions drop in a ruled stock list; active row turns yellow.

### Navigation
- **Style:** 64px yellow bar, 2px ink bottom rule, brand mark plus 26px condensed caps wordmark; links in 17px condensed 700 caps. Hover and current page draw a 2px ink box. Dark variant: ink bar, yellow text, yellow box.

### Postmark (signature)
Circular SVG cancellation in its verdict colour (red copy, blue main, green organic) with top/bottom arc text, a large centre figure, and wavy cancel lines on copies; roughened by the shared ink turbulence filter. Presses in on arrival (scale 1.35 to 1, blur 3px to 0, 0.55s, cubic-bezier(.16,1,.3,1)), staggered in arrival order on the hero slip and story lanes.

### Verdict Stamp
Rubber-stamp box: currentColor 2.5px border and text, 14px condensed 800 caps, 0.08em tracking, rotated -1.5deg. Three words only: Looks coordinated (red), Looks organic (green), Not enough data (muted). Large size 20px with a 3px border.

### Sorting Rack
Ink sheet of 150px-min pigeonholes ruled in dark grey. Ready cells are stock with a 44px country code; building cells carry a yellow/deep-yellow 45deg hazard stripe; hover draws a 3px yellow inset outline.

## Do's and Don'ts

### Do:
- **Do** fill whole fields with postal yellow and bound them with a 2px ink rule.
- **Do** put evidence on white label stock in ruled, zero-radius boxes with a label head.
- **Do** carry verdicts as stamps or postmarks in their one colour: red coordinated, green organic, muted no-data, blue mainstream.
- **Do** keep mono to times, lags, codes and URLs, and keep tabular numerals on.
- **Do** respect reduced motion: postmark press, step pulse and skeleton shimmer all stop.

### Don't:
- **Don't** build a dark threat-intel dashboard, glowing globe, or neon-on-black data UI.
- **Don't** round corners on boxes, buttons, fields or chips.
- **Don't** use cancellation red for anything that is not coordinated-copy evidence or a failure.
- **Don't** add drop shadows to containers; the hero slip's paper lift is the only one.
- **Don't** uppercase a quoted story headline.

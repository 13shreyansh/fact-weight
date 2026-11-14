# Signal Fire: exact screen spec (Fable for Claude, Sat 14 Nov 2026)

For Codex. Build exactly this. Read `/mnt/project-files/Junction/plan/DESIGN-FLOOR.md` as the floor under it. Where this file and your habit disagree, this file wins. Where a value is missing, ask, do not invent.

Mode: Operate (a monitoring and investigation tool a fact-checker or trust analyst works in for a shift). Method and the evidence pack are Read. Colour strategy: Restrained.

**Placeholder convention.** Every figure, date, quote, handle, domain, title and id written inside `‹ ›` is an example of shape only. It is replaced by the real value from the database. Nothing inside `‹ ›` may be hard-coded. There is no demo mode, no seeded story and no fake number anywhere.

---

## 0. The product in one line

Signal Fire watches the public conversation around a war. When many accounts say the same thing at the same minute, it shows who, when and with what words, weighs the claim against trusted trackers, and hands a newsroom or a platform trust team an evidence pack. It never reports, removes or blocks anything, and it never takes a side.

Who: a newsroom fact-checker or a platform trust analyst in the Baltics or Nordics, at a desk in office daylight, with the platform's own moderation tool or a CMS in the next tab. Job: "tell me what is being pushed right now, prove it is coordinated with things I can check myself, and give me something I can forward."

The unit of work is a **push**: one coordinated burst about one claim. A **watch** is the standing order that finds pushes (a conflict, the countries it is aimed at, languages, keywords, channels, trusted sources). One watch ships built deeply: "Russia's war on Ukraine, aimed at the Baltics".

---

## 1. Direction contract

**Thesis.** A trust team acts on things it can verify, not on a model's opinion. So Signal Fire never shows a verdict without the measured reasons beside it, and every reason opens the raw posts, accounts and quotes behind it. The interface is quiet so that one shape is loud: many small marks stacked on the same minute.

**The world.** A watch station's logbook in daylight, not a war room. White working surface, cool fog-grey chrome, one night-coloured bar across the top that carries the live watch status. Light theme, chosen from the scene: long reading of quoted posts in four scripts at an office desk, and an evidence pack that is printed and forwarded on white. A threat-intel tool is tempted toward near-black with a neon accent and glowing edges. That look is refused here: it reads as theatre to the people who would pay for this, and it makes quoted text harder to read.

**Signature element: the burst strip.** A time axis where every post is one small square, stacked upward in the slice of time it was posted. Ordinary talk is a low scatter of grey squares. A push is a tower of ember squares. "A thousand accounts at the same minute" becomes a shape anyone reads in one second, and each square is a real post you can open. The same grammar is used for accounts stacked by the week they were created (a tower is a batch of new accounts). The strip appears on Home (in a finding), on the Push page, in the evidence pack and on Method.

**Who is speaking.** Signal Fire's own words are set plain on the page. Anything quoted (a post, a trusted source, a cloned page) always sits in a **quote slab** (fog ground, 6px radius, a source line above it). Measured values that people compare character by character (times to the second, handles, domains) are set in mono.

**What we borrow, by name.**
- incident.io incidents table (Mobbin): Home's list is a plain table with a severity cell and text columns. No cards.
- incident.io incident page (Mobbin): one main column of evidence, one fixed rail of facts on the right, status in the header.
- Sentry issues list (Mobbin): a two-line first cell (title, then one line of detail) so a row explains itself.
- Sentry "create monitor" (Mobbin): New watch is one sectioned page with a single create button at the end, not a wizard.
- X Radar (Mobbin): a post-volume chart with the actual posts next to it. Ours is a unit chart, so the chart is the posts.
- Railway audit-log drawer (Mobbin): "When / Who / What" with the raw payload under each. This is the "How we found this" trail.
- Better Stack incident timeline (Mobbin): a vertical log of timestamped steps with the time at the right edge.
- Grain and Fireflies trackers (Mobbin): keywords as removable tokens in one field.
- GitHub split diff: two texts side by side with word-level tint. Here the finding is sameness, so only the few differing words are tinted.
- urlscan.io and DomainTools: two domains set large in mono, one above the other, differing characters marked, registration facts beneath.
- Graphika network maps: accounts as dots, ties as lines, clusters visible. Ours is small, static in layout and backed by a table.
- EUvsDisinfo database: a "seen before" entry is a dated case with its outlet and a link, not a similarity score.
- Linear triage: J / K through the list, Enter to open.

**Risk taken.** No dark theme, no map, no globe, no red alert banner, and the verdict is a sentence, not a score. On video that can read as calm for a war product. The counterweight: the burst strip gets all the colour and the one authored motion (zooming into the peak minute), and every beat of the video lands on a real post, a real account or a real quote.

**Never.** The words "fake", "propaganda", "disinformation", "lie", "bot", "troll", "enemy" as labels in Signal Fire's voice. No attribution to a state or actor. No "AI detected", no confidence percentage, no threat score, no chat. Verdict words are fixed (2.6).

---

## 2. Tokens

### 2.1 Fonts (self-hosted, never fall back visibly)

| Role | Face | Package | Why |
|---|---|---|---|
| Interface and quoted text | **Golos Text** variable, 400 to 700 | `@fontsource-variable/golos-text` | A plain, open sans drawn Cyrillic-first with full Latin Extended, so Russian, Ukrainian, Lithuanian (ė, ų), Latvian (ķ, ļ) and Estonian (õ) all look native in one face. Not on the banned list. |
| Measured values | **JetBrains Mono** variable, 400 and 500 | `@fontsource-variable/jetbrains-mono` | Times to the second, account handles, domains, ids, raw payloads. Only there. Never for labels, headings or buttons. |

`font-family: "Golos Text Variable", system-ui, sans-serif`. Load Latin, Latin-ext, Cyrillic and Cyrillic-ext subsets of both. Preload the Latin subset of Golos Text. All counts in tables: `font-variant-numeric: tabular-nums lining-nums`. If Golos Text's tabular figures do not hold width, right-align and fix column widths, do not swap the font.

### 2.2 Type scale (fixed px, no fluid type)

| Token | Size / line | Weight | Used for |
|---|---|---|---|
| `t-page` | 26 / 34 | 600 | page H1, push title |
| `t-title` | 20 / 28 | 600 | finding sentences, the verdict line, Method section headings, the benchmark sentence |
| `t-head` | 16 / 24 | 600 | section and panel headings, signal names, claim sentences |
| `t-body` | 15 / 24 | 400 | body, table cells, buttons (600), quoted text in slabs |
| `t-small` | 13 / 20 | 400 | secondary lines, glosses, meta lines, chips (500) |
| `t-micro` | 12 / 16 | 500 | table column heads, tags, axis notes |
| `m-data` | 13 / 20 | 400 mono | times, handles, domains in rows |
| `m-large` | 18 / 26 | 500 mono | the two domains in the site comparison |
| `m-micro` | 11 / 16 | 400 mono | axis tick times, raw payloads |

Letter-spacing `-0.01em` on `t-page` and `t-title`, `0` elsewhere. Sentence case everywhere. No uppercase labels. No label above a heading. Headings `text-wrap: balance`, paragraphs `text-wrap: pretty`, prose max 68ch.

### 2.3 Colour (every colour, with its job)

| Token | Hex | Job |
|---|---|---|
| `surface` | `#FFFFFF` | page, tables, panels |
| `ground` | `#F3F5F6` | quote slabs, the rail, table head rows, toolbars |
| `sunk` | `#E9EDEF` | inputs, skeletons, differing-word tint in "Same text" |
| `line` | `#D5DBDF` | 1px borders of panels and inputs, empty verdict bars |
| `line-soft` | `#E4E8EB` | row and column dividers |
| `ink` | `#111B21` | text, icons, the primary button |
| `ink-2` | `#46535C` | secondary text |
| `ink-3` | `#5C6A73` | tertiary text, placeholders, glosses (5:1 on `ground`) |
| `night` | `#0F1A20` | the top bar only |
| `on-night` | `#FFFFFF` | text on `night` |
| `on-night-2` | `#A9B6BE` | secondary text on `night` |
| `live` | `#4CC38A` | the 8px "reading now" dot on `night`, nothing else |
| `teal` | `#0B6B74` | links, focus ring, selected tab, chip and row state |
| `teal-hover` | `#084F56` | link hover |
| `teal-tint` | `#E3F2F3` | selected row ground, selected chip ground |
| `ember` | `#E8590C` | **marks only:** squares of posts in a push, fired-signal mark, verdict bars, marked characters in a domain |
| `ember-text` | `#B5400B` | the verdict words, counts that belong to the push (5.6:1 on white) |
| `ember-tint` | `#FDE8DA` | ground of a newly arrived row (fades), hover column in the strip |
| `slate` | `#7C8993` | marks only: squares of ordinary posts and older accounts |
| `plum` | `#7A3E9D` | technique: underline and name text |
| `plum-tint` | `#F0E6F7` | technique: marked words |
| `ok` | `#1F7A4D` | "Copied", "Saved", source reachable tick |
| `ok-tint` | `#E3F3EA` | ground of those confirmations |
| `err` | `#A8201A` | system errors only, always with an icon and words |

Rules. Ember means "part of the push" and nothing else: it is never a button, a card ground, a border, a side stripe or an error. Plum means "wording technique" and nothing else. Evidence for and against a claim uses `ink` with words and icons, never green against red, because the tool does not take sides. Teal is for links, focus and selection only. Text on any tint is `ink`. No gradients, no glow, no dark panels except the 52px top bar.

Browser surfaces: `::selection { background:#CDE7EA; color:#111B21 }`, `caret-color:#0B6B74`, `:focus-visible { outline:2px solid #0B6B74; outline-offset:2px }` (on `night`: outline `#FFFFFF`), link underline offset 3px, `scrollbar-color:#C3CBD1 transparent; scrollbar-width:thin`.

### 2.4 Spacing, radii, elevation

- Spacing steps: 4, 8, 12, 16, 24, 32, 48. Page side padding 24 (16 under 700px).
- Radii: 1 (strip squares), 3 (marked words, tags), 6 (buttons, inputs, chips, quote slabs), 8 (panels, dropdowns), 12 (phone sheet top corners).
- Elevation: flat with 1px lines. Only floating things cast a shadow: dropdowns and tooltips `0 8px 24px rgba(17,27,33,.12), 0 1px 2px rgba(17,27,33,.08)`; the phone sheet `0 -8px 32px rgba(17,27,33,.16)`.
- Hit targets at least 32 x 32 on desktop, 44 x 44 under 700px.

### 2.5 Marks, tags and icons

**Verdict mark** (authored SVG, 16 x 12): three vertical bars, each 4 x 12, radius 1, 2 apart.

| Verdict (exact words) | Bars | When |
|---|---|---|
| "Looks coordinated: strong" | three `ember` | rule in 2.6 |
| "Looks coordinated: moderate" | two `ember`, one `line` | rule in 2.6 |
| "Looks organic" | three hollow, 1px `ink-3` outline | a spike that was checked and cleared |
| "Not enough data" | three hollow, 1px dashed `ink-3` | fewer posts or accounts than the minimum |

**Signal mark** (10 x 10 square, radius 2): filled `ember` when the signal fired, hollow 1.5px `ink-3` when it was checked and not found.

**Platform tag:** two letters in a 26 x 18 box, radius 3, `surface`, 1px `line`, `t-micro` 600 `ink-2`: `TG` Telegram, `TT` TikTok, `YT` YouTube, `IG` Instagram, `RD` Reddit, `NW` news site, `WB` other web page. Tooltip gives the full name. No brand logos anywhere.
**Language tag:** lower-case code in a 24 x 18 box, radius 3, `ground`, no border, `t-micro` 600 `ink-2`: `lt`, `lv`, `et`, `ru`, `uk`, `en`, `pl`, `fi`.

**Icons:** Lucide, stroke 1.5, 16px (14px in chips and meta lines). Used: `search`, `arrow-up-right`, `chevron-down`, `chevron-right`, `chevron-left`, `x`, `check`, `minus`, `copy`, `download`, `file-text`, `plus`, `maximize-2`, `minimize-2`, `table`, `link`, `globe`, `clock`, `triangle-alert`, `rotate-cw`, `undo-2`, `route`. Not allowed: `sparkles`, `wand`, `bot`, `brain`, `zap`, `shield`, `skull`, `flame`, `radar`, `target`, `crosshair`, flags of countries. No emoji.

**Signal Fire mark:** authored SVG 20 x 20. Five squares 3 x 3 (radius 0.75) on one baseline at x = 1, 5, 9, 13, 17, all at y = 16, in `on-night-2`; above the middle one, three more stacked at y = 12, 8, 4 in `ember`. It is the burst strip in miniature. Beside it "Signal Fire" in Golos Text 600, 16px, `on-night`. On white (pack, favicon) the baseline squares are `slate`.

### 2.6 The verdict rule (shown on Method, applied the same everywhere)

Five signals. Each is measured against this watch's own baseline for the same keywords at the same hour and weekday. Thresholds live in `signals.config.ts`, are tuned on the benchmark's dev split, and are printed on Method.

| Signal | Name on screen | Sentence when fired (stored `reason`, numbers real) |
|---|---|---|
| timing | Same minute | "‹412› posts in ‹9› minutes. The usual rate for this topic is ‹3› per ‹10› minutes." |
| new_accounts | New accounts | "‹71›% of the accounts were created in the last ‹30› days. Usual for this topic: ‹8›%." |
| same_text | Same text | "‹188› posts repeat one text, ‹94›% identical, in ‹3› languages." |
| shared_links | Same links | "‹240› posts link to ‹lrt-zinios.com›, registered ‹6› days before, which copies ‹lrt.lt›." |
| ties | Linked accounts | "‹136› of the accounts follow each other. In a random sample of this topic, ‹4› do." |

Strong: three or more signals fired, and one of them is Same minute or Same text. Moderate: exactly two fired. Looks organic: one or none. Not enough data: under the minimum posts or accounts. A signal that could not be measured on a platform (for example no follower data) reads "Could not be measured on ‹TikTok›" and never counts as fired.

### 2.7 Controls (one vocabulary)

- **Primary button:** height 40, radius 6, `ink` ground, white `t-body` 600, padding 0 16. Hover `#22303A`. Pressed `#000000`. Disabled `sunk` ground, `ink-3` text. Loading: label stays, 14px ring spinner left of it. **At most one on any screen.**
- **Quiet button:** height 32 (40 beside a primary), `surface`, 1px `line`, `ink` `t-small` 500, padding 0 12. Hover border `ink-3`. Pressed `ground`. On `night`: transparent, 1px `#33434D`, `on-night` text.
- **Text button:** `teal` `t-small` 500, no ground, underline on hover, 32 high hit area.
- **Link:** `teal`, underlined on hover in UI, always underlined in prose. Links that leave Signal Fire end with a 12px `arrow-up-right`.
- **Segmented control:** height 32, 1px `line`, radius 6, 1px `line` between segments. Selected: `teal-tint` ground, `teal` text 600. Others `ink-2`.
- **Filter chip (toggle):** height 28, radius 6, 1px `line`, padding 0 10, `t-small` 500 with an `ink-3` tabular count. On: `teal-tint`, `teal` border and text. `aria-pressed`.
- **Text field:** height 36, radius 6, `sunk`, no border, `t-body`. Focus: `surface`, 1px `teal` border plus the ring. Error: 1px `err` border, message under it in `err` `t-small`.
- **Token field:** a text field that grows in height. Each token: height 24, radius 3, `surface`, 1px `line`, `t-small`, 14px `x` button. Enter or comma adds, Backspace on empty removes the last.
- **Tooltip:** `ink` ground, white `t-small`, radius 6, padding 6 8, after 400ms hover or on focus.
- **Quote slab:** `ground`, radius 6, padding 12 14, no border, never a coloured edge. Source line above the slab, `t-small`: platform tag, handle in `m-data` (a link to the original), language tag, time in `m-data`. Text in `t-body` `ink` with its `lang` attribute. For non-English text, the English gloss under the slab in `t-small` `ink-3`, starting "In English: ". If the original was removed: `ink-3` " · removed from ‹Telegram›, archived copy" after the time, linking to the stored snapshot.
- **Marked words** (`<mark>`): technique words: `plum-tint` ground, 2px `plum` underline, offset 4, radius 3, padding 1px 2px, `box-decoration-break: clone`. Differing words in "Same text": `sunk` ground, 1px dotted `ink-3` underline. Differing characters in a domain: `ember` 2px underline, `ink` text 600.

### 2.8 Motion

| Token | Value | Used for |
|---|---|---|
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | everything |
| `d-press` | 120ms | pressed states, chip toggles |
| `d-state` | 180ms | row selection, tab change, content swap (cross-fade) |
| `d-panel` | 260ms | strip expanding, lanes splitting, phone sheet |
| `d-zoom` | 700ms | **the one authored moment:** the burst strip changing zoom |
| `d-arrive` | 1200ms | `ember-tint` fading off a row that has just arrived |

No page-load choreography, no entrance animation on rows or sections. The `live` dot pulses opacity 1 to 0.4 over 2s only while a sweep is running. With `prefers-reduced-motion: reduce` every animation is an instant state change and the dot is steady.

---

## 3. Shared shell

### 3.1 Top bar (every page, 52 high, `night`, sticky, above everything)

- Left, x=24: the mark and wordmark. Link to the current watch's Home.
- 24 gap. **Watch switcher:** a quiet button on `night`, 32 high: "‹Russia's war on Ukraine · aimed at the Baltics›" with `chevron-down`, truncated at 360 wide. Dropdown (360 wide, `surface`, radius 8, shadow): one row per watch (40 high: name, then `ink-3` "‹14› pushes this week"), a 1px `line-soft` divider, then a row with `plus`: "New watch". Arrow keys move, Enter picks, Esc closes.
- 24 gap. Two links, `on-night-2` `t-body` 500, 24 apart: **"Pushes"**, **"Method"**. Current page: `on-night` with a 2px `ember` line under the word at the bar's bottom edge (the only ember in the shell).
- Right, x=24 from the edge: the live status, `t-small` `on-night-2`: the 8px `live` dot, then "Reading ‹214› sources · last sweep ‹2 min› ago". While a sweep runs: "Reading ‹214› sources · sweeping now". If the last sweep is older than 3 times the sweep interval: the dot becomes a 14px `triangle-alert` in `#FFB4A8` and the text "Last sweep ‹47 min› ago. Collection is behind." The status is a link to Method, section "Running now".

### 3.2 Routes (all state in the URL)

| Route | Screen |
|---|---|
| `/` | redirects to `/w/<default watch>` |
| `/w/<watch>?verdict=strong,moderate,organic&platform=&lang=&sort=newest\|largest` | Home |
| `/w/<watch>/p/<push>?zoom=whole\|hour\|10min&lanes=1&slice=<bin>&variant=<id>#<section>` | Push |
| `/w/<watch>/p/<push>/trail?step=<1-5>` | How we found this |
| `/w/<watch>/p/<push>/pack` | Evidence pack |
| `/watches/new?from=<watch>` | New watch |
| `/method?count=strong\|both` | Method and benchmark |

### 3.3 Page footer (Home, Method, New watch)

One line, `t-small` `ink-3`, 24 above the bottom: "Signal Fire reads public posts and pages only. It flags coordination and weak evidence, whoever is behind it. It never reports or removes anything."

### 3.4 Formats

Times are shown in the watch's time zone, named once per page ("Vilnius time"). Dates "14 Nov 2026", with time "14 Nov 2026, 14:02", to the second only in `m-data` post rows ("14:02:11"). Relative time ("‹2 h› ago") only for things under 24 hours old, with the absolute time in a tooltip. Thousands comma "1,240". Durations "9 min", "1 h 38 min". Numbers inside quotes are left as written.

---

## 4. Screen 1: Home `/w/<watch>`

Purpose: a judge with no context understands the product in 5 seconds, an analyst sees what to open first.

**Frame at 1440 x 900.** Content box 1392 wide. Vertical budget: top bar 52, then 28, H1 34, 8, paragraph 48, 24, findings band 232, 24, controls row 36, 12, table head 36, then six rows of 56 above the fold.

### 4.1 Intro (left 920 wide; the primary button sits at the right end of the H1 line)

1. H1 `t-page`: **"‹Russia's war on Ukraine›, as it is pushed at ‹the Baltics›"**. Built from the watch: "‹conflict›, as it is pushed at ‹audience›".
2. Paragraph, `t-body` `ink-2`, max 68ch: "Signal Fire reads public posts, channels and news sites in ‹Lithuanian, Latvian, Estonian, Russian and English›. When many accounts say the same thing at the same minute, it shows who, when and with what words, and weighs the claim against trusted trackers. It never reports or removes anything."
3. Right end of the H1 line: primary button **"Open the strongest push"**. It opens the newest push with verdict strong (then moderate). Not rendered if the watch has no coordinated push.

### 4.2 Findings band (the three live findings)

`t-head`: "Found in the last ‹7› days". 12 below it, three columns of 432 with 48 gaps, a 1px `line-soft` vertical rule centred in each gap. No boxes, no icons, no big numbers. Each column is one real push, shown through a different kind of evidence, so the three never look like three copies of one card:

| Column | Finding sentence (`t-title`, stored, at most 110 characters) | Evidence fragment (96 high) |
|---|---|---|
| Swarm | "‹412› accounts sent ‹Lithuanians› the same warning within ‹9› minutes." | A burst strip 432 x 72 at "Whole push" zoom, with its axis and two tick times in `m-micro`, and under it `t-micro` `ink-3` "one square = ‹1› post". |
| Same text | "‹188› posts repeat one text word for word, in ‹3› languages." | Two quote slabs side by side (210 each, 12 gap), two lines of text each, ellipsis, each with its source line (tag and time only). |
| Site | "A site registered ‹6› days ago copies ‹lrt.lt› and was linked ‹240› times." | The two domains in `m-large`, real one above, look-alike below, differing characters marked. Under each `t-small` `ink-2`: "registered ‹1998›" / "registered ‹8 Nov 2026›". |

Under each fragment, 12 gap, one row: left `t-small` `ink-2`: verdict mark, the verdict words, " · ‹2 h› ago"; right: text button **"See the evidence"** with `chevron-right`, opening that push at the matching section (`#timeline`, `#same-text`, `#site`).

**Which pushes are shown (a rule, not a choice):** among pushes of this watch first seen in the last 7 days with verdict strong or moderate. Swarm: the most posts in the shortest peak. Same text: the largest count of near-identical posts, excluding the Swarm pick. Site: the newest look-alike domain with at least one linking post, excluding both. If a kind has no qualifying push its column is not rendered and the others keep their width, left aligned. If none qualify the window widens to 30 days and the heading says so. If still none, the band is replaced by the empty state in 4.4.

### 4.3 The pushes table

Controls row (36 high): left, filter chips: "Strong ‹6›", "Moderate ‹11›", "Looks organic ‹42›" (the first two on by default), then a 1px `line` divider 20 high, then two menus as quiet buttons "Platform: all" and "Language: all". Right: segmented control "Newest" (default) | "Largest".

Table. No card around it. Head row 36 on `ground`, `t-micro` `ink-2`. Body rows 56, 1px `line-soft` between, no zebra.

| Column | Width | Align | Content |
|---|---|---|---|
| Verdict | 196 | left | verdict mark, 8 gap, the verdict words: `t-small` 600 `ember-text` for strong and moderate, `ink-2` for organic, `ink-3` for not enough data |
| Push | flex (about 520) | left | Line 1: the push title, `t-body` 600, one line, ellipsis. A neutral description stored at detection, at most 90 characters: "‹Posts telling Lithuanians that NATO will not defend them›". Line 2 `t-small` `ink-3`: the first fired reason, shortened: "‹412› posts in ‹9› min · ‹71›% new accounts". |
| Aimed at | 96 | left | up to three language tags, then "+‹2›" |
| Seen on | 112 | left | up to three platform tags, then "+‹1›" |
| Posts | 72 | right | count, `t-body` tabular |
| Accounts | 84 | right | count, tabular |
| Evidence | 128 | left | `t-small` `ink-2`: "‹0› for · ‹4› against". If no checkable claim: `ink-3` "no checkable claim". |
| First seen | 120 | right | `t-small` `ink-2` "‹2 h› ago" or "‹12 Nov›, ‹09:14›". Under it, if still growing: `t-micro` `ember-text` "still active". |

- The whole row is one link. Hover `ground`. Focus ring on the row. J / K move a `teal-tint` cursor row, Enter opens.
- **A push that arrives while the page is open** (the page polls every 30s) is inserted at the top with an `ember-tint` ground that fades in `d-arrive`. Nothing else moves except the rows shifting down by one. Counts in chips update.
- Under the table, one line `t-small` `ink-3`, left: "‹59› spikes checked in the last 7 days · ‹17› look coordinated · ‹42› look organic. " then link "How the verdict is decided". Right: "Show ‹25› more" text button when there are more.

### 4.4 States

- **Loading:** H1 and paragraph render from the watch record at once. Findings: three columns of `sunk` blocks. Table: head real, six skeleton rows (opacity pulse 1.2s).
- **New watch, first sweep running:** band replaced by `t-head` "The first sweep is running." and `t-body` `ink-2` "‹37› of ‹214› sources read so far. Pushes appear here as soon as something stands out from the usual rate, which takes about a day of reading to learn." with a 4px `sunk` track filled `ink` to the share read. Table shows "Nothing yet."
- **Quiet week (no coordinated push, spikes exist):** band replaced by `t-head` "Nothing looks coordinated in the last 30 days." and `t-body` `ink-2` "‹42› spikes were checked and looked organic. Turn on 'Looks organic' to see them." The chip is the action.
- **Filters hide everything:** "No pushes match these filters." and text button "Clear filters".
- **Database unreachable:** in place of band and table: `triangle-alert` 20px `err`, `t-head` "The database did not answer.", `t-body` `ink-2` "Nothing is shown from memory. Try again in a moment.", quiet button "Try again".

---

## 5. Screen 2: Push `/w/<watch>/p/<push>`

Purpose: prove one push with things the analyst can check, then hand it over.

### 5.1 Frame at 1440 x 900

Top bar 52. Header 124 (scrolls away). Section bar 44 (sticky at 52, full width, `surface`, 1px `line-soft` bottom border). Below: **main column 944** (x=24) and **the rail 400** (x=1016, `ground`, radius 8, padding 20, sticky at top 112, max height `calc(100vh - 128px)`, own scroll). 48 between them. The page scrolls, the rail stays.

### 5.2 Header (padding 24 24 20)

- Line 1: the push title as H1 `t-page`, max two lines. Right end of the line: primary button **"Open evidence pack"** with `file-text`.
- Line 2, 8 below: the verdict mark, then the verdict words in `t-title` `ember-text` (strong, moderate) or `ink-2` (organic).
- Line 3, 4 below, `t-small` `ink-2`: "‹412› posts · ‹388› accounts · " platform tags " · " language tags " · first seen ‹14 Nov 2026, 14:02› · " then `ember-text` "still active" or `ink-2` "ended ‹15:40›". "Vilnius time" in `ink-3` at the end.
- A replayed push (from the benchmark) shows one strip under the header, `sunk`, radius 6, padding 8 12, `t-small` `ink`: `rotate-cw` "Replay. These posts are from ‹February 2024›. They were fed to Signal Fire in order on ‹13 Nov 2026›, as if arriving live."

### 5.3 Section bar

Left, x=24: anchor tabs, `t-small` 500 `ink-2`, 24 apart; the section in view is `teal` 600 with a 2px `teal` line at the bar's bottom: **Timeline · Accounts · Same text · Site · Claims · Wording · Seen before**. A section with no data keeps its tab in `ink-3` and its body says why (5.12). Right end: text button with `route`: **"How we found this"**.

Every section in the main column: 40 above, an H2 in `t-head`, 4 below it one `t-small` `ink-2` sentence saying what to look for, 16 below that the content.

### 5.4 Timeline (the burst strip)

H2 "Timeline". Sentence: "Each square is one post. Ember squares belong to this push. Grey squares are other posts on the same keywords."

**Panel** (944 wide, `surface`, 1px `line`, radius 8).
- Header row 44, padding 0 16: left `t-head`: "‹412› posts in ‹1 h 38 min›", then `t-small` `ink-2` " · peak ‹96› in ‹2› minutes at ‹14:06›". Right: segmented control **"Whole push" | "Peak hour" | "Peak 10 minutes"**; 8 gap; segmented control "Together" | "By platform"; 8 gap; two 32 x 32 icon buttons: `table` (tooltip "Show as a table") and `maximize-2` (tooltip "Larger").
- Plot, padding 12 16 0: height 170 (410 when enlarged, in `d-panel`). Squares 4 x 4, radius 1, pitch 5 in both directions. Columns = floor(plot width / 5). Each column is one slice of time: window divided by columns. Squares stack from the axis upward: `ember` push posts at the bottom, `slate` other posts above them. If the tallest column would exceed the plot, one square stands for N posts (N = the smallest whole number that fits); the note under the plot says so.
- Windows: Whole push = 2 h before the first push post to 2 h after the last (at least 6 h). Peak hour = the 60 minutes holding the most push posts. Peak 10 minutes = the same for 10.
- A 1px dashed `ink-3` horizontal line at the usual number of posts per slice for this topic at this hour, labelled at the right end in `m-micro` `ink-3`: "usual: ‹3› per ‹2 min›".
- Axis: 1px `line`. Tick times in `m-micro` `ink-3` (every hour, every 10 minutes or every minute, by zoom).
- Event lines: 1px `ink` verticals over the full plot height, each with a `t-micro` `ink` label at the top, flipped left if it would overflow: "first post ‹14:02:11›", "flagged by Signal Fire ‹14:09›", and when they exist "‹ERR› report ‹13:50›" (a trusted-source item on the same topic) and "first public debunk ‹15 Nov, 09:30›".
- Under the plot, 36-high row, padding 0 16, `t-micro` `ink-3`: left "one square = ‹1› post · Vilnius time"; right a legend: an `ember` square "this push", a `slate` square "other posts on these keywords".

**By platform:** the plot splits into one lane per platform (each 44 high, its platform tag at the left edge, same time axis), in order of each platform's first push post. Lanes grow apart in `d-panel`. Above the lanes, `t-small` `ink`: "Started on ‹Telegram›. ‹TikTok› followed ‹6 min› later, ‹YouTube› ‹41 min› later."

**The authored moment.** Changing zoom re-bins the squares: each square travels from its old position to its new one in `d-zoom` with `ease-out` (FLIP on a canvas or WebGL layer, not 400 DOM nodes animating layout), the tick labels cross-fade, the header sentence swaps at the end. Going from "Whole push" to "Peak 10 minutes" is the shot: a low tower becomes a wall, and the grey squares almost vanish.

**Interaction.** Hover a column: `ember-tint` behind it, tooltip "‹14:06–14:08› · ‹96› posts, ‹91› in this push". Click a column: it stays tinted and the posts table below filters to it, headed "Posts from ‹14:06› to ‹14:08›" with a text button "Show all". Left / Right arrows move the column, Enter selects, Esc clears. The plot is `role="img"` with an `aria-label` equal to the header sentence, and the `table` button swaps the plot for a real table (time slice, posts in push, other posts).

**Posts table** (16 below the panel). Head row 36 on `ground`. Rows 48: time `m-data` (80), account handle `m-data` as a link (190, ellipsis), platform tag (40), language tag (36), text `t-body` one line with ellipsis and the gloss in `t-small` `ink-3` on a second line when not English (flex), views `t-small` tabular right (80), `arrow-up-right` link to the original (32). Ten rows, then "Show all ‹412›" (pages of 50). Sort: time ascending.

### 5.5 Accounts

H2 "Accounts". Sentence: "‹388› accounts posted in this push. ‹276› of them were created in the last 30 days."

Two panels side by side (464 each, 16 gap, 260 high, `surface`, 1px `line`, radius 8):
- **Left, "When the accounts were created":** the burst-strip grammar turned on accounts. Each square is one account, stacked on the week it was created, over the last 5 years (older ones stacked in one column at the left edge labelled "before ‹2021›"). `ember`: created in the last 30 days. `slate`: older. Axis ticks are years in `m-micro`. Under it `t-micro` `ink-3`: "one square = ‹1› account". Hover a column: "week of ‹2 Nov 2026› · ‹141› accounts".
- **Right, "Who follows whom":** a network drawing. Each account a 6px circle (`ember` if created in the last 30 days, else `slate`; 10px if it has ten or more ties). A 1px `line` line joins two accounts that follow each other. Positions are computed once on the server (force layout, fixed seed) and stored, so the drawing is identical on every load and in the pack. No physics in the browser, no drag, no zoom. Hover a circle: its ties turn `ink`, tooltip with handle, platform, creation date. Click: selects its row in the table below. Under it `t-micro` `ink-3`: "‹136› accounts with at least one mutual follow. ‹252› with none are not drawn." If follower lists are not public on a platform: "Follows could not be read on ‹TikTok›."

Accounts table, 16 below: handle `m-data` link, platform tag, created ("‹3 Nov 2026›", with `t-micro` `ember-text` "‹11› days old" when under 30 days), followers, posts in this push, mutual follows in this push, and a last column "also in": the count of other pushes this account appeared in, as a link. Ten rows, sorted by posts in this push, "Show all ‹388›".

### 5.6 Same text

H2 "Same text". Sentence: "‹188› posts repeat one text. Words that differ between copies are shaded."

- Variant picker when more than one repeated text exists: segmented control "Text 1 · ‹188› posts" | "Text 2 · ‹64› posts" (up to four).
- **Three quote slabs side by side** (304 each, 16 gap): the earliest post of the variant, then the two that differ from it the most. Identical words plain. Words that differ from the first slab are marked (2.7). Above the three, `t-small` `ink-2`: "‹94›% identical across ‹188› posts. First posted by " handle " at ‹14:02:11›." If the copies are in different languages, each slab shows its language tag and its gloss, and the line reads "The same text in ‹Lithuanian›, ‹Russian› and ‹English›."
- Under the slabs, text button "Show all ‹188› copies": expands a list of rows (time, handle, platform, the differing words only).
- Selecting a variant sets `?variant=` and, in the Timeline, fades every other square to 30% so the variant's posts stand out.

### 5.7 Site

H2 "Site". Sentence: "‹240› posts link to a site that looks like ‹LRT›, the Lithuanian public broadcaster."

Panel, padding 20, two rows on a shared left edge:
- `t-small` `ink-2` "The real site" then the domain in `m-large` `ink`: "‹lrt.lt›", then `t-small` `ink-2` "registered ‹1998› · ‹Lietuvos nacionalinis radijas ir televizija›".
- 12 below: `t-small` `ink-2` "The site linked in this push" then the domain in `m-large` with the differing characters marked: "‹lrt-zinios.com›", then `t-small` `ink`: "registered ‹8 Nov 2026›, ‹6› days before the first post · registrar ‹…› · hosted at ‹…›".
- 20 below: two page captures side by side (444 x 278 each, 16 gap, 1px `line`, radius 6, `object-fit: cover` from the top), captions `t-small` `ink-2` "‹lrt.lt›, captured ‹14 Nov 2026, 14:20›" and "‹lrt-zinios.com›, captured ‹14 Nov 2026, 14:21›". Real captures from the page monitor, never a mock-up.
- 16 below, a facts list (rows 32, label `ink-2` left, value `ink` right): "Article text copied from" link and "‹88›% identical" · "Logo and layout" "‹same files as lrt.lt›" · "Other look-alike domains on the same host" "‹14›" with a text button "List them" · "First linked by" handle and time.
- More than one look-alike domain: a segmented control at the top of the panel, one segment per domain.

### 5.8 Claims

H2 "Claims". Sentence: "What the posts state as fact, weighed against sources this watch trusts."

One block per claim (up to five, ordered by how many posts make it), divided by 1px `line-soft`, padding 20 0:
- The claim as `t-head`, a neutral restatement: "‹NATO has decided not to defend Lithuania.›" Right of it `t-small` `ink-3`: "in ‹301› posts".
- 8 below, the tally as one sentence in `t-body` 600 `ink`: **"‹0› sources for, ‹4› against, ‹2› do not address it."** Then the evidence word in `t-small` `ink-2`: "Evidence: weak" (no source for it), "Evidence: disputed" (sources on both sides), "Evidence: supported" (more for than against), "Evidence: unchecked" (no trusted source addresses it).
- 12 below, one row per trusted source that addresses it, "against" first: an icon in `ink` (`x` against, `check` for, `minus` does not address), the source name `t-small` 600 ("‹ISW, Russian Offensive Campaign Assessment›"), its date, then a quote slab with the exact passage and a link to the page. Three rows shown, then "Show ‹3› more".
- A claim that is a matter of opinion or prediction is listed as `t-small` `ink-3`: "Not checkable: a prediction."
- No verdict on truth appears anywhere. The words are "for", "against", "weak", "disputed", "supported", "unchecked".

### 5.9 Wording

H2 "Wording". Sentence: "How the text tries to move the reader, named in plain words."

Up to three techniques, each: the name in `t-head` `plum` ("Fear appeal", "Loaded language", "Fabricated authority", and others from the fixed list on Method), one plain sentence in `t-body`: "‹It tells the reader to act before it is too late, without saying what will happen or when.›", then a quote slab of one real post with the words that carry the technique marked in plum, and `t-small` `ink-3` "in ‹212› of ‹412› posts". Wording never changes the verdict: under the last technique, `t-small` `ink-3`: "Wording is described, not scored. It does not affect the verdict."

### 5.10 Seen before

H2 "Seen before". Sentence: "Earlier recorded cases of the same claim."

`t-body`: "This claim matches ‹14› cases in the EUvsDisinfo database, the earliest from ‹March 2022›." Then rows (56 high, 1px `line-soft`): date `t-small` tabular (96), case title as an external link, the outlet where it was recorded `ink-2`, languages as tags, and `t-small` `ink-3` "close match" or "loose match" (two words only, from a distance threshold in config). Five rows, "Show all ‹14›". None found: "No earlier case of this claim in the EUvsDisinfo database. That does not mean it is new."

### 5.11 The rail

1. `t-head`: "Why it looks coordinated" (for an organic verdict: "Why it looks organic").
2. 12 below: the five signals as rows, fired first. Each row, padding 10 0, 1px `line-soft` between: the signal mark, 8 gap, the signal name `t-small` 600, then on the next line the stored reason sentence in `t-small` `ink` (2.6). A not-fired signal has the hollow mark and `ink-3` text: "Not found: ‹4›% of accounts are new, about usual." **Each row is a button:** it scrolls the main column to the matching section (Same minute → Timeline, New accounts and Linked accounts → Accounts, Same text → Same text, Same links → Site) and tints that section's panel `teal-tint` for 1.2s.
3. 16 below: `t-head` "What could explain it innocently". One to three stored sentences in `t-small` `ink-2`, each with a `minus` icon: "‹A real event was reported by ERR at 13:50. Spikes after news are normal, though not with new accounts and one text.›" If nothing: "Nothing found that would explain the timing."
4. 16 below, `t-small` `ink-2`: `clock` "Flagged ‹7 min› after the first post. Checked again at ‹15:10›."
5. 16 below, a row of two: text button **"This looks organic to me"** and text button `copy` "Copy link".

**After "This looks organic to me":** the row swaps in place (`d-state`) to `t-head` "Why does it look organic?", three radio rows (40 high): "A real event explains the spike" (preselected), "These accounts are a real community", "The check misread the posts", then quiet button "Save" and text button "Cancel". Saving stores the review and settles to `t-small` `ink`: "A reviewer marked this as organic on ‹14 Nov 2026, 16:02›. Reason: ‹…›." with text button `undo-2` "Reopen". The verdict is not changed. The header gains, after the verdict words, `t-small` `ink-2` " · disputed by a reviewer", and Method counts it. Save failure: the form stays, `err` `t-small` "Could not save. Nothing was changed. Try again."

### 5.12 States

- **Loading:** header as `sunk` bars, section bar real, strip panel as a frame with an empty plot and the axis, rail as five `sunk` rows. No spinner.
- **Still active:** the header says "still active", the strip gains new squares at the right edge on each poll (they appear, no animation), counts update in place, and the rail line reads "Checked again ‹1 min› ago".
- **A section with no data:** its body is one `t-body` `ink-2` sentence. Site: "No post in this push links to a look-alike site." Same text: "No repeated text. The posts share a claim but not their wording." Claims: "No checkable claim was found in these posts." Accounts network: "No mutual follows found among these accounts."
- **Looks organic push:** same page. All squares in the strip are `slate`. The rail lists what was checked and not found. No primary button (an organic spike has no pack); the header's right end is empty.
- **Not enough data:** header verdict in `ink-3`, rail says "‹23› posts from ‹19› accounts. Signal Fire needs at least ‹40› posts from ‹25› accounts to judge." Sections render what exists.
- **Unknown id:** `t-page` "This push is not in the database." quiet button "Back to the list".
- **Original posts removed by the platform:** rows keep their text from the stored copy and are marked as in 2.7. A count appears in the header line: " · ‹37› since removed".

### 5.13 Keyboard

`1`–`7` jump to sections. `Z` cycles zoom. `P` toggles By platform. `T` opens the trail. `E` opens the evidence pack. `J` / `K` next / previous push in the list order. `Esc` clears a selected column or variant. Off while a field is focused. `?` opens a small popover listing them, bottom left, not a modal.

---

## 6. Screen 3: How we found this `/w/<watch>/p/<push>/trail`

Purpose: show the pipeline on this one push, with real times, counts and payloads. This is the "how it works" beat of the video and the proof of technical execution.

**Frame.** Header 96: a text link `chevron-left` "Back to the push" at the left of a 32-high row, then H1 `t-page`: "How Signal Fire found this push", and at the right end of the H1 line `t-title` `ink`: "‹8 min 04 s› from the first post to a finished evidence pack." (computed).

### 6.1 The chain (sticky at 52, 96 high, full width, `surface`, 1px `line-soft` bottom border)

Five stations on one horizontal 2px `line` rail, evenly spaced across 1392, each a button:
- a 14px circle on the rail: filled `ink` when the step finished, `ember` for the step currently selected, hollow 2px `ink-3` with the `live` pulse replaced by a 1.2s opacity pulse in `ink` when the step is still running;
- above the circle, `t-small` 600 `ink`: the step name; below it, `m-data` `ink-2`: the time it finished ("‹14:06:13›");
- on the rail between two stations, centred, `t-micro` `ink-3` on a `surface` patch: the time it took ("‹+ 4 min 02 s›").

| Step | Name | What it is |
|---|---|---|
| 1 | Collected | Context.dev monitors and feeds brought the posts in |
| 2 | Read | Models behind the Hostinger AI Router read, translated and pulled out the claims |
| 3 | Checked | The five signals were measured against the watch's baseline |
| 4 | Weighed | Trusted sources and the EUvsDisinfo database were searched for each claim |
| 5 | Packed | The evidence pack was assembled |

Clicking a station selects it (`?step=`). Left / Right arrows move. Step 1 is selected on load.

### 6.2 Step body (two columns under the chain: left 800, gap 48, right 544)

**Left: what happened, in words and counts.** `t-title`: one stored sentence for the step, then a table (rows 40, 1px `line-soft`, label `ink-2` left, value `ink` 600 tabular right, optional third column `t-small` `ink-3`). Shapes:
1. Collected. "The first post appeared at ‹14:02:11›. The ‹Telegram› monitor picked it up ‹3 min 50 s› later." Rows, one per source kind that contributed: "Telegram public channel pages" "‹96› posts from ‹14› channels" · "TikTok hashtag feeds and comments" "‹201› posts from ‹6› hashtags" · "YouTube videos and transcripts" "‹11›" · "Instagram hashtag feeds" "‹48›" · "Reddit" "‹9›" · "News search" "‹31› articles" · "Page monitors" "‹2› pages changed" · "Look-alike domain check" "‹1› domain". Kinds that brought nothing are listed in `ink-3` with "0".
2. Read. "‹412› posts in ‹3› languages were read and ‹5› claims pulled out." Rows: "Model for reading and translation" "‹model name›" · "Model for the second reading" "‹model name›" · "Posts read" · "Posts set aside as off-topic" · "Claims found" · "Techniques named" · "Calls to the AI Router" "‹438›" · "Time" "‹58 s›".
3. Checked. "‹4› of 5 signals fired, so the verdict is 'Looks coordinated: strong'." Rows, one per signal: name, "measured ‹412› in ‹9› min", "needed ‹40› in ‹10› min", and the signal mark at the right.
4. Weighed. "‹6› trusted sources were searched for ‹5› claims." Rows, one per trusted source: name, "‹2› passages found", stance counts.
5. Packed. "The pack holds ‹412› posts, ‹388› accounts, ‹2› page captures and ‹11› quotes." Rows: file names and sizes, the pack's SHA-256 in `m-data`, built at.

Under the table, for steps 2 and 3, one `t-small` `ink-2` line: "Models read and label. The verdict comes from the counts above, by a fixed rule." with the link "See the rule".

**Right: the raw record.** `t-head` "The actual requests". A list of the real calls made in this step (up to 20, newest last), each a disclosure row (40 high): time `m-data`, then the endpoint in `m-data` `ink` ("‹context.dev /v1/telegram/channel›"), then right aligned `t-small` `ink-3` "‹214› ms · ‹200›". Opening a row shows a `ground` box (radius 6, padding 12, max height 280, scroll) with the request parameters and the first 40 lines of the response in `m-micro`, wrapped, with a quiet button "Copy". Keys and tokens are replaced by "‹redacted›" on the server before they reach the browser. These are the strings the server logged for this push. Never a prepared sample.

### 6.3 States

- **Push still being processed:** finished stations are `ink`, the running one pulses, later ones are hollow with "waiting" in `ink-3`. Their bodies say "Not started yet."
- **A step failed and was retried:** its table gains a row "Retries" "‹2›" and the failed calls appear in the raw list with their status in `err`.
- **Raw record older than the retention window:** right column says "Raw requests are kept for ‹30› days. Counts and times remain."
- **Loading:** chain as five hollow circles, body as `sunk` bars.

---

## 7. Screen 4: Evidence pack `/w/<watch>/p/<push>/pack`

Purpose: the thing the analyst forwards. A Read surface that prints exactly as it looks.

**Frame.** Page ground `ground`. A toolbar row 56 under the top bar (`surface`, 1px `line-soft` bottom border, padding 0 24): left, text link `chevron-left` "Back to the push"; right: quiet button `copy` "Copy link", quiet button `download` "Data (.zip)", and the primary button **"Download PDF"** with `download`. Below, centred, one sheet: 794 wide (A4 at 96 dpi), `surface`, 1px `line`, padding 56, 32 above and below. Print stylesheet: no top bar, no toolbar, no sheet border, page breaks before each numbered part, repeating footer "Signal Fire evidence pack ‹SF-2026-00412› · page ‹2› of ‹9›".

Sheet content, in order (the parts are numbered because a reader cites them: "see part 3"):
- The mark and "Signal Fire evidence pack" in `t-head`. Then the push title `t-page`. Then `t-small` `ink-2`: "Pack ‹SF-2026-00412› · built ‹14 Nov 2026, 14:10› Vilnius time · watch: ‹…›".
- **Summary** (no number): the verdict mark and words, then one paragraph built from stored sentences: what was posted, how many posts and accounts, where, when, the fired signals, the evidence tally. Then `t-small` `ink-2`: "Signal Fire flags coordination and weak evidence, whoever is behind it. It does not say who is responsible. Nothing was reported or removed."
- **1. Timeline:** the burst strip at "Whole push" as a static image with its legend and event lines, then at "Peak 10 minutes".
- **2. Why it looks coordinated:** the five signal rows with their measured sentences, then "What could explain it innocently".
- **3. Accounts:** both account drawings, then the top 25 accounts as a table. "All ‹388› are in accounts.csv."
- **4. The text:** the three slabs from "Same text", then the 10 earliest posts with links. "All ‹412› are in posts.csv."
- **5. The site:** the two domains, the two captures, the facts list.
- **6. Claims and sources:** each claim, its tally, each quote with its link and date.
- **7. Wording** and **8. Seen before**, as on the push page.
- **9. How to check this yourself:** a short list: "Open any post link in part 4. Removed posts open as an archived copy." "Look up the domain in part 5 in any WHOIS service." "Read the sources in part 6 at their links." Then the method limits that apply (from Method), the reviewer note if one exists, and the pack's SHA-256.

The .zip holds `pack.pdf`, `posts.csv`, `accounts.csv`, `claims.json`, `captures/`, `README.txt`. After "Download PDF": the button reads "Downloaded" with `check` on `ok-tint` for 4s. No "send", "report" or "submit" button exists anywhere.

---

## 8. Screen 5: New watch `/watches/new`

Purpose: anyone sets up a watch for any war in about a minute. One page, one button.

**Frame.** Two columns centred as a 1128 pair: form 680, gap 48, preview 400 (sticky at top 76). H1 `t-page`: "New watch". Under it `t-body` `ink-2`: "Tell Signal Fire which conflict to watch and who it is aimed at. It starts reading at once and needs about a day to learn what is usual."

Directly under, one row: `t-small` `ink-2` "Start from" then a quiet button menu: "A blank watch" (default) or any existing watch ("‹Russia's war on Ukraine · aimed at the Baltics›"), which fills every field with that watch's values for editing.

### 8.1 The form (sections divided by 32, each an H2 in `t-head` with one `t-small` `ink-2` line; no numbers, no steps)

| Section | Fields |
|---|---|
| **The conflict** — "Name it the way a neutral encyclopedia would." | Text field "Conflict" (required), placeholder "for example: Sudan civil war". Text field "Watch name", prefilled as "‹conflict› · aimed at ‹audience›" until edited. |
| **Who it is aimed at** — "The countries whose public the messaging is trying to reach." | Token field "Countries" with a suggestion list of all countries (type to filter). Token field "Languages", prefilled from the countries' main languages and removable. |
| **What to listen for** — "Words and phrases, in each language." | One token field per chosen language, labelled with its language tag. Quiet button "Suggest in the other languages": translates the tokens of the first filled language into the others and adds them as tokens with a dotted border until the user edits or keeps them. |
| **Where to listen** — "Paste links to public channels, hashtags, subreddits or sites. One per line." | A text area (120 high). On blur or paste each line becomes a row (40 high): platform tag (recognised from the link: `t.me/s/…` TG, `tiktok.com/tag/…` TT, `youtube.com/@…` YT, `instagram.com/explore/tags/…` IG, `reddit.com/r/…` RD, other NW or WB), the address in `m-data`, then a status: a 14px spinner "checking", `check` `ok` "reachable, ‹38› posts this week", or `triangle-alert` `err` "not public" / "not found" / "X is not supported". `x` removes. Below the rows a checkbox, on by default: "Also search news in these languages for the keywords." |
| **Whom to trust** — "Claims are weighed against these. Pick sources that publish corrections and name their evidence." | A checklist of suggested sources for the chosen countries (each row: name, `t-small` `ink-3` what it is, link): for the Baltic watch "ISW daily assessments", "ERR (Estonia)", "LSM (Latvia)", "LRT (Lithuania)", "Official statements: ‹ministries›". A text field "Add a source by address". A checkbox, on by default: "Compare with the EUvsDisinfo database of recorded cases." |

At the end, 32 above: the primary button **"Start watching"**, and beside it `t-small` `ink-3`: "You can change all of this later."

### 8.2 The preview (400, `ground`, radius 8, padding 20), live as the form changes

`t-head` "What this watch will read". Then rows (label `ink-2`, value `ink` 600 tabular): "Sources" "‹23›" · "Languages" tags · "Keywords" "‹41›" · "Trusted sources" "‹5›" · "Sweep every" "‹5 min›". Then, once at least one keyword and one reachable source exist, a real test query (debounced 1s): `t-small` `ink`: "In the last 24 hours these sources carried ‹1,204› posts matching your keywords." with three real example posts as small quote slabs. While it runs: skeleton slabs and "Looking…". If it finds nothing: "Nothing matched in the last 24 hours. Add keywords or sources, or start anyway."

### 8.3 States

- **Validation on submit:** the page scrolls to the first problem and focuses it. Messages: "Give the conflict a name." "Add at least one country." "Add at least one keyword in at least one language." "Add at least one reachable source, or keep news search on."
- **Limits** (a watch costs money to run): at most ‹25› sources and ‹60› keywords. At the limit the field stops accepting and a `t-small` `ink-2` line says "A watch can hold up to ‹25› sources."
- **Submitting:** the button shows the spinner and "Starting…". On success: redirect to the new watch's Home in its first-sweep state (4.4).
- **Failure:** `err` `t-small` beside the button: "The watch was not created. Nothing was saved. Try again."
- **Leaving with unsaved input:** the browser's own confirm. No custom modal.

---

## 9. Screen 6: Method `/method`

Purpose: prove the detection is measured and honest. Read mode: one column 760 wide, with a sticky section list (200 wide, `t-small`, links, current one `ink` 600) in the left margin. Body `t-body` 15 / 26, max 68ch. Section headings `t-title`, 48 above, 12 below. Tables may run the full 760.

1. H1 `t-page`: "How Signal Fire decides, and how often it is right". Under it `t-body` `ink-2`: "A replay of documented campaigns mixed with ordinary war discussion, the rule behind every verdict, and where it fails."

2. **"The replay"**. Paragraph: "‹48› documented coordinated campaigns and ‹120› ordinary bursts of war discussion were fed to Signal Fire post by post, in their original order, as if arriving live. It saw only what was public at each moment. Thresholds were set on a separate third of the cases and are not tuned on these."
   - Then the result as two sentences in `t-title` `ink`, numbers in `ember-text` only where they count pushes: "**It flagged ‹41› of ‹48› coordinated campaigns. It wrongly flagged ‹6› of ‹120› ordinary bursts.**"
   - A segmented control above the table: "Count as flagged:" **"Strong and moderate"** (default) | **"Strong only"**. Every number in this section recomputes from the eval file (`?count=`).
   - The confusion table (2 x 2 plus totals, cells 64 high, 1px `line`, head cells on `ground`): rows "Documented as coordinated", "Ordinary discussion"; columns "Flagged", "Not flagged". Each cell: the count in `t-title` tabular and under it `t-small` `ink-2` the plain name: "caught", "missed", "false flag", "correctly left alone". No colour fills.
   - Under the table three lines, `t-body`: "Catch rate: ‹85›% (‹41› of ‹48›)." "False-flag rate: ‹5›% (‹6› of ‹120›)." "Precision: ‹87›% (‹41› of the ‹47› it flagged were documented campaigns)." Each with a `t-small` `ink-3` gloss of what the term means in one clause.

3. **"Hours before the first public debunk"**. Sentence `t-title`: "Half of the caught campaigns were flagged at least ‹31› hours before anyone published a debunk." Then a chart (760 wide): one row per caught campaign that has a dated public debunk (row 28 high, name at left in `t-small`, 220 wide). A shared horizontal axis in hours from each campaign's first post (0 at left, ticks in `m-micro`). Per row: an `ember` 8px square where Signal Fire flagged it, an `ink` 8px hollow circle where the first public debunk appeared, a 1px `ink-3` line between, and at the right `t-small` tabular "‹31› h earlier" (or `ink-3` "‹4› h later" when it was slower). Sorted by lead time. Legend above. Hover a row: tooltip with both timestamps and the debunk's publisher. Each row is a link to that campaign's replayed push.

4. **"The cases"**. A table: Campaign ("‹Portal Kombat / Pravda network›", "‹Doppelgänger cloned sites›", "‹Operation Overload / Matryoshka›", "‹EUvsDisinfo cases›", "Ordinary discussion: ‹…›"), Documented by (link), Period, Bursts replayed, Flagged, Median lead. Each campaign row expands to its bursts, each a link to its replayed push page.

5. **"One it got wrong"**. One real false flag and one real miss, each as: a `t-head` sentence ("Flagged, but it was ordinary: ‹…›" / "Missed: ‹…›"), a burst strip of that case, and two sentences on why. Picked by rule: the false flag with the most posts, the miss with the most posts. Omitted only if the count is zero.

6. **"The rule"**. The table from 2.6 with the live threshold of each signal and the strong / moderate rule in one sentence. Then: "Models read, translate and label posts. They do not decide the verdict. The verdict is counts against thresholds." Then the fixed list of wording techniques with one line each.

7. **"Running now"**. A two-column table, live on load, with "as of ‹14 Nov 2026, 21:40›" under it: "Hosted on" "Hostinger VPS, ‹region›" · "Up for" "‹41 h›" · "Watches" · "Sources read" · "Posts stored" · "Sweeps today" · "Context.dev calls today" · "AI Router calls today" · "Models in use" "‹names›" · "Pushes flagged, all time" · "Disputed by a reviewer" "‹3›".

8. **"Where it fails"**. A plain list of sentences: "It reads public pages only. Private groups, closed channels and X are not covered." · "Follower lists are not public on every platform. Where they are missing, 'Linked accounts' cannot fire." · "A real community reacting to real news can post fast and alike. That is why the verdict says 'looks', lists what could explain it, and a person decides." · "A patient campaign that posts slowly with old accounts and varied wording will be missed." · "Trusted sources can be wrong or silent. 'Weak evidence' means none of them supports the claim, not that it is untrue." · "English glosses are machine translations. Read the original before acting." · "The replay is ‹168› cases. The rates above carry that much uncertainty and no more."

9. **"What Signal Fire never does"**: "It does not report, remove or block anything. It does not say who is behind a push. It does not judge opinions."

10. End of page: the primary button **"See the strongest push this week"**.

States: every number loading as a 56-wide `sunk` bar. An eval not yet run: the cell reads "not measured" in `ink-3`, the sentences are not rendered. Never a guess.

---

## 10. Phone (390 wide; everything under 700px)

- **Top bar** 52: mark only (no wordmark), the watch switcher truncated to the remaining width, then a 44 x 44 `chevron-down` menu button holding "Pushes", "Method", "New watch" and the live status line.
- **Home:** H1 22 / 28. Paragraph. Primary button full width. Findings band becomes a vertical stack, each finding separated by a 1px `line-soft` rule, fragment full width (the two slabs in "Same text" stack). Chips in one horizontally scrollable row (the only horizontal scroll allowed, right edge faded by a 24px mask). The table becomes rows of 84: line 1 verdict mark and words with first-seen time right aligned; line 2 the title (two lines max); line 3 `t-small` `ink-3` "‹412› posts · ‹388› accounts · " tags.
- **Push:** header stacks; the primary button is full width under the meta line. Section bar scrolls horizontally with the same mask. **The rail moves to the top of the main column**, above Timeline, as a plain block. The strip: plot height 150, the three zoom segments full width under the header sentence, "By platform" and the icon buttons on a second row. Tapping a column selects it. The two account panels stack. The three slabs in "Same text" stack with the differing words still shaded. The two page captures stack. Tables become two-line rows (time and handle on line 1, text on line 2).
- **Trail:** the chain turns vertical at the left (rail on x=28), each station a row with name, time and duration; tapping one expands its body in place under it. The raw record sits under each step's table.
- **Pack:** the sheet is full width with 20 padding. Toolbar: primary full width, the two quiet buttons half width under it.
- **New watch:** one column. The preview becomes a collapsed bar pinned above the primary button: "Will read ‹23› sources · ‹41› keywords" with `chevron-down` to expand.
- **Method:** one column, no section list. The confusion table keeps its 2 x 2 shape. The lead chart drops the name column into a line above each row.

---

## 11. The 2:00 video (every beat is a real click on the live site, 1440 x 900)

Before recording, pick the push from live data by this checklist and write its id in the shot list. If no live push meets it on the day, use the most recent one that does, and if that is a replayed case its "Replay" strip stays on screen. Never stage data.
- **Push A:** verdict strong; aimed at Lithuania, Latvia or Estonia; Same minute and Same text both fired; a look-alike domain exists; at least one claim with sources against it; at least one EUvsDisinfo match; posts on two or more platforms.

| Time | Voice | Screen | Action | What the viewer learns |
|---|---|---|---|---|
| 0:00–0:07 | "Every war is fought twice. Once on the ground, and once in the minds of people who will never see it. Anyone with a phone." | Push A, Timeline enlarged (`maximize-2`), "Whole push" | Pointer rests. Grey squares scattered, one ember tower. | Something stands out. |
| 0:07–0:14 | "The second front doesn't need soldiers. It needs a thousand accounts saying the same thing at the same minute." | same | Click "Peak 10 minutes". The squares re-bin into a wall. Hover the tallest column. | The signature: one square is one post. |
| 0:14–0:24 | "To show you, let's take one place: the Baltics." | Home | Click the wordmark. H1 with the watch name, the three findings, the live table and status. Pointer on the Swarm finding. | What the product is, where it is pointed, that it is live. |
| 0:24–0:34 | (describe the push in one line) | Push A | Click "See the evidence". Header verdict, the rail's reasons. Click "Same minute", then "By platform". | A real push at Lithuania, with reasons. |
| 0:34–0:46 | | Accounts, Same text | Click the rail row "New accounts": the creation tower. Click "Same text": three slabs, a few shaded words. | New accounts, one text. |
| 0:46–0:58 | | Site, Claims | Press 4: two domains, two captures. Press 5: "0 sources for, 4 against", one ISW or LRT quote. Press 6 then 7 briefly. | Cloned site, weak evidence, named technique, seen before. |
| 0:58–1:18 | (how it works) | Trail | Click "How we found this". Click stations 1 to 5 in turn. On 1 open one raw Context.dev request. On 2 pause on the AI Router rows. On 3 the signals table. End on the "‹8 min›" sentence. | The pipeline is real, visible and fast. |
| 1:18–1:27 | | Pack | Back, click "Open evidence pack". Scroll the sheet. Click "Download PDF". | The output: a pack for a trust team. Nothing is reported by us. |
| 1:27–1:46 | (benchmark) | Method | Click "Method". The two result sentences, toggle "Strong only" and back, the lead chart, "One it got wrong". | Catch rate, false-flag rate, hours ahead, honest limits. |
| 1:46–1:53 | | New watch | Watch switcher, "New watch". Type a different conflict, add a country, paste two links: rows resolve, the preview counts. Do not submit. | Any war, any language, in a minute. |
| 1:53–2:00 | "The first war is fought by soldiers. The second one, we can see coming. Signal Fire." | Home | Click the wordmark. Title added in the edit. | |

Recording rules: no cut may hide a loading state longer than 1s (pre-warm the routes). Every number on screen is the live value. Account handles are public and stay unblurred in the product; the edit may blur them in the video.

---

## 12. Data the screens need (so no copy is invented in the browser)

**Watch:** `slug`, `name`, `conflict`, `audience` (phrase used in the H1), `countries`, `languages`, `keywords` per language, `sources` (kind, address, status, last read), `trusted_sources`, `timezone`, `sweep_interval`, `last_sweep_at`, `sweeping`, baseline rates per keyword set by hour and weekday.

**Push:** `id`, `pack_id`, `title` (neutral, 90 characters max), `verdict`, `status` (active / ended), `first_post_at`, `last_post_at`, `flagged_at`, `rechecked_at`, `is_replay` with `replay_of_period` and `replayed_at`, counts (posts, accounts, removed), `platforms`, `languages`; `signals[5]`: `key`, `fired`, `measurable`, `measured`, `threshold`, `baseline`, `reason` (the sentence); `innocent_explanations[]`; `finding_sentences` per kind; `review` (reason, at) or null.
**Posts:** `id`, `platform`, `account`, `posted_at` (to the second), `lang`, `text`, `gloss`, `url`, `archive_url`, `removed`, `views`, `in_push`, `variant_id`, `links[]`. Baseline posts on the same keywords for the strip's window are stored with `in_push = false`.
**Strip:** served as per-post timestamps and flags (the browser bins them), plus `usual_rate` and `events[]` (label, at, kind).
**Accounts:** `handle`, `platform`, `url`, `created_at`, `followers`, `posts_in_push`, `mutuals_in_push`, `other_pushes`, stored `x`, `y`; `edges[]`.
**Variants:** `id`, `count`, `similarity`, `languages`, three example post ids, per example `diff_spans` (character offsets).
**Sites:** `lookalike_domain`, `real_domain`, `real_owner`, both `registered_at`, `registrar`, `host`, `diff_spans`, two capture images with times, `copied_from_url`, `copy_similarity`, `sibling_domains[]`, `first_linked_by`, `link_count`.
**Claims:** `text` (neutral restatement), `post_count`, `checkable`, `evidence` (weak / disputed / supported / unchecked), `sources[]`: `name`, `stance`, `passage`, `url`, `published_at`.
**Techniques:** `name` (from the fixed list), `explanation`, example post id, `marked_spans`, `post_count`. **Seen before:** `title`, `url`, `recorded_at`, `outlet`, `languages`, `match` (close / loose).
**Trail:** per step `started_at`, `finished_at`, `status`, `sentence`, `rows[]` (label, value, note), `calls[]` (at, endpoint, duration, status, redacted params, response head).
**Benchmark:** read from eval files at request time: cases (campaign, documented by, url, period, kind, verdict given, flagged at, first debunk at and publisher, push id), thresholds, split.

If a field is missing the element that needs it is not rendered. Never a blank label, "undefined", "N/A" or a zero standing in for "not measured". Every stored sentence is written at detection time to the fixed patterns in this file and never generated in the browser.

---

## 13. Do not

- No "fake", "propaganda", "disinformation", "lie", "bot", "troll", "enemy", "attack" as labels. No naming of who is behind a push. No truth verdict: only "for", "against", "weak", "disputed", "supported", "unchecked".
- No "AI", "AI-detected", "model", "confidence", "risk score", "threat level" or percentages of certainty on Home, Push or the pack. Models are named on the trail (step 2) and on Method only.
- No dark theme, no near-black panels beyond the 52px top bar, no neon, no glow, no gradients, no glass.
- No world map, globe, radar sweep, crosshair, hexagons, matrix rain, terminal styling, flags or military imagery.
- No red alert banners, no blinking, no sirens. The only pulsing thing is the 8px live dot during a sweep.
- No demo mode, seeded push, canned finding, autoplay, tour or "next step" key. No hard-coded figure, quote, handle, domain or date.
- No coloured left or right border on rows, cards, slabs or callouts. No coloured card grounds. Ember and plum only as defined in 2.3.
- No cards on Home. No hero-metric tiles anywhere, including Method: rates are sentences and a table.
- No sparklines, progress rings or gauges. The only charts are the burst strip (and its accounts form), the network drawing and the lead chart, each with an axis or legend and real units.
- No label above a heading, no uppercase tracked labels, no mono for labels or headings.
- No modal dialogs. Reviews are inline, raw requests are disclosures, the pack is a page.
- No brand logos of platforms or broadcasters. Tags and names in text only. No copy of a broadcaster's logo outside the real page captures.
- No button that reports, removes, blocks, sends or submits to a platform. Signal Fire copies links and downloads files.
- No second primary button on any screen. No dead buttons, placeholder pages or "coming soon".
- No chat, assistant avatar, typing dots or streamed text.
- No physics, drag or zoom on the network drawing. No animation on it at all.
- No truncating a quote mid-sentence without "…" and a way to read the whole.
- No horizontal page scroll at 390 or 1440. No overflow with long Lithuanian, Russian or Estonian words: `overflow-wrap: anywhere` on quotes, `hyphens: auto` with the correct `lang` on every quoted element.
- No font other than the two named, and no fluid type.

---

## 14. Acceptance: screenshots Codex must produce and check

Save to `screenshots/signalfire/` as PNG from the deployed Hostinger site with real data. Desktop is 1440 x 900, phone is 390 x 844.

1. `01-home-desktop.png`: Home, three findings, six rows, live status in the bar.
2. `02-home-organic-desktop.png`: "Looks organic" chip on, cleared spikes visible.
3. `03-home-first-sweep-desktop.png`: a new watch in its first-sweep state.
4. `04-push-top-desktop.png`: Push A, header, strip at "Whole push", rail.
5. `05-push-peak-desktop.png`: strip at "Peak 10 minutes", one column selected, posts table filtered.
6. `06-push-lanes-desktop.png`: "By platform" lanes with the order sentence.
7. `07-push-accounts-desktop.png`: creation strip, network drawing, accounts table.
8. `08-push-same-text-desktop.png`: three slabs with shaded differing words.
9. `09-push-site-desktop.png`: two domains, two captures, facts.
10. `10-push-claims-desktop.png`: a claim with its tally and quotes.
11. `11-push-wording-seen-desktop.png`: Wording and Seen before.
12. `12-push-review-desktop.png`: the "looks organic to me" form, then `13-push-reviewed-desktop.png` settled.
13. `14-push-organic-desktop.png`: a "Looks organic" push (all grey strip, no primary).
14. `15-trail-step1-desktop.png` (one raw request open), `16-trail-step3-desktop.png`.
15. `17-pack-desktop.png` and `18-pack-print.pdf` (the real PDF).
16. `19-new-watch-desktop.png`: filled for a different conflict, sources resolved, preview with example posts.
17. `20-method-replay-desktop.png`, `21-method-lead-desktop.png`, `22-method-wrong-desktop.png`.
18. `23-home-phone.png`, `24-push-phone.png`, `25-trail-phone.png`, `26-new-watch-phone.png`.

Checks to run and report with the screenshots:
- **5-second test:** on 01 the words "war", "pushed at", "same thing at the same minute", "trusted" and "never reports or removes" are visible above the fold, with one burst strip and one pair of identical posts.
- **One primary:** count the `ink` filled buttons on every screenshot. The answer is 1 (0 on an organic push and on Home with no coordinated push).
- **Real data:** no `‹` or `›` anywhere in the rendered site. Every count on Home, Push and Method equals a direct database or eval-file count run at the same moment (attach both).
- **Squares are posts:** on Push A at each zoom, the number of ember squares times the unit equals the push's post count within rounding, and clicking five random columns lists exactly the posts in that time slice.
- **Quotes are exact:** for 10 random posts and 10 random source passages, the text on screen is a substring of the stored original, and every external link opens the original or its archived copy.
- **Verdict is the rule:** for every push in the list, recomputing 2.6 from its stored signals gives the verdict shown.
- **Trail is real:** each raw request shown equals the server log line for that call with secrets redacted, and step times sum to the headline duration.
- **Benchmark is real:** the confusion table equals the eval file under both settings of the toggle, and every lead-chart row's two timestamps match the case file.
- **Pack matches:** the PDF's counts, verdict and quotes equal the push page, and the .zip row counts equal the post and account counts.
- **Review persists:** mark a push as organic, open it in a second browser with no cookies: the note is shown and Method's "Disputed by a reviewer" is one higher. Reopen restores it.
- **New watch works end to end:** create a watch for another conflict with two sources; its Home shows the first-sweep state and the top bar status counts its sources.
- **Keyboard only:** open the strongest push from Home, cycle zoom with Z, visit all seven sections with 1–7, open the trail with T and walk its stations with arrows, open the pack with E.
- **Marks without colour:** in a greyscale 04, push squares and other squares are still told apart (ember is darker than slate: verify 3:1 against white for both and a visible step between them; if not, give other posts a hollow square).
- **Contrast:** every text pair 4.5:1 or better (check `ink-3` on `ground`, `ember-text` on `surface` and `teal-tint`, `plum` on `surface`, `on-night-2` on `night`). Every mark 3:1 or better.
- **Fonts:** a Russian post, a Lithuanian post and an Estonian post all compute to Golos Text with no fallback glyph. Handles, times and domains compute to JetBrains Mono.
- **Reduced motion:** the zoom, the lanes and the enlarged strip reach their end states instantly, and the live dot is steady.
- **No overflow:** at 390 and 1440, no horizontal page scroll and no clipped text with the longest real title and the longest real domain in the data.

## 15. Chief decisions (Sun 00:20, binding; these settle every open question above)
1. **Verdicts.** Strong and moderate are the shown verdicts. "Looks organic" (a spike that was checked and cleared) and "Not enough data" are allowed. Organic is hidden on Home by default and reachable through a filter. Never "fake", "propaganda" or "bot".
2. **Who decides.** The verdict is counts against thresholds (2.6), exactly as written here. Models (Hostinger AI Router, with Gemini flash for bulk triage) group posts into a narrative, extract and weigh claims, translate, and label wording. A push is shown only when the Router agrees the posts carry the same narrative AND the counts reach moderate or strong.
3. **Thresholds.** They are tuned on the benchmark dev split only, then frozen. The live values are printed on Method.
4. **Data availability.** Codex confirms per platform what Context.dev returns (account creation date, followers, mutual follows) and what RDAP gives (domain age). Where a value can't be had, the section says "Could not be measured on ‹platform›" and that signal is left out of the count. It is never guessed.
5. **Video push.** A live strong push is preferred. If none meets the Push A checklist by recording time, the video uses a documented benchmark campaign, with its "Replay" strip visible. Never a constructed example.
6. **Open access and cost.** New watch and "This looks organic to me" need no login. A new watch is visible only to its creator (a cookie link), expires after 24 hours, and is capped at 25 sources and 60 keywords. There is a global daily Context.dev cap; at the cap the form says "New watches are paused until tomorrow." Home shows only the shipped Baltic watch. E2E watches are deleted after the run.
7. **Handles.** Shown in the product and the pack, because the posts are public and a trust team needs them. The verdict is about the push, never about one person. Copy never calls an individual coordinated. The video blurs handles of accounts under 1,000 followers.
8. **Engineering choices.** PDF route, canvas or WebGL, retention and sweep interval are Codex's. Defaults: print stylesheet plus server-side PDF, canvas, 30 days, every 30 minutes within budget.
9. **Naming.** Two-letter platform tags with no logos: yes. The section stays "Wording"; the pitch may say "technique".

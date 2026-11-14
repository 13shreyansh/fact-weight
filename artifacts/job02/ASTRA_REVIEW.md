# Signal Fire independent review

Initial review, 15 November 2026 Helsinki. Source and local server were changing during review. Findings below describe the inspected version and require re-review after fixes. No source edits, provider calls, external writes, deployment or additional agents were performed. Only this report was written by the reviewer.

Spec fit: **FAIL**. Build quality: **FAIL**.

## Verification performed

- Read ../AGENTS.md, ../DESIGN-FLOOR.md, DESIGN-DIRECTION.md including section 15, and ../kit/TASTE-GATE.md.
- Independently ran `node --test test/signal-*.test.mjs`: 6 passed, 0 failed.
- Independently ran `npm test`: 21 passed, 1 failed. `test/server.test.mjs:14` expects the old Fact Weight landing copy.
- Read the detector, collectors, normalizer, provider ledger, server, exports, benchmark scripts and frontend.
- Inspected local desktop and phone screenshots for Home, Push, Trail, Method and New watch. They are local smoke artifacts, not deployed acceptance evidence.
- Ran independent headless Chromium navigation through Home, Push, Trail, Method and New watch. No page errors or horizontal overflow at 1440. The served brand image was broken because the running process returned text/html for SVG; current source has a passing regression fix, but the running server had not yet picked it up.
- Used read-only SQLite for live record checks and in-memory fixtures for detector, chart and budget reproductions. Never printed provider secrets or raw provider metadata.

## Build findings

1. **P1: Same text is overridden without measuring the published threshold.** `scripts/alternate-groups.mjs:3` marks every publisher-declared alternate as a copy and fires the signal. At review time `a0b9359237b2` claimed 10 copies, while the actual seed shingle rule found 5; `a6b0d22b1d61` claimed 15 and measured 2; `aa9426e2b5e6` claimed 15 and measured 1. The latter two were shown as strong. This contradicts the four-word shingle threshold printed on Method. Translation relationships can identify candidate groups, but must not silently replace the frozen signal definition. Parent has acknowledged and is fixing this. Recompute and replace affected persisted pushes, not just the script.

2. **P1: Missing matching baseline observations become a measured zero.** `signal/detect.mjs:14-20` requires seven observed dates anywhere, then divides matching-hour/weekday counts by at least one even when there are no matching observations. Reproduction: eight posts on 14 November 2026 at 12:00, with prior posts on seven dates all at 00:00. `measure()` fires timing and reports usual rate 0.0. There is no observed matching-hour sample. Track collection coverage and distinguish observed zero from unknown. Do not fire timing on an unknown baseline.

3. **P1: Failed retries overwrite the budget and audit ledger.** `signal/providers.mjs:23-24` uses the request cache hash as the attempt ID and `INSERT OR REPLACE`. Independent in-memory reproduction with mocked HTTP 429 responses: three outbound attempts leave one ledger row and 10 reserved credits, rather than three rows and 30. Repeated failures therefore disappear from daily/job limits and the trail. Give every attempt a unique ID, keep the cache key separately, and make reservation/check atomic across collector processes. The same-millisecond fresh-ID suffix is also not collision-proof.

4. **P1: Scheduled watches do not perform the evidence enrichment advertised by the UI.** `signal/sweep.mjs` calls `judge()` with `sources:[]`; `signal/store.mjs:7-10` initializes `sites:[]` and `seenBefore:[]`. The selected `trusted` and `seenBefore` watch settings do not control a working check. Consequently scheduled pushes have no claim source checks, and empty Site/Seen before sections say no result was found even where no corresponding check ran. Wire enrichment into the scheduled path and record each check's completion, failure or unavailable status. Parent is correcting this path.

5. **P1: The default start command launches the wrong application backend.** At review time `package.json` still ran `node server.mjs`, the old Fact Weight API, while `public/index.html` loads the new app that calls `/api/state`. The normal launch therefore cannot serve Signal Fire end to end. The full test suite also fails on the old landing expectation. Point the default start and service launch to the new server, and isolate or update the retained legacy landing test without weakening its purpose.

6. **P1: Original post provenance is dropped and claim-source calls are presented as collection calls.** `scripts/normalize.mjs:9-11` omits `call:d._call` for videos, posts and news. All four Reddit posts in push `4551e298ca84` have no call ID. `/api/push/:id/trail` unions post and evidence-source calls; `public/app.js:53` puts every Context call in Collected. For that push the ten displayed collection requests are LRT/Yle/ISW claim-source pages, not Reddit retrieval. Store provenance on every normalized record and distinguish Collected from Weighed call IDs. Backfill existing records where provenance can actually be established.

7. **P2: The peak chart drops a post exactly at the ten-minute endpoint.** `signal/detect.mjs:11` includes timestamps with a difference of exactly 600000 ms; `public/app.js:48` bins with an exclusive upper bound. Independent in-memory rendering of two posts at 12:00 and 12:10 yields peak 2 but one drawn square and table count 1. Use a common interval convention in measurement, plotting and slice filtering.

8. **P2: Restoring the URL does not restore the selected chart state.** `public/app.js:43,48-52`. Independently opened `.../p/4551e298ca84?zoom=10min&lanes=1&slice=3`: the By platform control says `aria-pressed=false`, Together says true, and the slice label/table are unfiltered. Apply lanes, selected bin and variants from the URL after layout; update state when zoom changes. This is required for copied evidence links to reproduce the view.

9. **P2: New watch sweeps can be silently discarded, and the empty-state status is false afterward.** `signal/sweep.mjs:2-3` returns immediately whenever any other watch is active; the create handler does not queue a retry. `public/app.js:30` labels every private watch without a coordinated push as first sweep running, even after failure or successful completion. Queue watch work and render stored running/complete/partial/failed states. Verify concurrent watch creation and a completed sweep with zero findings.

10. **P2: CSV exports do not neutralize spreadsheet formulas from public text.** `signal/export.mjs:2,17` only quotes CSV delimiters. An untrusted post or handle starting with `=`, `+`, `-` or `@` remains a formula when opened in common spreadsheet applications. Escape formula-leading cells for the human CSV export and retain exact original text in a clearly identified raw JSON export if needed. No malicious live input was submitted.

## Incomplete requirements, separate from bugs

- Deployment is blocked. No deployed commit verification, Mac-independent operation, deployed desktop/phone E2E, or full 2-minute acceptance flow has been established. Local screenshots cannot pass the taste gate.
- The campaign benchmark, dev-only threshold tuning/freeze, held-out coordination confusion tables, verified lead times and documented wrong case are incomplete. The content-only CIKM screening experiment is a different task. It must not be substituted for campaign accuracy. The current Method copy correctly avoids claiming those results.
- `drawPlot()` receives only push posts. There is no ordinary-topic background corpus in the chart even though its description and legend promise grey other posts. The signature visual comparison is incomplete. Missing background data must be stated explicitly until measured.
- Site captures/domain evidence, Seen before matching, a populated account-creation chart/network when data exists, multiple text variants and glosses are incomplete. Unknown account/follower data must remain unknown.
- Home currently renders one finding at most rather than the three specified finding types. Existing screenshots also predate the newly assessed alternate groups. The full specified screenshot set has not been produced.
- The supplied `scripts/local-check.mjs` is a page-opening smoke test with a fixed small-cluster ID. It does not exercise zoom/slice correctness, review persistence from a second browser, source resolution/watch creation and cleanup, exports versus database counts, keyboard flow, or the deployed URL. Expand it around actual available records; do not invent Push A.

## Release decision

Do not mark this build or the taste gate as passing. Fix the verdict, baseline, budget, provenance and launch defects first; rerun the independent checks against a restarted build. Then complete deployment and the remaining acceptance work, or report those requirements explicitly as blocked/incomplete. No invented replay or early-detection figures are an acceptable workaround.

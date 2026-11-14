# Targeted re-review, current source

Reviewed source commit `a63c2c9371ab041b63a346527d451ca86c7aac9c` on Node 24.21.0. The implementation agent was preparing another release during this review. This section supersedes the initial review below where a finding is marked closed.

Spec fit: **FAIL, acceptance still incomplete**. Build quality: **FAIL, three reproduced P1 defects remain**.

## Independently verified fixes

- `npm test`: **35 passed, 0 failed**. This includes the new webhook signature, monitor-identity, inbox deduplication, retry accounting, shingle-membership, unknown-baseline, endpoint and CSV checks.
- Recomputed all three currently shown moderate pushes from their stored posts and the current detector. All three remain moderate: `a6b0d22b1d61` has 10 copied posts of 17; `aa9426e2b5e6` has 13 of 20; `nab032987aff` has 7 of 9. No timing signal is needed. The former publisher-alternate override is removed. Strong remains zero.
- Unknown matching-hour/source-family baselines now stay unknown. Prior P1 findings 1 and 2 are closed for the inspected source and current moderate records.
- Provider attempts now use UUIDs and atomic SQLite reservations. Failed retries remain separate. Prior P1 finding 3 is closed for direct provider calls.
- Scheduled work now calls enrichment, queued sweeps no longer silently drop competing jobs, and `npm start` points to Signal Fire. Prior P1 findings 4 and 5 and the dropped-sweep part of P2 finding 9 are closed in source.
- New normalized records carry call IDs and the trail separates collection from weighing. The three moderate pushes have call IDs for every post. Retained historical small clusters still lack original collection call IDs, so their provenance is incomplete rather than repaired by inference.
- Source contains the inclusive endpoint fix, URL lanes/slice restoration, background-post rendering, CSV formula escaping, and a raw original-post JSON export.
- HMAC verification checks original bytes, a five-minute timestamp window, duplicate signature fields, envelope identity and the registered monitor. Signing secrets use authenticated encryption and are redacted from stored responses. Tests passed independently; this is not evidence of receipt from the real Context service.
- Both submission description bodies contain exactly **130 words**.

## Remaining reproduced P1 defects

1. **A failed sweep permanently acknowledges the webhook event.** `signal/monitors.mjs:219-234` marks every resolved sweep as `processed`; `signal/sweep.mjs` catches provider, budget and processing failures and resolves a run with `status: failed` or `partial`. Independent in-memory reproduction using the current `processInbox`: a stub sweep resolves `{id: failed-sweep, status: failed, errors: [...]}` and the event becomes `processed`. That change will not retry. Inspect the returned status and preserve durable retry/backoff or explicit partial/failed work. Startup recovery of interrupted `processing` events is already present and is not a finding.

2. **Finishing a PDF can overwrite a newer push or undo withdrawal.** `signal/packs.mjs:5-45` takes a snapshot, awaits PDF generation and filesystem operations, then writes the entire old push back. Independent in-memory reproduction: start a pack for an old push; store a newer title with `excluded: true`; finish the pack. The saved title becomes old and the exclusion disappears. A download can therefore reverse a recheck. Use revision-bound content files and compare-and-swap of pack metadata, or reject the stale result after rereading. Also include every rendered field in the cache identity, including title, claim, verdict, techniques, sites, seen-before and explanations, which the current cache key omits.

3. **The advertised PDF SHA-256 is not the file's SHA-256.** `signal/providers.mjs:hash`, `signal/packs.mjs:39`, and the PDF response header in `signal/server.mjs` pass a Buffer through JSON.stringify before hashing. Independent read-only verification with standard Python `hashlib.sha256(file_bytes)` failed against the stored hash for all four active local records with packs: `a6b0d22b1d61`, `a97b30b3019f`, `aa9426e2b5e6`, and `nab032987aff`. The current value hashes the JSON Buffer representation, not the PDF bytes. Treat Buffer/Uint8Array as bytes and refresh existing metadata, including cache-hit paths. Current PDF text extraction found the expected title and claim prefixes and no out-of-page text blocks. Existing `artifacts/pdf-check` images show an older eight-page render, while the current main packs have twelve pages, so those images are not current visual acceptance.

## Remaining limits and follow-up checks

- Public check of `https://signal-fire.72.61.22.106.sslip.io/api/health` through independent headless Playwright returned plain `404 page not found` during release preparation. No deployed commit was verified in this pass. This observation does not negate the owner's previous deployment evidence; it blocks claiming this reviewed source is the current deployed release.
- Campaign replay, frozen campaign thresholds, full deployed E2E, the complete screenshot/taste gate and the deployed Context cut remain open. Content screening and observed historical delays must not replace campaign accuracy or lead time.
- Monitor spend is recorded after remote runs and the guard pauses on a one-minute timer with a fixed 150-credit buffer. Direct-call caps are now durable, but a strict global daily cap for many recurring monitors is not established: account for the active monitor count, worst-case next-run spend and delayed/missing run webhooks before claiming a hard bound.
- New envelope deduplication is tested, but its record insert and monitor-run accounting are separate writes. Consider making receipt, accounting and monitor metadata one transaction so a crash cannot retain a dedupe marker while losing the associated billing record.

No source files, live records, monitors or deployment state were changed by the reviewer. Only this report was updated. The new defect reproductions used mocked in-memory dependencies; no provider credits were consumed.

---

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

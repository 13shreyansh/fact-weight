# Fact Weight handoff

Updated 2026-11-14T17:58+02:00, Helsinki. C-09 build delivery DONE.

- Live [https://fact-weight.72.61.22.106.sslip.io](https://fact-weight.72.61.22.106.sslip.io) on the existing Hostinger KVM 2, not Vercel.
- Public MIT repository https://github.com/13shreyansh/fact-weight . External sources retain their rights.
- Runtime release/image `c465b5ffd39022c7e08af038087b7a6033372074`, container `fact-weight`, app `0.3.0`. Later Git commits containing this handoff are documentation only; do not infer that they were deployed.
- Release path `/opt/fact-weight/releases/c465b5ffd39022c7e08af038087b7a6033372074`. Own environment `/etc/fact-weight.env`, mode0600. Never print its values.
- App listens on container4320, bridge network, no published host port. Existing host-network Traefik routes the own hostname with its existing `letsencrypt` resolver. Memory384MB,0.5CPU,64PIDs, read-only rootfs.
- Do not touch Spread's dispatcher, policy, service or `/etc/junction-spread.env`. Do not reboot, replace templates, restart Traefik, reset passwords, introduce another Spread writer or add SSH credentials. Spread PID15545 stayed active through deployment and the five-minute check.
- Browser/account/UI work uses Codex IAB only. This project chat lacks IAB; Chief has the authorized console. Do not use personal Chrome or other browsers. Local coding/build/test/secret-safe CLI work remains allowed when necessary.

## Verified

13 local contract tests. Real Context.dev search, PDF/article extraction and fresh re-fetch. Real Hostinger Router post extraction/comparison and Claude Fable5.2 veto requests. Public IAB two-claim run11,959ms, correct displayed relations to the Council report,0 rejected citations, parsed exports, original source opened, fresh unchanged-page check3,044ms. Provider model response IDs were reused on re-fetch, so no fresh-inference claim. Trusted HTTPS. See eval/LIVE_CHECKS.md for IDs and evidence.

## Evaluation and risks

Do not headline the easy synthetic40/40. Fresh final source-derived stress set22/24 vs baseline23/24,1 false flag among18 negative cases,1 malformed-response failure. Bounded JSON retry repaired that failure in a repeated regression23/24; false flag remains. These are agent-constructed labels against dated documents, no human expert labels, calibration or broad real-world disinformation accuracy. Source grouping is heuristic and cannot prove independence. The reference pool is incomplete and institutionally skewed. Checkable claims can still be misinterpreted despite valid quotes and a second model family.

One remaining false flag concerns an unsupported specific cash amount treated as contradicted by a broad passage. Current code is pinned after public verification; any semantic improvement needs a new development hypothesis and a fresh independent test, not a relabelled old holdout. Fresh metrics and all unsuccessful versions remain in eval/LEDGER.md.

The service has bounded concurrency and150 analyses per process per day. Restart resets the counter, so this is not a durable billing cap. Provider credits are used; euro costs were not measured. Source text is limited to18,000 normalized characters per page. Minor2px mobile document overflow has no visibly clipped element and is retained under the release freeze.

## Remaining user-owned event steps

Record the public video using DEMO_SCRIPT.md, at most2:00. Use PEER_REVIEW.md for the five-minute pitch. The main entry is Hostinger, with Context.dev as a technology prize only. Final competition submission and video publication were not performed or authorized by this build. Final deadline Sunday15November2026,10:00Helsinki.

## Safe maintenance

The initial installer aborts if the own container already exists. Do not rerun it as an update strategy. Prepare a reviewed release and an own-app-only update separately if needed. Never inspect or dump Docker Env or the ACME private JSON. Read-only checks: own container status/health, public /api/health and Spread ActiveState/SubState/MainPID. No automated final submission or account change is configured.

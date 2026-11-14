# Live integration checks

These are measured requests, not human-labelled accuracy tests. Local checks precede public VPS verification.

## Discovery and extraction

14 November2026, Helsinki. Actual local /api/analyze returned HTTP200 in11,340ms. Context.dev search request `d32078eb-1b13-43e6-920f-cc121cb926d2` found an EU Council report and three ERR pages. PDF extraction `2fe3ff9e-1b07-4205-ad28-7f961c3fe881` succeeded. ERR extractions returned too little usable text, and each failure was visible as a warning. The app analysed only the successful document.

Source: [Council report ST6668/2025,4 March2025](https://data.consilium.europa.eu/doc/document/ST-6668-2025-INIT/en/pdf). This is one institutional document, not independent corroboration from four sources.

The first graph added two claims found only in the document. Fixed by separating post-only claim extraction from comparison. This failure is retained in the ledger.

## v4 two-claim check

Same document, fresh Context.dev request `0ddddde5-06a5-4995-a77a-db20a1b0bd52`, provider cache miss. Router extraction `chatcmpl-EkA1Iz4gu3y2N5COHu6ODU7PanKTX`, comparison `chatcmpl-EkA1KBbOEUbFWPR3jb4lTSCSNqSPs`. HTTP200,7,178ms total, exactly two claims, no added claims. One supported synchronisation date and one contradiction about consumer interruption, each with a verified source passage.

Demo input:

> Estonia, Latvia and Lithuania synchronised their electricity systems with continental Europe on 9 February 2025. Consumers were affected by power interruptions during the frequency stability tests.

The expected relation is to the Council report only. This is not a statement about every interruption or every consumer anywhere. No human review, bot detection or manipulation-intent inference was measured.

## Remaining at this checkpoint

Public Hostinger HTTPS request, browser desktop/mobile use, fresh-page comparison and own-container isolation verification. Do not mark those complete until observed.

## JSON-repaired live flow, 2026-11-14T17:43+02:00

Attempt 1: HTTP200, exactly 2 claims, labels supported, contradicted. Total 10588ms. Syntax retries 1. Context.dev request `f4bef84e-f2b4-429f-a8ec-fa5b565f4d45`, provider cache miss, text hash `6117a9a6fae5673d27f3e254533a8995414b0d721c656fa4b689a6713ff7a58e`, changed=None. Independent-family checker `claude-fable-5.2`, request `msg_vrtx_011Ch35L3GFNJGDRdQeTRyeY`.

Attempt 2: HTTP200, exactly 2 claims, labels supported, contradicted. Total 3487ms. Syntax retries 1. Context.dev request `8738b5ae-981d-4294-8c39-d1fb8d0b001e`, provider cache miss, text hash `6117a9a6fae5673d27f3e254533a8995414b0d721c656fa4b689a6713ff7a58e`, changed=False. Independent-family checker `claude-fable-5.2`, request `msg_vrtx_011Ch35L3GFNJGDRdQeTRyeY`.

## Public Hostinger verification passed, 2026-11-14T17:58+02:00

Live URL: https://fact-weight.72.61.22.106.sslip.io. Runtime release `c465b5ffd39022c7e08af038087b7a6033372074`, app version `0.3.0`. Chief IAB used the existing VPS console, verified five reviewed file hashes and created only our mode0600 environment through hidden getpass prompts. Own Docker container healthy, bridge networking, no published host port. Spread MainPID15545 active before and after deployment and at the five-minute read-only check. No Traefik/Spread restart or configuration change.

Initial default/self-signed certificate was an ACME issuance delay. No browser warning was bypassed. The normal HTTPS reload succeeded after a valid Let's Encrypt YR2 certificate for the exact hostname was issued. A separate strict Python default-context TLS handshake also passed. Public health and evaluation endpoints returned200 with normal certificate validation.

Public constructed example: exactly2 original-post claims, supported synchronisation date and contradicted consumer-interruption claim, each with original post anchor, Council passage, source and retrieval timestamp.0 rejected citations. Measured public request11,959ms.

- Context.dev extraction `296c25f2-00f1-4623-87c1-8d59b139a349`.
- Router post extraction `chatcmpl-EkAKVwBTtLQnRkUSaz1r0gk4Akocv`.
- Router comparison `chatcmpl-EkAKWwJufTGtPxFtsoJGP4knD2ZaG`.
- Fable relation check `msg_vrtx_011Ch3647c7evgDcjCWXxKtN`.

Public Check pages again:3,044ms, new Context.dev extraction `e51a7359-a203-4546-8cf9-06664ed52f82`, same extracted-text hash `6117a9a6fae5673d27f3e254533a8995414b0d721c656fa4b689a6713ff7a58e`, changed=false. Router IDs were reused, so this does not establish fresh model inference. The app made provider requests; provider response reuse/caching can reduce later latency.

Both public evidence exports parsed with2 claims. Source link opened the actual Council PDF in IAB. Desktop and390px mobile usable. Mobile document width was392px with no element clipped beyond391px, a minor2px overflow retained under the pinned-release freeze. Functional inspection was performed by the Chief, not a calibrated human design study.

Screenshots: `.impeccable/review/public-desktop.jpg`, `public-mobile.jpg`, `vps-deployed.jpg`. First failing local browser captures are retained alongside the passing captures. Public video and final competition form submission were not performed. C-09 authorized build delivery is complete.

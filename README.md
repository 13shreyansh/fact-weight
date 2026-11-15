# Signal Fire

Signal Fire reads public war discussion and shows evidence of coordinated publishing: timing, repeated wording, account histories, shared links and public ties. It weighs checkable claims against selected sources. It never reports or removes posts and does not attribute a push to an actor.

The shipped watch follows the documented Pravda network across the Baltics and Finland, within the Russia–Ukraine war. Anyone can create a private, 24-hour watch for another conflict.

## Run

Use Node 24. Supply the existing `CONTEXT_DEV_API_KEY` and `HOSTINGER_AI_ROUTER_API_KEY` through the process environment. `npm ci`, then `npm start`. The app listens on `127.0.0.1:4321`. `npm test` runs local contracts and regression checks.

`SIGNAL_DATA` selects the persistent SQLite and embedding-cache directory. Set `SIGNAL_SCHEDULER=1` to start the durable worker. Signed Context.dev webhooks trigger collection; a 30-minute platform sweep is the safety net. The job has durable caps of 30,000 Context.dev credits and 1,500 Router credits. The deployed collection-day cap is 6,000 Context.dev credits. Every attempt reserves credits before a request; unknown usage retains its reservation. Cached successful requests are reused; scheduled reads explicitly request fresh content.

The multilingual embedding model is `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, quantized, served locally. The first 400 characters are embedded; this bounds the model input and is a detection limitation. Four-word shingles measure repeated text separately. Model agreement on a narrative does not override the measured verdict rule.

## Evidence and limitations

There are no constructed examples or seeded findings. Source snapshots, provider call provenance, account metadata, judgements, prompt versions and times are stored in SQLite. Dates and follower lists that are unavailable stay unknown. Publisher translations and ordinary syndication can look coordinated, so the page states innocent explanations and accepts a persistent reviewer dispute.

The CIKM 2024 EUvsDisinfo base inventory contains 18,249 article records; the recorded Ukraine keyword filter selects 4,503. The content-screening experiment and any campaign replay are different measurements. See `STATUS.md`, `artifacts/benchmark/` and the Method page for actual results and unresolved limits. No early detection claim is made without both original-post and debunk timestamps.

## Hostinger

The deployed URL is https://signal-fire.72.61.22.106.sslip.io, in an isolated `signal-fire` container. `deploy/signal-fire.sh` builds a versioned image and uses labels on the existing Traefik provider. It preserves existing Fact Weight and Traefik container IDs and the pre-existing Spread service state. It never modifies proxy configuration, SSH, server templates or unrelated containers. The provider environment is reused in place; credentials are not copied into the release or repository.

The original Fact Weight container remains at https://fact-weight.72.61.22.106.sslip.io. Its source modules and regression evidence remain in this repository's history and retained files.

## Rights

Application code: MIT. Golos Text and JetBrains Mono: SIL Open Font License. EUvsDisinfo dataset: CC BY-SA 4.0, [Leite et al., CIKM 2024](https://github.com/joaoaleite/euvsdisinfo). Public quotes and source captures retain their publishers' rights. Evidence packs include source links and exact original text in the accompanying JSON.

`node scripts/deployed-e2e.mjs` verifies the live site at desktop and phone sizes, downloads the actual evidence pack, exercises a private watch and deletes it. It requires deployed health to match Git HEAD. Screenshots and receipts are saved under `artifacts/e2e/` and `screenshots/signalfire/`.

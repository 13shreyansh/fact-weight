# C-16 audit evidence

This is an evaluation/documentation addition. The public app stays at pinned c465b5f. The independent semantic review and final report are the interpretation layer; raw strict signatures are not automatically semantic verdict grades.

- [Frozen spec](SPEC.md), [input seal](manifest.json), [fixture definitions](fixtures.json).
- [Source collection metadata](sources.json), [recorded pre-C16 source inventory](prior-source-inventory.json).
- [First outcomes](results/), [frozen automated summary](summary.json), [compact model-output evidence](review-evidence.json).
- [Report](REPORT.md), [independent reviewer findings](review/FINAL_REVIEW.md), [semantic grades](review/semantic-grades.json), [final artifact seal](FINAL_AUDIT.json).

Offline verification, no keys or API requests:

```sh
node eval/c16/verify.mjs
```

Fresh same-hash replay, using existing configured Context.dev/Router credentials and credits:

```sh
node eval/c16/prepare.mjs
node eval/c16/replay.mjs
```

Source preparation refuses content drift. The replay copies the sealed harness and matching source bodies into a new ignored work directory. It does not replace frozen outcomes. Full external documents remain in ignored work storage; public evidence contains source URLs/hashes and model-cited passages, with external rights retained.

Do not run run.mjs as a request to overwrite published results. Its resume path reads only matching saved outcomes, writes missing cases once, and refuses overwrites. It intentionally will not replace an existing final summary.

Known interpretation limits: eight underlying families, not 48 independent facts; two institutional publisher groups; NATO headquarters and ACT are one publisher; same-event overlap with Council development data; metadata redaction leaves publisher mentions inside source bodies; provider response reuse means no fresh-inference or cold-latency claim. No human gold labels or calibration. The one-source reorder retrieval probe is a no-op, unlike the two-source main reorder tests.

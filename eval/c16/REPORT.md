# C-16 final audit report

C-09 build delivery remains DONE. C-16 adds evaluation and documentation only. Deployed app release c465b5ffd39022c7e08af038087b7a6033372074 and its prompts are unchanged. The earlier live-site headline has not been replaced with these results.

## What was held out

The recorded pre-C16 evaluation inventory contains two real Council of the EU documents. This audit adds ENTSO-E and NATO, grouping NATO headquarters and ACT as one publisher. It has 48 main cases from eight underlying claim families, six variants per family, plus six wrong-content retrieval probes. These are agent-authored source-derived assertions, counterfactual dates, evidence gaps and opinions, not authentic posts or human gold labels.

All selected documents from the new publishers are in the final audit, not a row-random development split. ENTSO-E still describes the same grid event as a development Council report and may share upstream information. The historical inventory cannot exclude unlogged activity or model pretraining. These are two institutional publisher groups, not a representative publisher sample or proven independent sources.

[Protocol](SPEC.md) and [input manifest](manifest.json) were sealed before model execution. The runner verifies eight frozen file hashes and source-body hashes. First outcomes are retained, including internal retries. No prompts, cases or outcomes were tuned or replaced after the audit began.

## Source collection coverage

| Publisher group | Selected source                                     | Target article in extracted body               |
| --------------- | --------------------------------------------------- | ---------------------------------------------- |
| ENTSO-E         | 9 February 2025 Baltic synchronisation announcement | Yes                                            |
| NATO            | Headquarters accession article                      | No: an account modal/country list was returned |
| NATO            | ACT article about Finland accession                 | Yes                                            |

This is 2/3 selected extraction attempts, with ENTSO-E 1/1 and NATO 1/2. It is a descriptive coverage check, not an estimate of general retrieval accuracy. Successful HTTP and Markdown output did not ensure the requested article was present. All six modal-body probes returned unsupported, which is appropriate for the supplied body; it does not prove the intended article was retrieved or independently establish what that missing article says.

[Source metadata and hashes](sources.json) retain actual Context.dev request IDs. Full source bodies remain in ignored work storage; third-party rights are retained.

## Publisher slices and frozen signatures

| Target publisher | Underlying families | Cases | Candidate strict signature matches | Baseline exact labels |
| ---------------- | ------------------: | ----: | ---------------------------------: | --------------------: |
| ENTSO-E          |                   4 |    24 |                              19/24 |                 17/24 |
| NATO             |                   4 |    24 |                              23/24 |                 24/24 |
| Total main       |                   8 |    48 |                              42/48 |                 41/48 |

These strict signatures are not a clean semantic accuracy metric. The frozen scorer treats two unsupported extracted subclaims as `MULTI:unsupported,unsupported`, distinct from one unsupported claim. Five such count-gap outcomes fail that strict contract even though their joint meaning and unsupported disposition are retained. The baseline produces one label and has no equivalent decomposition penalty. The independent review does not endorse claiming a broad performance win from 42 versus 41.

On the declared contradiction/contested flag definition, the candidate flagged all 12 reference-positive cases and made 0 flags among 36 reference-negative cases. Those are correlated variants of only two positive and six negative underlying families. This flag metric also misses the supported-label error on an opinion, so it is not a comprehensive false-positive or answer-quality score. The baseline missed one constructed date conflict and also made no contradiction flags on negatives.

## Separate stage grades

The fresh-context reviewer inspected 27 distinct core output patterns and 16 quote/relation patterns, then mapped judgments to all 54 case IDs. It reused judgments for equivalent patterns and checked each post/ID mapping. This is one computational reviewer, not 54 independent reviews or human calibration.

| Dimension                                                        | Pass | Fail | Not applicable | Unit                                          |
| ---------------------------------------------------------------- | ---: | ---: | -------------: | --------------------------------------------- |
| Semantic extraction faithfulness, all cases                      |   44 |   10 |              0 | 54 case outputs                               |
| Semantic extraction faithfulness, main only                      |   38 |   10 |              0 | 48 main outputs                               |
| Frozen exact claim-count convention                              |   39 |   15 |              0 | 54 outputs; not semantic faithfulness         |
| Normalized quote match                                           |   48 |    0 |              0 | Returned passages; mechanical invariant       |
| Passage relevance to extracted claim                             |   45 |    3 |              0 | Returned passages                             |
| Support status given the extracted claim                         |   48 |    0 |              9 | 57 returned claims; excludes non-propositions |
| Relevant coverage for original supported/contradicted references |   24 |    0 |             30 | Cases; no empty-evidence pass for other cases |

A conditional support pass does not rescue an unfaithful extraction. Ten of twelve opinion inputs produce factual fragments. Most still end up unsupported, hiding extraction failures behind an apparently acceptable final label. All five split count-gap cases are semantically faithful under the review despite failing the frozen one-claim convention.

Three modal-body probes have irrelevant context passages and misleading rationales. Their final unsupported label is appropriate, but their explanations describe announcement/news or accession information absent from the modal extraction. Correct status is not proof of a grounded explanation.

By main publisher, semantic extraction passes 20/24 ENTSO-E cases and 18/24 NATO cases. Two of eight main families have at least one semantic extraction failure. All denominators, reasons and not-applicable judgments are in [semantic-grades.json](review/semantic-grades.json).

## Nuisance checks

| Change                       | Main pairs | Raw signature changes | Original-meaning disposition changes |
| ---------------------------- | ---------: | --------------------: | -----------------------------------: |
| Rephrase                     |          8 |                     1 |                                    1 |
| Neutral wrapper              |          8 |                     1 |                                    0 |
| Source-ID/title rename       |          8 |                     0 |                                    0 |
| Two-source reorder           |          8 |                     0 |                                    0 |
| Publisher metadata redaction |          8 |                     0 |                                    0 |

All 40 main pairs completed; no request-failure pairs. These are paired checks across eight families, not 40 independent facts. One of eight families has a real original-meaning disposition flip. Two have raw signature changes. Three pairs change extraction meaning/opinion gating, including cases where a wrapper or rephrase improves the opinion gate without changing the unsupported disposition.

The separate six-case modal probe has five original-to-variant pairs, but its source-order pair is a no-op because it has only one source. It is not evidence of reorder robustness.

### Failure retained: opinion becomes a factual prefix

Original: `I personally like the design of the Finnish flag.`

Rephrase: `The Finnish flag has a design that I personally find appealing.`

The rephrase yields `The Finnish flag has a design.` with a supported label and a valid, relevant design passage. That extracted prefix drops the personal-preference qualifier. The support reasoning is conditionally plausible for the changed claim, while the response fails the original opinion task. [Original record](results/main-flag-opinion-original.json) and [rephrased record](results/main-flag-opinion-rephrased.json).

### Failure retained: shape instability is not necessarily a verdict reversal

The count-gap original yields two unsupported subclaims; the neutral wrapper yields one unsupported claim. This is one frozen signature change, but the reviewer finds no semantic support-status reversal. [Original](results/main-grid-count-gap-original.json) and [wrapper](results/main-grid-count-gap-neutral-wrapper.json).

## Controls that limit interpretation

- Metadata redaction is partial. Publisher names remain in source bodies. The baseline also receives full snapshot metadata, including publisher/canonical URL, while the candidate serializes a narrower field set. No clean publisher-blindness or matched-information claim is supported.
- The baseline runs first on a shared 120-second case deadline. It can consume candidate time. No API errors occurred in this run, but the method and shared fetch throttle preclude a clean latency comparison.
- Zero extracted claims map to unsupported in the scorer. That can be correct for an opinion and still mask a missing factual extraction. Separate stage grades are required.
- Eight families, two publishers, no contested reference case, constructed negatives and familiar historical facts cannot establish real-world misinformation detection or multilingual performance.
- Mechanical quote matching does not prove entailment. Multiple links, publisher groups or source groups do not establish independent corroboration or truth.
- Internal artifact hashes support consistency, not an external timestamp, human validation, exhaustive prior non-exposure or independent attestation of remote deployment identity.

## Reviewer and provider provenance

The reviewer was created with `fork_turns=none` and received only the sealed spec, fixtures, source snapshots, code and output evidence. It did not receive the builder conversation, README persuasion or old troubleshooting narrative. Its exact underlying model identifier is not exposed. This is context-separated agent review, not human review, statistical independence or a calibrated model grader.

The [protocol review](review/PROTOCOL_REVIEW.md) initially refused performance claims while outputs were absent. The [final review](review/FINAL_REVIEW.md) checks all supplied hashes and individual baseline outputs, publishes limitations, and refuses broad accuracy, human validation, proven source independence, pretraining exclusion, remote runtime attestation and verified billing claims.

Saved call logs contain 199 HTTP-200 provider responses, 151 distinct response IDs and 48 repeated-ID occurrences. Two length-finished responses were retained internal syntax retries. Recorded provider-reported usage sums to 215.441424 credits. This is neither verified billing nor 199 unique inferences. Request timing includes intentional throttling and provider reuse; no cold-latency claim is made.

## Reproduce and preserve

Run `node eval/c16/verify.mjs` for offline input, outcome, metric and final-seal checks. A fresh same-hash replay is documented in [README.md](README.md); it uses a separate ignored work directory and existing configured credentials/credits. Refetched source drift is refused. The original audit is never overwritten.

The first offline verifier failed because its failure-list ordering differed from the runner. Only that new verification helper was corrected to use the runner's order. No frozen input, model result or score changed. The three added scoring tests and full 16-test suite passed.

A future runtime change should address full-opinion extraction and wrong-content retrieval/rationale handling, then be tested on new evidence. No such fix or deployment is included in C-16. The public app remains c465b5f; Spread, Traefik, credentials and infrastructure are untouched.

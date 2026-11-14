# C-16 protocol and reference review

This is a fresh-context computational agent review of the seven supplied packet files. It is not human review. The exact underlying reviewer model identifier is not exposed. No model outputs were supplied, and I did not execute `run.mjs`, browse, or inspect the engine, development history, or deployment.

## Decision

The packet supports a small, frozen, source-relative audit with the qualifications below. The eight main families' reference statuses are defensible against the supplied bodies. Their rephrases preserve the relevant meaning. The missing-article probe's `unsupported` label is defensible for the extracted modal body. No performance, accuracy, baseline superiority, extraction-faithfulness, evidence-relevance, or support-status result can yet be graded.

All six INTAKE file digests match. The four directly supplied audit files also match their manifest digests. All three source-text SHA-256 values match both snapshots and manifest, and every fixture source mapping and body digest resolves. These establish internal packet consistency. They do not prove an external timestamp, prior non-exposure, unchanged deployed code, or a genuine upstream retrieval transaction.

## Reference review

Each row covers all six frozen variants. See `reference-review.json` for case IDs and evidence pointers.

| Family | Reference | Review | Evidence and limit |
| --- | --- | --- | --- |
| grid-date-support | supported, one claim | pass | ENTSO-E explicitly dates synchronisation of all three countries to 09 February 2025 at 14:05 EET. |
| grid-date-conflict | contradicted, one claim | pass | The post substitutes 10 February for that same completed event. This is a source-relative conflict. |
| grid-count-gap | unsupported, one claim | pass | The body mentions infrastructure upgrades, but supplies no count of 47 substations or their replacement date. Context does not establish the compound assertion. |
| grid-opinion | unsupported, zero factual claims | pass under declared convention | The statement expresses an evaluation. `unsupported` is the runner's encoding for zero claims, not a factual refutation of an opinion. |
| accession-date-support | supported, one claim | pass | NATO ACT says Finland became the newest NATO member on April 4, 2023. The September article date is distinct from the event date. |
| accession-date-conflict | contradicted, one claim | pass | The post substitutes April 5 for the accession dated April 4. |
| accession-fee-gap | unsupported, one claim | pass | Neither supplied main body establishes an accession fee, amount, or payment on that date. Silence does not establish falsity. |
| flag-opinion | unsupported, zero factual claims | pass under declared convention | Personal preference is not a factual design claim. |
| missing-article | unsupported, one claim | pass for body evidence | The headquarters extraction is an account modal, not the intended article. URL and title clues do not establish the date of accession in a target-article passage. |

The expected count of one treats each date or quantity assertion as a single event claim, including its subjects and qualifiers. It is an evaluation convention, not a unique linguistic decomposition. Extracting only an easier component would fail semantic faithfulness even if count and anchors passed. No reference-label disagreement was found under these declared conventions. The extra `intendedArticleStatus: supported` annotation is unjudgeable as a claim about the missing headquarters article. The ACT body supports the historical date, but cannot prove the missing article's contents. `SPEC.md:15` makes the same unsupported content claim about the intended article.

## Confirmed structure and coverage

There are 54 unique cases: 48 main cases across eight families, plus six variants of one missing-article probe. Main references comprise 12 supported, 12 contradicted and 24 unsupported cases, including 12 opinion cases. Only two main families are positive flag tasks. There are no reference-contested cases.

Every main case contains the same two article bodies, with one relevant publisher and one unrelated distractor. Publisher slices identify the target family's publisher; they do not isolate exposure to that publisher. The 40 main original-to-variant comparisons are correlated. Source-key and body-digest sets are invariant across variants; wrappers and metadata-only posts preserve the originals as specified. The probe's source-order reversal has one source and is identical to its original input. Its corresponding pair is a no-op control, not evidence of order robustness.

The snapshot bodies contain two target articles out of three selected source attempts. ENTSO-E is 1/1 and NATO is 1/2, counting headquarters and ACT together. These are descriptive packet coverage counts, not estimates of a retrieval system's real-world success rate. Retrieval was already completed before replay. Request IDs, provider cache fields and retrieval provenance are supplied metadata, not independently authenticated here.

NATO headquarters and ACT must remain one group. The packet does not establish source independence. The alleged project-development holdout, shared development grid event and prior lack of document use cannot be independently verified without development records, which are outside this review boundary. Publisher representativeness and pretraining exclusion are unsupported.

## Protocol and scoring limits

1. **Publisher redaction is partial.** Fixtures replace `url` and `title` but retain `canonicalUrl`. `run.mjs:95-102` spreads each full snapshot into the source object, retaining `publisher`, source family and other metadata, and adds `auditSourceKey`. The baseline receives that object at lines 111-116. Bodies also retain publisher names and publisher URLs. The absent engine determines which fields the candidate serializes, so its exact exposure is unjudgeable. The defensible comparison is a title/URL transformation with publisher clues remaining, not complete publisher removal. Source rename also combines ID and title changes, so effects cannot be assigned to either alone.
2. **The methods share an unequal deadline.** `run.mjs:108-126` creates one 120-second signal, runs the baseline first, then the candidate on the remaining time. A slow baseline can deprive the candidate of its request budget. Failures remain reportable first outcomes, but comparative success rates and timing require this qualification. The shared fetch queue and concurrent case pairs add scheduling effects. No cold or independent latency comparison is justified.
3. **Automatic status agreement can hide extraction failures.** `scoring.mjs:4-14` maps zero extracted claims to `unsupported`. This can yield agreement for a factual evidence-gap case even when extraction omitted its claim. Opinion success is also represented as `unsupported`. Claim-count and later semantic grades must stay separate. The planned end-to-end label agreement is a narrow metric, not semantic correctness.
4. **Mechanical integrity is weaker than semantic integrity.** `run.mjs:133-148` checks normalized post substrings and normalized source substrings. The normalizer implementation is absent, so exact normalization behavior is unverified. An empty quote passes `includes` if normalization yields an empty string. Empty evidence arrays supply no relevant-evidence coverage. Valid anchors and copied quotes alone establish neither faithful claims nor relevant or entailing evidence.
5. **Scoring assumes valid label/schema values.** `statusMetrics` treats any non-flag, non-`ERROR` prediction as a negative task prediction. `run.mjs:155` accepts the baseline label without an allowlist here. A malformed nonempty label can therefore count as TN while failing exact agreement, and a non-string can break `isFlag`. Engine-side validation is unavailable for inspection. Explicit baseline and candidate error reporting remains necessary. Reference-negative errors stay in the FPR denominator but do not become TN; the confusion cells therefore need not sum to `n`.
6. **The summary does not implement every promised report.** `nuisanceMetrics` reports comparable pairs, flips and failed pairs, but no family-level any-failure rate. The summary has no structured semantic grades, unjudgeable denominators, per-source target retrieval coverage, or per-publisher baseline nuisance table. Those remain separate reporting obligations under `SPEC.md:25-34`. Its `failures` list at `run.mjs:243-258` covers candidate status/count/anchor failures only, not all baseline or quote failures. Raw outcome rows must remain inspectable.
7. **Runtime claims exceed the supplied evidence.** The packet provides engine/retrieval hashes and a release identifier, but not those files or deployment proof. I cannot verify unmodified pinned runtime, retry policy, prompt parity, actual model routing, or candidate evidence serialization. The runner uses a separate `work/c16/sources.json` path and checks text hashes, not the entire snapshot metadata. Its exclusive result writes and manifest checks support retention behavior in code; absent outputs cannot establish that execution followed it. Requested model names are manifest declarations, not observed returned model identifiers.

These are limits on interpreting this sealed audit. They are not instructions to change the engine, replace cases, repair labels after outcomes, or rerun failed cases.

## Refusals and pending review

I refuse any numerical performance, accuracy, false-positive rate, recall, nuisance-stability, baseline-comparison or request-success conclusion while outputs are absent. I also refuse broad real-world accuracy, calibrated probability, human agreement or human gold-label claims; proven source independence; pretraining exclusion; publisher representativeness; verified deployment identity; verified billing; or independent cold-latency claims.

The evidence-only follow-up can grade extraction faithfulness, passage relevance and coverage, and whether each output status follows from its extracted claim and supplied bodies. Each dimension requires separate pass/fail or unjudgeable judgments with reasons. It must also retain the original-post end-to-end relation, so a changed extracted claim cannot rescue an incorrect result. API errors and missing outputs require explicit denominators. This review supplies no output-level grades.

Evidence references throughout resolve only to `INTAKE.json`, `SPEC.md`, `manifest.json`, `fixtures.json`, `source-snapshots.json`, `scoring.mjs` and `run.mjs` in this packet.

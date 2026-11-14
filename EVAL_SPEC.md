# Evaluation contract

Freeze before the first model run, 14 November 2026.

The first version measures evidence relation, citation validity and conservative contradiction flags. It does not measure bot detection, author intent or broad misinformation detection.

## Dataset

20 development and 40 held-out cases, authored by code during Junction. Every passage and label is synthetic, constructed with dates, counts, quoted allegations, forecasts, negations, copied reporting, conflicts and prompt injection. Expected outputs follow construction rules. No human or external fact-checker labels. Held-out claim wording, entities and values differ from development; templates are shared, so this is a narrow generalization test.

## Comparisons

- Plain LLM receives the same post and passages, asks for one supported/contradicted/contested/unsupported label. This is an evidence-aware but unstructured baseline.
- Fact Weight asks for claims and exact quotations, validates quotes and computes labels from accepted relations. Same model and inputs.
- Oracle uses the constructed expected labels, demonstrating grader ceiling but not retrieval performance.

A positive flag is contradicted or contested. A false positive is such a flag on a constructed supported or unsupported example. Report precision, recall, false-positive rate with counts, exact label agreement, accepted citation exact-match rate, rejected citation count, and measured latency. Empty claim list represents unsupported for scoring, with separate abstention counts. Corpus is small; do not claim calibrated probabilities or benchmark superiority.

## Promotion

Ship if API contract checks pass; every shown quote is a substring of retrieved content; absent evidence never creates a contradiction; duplicates do not inflate independent-group counts. Publish all model runs and failures. Freeze before held-out and do not tune after looking at it. Human review, calibration and real-source end-to-end accuracy remain unmeasured until actually completed.

## v4 amendment, registered before source-heldout run

A first real PDF revealed source-only claim leakage, so v4 separates post-only claim extraction from comparison and binds results to fixed claim IDs. Rerunning the original40 held-out cases is explicitly a regression test, not another untouched holdout.

A fresh24-case source-derived stress set is frozen in source-heldout.json before model execution:6 supporting statements,6 conflicting assertions and12 unsupported assertions or opinions. The source is a real EU Council report extracted with Context.dev. These are agent-constructed variations, not authentic social posts and not human expert labels. The task is relation to this one document, not truth in the world. Both methods receive the same full extracted source. Raw run records omit full source text to avoid republishing the document; source URL, extraction time, hash, request ID and cited passages remain. No tuning after this run.

## v5 amendment, before fresh-source-heldout execution

v4's24-case source holdout became development after its failures were read. v5 adds a different model family through Hostinger AI Router, Claude Fable5.2, as a veto-only relation checker. It is not calibrated against humans and is not presented as a trusted judge. It can demote proposed relations but cannot invent support or contradiction. Provider500 failures observed in the v4 regression prompted one bounded retry and a120-second overall request deadline.

Fresh source holdout:24 new agent-constructed assertions/opinions against the Council's historical13 June2025 press release about temporary protection.6 support,6 contradiction,12 unsupported. This is a relation task about what that dated document says, not current legal guidance. The report and topic differ from the electricity document. Labels are agent-constructed, no human review. No prompt or semantic changes after executing this fresh holdout.

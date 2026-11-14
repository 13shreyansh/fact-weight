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

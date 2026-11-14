# Evaluation ledger

All times Helsinki, 14 November 2026. Model calls use Hostinger AI Router with gpt-4.1-mini, temperature0. Synthetic passages and construction-rule labels, no human labels.

## v1, development

Frozen contract: ../EVAL_SPEC.md.20 development cases, same evidence supplied to a plain unstructured LLM baseline and Fact Weight. Raw traces retained under runs/v1/dev. The oracle is the constructed expected label,20/20 by definition, not a model result.

Observed first failures: an unverified allegation was labelled supporting even though the explanation called it unverified; planned work without a completion record was labelled contradicting. Both quotations were valid. Quote matching alone does not establish entailment.

## v2 hypothesis, registered before running

Require claim type and passage basis. Deterministically demote allegations, plans, absence and unrelated passages to context, and permit attribution to support only an attributed claim. Add explicit counterexamples in the prompt. Success means fewer false contradiction flags on the same development set without lower contradiction recall. No tuning on held-out.

## Limits

No real misinformation-detection benchmark, calibrated probability, multilingual score, human agreement or live retrieval accuracy claimed. The synthetic test shares templates between splits. Publication counts and group counts do not prove truth or independence. Billing cost in euros is not measured; provider-reported credits are retained in traces. Latencies are actual model-request times and exclude web retrieval.

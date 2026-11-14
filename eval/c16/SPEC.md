# C-16 frozen publisher and nuisance audit

This is an audit of the delivered Fact Weight engine, not a runtime update. The deployed release remains c465b5ffd39022c7e08af038087b7a6033372074. No prompts, thresholds, provider parameters or app files may change after the audit is sealed. All outcomes and request failures are published. No tuning on this audit.

## Scope and split

Development publishers: Council of the EU, including both historical Council documents used in earlier iterations. Final publishers: ENTSO-E and NATO, with all of their selected documents confined to this audit. NATO headquarters and NATO ACT belong to one publisher group. They are not independent sources. Holdout means unseen in this project's local development/evaluation, not absent from model pretraining.

ENTSO-E reports the same grid event discussed by the development Council report, so publisher separation does not establish content-origin independence. NATO adds a different accession topic. This is a small institutional-source sample, not a Baltic misinformation corpus or representative publisher study.

Sources were selected in IAB and extracted through the existing Context.dev adapter. One NATO headquarters extraction returned an account modal rather than the target article. Retain it as a retrieval-coverage failure and an abstention probe. A separately selected NATO ACT article is the usable NATO source. Do not silently turn successful HTTP/Markdown extraction into successful target-document retrieval.

## Frozen cases

Eight underlying semantic families, four per main publisher. Each has six variants: original, rephrased, neutral wrapper, source-ID/title rename, source-order reversal, and publisher metadata redaction. Thus 48 main cases and 40 paired nuisance comparisons, not 48 independent facts. Six extra variants of the Finland date claim use only the failed headquarters extraction. These test abstention on missing evidence; expected status is unsupported relative to the supplied text even though the intended article supports the claim.

Fixtures are agent-authored source-derived assertions, counterfactual mutations and opinions. They are not authentic posts or human gold labels. Reference labels and expected extraction counts are frozen before calls, then independently audited. A reference-label disagreement must be published rather than silently repaired after results are seen.

Source bodies must remain byte-identical across nuisance variants. Rename/reorder/redaction are replay-only transformations, not live retrieval at the synthetic URLs. Actual source URLs, hashes, request IDs and the mapping to transformed IDs remain inspectable. A second unrelated document is a distractor in each main case; links are never counted as independent corroboration.

## Methods

Candidate: unmodified pinned engine, gpt-4.1-mini extraction/comparison and claude-fable-5.2 veto, including its existing bounded retries. Baseline: the existing unstructured, same-evidence LLM prompt. Same fixture text/documents for both. API calls use existing event credentials privately; no service purchase or VPS change. Save first outcomes. Resume only missing cases with the identical sealed manifest, never overwrite or replace a failed result.

## Separate grading

1. Target-document retrieval coverage: whether the extracted source contains the target article/facts. Report separately by source and publisher. The modal is a failure, not a passing source.
2. Claim extraction integrity: deterministic valid post anchors and expected claim count. Separately, the fresh-context reviewer grades semantic faithfulness to subject, event, date/quantity, negation and attribution. Do not call an exact anchor proof of faithful extraction. Opinions should yield zero factual claims.
3. Evidence integrity: deterministic normalized quote match and source-ID existence. Separately, the reviewer grades each passage's relevance to the extracted claim, plus relevant-evidence coverage on supported/contradicted cases. Missing passages are not automatically counted as relevant evidence. Context can be relevant without entailing a claim.
4. Support status: end-to-end label agreement with the reference post/document relation, plus a separate reviewer judgment of whether the label follows from the extracted claim and supplied documents. If extraction changes the claim, a correct label for that changed claim does not rescue end-to-end correctness.

The review uses binary pass/fail or unjudgeable with a reason. No 1–10 confidence scores. Unjudgeable and API-error denominators are explicit. Errors on positive flag tasks count as missed flags. Contradicted/contested is a flag; supported/unsupported are negative tasks. FPR uses all reference-negative cases and reports request failures separately.

Nuisance stability is separate from correctness. A consistently wrong verdict is stable but wrong. Report comparable completed-pair verdict flips, failed pairs, and family-level any-failure rates. Do not inflate sample size by treating six variants as independent examples. Publisher slices must remain separate.

## Independent review boundary

A fresh-context Codex reviewer receives only this spec, sealed fixtures, source evidence and model-output packet. It receives no builder conversation, README persuasion or historical troubleshooting narrative. Record its provenance honestly: computational agent review, not human review; exact model identifier only if exposed. It must refuse claims not supported by the packet, including broad real-world accuracy, calibrated probabilities, human agreement, proven source independence, pretraining exclusion or publisher representativeness.

This final audit is evidence collection, not an instruction to deploy. The existing site headline stays unchanged unless a separate concrete reviewed update is justified and the root chat performs authorized VPS administration.

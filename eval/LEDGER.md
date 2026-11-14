# Evaluation ledger

All times Helsinki, 14 November 2026. Model calls use Hostinger AI Router with gpt-4.1-mini, temperature0. Synthetic passages and construction-rule labels, no human labels.

## v1, development

Frozen contract: ../EVAL_SPEC.md.20 development cases, same evidence supplied to a plain unstructured LLM baseline and Fact Weight. Raw traces retained under runs/v1/dev. The oracle is the constructed expected label,20/20 by definition, not a model result.

Observed first failures: an unverified allegation was labelled supporting even though the explanation called it unverified; planned work without a completion record was labelled contradicting. Both quotations were valid. Quote matching alone does not establish entailment.

## v2 hypothesis, registered before running

Require claim type and passage basis. Deterministically demote allegations, plans, absence and unrelated passages to context, and permit attribution to support only an attributed claim. Add explicit counterexamples in the prompt. Success means fewer false contradiction flags on the same development set without lower contradiction recall. No tuning on held-out.

## Limits

No real misinformation-detection benchmark, calibrated probability, multilingual score, human agreement or live retrieval accuracy claimed. The synthetic test shares templates between splits. Publication counts and group counts do not prove truth or independence. Billing cost in euros is not measured; provider-reported credits are retained in traces. Latencies are actual model-request times and exclude web retrieval.

## v1 and v2 measured results

| Version     | Dev agreement | Flag precision | Recall | False-positive rate | Verbatim citations |
| ----------- | ------------: | -------------: | -----: | ------------------: | -----------------: |
| v1 baseline |         19/20 |            8/9 |    8/8 |                1/12 |      not requested |
| v1 flow     |         17/20 |           8/10 |    8/8 |                2/12 |              24/24 |
| v2 baseline |         19/20 |            8/9 |    8/8 |                1/12 |      not requested |
| v2 flow     |         18/20 |            6/6 |    6/8 |                0/12 |              24/24 |

v2 failed its promotion guard because recall fell. The two misses were operational denials treated as mere attribution. No inference from quotation presence can solve that semantic problem.

## v3 hypothesis, registered before running

Clarify that an operator's record of its own service and an explicit event denial are direct records, while an unverified quoted allegation stays context. Require no false positives on dev and restore8/8 flag recall before held-out. This is a prompt distinction, not a claim that official sources are inherently correct.

## v3 final and held-out, frozen

v3 restored20/20 development labels,8/8 flag recall and0/12 false flags. Source at `versions/v3-engine.mjs` is the held-out engine, with formatting-only changes from the dev run. Its SHA256 is3690b99efb9dbeac96feb385bd4abb6dc0184b683e5b4953aa8ea476a0a46386. No semantic changes after seeing held-out.

| Frozen held-out,40 synthetic cases | Same-evidence baseline | Fact Weight v3 |
| ---------------------------------- | ---------------------: | -------------: |
| Exact relation label               |                  39/40 |          40/40 |
| Flag precision                     |                  16/17 |          16/16 |
| Flag recall                        |                  16/16 |          16/16 |
| False-positive rate                |                   1/24 |           0/24 |
| Accepted verbatim citations        |          not requested |          48/48 |

One positive means contradicted or contested. The baseline's only held-out miss followed an instruction injected into the source. The flow retained the factual passage. This one-case difference is not a general benchmark win. Source text quoted correctly can still be interpreted incorrectly.

Actual held-out Router inference median2,037ms, p95 2,796ms. Both methods together charged3.380928 provider-reported credits for this run. Not euros, and not the cost/latency of live retrieval. Baseline and pipeline request metadata are retained in each raw trace.

## Error coding

Builder-agent review, not human review: inspected30 claim traces with their quotations and reasons,15 from v1 and15 from v3. First-failure buckets across full dev run results: v1 allegation-as-fact1, missing-confirmation-as-contradiction2; v2 operational-denial-demoted2; v3 none on20 cases. The v3 explanation still calls some records official based on the supplied text, so provenance authenticity is not established. No independent LLM judge was calibrated and no human-label agreement is claimed.

## v4 after the first live PDF, separate graph nodes

A genuine live Context.dev search and extraction returned the Council report. The v3 model added2 claims present only in that report. The two synthetic templates had not exposed source-only claim leakage. This is a live failure, not a held-out tuning finding.

v4 uses a post-only extraction call with exact post anchors. Comparison receives a fixed set of claim IDs. Code ignores added IDs and model rewrites of claim text; missing IDs become explicit abstentions. A code regression verifies that source-only additions and invented anchors do not enter the displayed claim set. This does not prove that the extractor's paraphrase is semantically faithful.

v4 development:20/20 relation labels,8/8 flag recall,0/12 false flags;23 accepted quotations matched,1 nonmatching citation rejected. Median total Router inference3,716ms, p95 4,519ms. Both methods charged2.116896 provider credits. The original40-case held-out set is being rerun as an explicitly labelled regression. A separate24-case source-derived holdout is frozen after the graph change, before running it.

## v4 real-source holdout and v5, no hidden failures

v4 source-derived holdout:20/24 labels, flag precision6/8, recall6/6, false flags2/18. Baseline19/24 labels, precision5/6, recall5/6, false flags1/18. This exposed overgeneralisation from broad consumer-impact statements to specific equipment counts, an unsupported invented count accepted as support, and an opinion treated as a factual assertion. The source-derived cases then became development.

v4 reused synthetic holdout regression:38/40 including2 providerHTTP500 errors. All16 expected flags returned correctly, with0 false flags among22 answered negatives;2 additional negative cases failed. Failures are retained, not scored as correct abstentions.

v5 added a different-family, veto-only relation check through Hostinger Router, Claude Fable5.2. No human calibration. On the now-development24-case electricity set,24/24 labels,6/6 flag recall,0/18 false flags;23 accepted quotations,4 rejected. Provider-reported total72.500064 credits for both methods, median total inference3,663ms, p95 6,594ms. A correctness improvement at materially higher inference cost.

Fresh v5 source holdout, historical13 June2025 temporary-protection press release:22/24 labels versus baseline23/24. Pipeline5/6 flag precision,5/6 recall counting the failed positive response as a missed flag,1/18 false flags. Baseline5/5 precision,5/6 recall,0/18 false flags.23/23 accepted quotations matched;1 was rejected. Median total inference6,769ms, p95 10,419ms. Both methods together reported69.922752 credits. These agent-constructed cases are not current legal guidance.

The v5 fresh run did not beat the baseline on agreement or false-positive rate. The remaining false flag concerned a specific cash amount unsupported by the document. Both model families accepted an overbroad contradiction. One response failed to parse. This remains visible in the headline and must not be replaced with the easier synthetic score.

## Runtime JSON repair after fresh holdout

A live two-claim browser/API check reproduced malformed comparison output. Diagnostic response: HTTP200, finish_reason length,9,668 characters, only one claimId, then repeated closing brackets. This was gpt-4.1-mini JSON-mode output. The independent checker returned valid JSON in a separate direct test. Added one syntax retry without response_format, same prompt, only after parse failure. First failed attempt's successful-response usage and wall time remain included. Provider5xx/429 receives one bounded retry. The app has an overall120-second deadline.

This is a runtime repair after the fresh holdout, not a new semantic prompt version. The fresh22/24 result is retained. Any repeated24-case run is labelled regression. No new held-out claim is made for the repair.

## JSON-repair regression result

Repeated24-case source set, not untouched:23/24 labels,6/7 flag precision,6/6 recall,1/18 false flags,0 request errors. Baseline23/24,5/5 precision,5/6 recall,0/18 false flags.25 accepted quotations matched,1 rejected. Provider-reported75.913248 credits for both methods. Measured median total inference1,489ms, p95 2,056ms on repeated requests; this is not verified cold latency and may benefit from provider caching. The fresh22/24 result remains the headline.

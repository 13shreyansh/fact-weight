# C-16 final independent evidence review

The frozen exact-signature totals reproduce from the supplied first outcomes: candidate 42/48 main cases and 6/6 missing-article probes; baseline 41/48 main cases and 5/6 probes. Those totals are narrow reference-agreement scores. They do not establish real-world accuracy or broad superiority of either workflow.

This is one fresh-context computational agent review, not human validation. The exact underlying reviewer model identifier is not exposed. I read only the authorized evidence packet plus required prose-style guidance. I made no network or model calls and changed no engine, fixtures, labels or outcomes. Pure local hashing and scoring functions were used to verify records.

## Evidence and review coverage

All nine `FINAL_INTAKE.json` digests and all 56 supplemental file digests match. The supplied engine and retrieval code match their frozen manifest digests. All 54 raw outcomes map exactly to the frozen cases and project without changes into `review-evidence.json`. All 48 accepted source quotes are literal substrings of the mapped source bodies, in addition to passing the runner's normalized checks.

I inspected all 27 distinct family/claim/status/canonical-source/quote/relation patterns, all 16 family/quote/relation patterns, and every individual baseline label/reason pair. Equivalent pattern judgments were reused, with case posts, source mappings, variants and claim structures checked individually. This is one review applied to 54 correlated cases, not 54 independent judgments. `semantic-grades.json` maps every grade and all 45 nuisance pairs to case IDs.

## Separate candidate grades

| Dimension | Pass | Fail | Not applicable | Unit |
| --- | ---: | ---: | ---: | --- |
| Extraction semantic faithfulness, including opinion gating | 44 | 10 | 0 | 54 cases |
| Frozen expected claim count | 39 | 15 | 0 | 54 cases |
| Factual support status given the extracted claim | 48 | 0 | 9 | 57 returned claims |
| Passage relevance to the extracted claim | 45 | 3 | 0 | 48 returned passages |
| Required evidence coverage for supported/contradicted extracted claims | 25 | 0 | 32 | 57 returned claims |
| Required evidence coverage for original supported/contradicted posts | 24 | 0 | 30 | 54 cases |

No candidate output in these records is missing or an API-error outcome, and no applicable candidate grade is unjudgeable. Ten returned claims contain no passages and two cases contain no claims. Missing passages do not count as relevance passes. Nine extracted personal preferences or value judgments have no applicable factual support-status grade.

Within the main set, extraction semantic faithfulness is 38/48. ENTSO-E is 20/24 and NATO is 18/24. All six modal probes preserve the extracted assertion and appropriately return unsupported. These are case-level descriptive counts across repeated variants.

A separate relation-only review finds one original-meaning disposition error, the flag rephrase. This does not mean the other 53 outputs are complete task successes: extraction and opinion handling remain separate requirements. The defined conjunction of faithful extraction and a valid original-meaning disposition passes 44/54 cases, including 38/48 main cases. It is a reviewer judgment with stated rules, not a replacement for the frozen exact-signature score or a claim about rationale quality.

## The raw flips need different interpretations

The candidate has two raw signature flips among 40 completed main comparisons, with no failed comparison requests.

- `main-grid-count-gap-neutral-wrapper` changes the original's two unsupported subclaims into one unsupported compound claim. The subclaims jointly preserve the original quantity, event, date, location and project relationship. This is decomposition sensitivity. The original intended assertion remains unsupported, so it is not a semantic support-verdict reversal. The five two-claim variants retain their frozen count and strict-signature failures; I have not repaired the reference or rescored the frozen metric.
- `main-flag-opinion-rephrased` changes personal preference into "The Finnish flag has a design." The quoted white flag with a Nordic cross supports that easier extracted assertion. It does not validate the original preference. This is an end-to-end output-disposition flip caused by extraction drift. It is not evidence that unchanged factual meaning received different source support.

There is also instability that the raw label misses. `grid-opinion` original, publisher-redacted, source-rename and source-reorder emit an unattributed value judgment. Its neutral wrapper and rephrase correctly emit no factual claims. Every variant still receives unsupported. Thus the raw label hides two opinion-gate changes.

Across eight main families, two have any raw signature flip, one has an original-meaning disposition flip, and two have at least one semantic extraction failure. Three main pairs change extracted meaning or opinion handling; the count-wrapper pair adds a separate decomposition change. These family and pair counts must not be treated as independent observations.

All five candidate probe comparisons are disposition-stable. The one-source order reversal is identical to its original input and remains a no-op control.

## Opinions, context and misleading explanations

Ten of twelve main opinion cases incorrectly produce a checked claim. Four Baltic-opinion variants remove the speaker's attribution. All six flag-opinion variants produce a claim, including the rephrase that substitutes design existence. A later relation veto can leave these claims labeled unsupported; it does not remove the invalid claim from the output. The supplied code confirms this retention at `pinned-engine.mjs:340-383`.

The three failed relevance grades are flag-flying or ceremony passages attached to personal liking of the flag design. Mentioning the same flag does not bear on who likes its design. The flag rephrase's design passage is relevant to its altered claim, but cannot rescue the extraction.

The fee and substation passages are relevant context for their associated accession or infrastructure claims. They do not establish a fee, precise replacement count, or replacement date. The two URL-slug passages in modal probes are contextual to accession, but a dated URL path does not establish the event date. Official praise is contextual to the extracted generic project evaluation, while providing no record of the post speaker's own opinion.

Correct unsupported labels also conceal false retrieval descriptions. The original, neutral-wrapper and source-reorder modal outputs claim that the supplied text explicitly confirms accession and describe the article as truncated. The supplied snapshot is marked untruncated and contains an account modal. These three rationale failures are recorded separately. Six passing abstention labels therefore do not mean six faithful explanations of retrieval failure. See the corresponding `raw-results/retrieval-failure-probe-missing-article-*.json#/pipeline/claims/0` records and `source-snapshots.json#/1`.

## Baseline review

Individual raw baseline records reproduce 41/48 main reference agreements and 5/6 probe agreements. The seven main errors are all six Baltic-opinion variants, which the baseline calls supported, and `main-grid-date-conflict-rephrased`, which treats a source date of 9 February as sufficiently close to a claim of completion on 10 February. The latter is a genuine date-relation error. It accounts for the baseline's one main nuisance flip. The baseline also flips to supported on the publisher-redacted modal probe, where no target article body exists.

The baseline exposes no extracted-claim representation or quoted evidence list. Its extraction is unjudgeable in all 54 cases; quote relevance is not applicable to all 54; comparable structured quoted-evidence coverage is unjudgeable. Its original-post labels can be graded, yielding 46 pass and 8 fail across both slices. Several flag-opinion rationales also incorrectly say the source provides no design information, despite the white-field and cross description. Their unsupported labels remain correct under the declared opinion convention.

The candidate's 42/48 versus baseline's 41/48 is not a clean semantic quality ranking. Five candidate strict errors are faithful decompositions, while the strict score also misses opinion-extraction failures. The methods use different workflows and metadata, and the baseline always runs first on a shared 120-second deadline. Report the frozen numbers with these qualifications rather than claiming a general accuracy improvement.

## What the supplement resolves

The supplied engine uses NFKC plus whitespace normalization and requires accepted quotes of at least 20 characters. The standalone scoring check's empty-string behavior is not a realized pinned-engine citation weakness in this packet. Candidate statuses are derived from validated evidence relations, rather than trusting raw label strings. The baseline runner still lacks an explicit label allowlist, although all observed baseline labels are valid.

The candidate comparison serializes only `id`, `url`, `title`, `text` and `publishedAt`; its verifier receives `id` and `text`. The baseline receives full snapshot objects. All 54 baseline input hashes reconstruct from those full objects, and all 54 extraction input hashes reconstruct from the posts. The candidate therefore does not receive the retained `canonicalUrl` and `publisher` fields in its comparison, unlike the baseline. Publisher names, headers and URLs still remain in source bodies for both methods. Redaction remains partial. See `pinned-engine.mjs:271-284`, `pinned-engine.mjs:326-333` and `run.mjs:95-116`.

The supplied retry code is bounded, and the traces contain two comparison responses ending at the token limit followed by retained syntax-retry outcomes. Those internal attempts remain part of the first method outcomes. No case was rerun by this reviewer.

## Provenance and remaining refusals

The call records reproduce 199 HTTP-200 responses: 54 baseline and 145 candidate-workflow responses. Recorded requested and returned model strings agree for 162 `gpt-4.1-mini` responses and 37 `claude-fable-5.2` responses. Prompt hashes match the supplied code. These are recorded request/response identifiers, not verification of the underlying provider weights or the reviewer's own exact model.

There are 151 distinct response IDs. Twenty-three IDs recur, creating 48 excess occurrences; each repeated ID has identical request-signature and response-body hashes in its repeated records. This is consistent with response reuse. It does not prove the reuse mechanism or independent new inference. The response-level reported credit sum is 215.441424; it is not verified billing. See `raw-results/*.json#/calls` and `run-summary.json#/provider`.

The prior-source inventory contains 95 saved-record entries with two real URLs, both grouped as Council of the EU. None is an ENTSO-E or NATO audit URL. This supports publisher separation within that supplied inventory. It cannot exclude unlogged project activity, upstream shared information, or pretraining exposure. NATO headquarters and ACT remain one publisher group. The development article bodies are absent, so this review does not independently prove the alleged shared-event provenance or source independence.

The source-relative reference labels remain defensible. The frozen single-claim count is a convention that penalizes the five faithful decompositions. The annotation that the missing headquarters article itself supports accession remains unjudgeable because that article body is absent; the ACT body supports the historical date separately. These issues are reported without rewriting frozen references.

I refuse claims of representative real-world accuracy, calibrated probabilities, human agreement, human gold labels, proven source independence, pretraining exclusion, exhaustive development holdout, externally attested remote VPS code, verified provider billing, or independent cold latency. Local file hashes and call records support internal consistency, not those stronger claims. The earlier protocol report's remaining limits still apply, including composite ID/title renaming, correlated fixtures, incomplete publisher redaction and the shared deadline. No frozen-engine tuning, case replacement or label repair is proposed.

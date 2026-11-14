# Five-minute peer-review pitch

0:00–0:40. A concrete reader and claim. Open the public app. A Lithuanian or Estonian reader receives a post about the electricity-grid switch. The useful question is which parts are supported by documented evidence. We do not need to infer a person's motives to answer that.

0:40–2:00. Run the real two-claim example in DEMO_SCRIPT.md. Show each passage, source link and retrieval timestamp. Let the reviewer change a date, number or source URL. A fresh request must be labelled as fresh; a saved result must be labelled as a replay. Open one original source so the reviewer can inspect it.

2:00–2:50. Explain the architecture in plain language. Context.dev searches a stated reference pool and extracts article/PDF text. The first Router call sees only the pasted post. The comparison call gets fixed claim IDs and source passages. Code validates anchors and quotations, demotes plans/allegations/absent confirmation to context, groups likely copies, then computes the relation label. No score is presented as a probability.

2:50–3:45. Show the ledger and one actual failure. v1 had valid quotes but confused unconfirmed statements with contradictions. v2 became too conservative and missed direct denials. v3 fixed that on development and was frozen before its synthetic held-out run. The first real long document then exposed source-only claim leakage; the final graph prevents comparison from adding new claims. Distinguish the untouched held-out result from subsequent regression runs. No human labels, no calibrated confidence and no real-world disinformation accuracy claim.

3:45–4:25. Show the Hostinger deployment proof and health response, plus a real Context.dev request ID in an exported record. The app is an isolated container with memory and CPU limits on the existing KVM2. No public app port beyond the existing HTTPS proxy. The separate Spread dispatcher was not restarted or changed.

4:25–5:00. State the limits. Reader-selected sources and the curated discovery pool can miss contrary evidence. Separate domains can repeat one origin. Sources can be wrong, translations can alter meaning, and a model can misread a valid quote. The next useful milestone is a Baltic fact-checker's independently labelled corpus and multilingual user review. Invite the reviewer to challenge a source choice or interpretation.

Likely questions:

- Why trust your source list? You should inspect it. The pool is disclosed and incomplete. Users can replace it with direct URLs, including alternative accounts.
- Why not a true/false classifier? A document relation is easier to inspect and challenge. No source has absolute authority.
- How is this more than a wrapper? Separate claim extraction, a fixed comparison set, quote verification, source grouping, provenance/change records, measured failures and a public implementation. Semantic inference still depends on the model.
- What does the score prove? Only the stated synthetic task, plus separately reported live integration checks. No human calibration or broad propaganda-detection result.
- Is Context.dev central? Search, text extraction, fresh re-fetch and change detection all depend on its responses. Missing or failed retrieval remains visible.

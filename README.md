# Fact Weight

## Judge quick path

| Criterion                                              | Evidence to open                                                                                                                                                                                             | What it establishes and limits                                                                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hostinger detection quality, 40%                       | [Frozen C-16 audit](eval/c16/REPORT.md), [raw cases](eval/c16/results/), [historical ledger](eval/LEDGER.md)                                                                                                 | Publisher/source slices, nuisance flips and separate stage grades. Agent-authored references, no human gold labels or broad misinformation accuracy.                                      |
| Technical execution and live Hostinger deployment, 25% | [Live app](https://fact-weight.72.61.22.106.sslip.io), [public verification](eval/LIVE_CHECKS.md), [deployment isolation](deploy/README.md)                                                                  | Actual public source retrieval, cited analysis, export and re-fetch; pinned c465b5f on Hostinger. No production uptime or compliance claim.                                               |
| Originality and real-world impact, 20%                 | [Claim/evidence engine](engine.mjs), [known failures](eval/LEDGER.md), [scope and limits](HANDOFF.md)                                                                                                        | Inspectable claim-first comparison, quote checks and source groups. Originality and user impact have not been independently established. Multiple links do not prove independent sources. |
| Demo clarity, 15%                                      | [Constructed live example](https://fact-weight.72.61.22.106.sslip.io), [two-minute script](DEMO_SCRIPT.md), [five-minute pitch](PEER_REVIEW.md), [actual screenshots](.impeccable/review/public-desktop.jpg) | A demonstrated interaction and recording plan. No public video or final submission yet; script times are planned, not video evidence timestamps.                                          |
| Context.dev technology-prize integration               | [Retrieval code](retrieval.mjs), [live request IDs](eval/LIVE_CHECKS.md), [C-16 collection coverage](eval/c16/sources.json)                                                                                  | Search, extraction and fresh re-fetch are real API paths. Wrong-content and unavailable retrievals remain failures. This is not the Context.dev main entry.                               |

C-09 build delivery is complete. C-16 is a separate audit/documentation improvement; it does not silently replace the deployed app or its earlier headline. The C-16 protocol is frozen in [SPEC.md](eval/c16/SPEC.md) and [manifest.json](eval/c16/manifest.json).

A claim-versus-evidence desk for Baltic readers. Paste a post, find or choose source articles, and inspect supporting, conflicting and missing evidence with passages, source groups and retrieval timestamps.

Built during Junction 2026 by Shreyansh, solo team The CS Guy. Main challenge: Hostinger. Technology prize: Context.dev, not its main challenge.

## Status

**Live on Hostinger:** [https://fact-weight.72.61.22.106.sslip.io](https://fact-weight.72.61.22.106.sslip.io). Pinned runtime release `c465b5ffd39022c7e08af038087b7a6033372074`, version `0.3.0`. Public desktop/mobile interaction, a real two-claim analysis, source opening, two parsed JSON exports and a fresh re-fetch passed in the Chief's inbuilt browser. The separate Spread service stayed active with the same PID before deployment and at the five-minute check. See [live verification](eval/LIVE_CHECKS.md).

The final video and competition submission have not been performed. The recording and pitch scripts are ready.

## Run

Requires Node.js 22 or newer. No runtime dependencies.

```sh
cp .env.example .env
# Set the existing Hostinger AI Router and Context.dev keys privately in .env.
npm start
# Open http://127.0.0.1:4320
```

Click **Load a constructed example**, then Compare. The example has one deliberately conflicting assertion and uses a real Council report. It is not an authentic social post.

The app sends the post and extracted sources to Hostinger AI Router. Discovery sends up to 400 post characters to Context.dev, which also receives article URLs. It does not save posts to disk. Source pages are held in a bounded process-memory cache. Avoid private information.

## How it works

1. Context.dev searches a disclosed reference pool or retrieves the supplied URLs. Unavailable pages remain visible as warnings.
2. A Router call sees only the pasted post and extracts checkable claims with exact post anchors.
3. A comparison call receives fixed claim IDs and retrieved passages. Extra IDs and model rewrites cannot expand the displayed claim set.
4. Code validates normalized quotations and demotes allegations, plans and absent confirmation to context.
5. A different model family, Claude Fable 5.2 through Hostinger AI Router, can veto proposed relations. It has no human calibration.
6. Accepted relations determine supported, contested, contradicted or unsupported. Same-domain and near-identical passages collapse into source groups. Separate groups do not prove independence.

No label is a truth probability or a judgment about author intent. Search is limited to the declared pool; users can replace it with direct article URLs. At most 18,000 normalized characters per page are compared. The app has bounded concurrency, requests, retries and an overall 120-second deadline.

## Evaluation

C-16 adds a [frozen publisher/nuisance audit](eval/c16/REPORT.md): 48 main cases from eight families, plus six wrong-content probes. A rephrase changes a personal opinion into a supported factual prefix. The independent agent review separates extraction faithfulness, passage relevance and support status, and refuses broader claims. Strict signature counts include decomposition differences and must not be called broad accuracy. The original site headline and runtime remain unchanged.

The easiest synthetic result is not our headline. A real document exposed problems that the synthetic cases missed.

| Test                                       |     Baseline |                          Fact Weight |
| ------------------------------------------ | -----------: | -----------------------------------: |
| v3 untouched synthetic holdout             | 39/40 labels |                         40/40 labels |
| v4 untouched electricity-source stress set |        19/24 |                                20/24 |
| v5 untouched second-document stress set    |        23/24 | 22/24, including one failed response |
| v5 JSON-repair regression on that same set |        23/24 |            23/24, no failed requests |

In the fresh v5 source test, the flow made **1 false flag among 18 negative cases**, while the baseline made none. The JSON repair fixed the failed response; it did not fix that false flag. These are agent-constructed cases with source-derived labels, no human expert labels. They do not establish real-world misinformation precision. The same-evidence baseline is a plain unstructured LLM comparison. All runs and failure notes are in [eval/LEDGER.md](eval/LEDGER.md).

```sh
npm test
node eval/run.mjs --split=dev --version=my-dev
# Fetch the live original documents, then evaluate against that snapshot:
node eval/prepare-sources.mjs
node eval/run.mjs --split=source-heldout --version=my-electricity-run
node eval/run.mjs --split=fresh-source-heldout --version=my-second-document-run
```

There are 16 local contract/scoring tests. Model outputs, request IDs, source metadata and hashes are retained in evaluation records. Preparing sources uses live Context.dev calls; source content may drift. Full external documents are kept only in ignored `work/`, not committed. Historical model versions are under `eval/versions/`.

## Deployment and demo

[Isolation rules](deploy/README.md). The existing KVM 2 also runs Spread. Fact Weight uses its own Docker container, release and environment, with 0.5 CPU and 384 MB memory limits. It publishes no app port and uses the existing HTTPS proxy. Never alter Spread, restart Traefik, replace templates, reboot or touch Spread's environment.

[Two-minute demo script](DEMO_SCRIPT.md) · [Five-minute peer-review notes](PEER_REVIEW.md)

## License

MIT for project code and original synthetic fixtures. External documents, quotations and third-party data retain their own rights. Council source URLs and provenance are recorded; no external article corpus is committed.

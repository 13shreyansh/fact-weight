# Fact Weight

A claim-versus-evidence desk for Baltic readers. Paste a post, choose source articles, and inspect supporting, conflicting and missing evidence with quotations and retrieval timestamps.

Built during Junction 2026 by Shreyansh, solo team The CS Guy. Main challenge: Hostinger. Technology prize: Context.dev, not its main challenge.

## Status

Local backend and interface implemented. Hostinger AI Router passed a real inference call with `gpt-4.1-mini`. Context.dev live retrieval and public Hostinger deployment await the existing account/console access step through the Chief chat. A configured environment is not evidence of a successful integration.

## Run

Requires Node.js22 or newer. No runtime dependencies.

```sh
cp .env.example .env
# Set the existing Hostinger AI Router and Context.dev keys privately in .env.
npm start
# Open http://127.0.0.1:4320
```

The application sends the post and extracted sources to Hostinger AI Router. Context.dev retrieves the article URLs. It does not save posts to disk. Source pages are held in a bounded process-memory cache. Do not paste private information.

## What is verified

The model proposes a relation for each passage. Code accepts a citation only when its source ID exists and its normalized quotation occurs in the retrieved text. Unsupported allegations, plans and absent confirmation cannot create a support or contradiction relation. Accepted relations determine the final label. Domains and near-identical text collapse into source groups. Different groups do not prove independent reporting.

Labels describe the supplied documents. They are not truth probabilities or judgments about a person's intent. This version needs article URLs from the reader and does not discover every relevant source or monitor a feed.

## Evaluation

```sh
npm test
node eval/run.mjs --split=dev --version=my-run
# Freeze before looking at held-out cases, then:
node eval/run.mjs --split=heldout --version=my-run
```

The test corpus contains20 development and40 held-out synthetic cases with construction-rule labels. No human labels. It covers number/date mismatches, attribution versus fact, allegations, plans, copied reports, conflicts, negation and an injected instruction. It measures relation agreement, contradiction-flag precision/recall/false positives and verbatim citation validity. It does not measure live retrieval or real-world misinformation accuracy. Results and observed failures are in [eval/LEDGER.md](eval/LEDGER.md). The baseline receives the same passages, without the structured checks.

## Deployment

[Deployment isolation rules](deploy/README.md). The existing VPS also runs Spread. Fact Weight uses only its own directory, environment and service/container. Never restart or alter Spread, replace server templates, change its policy, reboot, or touch its environment.

## License

MIT for project code. Third-party documents retain their own rights. Synthetic evaluation passages are original project data. No external article corpus is committed.

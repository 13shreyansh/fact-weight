import fs from "node:fs";
import { get, spend } from "../signal/providers.mjs";
const ids = ["a6b0d22b1d61", "aa9426e2b5e6", "nab032987aff"];
let report =
  "# REAL FINDINGS\n\nUpdated " +
  new Date().toISOString() +
  ". Source observations, not an attribution of intent. Publishing domains are counted as publishing identities; they are not people or new social accounts.\n";
for (const id of ids) {
  const p = get("push", id);
  if (!p) continue;
  report +=
    `\n## ${id}: ${p.title}\n\nVerdict: ${p.verdict}. Measured ${p.posts.length} posts, ${p.accounts.length} publishing identities. Peak: ${p.peak} posts in 10 minutes, starting ${p.peakAt}. Same-minute signal is withheld where a comparable historical collection baseline is unavailable.\n\n### Posts\n` +
    p.posts
      .map((x) => `- ${x.platform} ${x.handle}, ${x.postedAt}: ${x.url}`)
      .join("\n") +
    "\n\n### Accounts and ages\n" +
    p.accounts
      .map(
        (a) =>
          `- ${a.handle} (${a.platform}): ${a.createdAt ? "created " + a.createdAt : "creation date could not be measured"}; followers: ${a.followers ?? "not public"}. ${a.url}`,
      )
      .join("\n") +
    "\n\n### Measured reasons\n" +
    p.signals
      .map(
        (s) => `- ${s.name}: ${s.fired ? "fired" : "not fired"}. ${s.reason}`,
      )
      .join("\n") +
    "\n\n### Origin and pickup\n" +
    (p.origins || [])
      .map(
        (o) =>
          `- ${o.relationship}: ${o.url} (${o.postedAt || "publication time unavailable"}).`,
      )
      .join("\n") +
    "\n" +
    (p.pickups || [])
      .map(
        (x) =>
          `- Matching claim on ${x.platform}: ${x.url}. ${x.copyLinkEstablished ? "A network link is present." : "Direct copying or exposure caused by the network was not established."}`,
      )
      .join("\n") +
    "\n\n### Claim and tracker evidence\n" +
    p.claim +
    "\n" +
    (p.evidence.length
      ? p.evidence
          .map(
            (e) =>
              `- ${e.stance}; ${e.publisherGroup || e.name}; quote: ${e.quote}\n  ${e.url}`,
          )
          .join("\n")
      : "No exact relevant tracker passage was verified. This claim remains unchecked.") +
    "\n\n### Wording\n" +
    (p.techniques.length
      ? p.techniques
          .map((t) => `- ${t.name}: "${t.phrase}". ${t.explanation}`)
          .join("\n")
      : "No technique was established from an exact phrase.") +
    "\n\n### Seen before and sites\n" +
    (p.seenBefore.length
      ? p.seenBefore
          .map(
            (c) =>
              `- ${c.title}, ${c.recordedAt || "date unavailable"}: ${c.url}`,
          )
          .join("\n")
      : "No close match among the retrieved EUvsDisinfo cases. This does not mean the claim is new.") +
    "\nNo verified cloned Baltic news site was found in this push.\n\nJudgement: " +
    p.judgement.model +
    ", " +
    p.judgement.promptVersion +
    ", " +
    p.judgement.at +
    ".\n";
}
report +=
  "\n## Recorded provider spend\n\n" +
  JSON.stringify(spend(), null, 2) +
  "\nUnknown billed amounts retain reservations. Monitor runs are reconciled by authenticated provider events.\n";
fs.mkdirSync("artifacts/findings", { recursive: true });
fs.writeFileSync("artifacts/findings/REAL_FINDINGS.md", report);
let status = `Signal Fire detects coordination in public war narratives and shows inspectable source evidence.\nThe shipped watch follows the documented Pravda network aimed at the Baltics and Finland.\nContext.dev collection stays within 30,000 credits; shown judgements use Router within 1,500 credits.\nDeployment is an isolated Hostinger container; original Fact Weight, Traefik, Spread and Parallax are preserved.\nAcceptance requires deployed desktop/mobile tests, real exports, a frozen benchmark and independent review.\n\nSIGNAL FIRE / ${new Date().toISOString()} / release in progress / https://signal-fire.72.61.22.106.sslip.io\nDONE:\n- Isolated Hostinger deployment is live; current verified runtime commit b4e05d51251f529136c6d4692fa7ef5777432e3d.\n- Three live network copy chains now meet the moderate rule, with measured text variants and links.\n- Repository renamed to https://github.com/13shreyansh/signal-fire; original Fact Weight URL remains running.\nNUMBERS: measured content-only dev 3/8 caught, 1/8 false flags; held-out 8/16 caught, 3/16 false flags, 2 failed outputs. These are not coordination accuracy.\nSCREENSHOTS: deployed acceptance pending; local smoke evidence is not treated as deployed proof.\nREVIEW: initial Astra review failed; correctness repairs have regression tests. Re-review pending.\nNEXT: deploy signed monitor webhooks and latency, then complete the campaign replay and deployed video tests.\nNEEDS DECISION: none.\nBLOCKED: no infrastructure blocker. Required acceptance work remains in progress.\n\n## REAL FINDINGS\n\nThe three strongest verified live pushes are below. Complete posts, publishing identities, dates, source quotes and limits: [REAL_FINDINGS.md](artifacts/findings/REAL_FINDINGS.md).\n\n`;
for (const id of ids) {
  const p = get("push", id);
  status += `- [${p.title}](https://signal-fire.72.61.22.106.sslip.io/w/baltics/p/${id}): moderate; ${p.posts.length} posts, ${p.accounts.length} publishing identities; peak ${p.peak} per 10 minutes. Origin: ${(p.origins || []).map((o) => o.url).join(", ") || "not established"}. ${p.pickups?.length || 0} matching public items; a causal copy connection is not assumed. Accounts ages unavailable. No verified cloned site. ${p.evidence.length} exact tracker passages.\n`;
}
status +=
  "\n## Benchmark\n\nCIKM base: measured 18,249 article records. Ukraine keyword subset: measured 4,503, with 1,695 source-labelled trustworthy and 2,808 source-labelled disputed. Grouped by debunk ID: 1,531 development / 2,972 held-out inventory records. Article experiment sampled 16 development and 32 held-out retrievable articles; the held-out false-flag rate was 18.75%, above 5%. Campaign coordination replay and lead time remain in progress; no early-debunk lead is claimed.\n\n## Credits spent\n\n" +
  JSON.stringify(spend(), null, 2) +
  "\nMeasured is the sum of returned request charges. Charged-or-reserved includes unknown amounts. Initial failed attempts and concurrent preparation are being reconciled with the VPS ledger before the final report.\n\n## Hosting used\n\nHostinger 72.61.22.106, isolated signal-fire container. 1 CPU and 1,536 MB memory limit. Persistent database and embedding model are on the VPS. Existing Fact Weight and Traefik container IDs were preserved. The named Spread service was already inactive, PID 0, before deployment and remains unchanged. Parallax containers were observed and not changed.\n\n## Spec gaps I filled\n\n- Publishing domains use source identities in account tables; creation dates are never inferred from domain registration.\n- Ordinary publisher translation and syndication are stated as innocent explanations.\n- A missing historical source baseline is unknown, not zero.\n- Public matching-claim items are separated from verified copy connections.\n- Actual first-post delays include backfilled content and will be labelled as observed latency, not warning lead.\n- Public CheckFirst files currently expose aggregates; article-level evidence is collected directly.\n\n## In progress from Job 04\n\nSigned Context.dev monitor webhooks, per-step times, the Method Speed and live-web-data blocks, a deployed Context.dev video cut, and SUBMISSION.md. They are not marked complete until the deployed flow is verified.\n";
fs.writeFileSync("STATUS.md", status);
console.log(
  "Three real findings written to STATUS.md and the linked full ledger.",
);

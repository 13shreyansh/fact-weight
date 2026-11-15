import fs from "node:fs";
import { get, put, judge, hash } from "../signal/providers.mjs";
import { measure, config } from "../signal/detect.mjs";
const split = process.argv[2];
if (!["dev", "heldout"].includes(split)) throw Error("split required");
const frozenPath = "artifacts/benchmark/coordination-frozen.json",
  configHash = hash(config);
if (split === "heldout") {
  const f = JSON.parse(fs.readFileSync(frozenPath));
  if (f.configHash !== configHash) throw Error("Frozen thresholds changed");
}
const input = [
  ...JSON.parse(fs.readFileSync("work/coordination/" + split + "-cases.json")),
  ...JSON.parse(
    fs.readFileSync("work/coordination/" + split + "-controls.json"),
  ),
];
const results = [];
for (const c of input) {
  const posts = [...c.posts].sort(
      (a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt),
    ),
    full = measure(posts, [], c.accounts);
  let flag = null,
    judgements = [],
    failed = false;
  for (let n = config.minPosts; n <= posts.length; n++) {
    const prefix = posts.slice(0, n),
      accounts = c.accounts.filter((a) =>
        prefix.some((p) => p.accountId === a.id),
      ),
      m = measure(prefix, [], accounts);
    if (!["moderate", "strong"].includes(m.verdict)) continue;
    try {
      const j = await judge({
        posts: prefix
          .slice(0, 12)
          .map((p) => ({ id: p.id, text: p.text.slice(0, 5000) })),
        sources: [],
        signals: m.signals,
        task: "Check whether these public posts carry the same specific war-related narrative. Return sameNarrative false for a mixed collection of unrelated stories. Publisher/network identity does not decide the answer.",
      });
      judgements.push(j);
      if (j.data.sameNarrative) {
        flag = {
          verdict: m.verdict,
          at: prefix.at(-1).postedAt,
          posts: n,
          signals: m.signals,
        };
        break;
      }
    } catch (e) {
      failed = true;
      break;
    }
  }
  const result = {
    ...c,
    posts,
    finalMeasured: full,
    eligible:
      posts.length >= config.minPosts &&
      c.accounts.length >= config.minAccounts,
    flag,
    judgements,
    failed,
    firstPostAt: posts[0]?.postedAt,
    firstPublicDebunkAt: null,
  };
  results.push(result);
  console.log(
    split,
    c.label,
    results.length,
    posts.length,
    flag?.verdict || "not flagged",
  );
  fs.writeFileSync(
    "work/coordination/" + split + "-evaluated.json",
    JSON.stringify(results),
  );
}
const counts = (strongOnly) => {
  let pos = results.filter((c) => c.label === "coordinated"),
    neg = results.filter((c) => c.label === "normal_reporting");
  let f = (c) =>
    c.flag &&
    (strongOnly
      ? c.flag.verdict === "strong"
      : ["strong", "moderate"].includes(c.flag.verdict));
  let tp = pos.filter(f).length,
    fp = neg.filter(f).length;
  return {
    tp,
    fn: pos.length - tp,
    fp,
    tn: neg.length - fp,
    positive: pos.length,
    negative: neg.length,
    catchRate: tp / pos.length,
    falseFlagRate: fp / neg.length,
    precision: tp + fp ? tp / (tp + fp) : null,
  };
};
const report = {
  split,
  at: new Date().toISOString(),
  configHash,
  n: results.length,
  contentItems: results.reduce((s, c) => s + c.posts.length, 0),
  eligible: results.filter((c) => c.eligible).length,
  positiveEligible: results.filter(
    (c) => c.eligible && c.label === "coordinated",
  ).length,
  negativeEligible: results.filter(
    (c) => c.eligible && c.label === "normal_reporting",
  ).length,
  failed: results.filter((c) => c.failed).length,
  both: counts(false),
  strong: counts(true),
  leadSubset: 0,
  limitations:
    "Conditional candidate-verification replay. Article sets were discovered through declared publication alternates or a Baltic news headline search, not recovered by end-to-end network discovery. Missing baselines, account ages and mutuals cannot fire. English-edition and search-retrieval selection limit generalisation. Some reporting controls do not meet the minimum sample. Only Pravda is replayed; the other documented families lack retrievable timestamped post sets. No public-debunk lead pairs verified.",
  cases: results.map((c) => ({
    id: c.id,
    seed: c.seed,
    label: c.label,
    family: c.family,
    selection: c.selection,
    posts: c.posts.length,
    accounts: c.accounts.length,
    eligible: c.eligible,
    firstPostAt: c.firstPostAt,
    flag: c.flag,
    firstPublicDebunkAt: null,
    failed: c.failed,
    judgements: c.judgements.map(({ data, usage, ...j }) => ({
      ...j,
      sameNarrative: data.sameNarrative,
      usage,
    })),
  })),
  wrong:
    results.find((c) => c.label === "coordinated" && !c.flag) ||
    results.find((c) => c.label === "normal_reporting" && c.flag) ||
    null,
};
if (report.wrong)
  report.wrong = {
    id: report.wrong.id,
    label: report.wrong.label,
    title: report.wrong.posts[0]?.title,
    url: report.wrong.seed,
    posts: report.wrong.posts.length,
    accounts: report.wrong.accounts.length,
    signals: report.wrong.finalMeasured.signals,
    verdict: report.wrong.finalMeasured.verdict,
  };
fs.writeFileSync(
  "artifacts/benchmark/" + split + "-coordination-results.json",
  JSON.stringify(report, null, 2),
);
put("benchmark", split + "-coordination", report);
console.log(JSON.stringify({ ...report, cases: undefined, wrong: undefined }));
if (split === "dev")
  fs.writeFileSync(
    frozenPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        config,
        configHash,
        devResultsHash: hash(report),
        readerPromptVersion: "sf-judge-v5",
        model: "gpt-4.1-mini",
        rule: "Retain the provisional thresholds unchanged. No threshold selected after development. Held-out sets use different dates and are deduplicated against development by measured text overlap.",
      },
      null,
      2,
    ),
  );

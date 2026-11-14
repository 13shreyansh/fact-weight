import { all, get, put, hash } from "../signal/providers.mjs";
import { measure, shingles, jaccard, config } from "../signal/detect.mjs";
const records = all("post").filter(
  (p) => p.postedAt && Date.parse(p.postedAt) >= Date.parse("2026-11-01"),
);
const posts = records
  .map((p) => ({
    ...p,
    embedding: get("embedding", hash("sf-embed-v2:" + p.text)),
  }))
  .filter((p) => p.embedding);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
let groups = [];
for (const p of posts) {
  let best,
    similarity = config.embeddingSimilarity;
  for (const g of groups) {
    if (
      Math.abs(Date.parse(p.postedAt) - Date.parse(g[0].postedAt)) >
      48 * 3600000
    )
      continue;
    let d = dot(p.embedding, g[0].embedding);
    if (d > similarity) {
      similarity = d;
      best = g;
    }
  }
  if (best) best.push(p);
  else groups.push([p]);
}
const candidates = groups
  .filter((g) => g.length >= 4)
  .sort((a, b) => b.length - a.length);
for (const c of candidates) {
  const clean = c.map(({ embedding, ...p }) => p);
  const accounts = [...new Set(c.map((p) => p.accountId))]
    .map((id) => get("account", id))
    .filter(Boolean);
  const universe = posts
    .filter((p) => dot(p.embedding, c[0].embedding) > 0.55)
    .map(({ embedding, ...p }) => p);
  const m = measure(clean, universe, accounts);
  const id = "s" + hash(c.map((p) => p.id).sort()).slice(0, 11);
  put("candidate", id, {
    id,
    posts: clean,
    accounts,
    ...m,
    grouping: {
      method: "multilingual embedding",
      model: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
      version: "sf-embed-v2",
      threshold: config.embeddingSimilarity,
    },
  });
  console.log(
    id,
    c.length,
    accounts.length,
    m.verdict,
    m.signals.filter((s) => s.fired).map((s) => s.name),
    c[0].text.slice(0, 120),
  );
}

put("meta", "semanticCandidates", {
  ids: candidates.map(
    (c) => "s" + hash(c.map((p) => p.id).sort()).slice(0, 11),
  ),
  at: new Date().toISOString(),
});

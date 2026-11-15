import fs from "node:fs";
import { shingles, jaccard } from "../signal/detect.mjs";
const paths = [
  "dev-cases",
  "dev-controls",
  "heldout-cases",
  "heldout-controls",
];
let sets = {};
for (let x of paths)
  sets[x] = JSON.parse(fs.readFileSync("work/coordination/" + x + ".json"));
const canonical = (u) => {
  let x = new URL(u);
  return x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/$/, "");
};
let dev = [...sets["dev-cases"], ...sets["dev-controls"]],
  held = [...sets["heldout-cases"], ...sets["heldout-controls"]];
let urls = new Map();
for (let c of dev) for (let p of c.posts) urls.set(canonical(p.url), c.id);
let overlap = [];
for (let c of held)
  for (let p of c.posts)
    if (urls.has(canonical(p.url)))
      overlap.push({
        dev: urls.get(canonical(p.url)),
        heldout: c.id,
        url: p.url,
      });
const devText = sets["dev-cases"].flatMap((c) =>
  c.posts.map((p) => ({ case: c.id, text: shingles(p.text) })),
);
let similar = [];
for (let c of sets["heldout-cases"]) {
  let found = false;
  for (let p of c.posts) {
    let a = shingles(p.text),
      match = devText.find((d) => jaccard(a, d.text) >= 0.72);
    if (match) {
      similar.push({ dev: match.case, heldout: c.id, url: p.url });
      found = true;
      break;
    }
  }
}
let report = {
  at: new Date().toISOString(),
  counts: Object.fromEntries(paths.map((p) => [p, sets[p].length])),
  canonicalURLoverlap: overlap,
  nearDuplicateNetworkStories: similar,
};
fs.writeFileSync(
  "artifacts/benchmark/split-audit.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));

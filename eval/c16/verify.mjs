import fs from "node:fs/promises";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { statusMetrics, nuisanceMetrics } from "./scoring.mjs";
const at = new URL("./", import.meta.url),
  root = new URL("../../", import.meta.url);
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
const manifestBytes = await fs.readFile(new URL("manifest.json", at)),
  manifest = JSON.parse(manifestBytes);
for (const [p, h] of Object.entries(manifest.hashes))
  assert.equal(
    hash(await fs.readFile(new URL(p, root))),
    h,
    "Changed frozen input: " + p,
  );
const fixtures = JSON.parse(
  await fs.readFile(new URL("fixtures.json", at), "utf8"),
);
const rows = [];
for (const f of fixtures) {
  const r = JSON.parse(
    await fs.readFile(new URL("results/" + f.id + ".json", at), "utf8"),
  );
  assert.equal(r.manifestSha256, hash(manifestBytes));
  assert.deepEqual(r.reference, f.reference);
  assert.equal(r.post, f.post);
  rows.push(r);
}
rows.sort((a, b) => a.id.localeCompare(b.id));
const summary = JSON.parse(
  await fs.readFile(new URL("summary.json", at), "utf8"),
);
const main = rows.filter((r) => r.slice === "main");
assert.deepEqual(statusMetrics(main), summary.main.pipeline);
assert.deepEqual(statusMetrics(main, "baselineLabel"), summary.main.baseline);
assert.deepEqual(nuisanceMetrics(main), summary.main.nuisance);
const review = JSON.parse(
  await fs.readFile(new URL("review/semantic-grades.json", at), "utf8"),
);
const provenance = JSON.parse(
  await fs.readFile(new URL("review/provenance.json", at), "utf8"),
);
for (const [p, h] of Object.entries(provenance.reviewFiles))
  assert.equal(hash(await fs.readFile(new URL("review/" + p, at))), h, p);
assert.deepEqual(review.cases.map((c) => c.id).sort(), rows.map((r) => r.id));
const tally = (grades) => {
  const counts = { pass: 0, fail: 0, unjudgeable: 0, "not-applicable": 0 };
  for (const g of grades) {
    assert.ok(Object.hasOwn(counts, g.grade), "Unknown reviewer grade");
    counts[g.grade]++;
  }
  return counts;
};
for (const key of [
  "extractionSemanticFaithfulness",
  "originalMeaningSupportStatus",
  "originalPostTaskFaithfulness",
  "relevantEvidenceCoverageForOriginalSupportedOrContradictedClaim",
])
  assert.deepEqual(tally(review.cases.map((c) => c[key])), review.aggregates[key]);
const claims = review.cases.flatMap((c) => c.claims);
assert.equal(claims.length, review.aggregates.returnedClaims);
for (const key of [
  "supportStatusGivenExtractedClaim",
  "relevantEvidenceCoverageForExtractedClaim",
])
  assert.deepEqual(tally(claims.map((c) => c[key])), review.aggregates[key]);
const passages = claims.flatMap((c) => c.evidence);
assert.equal(passages.length, review.aggregates.returnedEvidencePassages);
assert.deepEqual(
  tally(passages.map((p) => p.relevanceToExtractedClaim)),
  review.aggregates.evidenceRelevanceToExtractedClaim,
);
assert.equal(
  review.nuisancePairs.filter((p) => p.slice === "main" && p.originalMeaningDispositionFlip).length,
  review.nuisanceSummary.mainOriginalMeaningDispositionFlips,
);
try {
  const seal = JSON.parse(
    await fs.readFile(new URL("FINAL_AUDIT.json", at), "utf8"),
  );
  for (const [p, h] of Object.entries(seal.files))
    assert.equal(
      hash(await fs.readFile(new URL(p, root))),
      h,
      "Final audit artifact changed: " + p,
    );
  console.log("Final evidence/review seal verified.");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  console.log(
    "Initial frozen audit verified; final review seal not present yet.",
  );
}
console.log(
  JSON.stringify({
    frozenInputs: Object.keys(manifest.hashes).length,
    cases: rows.length,
    mainFamilies: 8,
    mainCases: main.length,
    strictSignatureMatches: summary.main.pipeline.correct,
    nuisanceSignatureChanges: summary.main.nuisance.flips,
    runtimeEngineHash: manifest.hashes["engine.mjs"],
  }),
);

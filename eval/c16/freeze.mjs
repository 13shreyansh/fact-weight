import fs from "node:fs/promises";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const root = new URL("../../", import.meta.url),
  at = new URL("./", import.meta.url);
const hash = (x) => crypto.createHash("sha256").update(x).digest("hex");
try {
  await fs.access(new URL("manifest.json", at));
  throw Error("Audit already sealed");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const paths = [
  "engine.mjs",
  "retrieval.mjs",
  "eval/c16/SPEC.md",
  "eval/c16/fixtures.json",
  "eval/c16/sources.json",
  "eval/c16/build-fixtures.mjs",
  "eval/c16/run.mjs",
  "eval/c16/scoring.mjs",
];
const hashes = {};
for (const p of paths) hashes[p] = hash(await fs.readFile(new URL(p, root)));
const engine = await fs.readFile(new URL("engine.mjs", root));
const deployed = execFileSync(
  "git",
  ["show", "c465b5ffd39022c7e08af038087b7a6033372074:engine.mjs"],
  { cwd: root },
);
if (!engine.equals(deployed))
  throw Error("Engine differs from deployed release");
const sources = JSON.parse(
  await fs.readFile(
    new URL("../../work/c16/sources.json", import.meta.url),
    "utf8",
  ),
);
for (const s of sources)
  if (hash(s.text) !== s.hash)
    throw Error("Source body differs from metadata hash");
const manifest = {
  audit: "C16-publisher-nuisance-v1",
  sealedAt: new Date().toISOString(),
  runtimeRelease: "c465b5ffd39022c7e08af038087b7a6033372074",
  models: { proposer: "gpt-4.1-mini", veto: "claude-fable-5.2" },
  developmentPublishers: ["Council of the EU"],
  heldoutPublishers: ["ENTSO-E", "NATO"],
  claimFamilyUnit: 8,
  mainCases: 48,
  retrievalFailureProbeCases: 6,
  hashes,
  sources: sources.map(
    ({ id, publisher, url, hash, requestId, articleCoverage }) => ({
      id,
      publisher,
      url,
      hash,
      requestId,
      articleCoverage,
    }),
  ),
  limits: [
    "No human gold labels",
    "Publisher holdout is from this project, not model pretraining",
    "ENTSO-E shares the development grid event and potentially upstream information",
    "NATO and NATO ACT are one publisher",
    "Source independence is not established",
    "Repeated variants are correlated",
  ],
};
await fs.writeFile(
  new URL("manifest.json", at),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log({
  sealedAt: manifest.sealedAt,
  engineHash: hashes["engine.mjs"],
  mainCases: 48,
  retrievalProbe: 6,
});

import fs from "node:fs";
import { get, put, hash } from "../signal/providers.mjs";
const dev = JSON.parse(
    fs.readFileSync("artifacts/benchmark/dev-coordination-results.json"),
  ),
  heldout = JSON.parse(
    fs.readFileSync("artifacts/benchmark/heldout-coordination-results.json"),
  ),
  audit = JSON.parse(fs.readFileSync("artifacts/benchmark/split-audit.json"));
if (
  audit.canonicalURLoverlap.length ||
  audit.nearDuplicateNetworkStories.length
)
  throw Error("Split overlap");
const old = get("benchmark", "latest") || {};
const record = {
  ...old,
  status: "measured",
  coordination: heldout,
  development: dev,
  leadSubset: 0,
  freeze: JSON.parse(
    fs.readFileSync("artifacts/benchmark/coordination-frozen.json"),
  ),
  splitAudit: audit,
};
put("benchmark", "latest", record);
fs.writeFileSync(
  "artifacts/benchmark/results.json",
  JSON.stringify(record, null, 2),
);
console.log("Recorded held-out coordination replay", heldout.both);

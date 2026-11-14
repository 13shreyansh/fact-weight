import fs from "node:fs";
import { db, get, all } from "../signal/providers.mjs";
import { finalize } from "../signal/store.mjs";
import { ensurePack } from "../signal/packs.mjs";
const ids = ["a6b0d22b1d61", "aa9426e2b5e6", "nab032987aff"];
for (const id of ids) {
  const c = get("assessed", id);
  for (const p of c.posts) {
    if (new URL(p.url).hostname === "telegra.ph") {
      p.platform = "WB";
      const a = get("account", p.accountId);
      if (a)
        db.prepare("UPDATE records SET data=? WHERE kind=? AND id=?").run(
          JSON.stringify({ ...a, platform: "WB" }),
          "account",
          a.id,
        );
    }
  }
  const p = finalize(c);
  if (p) await ensurePack(p);
}
const records = [],
  add = (kind, id) => {
    const d = get(kind, id);
    if (d) records.push({ kind, id, data: JSON.stringify(d) });
  };
for (const id of ids) {
  for (const kind of [
    "push",
    "candidate",
    "assessed",
    "latency",
    "structured-origin",
  ])
    add(kind, id);
  const p = get("push", id);
  for (const post of p.posts) {
    add("post", post.id);
    add("account", post.accountId);
  }
}
for (const p of all("push").filter((p) => p.excluded)) add("push", p.id);
for (const kind of ["network-evidence", "network-index", "batch"])
  for (const row of db
    .prepare("SELECT kind,id,data FROM records WHERE kind=?")
    .all(kind))
    records.push(row);
add("watch", "baltics");
add("benchmark", "latest");
const calls = db.prepare("SELECT * FROM calls").all();
fs.writeFileSync(
  "work/signal-data-update.ndjson",
  [
    ...records.map((r) => JSON.stringify({ type: "record", ...r })),
    ...calls.map((r) => JSON.stringify({ type: "call", ...r })),
  ].join("\n"),
);
console.log(
  "Data update",
  records.length,
  "records,",
  calls.length,
  "call records. Signing secrets are not exported.",
);

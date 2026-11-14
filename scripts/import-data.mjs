import fs from "node:fs";
import { db } from "../signal/providers.mjs";
const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
db.exec("BEGIN IMMEDIATE");
try {
  const c = db.prepare(
    "INSERT OR IGNORE INTO calls(id,provider,at,endpoint,params,status,ms,credits,reserved,response,cache_key) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
  );
  for (const r of input.calls)
    c.run(
      r.id,
      r.provider,
      r.at,
      r.endpoint,
      r.params,
      r.status,
      r.ms,
      r.credits,
      r.reserved,
      r.response,
      r.cache_key,
    );
  const put = db.prepare(
    "INSERT OR REPLACE INTO records(kind,id,data) VALUES(?,?,?)",
  );
  for (const r of input.records) put.run(r.kind, r.id, r.data);
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
console.log("Imported source evidence and retained existing VPS records.");

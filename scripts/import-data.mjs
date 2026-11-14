import fs from "node:fs";
import readline from "node:readline";
import { db } from "../signal/providers.mjs";
const lines = readline.createInterface({
  input: fs.createReadStream(process.argv[2]),
  crlfDelay: Infinity,
});
const call = db.prepare(
  "INSERT OR IGNORE INTO calls(id,provider,at,endpoint,params,status,ms,credits,reserved,response,cache_key) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
);
const record = db.prepare(
  "INSERT OR REPLACE INTO records(kind,id,data) VALUES(?,?,?)",
);
let count = 0;
for await (const line of lines) {
  if (!line.trim()) continue;
  const r = JSON.parse(line);
  if (r.type === "call")
    call.run(
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
  else if (r.type === "record") record.run(r.kind, r.id, r.data);
  count++;
}
console.log(
  "Imported",
  count,
  "source records; existing VPS call records retained.",
);

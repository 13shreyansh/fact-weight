import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.SIGNAL_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "sf-metrics-"));
const { db, put } = await import("../signal/providers.mjs");
const { metrics } = await import("../signal/store.mjs");
test("source-read counts count successful watched URLs once, excluding unsuccessful extraction", () => {
  put("watch", "isolated", {
    id: "isolated",
    sources: ["https://example.org/a", "https://example.org/b"],
  });
  const insert = db.prepare(
    "INSERT INTO calls(id,provider,endpoint,status,params,response)VALUES(?,?,?,?,?,?)",
  );
  for (let id of ["one", "two"])
    insert.run(
      id,
      "context",
      "/web/scrape",
      200,
      JSON.stringify({ url: "https://example.org/a" }),
      JSON.stringify({
        markdown: { success: true, data: "Real extracted text" },
      }),
    );
  insert.run(
    "failed",
    "context",
    "/web/scrape",
    200,
    JSON.stringify({ url: "https://example.org/b" }),
    JSON.stringify({ markdown: { success: false, data: null } }),
  );
  assert.equal(metrics("isolated").sources, 1);
});

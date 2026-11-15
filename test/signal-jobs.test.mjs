import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.SIGNAL_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "sf-job-"));
const { server } = await import("../signal/server.mjs");
const { all } = await import("../signal/providers.mjs");
test("creating a watch queues durable work without running providers on the request thread", { skip: "v1 watch creation retired with the v1 UI; POST /api/watch now registers v2 newsroom alerts (v2/live.mjs)" }, async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const original = global.fetch;
  try {
    const response = await original(
      "http://127.0.0.1:" + server.address().port + "/api/watch",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conflict: "Isolated regression test",
          countries: ["Sudan"],
          languages: ["en"],
          keywords: { en: ["Sudan"] },
          sources: ["https://example.org/one", "https://example.org/two"],
          news: false,
        }),
      },
    );
    assert.equal(response.status, 201);
    const d = await response.json();
    const jobs = all("sweep-request").filter((j) => j.watchId === d.id);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].status, "pending");
    assert.equal(all("sweep").length, 0);
  } finally {
    server.close();
  }
});

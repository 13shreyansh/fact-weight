import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.SIGNAL_DATA = fs.mkdtempSync(
  path.join(os.tmpdir(), "sf-duplicate-"),
);
const { put, get } = await import("../signal/providers.mjs");
const { collapseDuplicates } = await import("../signal/duplicates.mjs");
const { finalize } = await import("../signal/store.mjs");
test("duplicate source rows retain the larger finding and its origin evidence", () => {
  const posts = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
  put("push", "smaller", {
    id: "smaller",
    watchId: "isolated",
    posts: posts.slice(0, 8),
  });
  put("push", "larger", {
    id: "larger",
    watchId: "isolated",
    posts,
    origins: [{ url: "https://example.org/original" }],
  });
  assert.equal(collapseDuplicates("isolated"), 1);
  assert.equal(get("push", "smaller").mergedInto, "larger");
  assert.ok(!get("push", "larger").excluded);
});
test("a failed narrative recheck withdraws the previous public finding", () => {
  put("push", "withdrawal", {
    id: "withdrawal",
    watchId: "isolated",
    verdict: "moderate",
  });
  assert.equal(
    finalize(
      { id: "withdrawal", judgement: { data: { sameNarrative: false } } },
      "isolated",
    ),
    null,
  );
  assert.equal(get("push", "withdrawal").excluded, true);
});

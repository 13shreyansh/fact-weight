import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.SIGNAL_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "sf-scopes-"));
const { put, get } = await import("../signal/providers.mjs");
const { recordPost, inWatch, purgeWatch, safeWatch } =
  await import("../signal/scopes.mjs");
const { metrics } = await import("../signal/store.mjs");
test("private collection is isolated, shared evidence survives deletion, and late work cannot recreate it", () => {
  put("watch", "private", { id: "private", sources: [] });
  const privatePost = recordPost(
    {
      id: "only-private",
      url: "https://example.org/a",
      text: "public source",
      accountId: "a",
    },
    "private",
  );
  assert.equal(inWatch(privatePost, "baltics"), false);
  assert.equal(metrics("private").posts, 1);
  put("post", "shared", {
    id: "shared",
    url: "https://example.org/b",
    text: "already public",
    accountId: "b",
  });
  recordPost(get("post", "shared"), "private");
  purgeWatch("private");
  assert.equal(get("post", "only-private"), null);
  assert.deepEqual(get("post", "shared").watchIds, ["baltics"]);
  assert.equal(
    recordPost({ id: "late", text: "late result" }, "private"),
    null,
  );
  assert.equal(get("post", "late"), null);
  assert.equal(safeWatch({ id: "private", owner: "secret" }).owner, undefined);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
process.env.SIGNAL_DATA = fs.mkdtempSync(
  path.join(os.tmpdir(), "signal-pack-test-"),
);
const { put, get, hash } = await import("../signal/providers.mjs");
const { ensurePack, packKey } = await import("../signal/packs.mjs");
test("evidence hashes use actual bytes", () => {
  const bytes = Buffer.from([0, 255, 65, 10]);
  assert.equal(
    hash(bytes),
    crypto.createHash("sha256").update(bytes).digest("hex"),
  );
});
test("PDF revision includes title and all rendered evidence", () => {
  assert.notEqual(packKey({ title: "old" }), packKey({ title: "new" }));
  assert.notEqual(
    packKey({ sites: [] }),
    packKey({ sites: [{ domain: "example.com" }] }),
  );
});
test("packing cannot restore a withdrawn finding", async () => {
  const p = {
    id: "isolated",
    title: "Test finding",
    packId: "SF-test",
    verdict: "moderate",
    firstSeen: new Date().toISOString(),
    checkedAt: new Date().toISOString(),
    posts: [],
    accounts: [],
    signals: [],
    evidence: [],
    innocentExplanations: [],
    sites: [],
    techniques: [],
    seenBefore: [],
  };
  put("push", p.id, p);
  const pending = ensurePack(p);
  put("push", p.id, { ...p, title: "Withdrawn after recheck", excluded: true });
  await assert.rejects(pending, /withdrawn/);
  assert.equal(get("push", p.id).excluded, true);
  assert.equal(get("push", p.id).title, "Withdrawn after recheck");
});

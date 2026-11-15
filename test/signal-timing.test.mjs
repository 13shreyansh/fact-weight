import test from "node:test";
import assert from "node:assert/strict";
import { reconcileTiming } from "../signal/timing.mjs";
test("backfill waiting and overlapping checks reconcile to the real elapsed delay", () => {
  let t = Date.parse("2026-11-14T00:00:00Z"),
    at = (n) => new Date(t + n).toISOString();
  let x = reconcileTiming(at(0), at(100), {
    collected: { startedAt: at(10), finishedAt: at(30), ms: 20 },
    read: { startedAt: at(20), finishedAt: at(40), ms: 20 },
  });
  assert.equal(x.workMs, 40);
  assert.equal(x.overlapMs, 10);
  assert.equal(x.beforeCollectionMs, 10);
  assert.equal(x.workMs + x.waitMs - x.overlapMs, x.elapsedMs);
  assert.equal(reconcileTiming("bad", at(100), {}), null);
});

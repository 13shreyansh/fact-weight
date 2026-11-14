import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
process.env.SIGNAL_DATA = fs.mkdtempSync(
  path.join(os.tmpdir(), "signal-inbox-test-"),
);
process.env.CONTEXT_DEV_API_KEY = "mock-encryption-key";
const { put, all, db } = await import("../signal/providers.mjs");
const { encryptSecret } = await import("../signal/secrets.mjs");
const { receiveWebhook } = await import("../signal/monitors.mjs");
const secret = "whsec_only_for_isolated_tests";
put("monitor", "route-test", {
  id: "monitor-test",
  routeId: "route-test",
  watchId: "test",
  target: { type: "page", url: "https://example.com/" },
  secret: encryptSecret(secret),
});
function signed(event) {
  const raw = Buffer.from(JSON.stringify(event)),
    t = String(Math.floor(Date.now() / 1000)),
    sig = crypto
      .createHmac("sha256", secret)
      .update(t + ".")
      .update(raw)
      .digest("hex");
  return [
    raw,
    {
      "x-context-signature": `t=${t},v1=${sig}`,
      "x-context-id": event.id,
      "x-context-event": event.event,
    },
  ];
}
test("verified duplicate deliveries produce one inbox event and one billed run", () => {
  const event = {
    id: "isolated-event",
    event: "run.completed",
    created_at: new Date().toISOString(),
    data: {
      run: {
        id: "isolated-run",
        monitor_id: "monitor-test",
        status: "completed",
        credits_charged: 1,
      },
    },
  };
  const [raw, headers] = signed(event);
  assert.equal(receiveWebhook("route-test", raw, headers).status, 204);
  assert.equal(receiveWebhook("route-test", raw, headers).duplicate, true);
  assert.equal(all("webhook").length, 1);
  assert.equal(
    db
      .prepare("SELECT count(*) n FROM calls WHERE endpoint='/monitors/run'")
      .get().n,
    1,
  );
});
test("valid signature cannot authorize a different monitor", () => {
  const [raw, headers] = signed({
    id: "wrong-source",
    event: "run.completed",
    data: { run: { id: "wrong", monitor_id: "another-monitor" } },
  });
  assert.equal(receiveWebhook("route-test", raw, headers).status, 403);
});
test("failed and partial webhook collections remain durable retries with backoff", async () => {
  const { processInbox } = await import("../signal/monitors.mjs");
  put("watch", "test", { id: "test" });
  for (const status of ["failed", "partial"]) {
    const id = "retry-" + status;
    put("webhook", id, {
      id,
      routeId: "route-test",
      watchId: "test",
      status: "pending",
    });
    await processInbox(async () => ({ id: "sweep-test", status }));
    const saved = all("webhook").find((e) => e.id === id);
    assert.equal(saved.status, "pending");
    assert.equal(saved.attempts, 1);
    assert.ok(Date.parse(saved.nextAttemptAt) > Date.now());
  }
});

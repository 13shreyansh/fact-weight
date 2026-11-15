import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.SIGNAL_DATA = fs.mkdtempSync(
  path.join(os.tmpdir(), "sf-registration-"),
);
const { put, get } = await import("../signal/providers.mjs");
const { enqueueRegistration, registerPending } =
  await import("../signal/registrations.mjs");
test("monitor setup retries durably after a provider failure", async () => {
  put("watch", "isolated", { id: "isolated" });
  enqueueRegistration("isolated");
  let attempts = 0;
  const setup = async () => {
    if (++attempts === 1) throw Error("rate limited");
  };
  await registerPending(setup);
  let job = get("monitor-registration", "isolated");
  assert.equal(job.status, "pending");
  assert.ok(Date.parse(job.nextAttemptAt) > Date.now());
  put("monitor-registration", job.id, {
    ...job,
    nextAttemptAt: new Date(0).toISOString(),
  });
  await registerPending(setup);
  assert.equal(attempts, 2);
  assert.equal(get("monitor-registration", "isolated").status, "complete");
});

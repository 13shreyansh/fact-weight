import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  verifySignature,
  encryptSecret,
  decryptSecret,
  redact,
} from "../signal/secrets.mjs";
test("Context signature verifies original bytes and rejects replay, tampering and duplicate fields", () => {
  const raw = Buffer.from('{"event":"run.completed", "id":"test-only"}'),
    secret = "test-only-signing-secret",
    t = String(Math.floor(Date.now() / 1000)),
    signature = crypto
      .createHmac("sha256", secret)
      .update(t + ".")
      .update(raw)
      .digest("hex"),
    header = `t=${t},v1=${signature}`;
  assert.equal(verifySignature(raw, header, secret), true);
  assert.equal(verifySignature(Buffer.from("{}"), header, secret), false);
  assert.equal(
    verifySignature(raw, header, secret, Date.now() + 3600000),
    false,
  );
  assert.equal(verifySignature(raw, header + ",t=" + t, secret), false);
  assert.equal(verifySignature(raw, "", secret), false);
});
test("signing secrets are encrypted for storage and stripped from logged responses", () => {
  process.env.CONTEXT_DEV_API_KEY = "mock-env-key";
  const secret = "whsec_test_only";
  const encrypted = encryptSecret(secret);
  assert.ok(!JSON.stringify(encrypted).includes(secret));
  assert.equal(decryptSecret(encrypted), secret);
  assert.equal(redact({ webhook: { secret } }).webhook.secret, "[redacted]");
});

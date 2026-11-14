import crypto from "node:crypto";
const key = () =>
  crypto
    .createHash("sha256")
    .update(
      "Signal Fire webhook encryption v1\0" + process.env.CONTEXT_DEV_API_KEY,
    )
    .digest();
export function encryptSecret(secret) {
  const iv = crypto.randomBytes(12),
    cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const bytes = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    ciphertext: bytes.toString("hex"),
  };
}
export function decryptSecret(value) {
  const cipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(value.iv, "hex"),
  );
  cipher.setAuthTag(Buffer.from(value.tag, "hex"));
  return Buffer.concat([
    cipher.update(Buffer.from(value.ciphertext, "hex")),
    cipher.final(),
  ]).toString("utf8");
}
export function redact(value) {
  if (typeof value === "string")
    return value.replace(
      /([?&](?:Signature|access_token|refresh_token|token|api_key|X-Goog-Signature)=)[^&\s)\"<>]+/gi,
      "$1[redacted]",
    );
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        /^(secret|webhook_secret|api_?key|authorization|access_token|refresh_token)$/i.test(
          k,
        )
          ? "[redacted]"
          : redact(v),
      ]),
    );
  return value;
}
export function verifySignature(raw, header, secret, now = Date.now()) {
  if (!Buffer.isBuffer(raw) || !secret || typeof header !== "string")
    return false;
  const parts = Object.create(null);
  for (const part of header.split(",")) {
    const pair = part.trim().split("=");
    if (pair.length !== 2 || Object.hasOwn(parts, pair[0])) return false;
    parts[pair[0]] = pair[1];
  }
  if (
    !/^\d{1,12}$/.test(parts.t || "") ||
    !/^([a-f0-9]{64})$/i.test(parts.v1 || "")
  )
    return false;
  if (Math.abs(now / 1000 - Number(parts.t)) > 300) return false;
  const expected = crypto
      .createHmac("sha256", secret)
      .update(parts.t + ".")
      .update(raw)
      .digest(),
    actual = Buffer.from(parts.v1, "hex");
  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
}

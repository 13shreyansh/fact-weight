import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { server } from "../server.mjs";
let base;
before(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + server.address().port;
});
after(() => new Promise((r) => server.close(r)));
test("landing, security headers and health route", async () => {
  const r = await fetch(base);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-security-policy"), /default-src 'self'/);
  assert.match(await r.text(), /Signal Fire/);
  const h = await (await fetch(base + "/api/health")).json();
  assert.equal(h.app, "Fact Weight");
});
test("bad input is rejected before provider calls", async () => {
  const r = await fetch(base + "/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "A concrete claim",
      urls: ["http://localhost/"],
    }),
  });
  assert.equal(r.status, 400);
});
test("cross-origin analysis refused", async () => {
  const r = await fetch(base + "/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: "{}",
  });
  assert.equal(r.status, 403);
});

import test from "node:test";
import assert from "node:assert/strict";
import { server, publicURL } from "../signal/server.mjs";
test("brand mark is served as SVG, not HTML", async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const r = await fetch(
      "http://127.0.0.1:" + server.address().port + "/mark.svg",
    );
    assert.equal(r.headers.get("content-type"), "image/svg+xml");
    assert.match(await r.text(), /<svg/);
  } finally {
    server.close();
  }
});
test("new watch rejects private addresses and credential-bearing URLs", () => {
  for (const u of [
    "https://127.0.0.1/a",
    "https://[::1]/",
    "https://localhost/",
    "http://public.org",
    "https://name:password@public.org",
  ])
    assert.equal(publicURL(u), null);
  assert.equal(publicURL("https://t.me/s/news_lv"), "https://t.me/s/news_lv");
});

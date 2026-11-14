import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { scrape, search } from "../retrieval.mjs";
afterEach(() => mock.restoreAll());
test("Context extraction requires an explicit successful markdown output and preserves metadata", async () => {
  let request;
  mock.method(globalThis, "fetch", async (url, opts) => {
    request = { url, body: JSON.parse(opts.body) };
    return {
      ok: true,
      json: async () => ({
        markdown: {
          success: true,
          data: "A real-shaped fixture page with enough content to pass the extraction guard. This is a synthetic integration fixture.",
        },
        metadata: { title: "Fixture", publishedTime: "2025-02-09T12:00:00Z" },
        request_id: "fixture-1",
        key_metadata: { credits_consumed: 1 },
        cache_metadata: { status: "miss", age_ms: 0 },
      }),
    };
  });
  const r = await scrape("https://fixture.example.org/page", {
    key: "test-fixture",
    fresh: true,
  });
  assert.equal(request.url, "https://api.context.dev/v1/web/scrape");
  assert.equal(request.body.maxAgeMs, 0);
  assert.equal(r.publishedAt, "2025-02-09T12:00:00Z");
  assert.equal(r.requestId, "fixture-1");
  assert.equal(r.creditsConsumed, 1);
});
test("HTTP200 with unsuccessful extraction does not become evidence", async () => {
  mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({ markdown: { success: false, data: null } }),
  }));
  await assert.rejects(
    () =>
      scrape("https://fixture.example.org/fail", {
        key: "test-fixture",
        fresh: true,
      }),
    /could not extract/,
  );
});
test("discovery requests bounded results from declared domains", async () => {
  let body;
  mock.method(globalThis, "fetch", async (url, opts) => {
    body = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({
        results: [
          { url: "https://news.err.ee/report", title: "A report" },
          { url: "http://localhost/private", title: "Unsafe" },
        ],
        request_id: "fixture-search",
      }),
    };
  });
  const r = await search("Baltic electricity", { key: "test-fixture" });
  assert.equal(body.numResults, 4);
  assert.ok(body.includeDomains.includes("news.err.ee"));
  assert.equal(r.results.length, 1);
  assert.equal(r.requestId, "fixture-search");
});

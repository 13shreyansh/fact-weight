import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.SIGNAL_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "sf-domain-"));
process.env.CONTEXT_DEV_API_KEY = "isolated-test";
const { inspectDomain, lookalike } = await import("../signal/domains.mjs");
test("matching relative logo filenames on different origins do not prove a clone", async () => {
  assert.equal(lookalike("err.example").domain, "err.ee");
  let original = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes("rdap.org"))
      return new Response("{}", { status: 404 });
    return new Response(
      JSON.stringify({
        html: { data: '<img src="/logo.svg">' },
        markdown: { data: "A public page" },
        metadata: { title: "Source" },
        key_metadata: { credits_consumed: 0 },
      }),
      { status: 200 },
    );
  };
  try {
    const d = await inspectDomain("err.example");
    assert.equal(d.verifiedClone, false);
    assert.deepEqual(d.sameLogoFiles, []);
  } finally {
    global.fetch = original;
  }
});

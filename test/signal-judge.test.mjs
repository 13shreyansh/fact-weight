import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.SIGNAL_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "sf-judge-"));
process.env.HOSTINGER_AI_ROUTER_API_KEY = "isolated-test";
const { judge, db } = await import("../signal/providers.mjs");
test("a truncated cached judgement gets a bounded fresh retry", async () => {
  let count = 0;
  const original = global.fetch;
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        model: "isolated-model",
        usage: { credits_charged: 0 },
        choices: [
          {
            finish_reason: ++count === 1 ? "length" : "stop",
            message: {
              content:
                count === 1
                  ? '{"sameNarrative":'
                  : '{"sameNarrative":true,"title":"A real claim"}',
            },
          },
        ],
      }),
      { status: 200 },
    );
  try {
    let result = await judge({ posts: [], sources: [] });
    assert.equal(result.data.sameNarrative, true);
    assert.equal(count, 2);
    assert.equal(db.prepare("SELECT count(*) n FROM calls").get().n, 2);
  } finally {
    global.fetch = original;
  }
});

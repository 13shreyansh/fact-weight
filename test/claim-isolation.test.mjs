import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "../engine.mjs";
afterEach(() => mock.restoreAll());
test("source-only claims cannot enter the reader question, and post anchors must match", async () => {
  let n = 0;
  const post = "The port received 48 generators on Monday.";
  const sourceText =
    "The port received 48 generators on Monday. A separate unrequested operation moved 19 ships.";
  mock.method(globalThis, "fetch", async (url, opts) => {
    n++;
    const input = JSON.parse(JSON.parse(opts.body).messages[1].content);
    if (n === 1) {
      assert.equal(input.post, post);
      assert.equal(input.sources, undefined);
    } else {
      assert.equal(input.claims.length, 1);
      assert.equal(input.claims[0].claimId, "C1");
    }
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(
                n === 1
                  ? {
                      claims: [
                        {
                          claim: "The port received 48 generators on Monday.",
                          postQuote: post,
                          claimType: "event",
                        },
                        {
                          claim: "19 ships moved.",
                          postQuote: "19 ships moved.",
                          claimType: "event",
                        },
                      ],
                    }
                  : n === 3
                    ? {
                        claims: [
                          {
                            claimId: "C1",
                            checkableAndFaithful: true,
                            candidates: [
                              {
                                candidateId: "C1E0",
                                passes: true,
                                reason:
                                  "The source explicitly records this delivery.",
                              },
                            ],
                          },
                        ],
                      }
                    : {
                        claims: [
                          {
                            claimId: "C1",
                            claim: "A model rewrite must be ignored.",
                            evidence: [
                              {
                                sourceId: "S1",
                                quote: post,
                                relation: "supports",
                                basis: "direct_record",
                              },
                            ],
                          },
                          {
                            claimId: "C9",
                            claim: "The unrequested operation moved 19 ships.",
                            evidence: [],
                          },
                        ],
                      },
              ),
            },
          },
        ],
        model: "fixture-model",
        usage: { credits_charged: 0 },
        id: "fixture-" + n,
      }),
    };
  });
  const r = await analyze(
    post,
    [{ id: "S1", url: "https://example.org/record", text: sourceText }],
    { key: "test-fixture" },
  );
  assert.equal(r.claims.length, 1);
  assert.equal(r.claims[0].claim, post);
  assert.equal(r.claims[0].postQuote, post);
  assert.equal(r.rejectedClaims, 2);
  assert.equal(r.claims[0].status, "supported");
});

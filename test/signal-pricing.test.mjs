import test from "node:test";
import assert from "node:assert/strict";
import { reserveRouter } from "../signal/pricing.mjs";
test("Router reservations grow with input and output bounds for expensive judging", () => {
  let small = reserveRouter({
      model: "claude-opus-5.5",
      max_tokens: 6000,
      messages: [{ content: "small" }],
    }),
    large = reserveRouter({
      model: "claude-opus-5.5",
      max_tokens: 6000,
      messages: [{ content: "x".repeat(100000) }],
    });
  assert.ok(small > 35);
  assert.ok(large > small);
  assert.ok(
    reserveRouter({ model: "gpt-4.1-mini", max_tokens: 4200, messages: [] }) >=
      10,
  );
});

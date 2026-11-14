import test from "node:test";
import assert from "node:assert/strict";
import { csv } from "../signal/export.mjs";
test("untrusted public text is safe to open as spreadsheet CSV", () => {
  const output = csv(
    [{ text: '=HYPERLINK("https://example.com")', handle: "@untrusted" }],
    ["text", "handle"],
  );
  assert.ok(output.includes("'=HYPERLINK"));
  assert.ok(output.includes("'@untrusted"));
});

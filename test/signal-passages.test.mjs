import test from "node:test";
import assert from "node:assert/strict";
import { plainText, passages } from "../signal/passages.mjs";
test("linked source text becomes exact rendered words before quotation checks", () => {
  const text = plainText(
    "[German newspaper Bild](https://example.com) reports that Finland withdraw from Nato. An official said the proposal was unacceptable.",
  );
  assert.ok(text.includes("German newspaper Bild reports"));
  for (const p of passages(text, "Finland NATO withdrawal", "s1"))
    assert.ok(text.includes(p.text));
});

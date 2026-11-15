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
test("source passages retain adjacent sentences with the attribution and its substance", () => {
  const text =
    "Bild reported far reaching demands. They include Finland leaving NATO. An official denied the demand.";
  assert.ok(passages(text, "Finland NATO", "s1").some((p) => p.text === text));
});

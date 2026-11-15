import test from "node:test";
import assert from "node:assert/strict";
import { instant } from "../signal/dates.mjs";
test("publisher EET/EEST metadata becomes an explicit instant and malformed dates stay unknown", () => {
  assert.equal(instant("2026-11-13T17:34:00EET"), "2026-11-13T15:34:00.000Z");
  assert.equal(instant("2026-07-13T17:34:00EEST"), "2026-07-13T14:34:00.000Z");
  assert.equal(instant("not a date"), null);
  assert.equal(instant(null), null);
});

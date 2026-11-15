import test from "node:test";
import assert from "node:assert/strict";
import { applyVeto } from "../signal/verify.mjs";
test("missing or failed independent checks cannot retain asserted support", () => {
  let e = [
    { stance: "for", quote: "Historical policy" },
    { stance: "against", quote: "Source silence" },
    { stance: "not reported" },
  ];
  assert.deepEqual(
    applyVeto(e, [{ id: "0", passes: false, reason: "Different time" }]).map(
      (e) => e.stance,
    ),
    ["not reported", "not reported", "not reported"],
  );
  assert.equal(
    applyVeto(e, [{ id: "0", passes: true }])[0].verificationPassed,
    true,
  );
});

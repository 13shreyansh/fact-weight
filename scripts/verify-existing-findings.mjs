import { get, put } from "../signal/providers.mjs";
import { verifyEvidence } from "../signal/verify.mjs";
import { finalize } from "../signal/store.mjs";
import { ensurePack } from "../signal/packs.mjs";
for (const id of ["a6b0d22b1d61", "aa9426e2b5e6", "nab032987aff"]) {
  let c = get("assessed", id);
  for (const e of c.judgement.data.evidence) {
    if (e.proposedStance) e.stance = e.proposedStance;
  }
  await verifyEvidence(c.judgement, c.posts, c.sources);
  put("assessed", id, c);
  let p = finalize(c);
  if (p) await ensurePack(p);
  console.log(
    id,
    c.judgement.verification?.status,
    c.judgement.verification?.error,
    p.evidence.map((e) => e.stance + ": " + e.reason),
  );
}

import { get, put, judge } from "../signal/providers.mjs";
import { finalize } from "../signal/store.mjs";
import { ensurePack } from "../signal/packs.mjs";
for (const id of ["a6b0d22b1d61", "aa9426e2b5e6", "nab032987aff"]) {
  let c = get("assessed", id);
  const start = performance.now(),
    at = new Date().toISOString();
  const judgement = await judge({
    posts: c.posts
      .filter((p) => p.language === "en")
      .slice(0, 8)
      .map((p) => ({ id: p.id, text: p.text.slice(0, 6000) })),
    sources: c.sources.map(({ text, markdown, ...s }) => s),
    signals: c.signals,
    task: "Choose one central atomic checkable claim, preserve attribution, then weigh that exact claim against each source passage. Current demands differ from historical background. Unrelated passages and denials of a claim whose publication is attributed to BILD are not reported, never contradiction. Return exact entire source passages by passageId.",
  });
  judgement.rawEvidence = structuredClone(judgement.data.evidence);
  for (const e of judgement.data.evidence || []) {
    let span = c.sources
      .find((s) => s.id === e.sourceId)
      ?.passages?.find((p) => p.id === e.passageId);
    if (span) e.quote = span.text;
  }
  c = {
    ...c,
    judgement,
    pipeline: {
      ...c.pipeline,
      weighed: {
        startedAt: at,
        finishedAt: new Date().toISOString(),
        ms: Math.round(performance.now() - start),
      },
    },
  };
  put("assessed", id, c);
  let p = finalize(c);
  if (p) {
    await ensurePack(p);
    console.log(
      id,
      p.title,
      p.claim,
      p.evidence.map((e) => e.stance + ":" + e.basis),
      judgement.usage?.credits_charged,
    );
  }
}

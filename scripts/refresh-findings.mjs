import { get, put } from "../signal/providers.mjs";
import { storeArticle } from "../signal/news-pages.mjs";
import { enrich } from "../signal/enrich.mjs";
import { finalize } from "../signal/store.mjs";
import { ensurePack } from "../signal/packs.mjs";
for (const id of ["a6b0d22b1d61", "aa9426e2b5e6", "nab032987aff"]) {
  let c = get("assessed", id);
  c.posts = c.posts.map((p) => {
    let d = get("reference", p.url);
    return d?.html?.data && p.url.includes("news-pravda.com")
      ? { ...p, ...storeArticle(d, p.url) }
      : p;
  });
  let result = await enrich(c, get("watch", "baltics"));
  put("assessed", id, result);
  let p = finalize(result);
  if (p) {
    await ensurePack(p);
    console.log(
      id,
      p.verdict,
      p.posts.length,
      p.evidence.length,
      p.judgement.promptVersion,
      p.claim,
    );
  }
}

import { pipeline, env } from "@huggingface/transformers";
import { all, get, put, hash } from "../signal/providers.mjs";
env.cacheDir = "./data/models";
const extractor = await pipeline(
  "feature-extraction",
  "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
  { dtype: "q8", session_options: { intra_op_num_threads: 2 } },
);
const posts = all("post").filter(
  (p) =>
    p.text.length > 90 &&
    p.postedAt &&
    Date.parse(p.postedAt) >= Date.parse("2026-11-01") &&
    /ukrain|украин|україн|balt|балт|nato|нато|russi|росси|росі|venemaa|kriev|rusij/i.test(
      p.text,
    ),
);
for (let i = 0; i < posts.length; i += 16) {
  const batch = posts
    .slice(i, i + 16)
    .filter((p) => !get("embedding", hash("sf-embed-v2:" + p.text)));
  if (!batch.length) continue;
  const r = await extractor(
    batch.map((p) => p.text.slice(0, 400)),
    { pooling: "mean", normalize: true },
  );
  r.tolist().forEach((v, i) =>
    put("embedding", hash("sf-embed-v2:" + batch[i].text), v),
  );
  if (i % 160 === 0) console.log(i, "of", posts.length);
}
put("meta", "embedding", {
  model: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
  dimensions: 384,
  at: new Date().toISOString(),
  posts: posts.length,
});
console.log("embedded", posts.length);

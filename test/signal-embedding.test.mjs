import test from "node:test";
import assert from "node:assert/strict";
import { pipeline, env } from "@huggingface/transformers";
test("long Russian posts do not become near-duplicates from overlong model input", async () => {
  env.cacheDir = "./data/models";
  const model = await pipeline(
    "feature-extraction",
    "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
    { dtype: "q8" },
  );
  const a =
      "Пора подумать не об Украине, а о своей стране. Председатель Сейма Латвии получил ответ от депутатов парламента. ",
    b =
      "13 ноября состоится лекция в музее. Посетители увидят выставку картин и фотографий. Вход свободный для детей. ";
  const r = await model(
    [a.repeat(20), b.repeat(20)].map((s) => s.slice(0, 400)),
    { pooling: "mean", normalize: true },
  );
  const [v, w] = r.tolist();
  assert.ok(v.reduce((s, x, i) => s + x * w[i], 0) < 0.88);
});

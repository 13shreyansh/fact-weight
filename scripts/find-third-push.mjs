import { all, get, put, scrape, hash } from "../signal/providers.mjs";
import { load } from "cheerio";
import { storeArticle } from "../signal/news-pages.mjs";
import { measure } from "../signal/detect.mjs";
import { enrich } from "../signal/enrich.mjs";
import { finalize } from "../signal/store.mjs";
import { ensurePack } from "../signal/packs.mjs";
const links = new Map();
for (const d of all("network-index")) {
  const $ = load(d.html?.data || "");
  $("a[href]").each((i, e) => {
    const url = $(e).attr("href"),
      text = $(e).text();
    if (
      url &&
      /\/2026\/11\/(14|15)\/\d+\.html/.test(url) &&
      /ukrain|украин|україн|nato|нато|venäj|suom|russi|войн|military|warship/i.test(
        text,
      )
    )
      links.set(url, text);
  });
}
console.log("new story candidates", links.size);
let found = 0;
for (const [url, title] of [...links].slice(0, 24)) {
  if (all("candidate").some((c) => c.posts.some((p) => p.url === url)))
    continue;
  try {
    const d = await scrape(url);
    put("reference", url, d);
    const main = storeArticle(d, url);
    if (!main) continue;
    const $ = load(d.html?.data || "");
    const alternates = $('link[rel="alternate"][hreflang]')
      .map((i, e) => ({ url: $(e).attr("href"), lang: $(e).attr("hreflang") }))
      .get()
      .filter(
        (a) =>
          a.url && /news-pravda\.com\//.test(a.url) && a.lang?.startsWith("en"),
      )
      .slice(0, 12);
    if (alternates.length < 6) continue;
    let posts = [main];
    for (let i = 0; i < alternates.length; i += 4)
      await Promise.allSettled(
        alternates.slice(i, i + 4).map(async (a) => {
          try {
            const page = await scrape(a.url);
            put("reference", a.url, page);
            const p = storeArticle(page, a.url);
            if (p) posts.push(p);
          } catch {}
        }),
      );
    posts = [...new Map(posts.map((p) => [p.id, p])).values()];
    const accounts = [...new Set(posts.map((p) => p.accountId))].map((id) =>
      get("account", id),
    );
    const measured = measure(
      posts,
      all("post").filter((p) =>
        /nato|нато|ukrain|украин|russi|venäj/i.test(p.text),
      ),
      accounts,
    );
    if (!["moderate", "strong"].includes(measured.verdict)) continue;
    const id = "n" + hash(posts.map((p) => p.id).sort()).slice(0, 11),
      candidate = {
        id,
        posts,
        accounts,
        ...measured,
        grouping: {
          method: "Retrieved article variants; all signals measured",
        },
        sourceDeclaration: main.sourceLabel,
      };
    put("candidate", id, candidate);
    const result = await enrich(candidate, get("watch", "baltics"));
    put("assessed", id, result);
    const p = finalize(result);
    if (p) {
      await ensurePack(p);
      console.log("THIRD LIVE PUSH", id, p.verdict, p.posts.length, p.title);
      found++;
      if (found >= 2) break;
    }
  } catch (e) {
    console.log(url, e.message);
  }
}

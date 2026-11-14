import { scrape, get, put, all, hash } from "../signal/providers.mjs";
import { load } from "cheerio";
const urls = new Set();
for (const u of [
  "https://lithuania.news-pravda.com/",
  "https://latvia.news-pravda.com/",
  "https://estonia.news-pravda.com/",
]) {
  const d = get("reference", u),
    $ = load(d?.html?.data || "");
  for (const link of $("a[href]")
    .map((i, e) => $(e).attr("href"))
    .get())
    if (/news-pravda\.com\/[^/]+\/2026\/11\//.test(link)) urls.add(link);
}
async function collect(u, alternates = true) {
  try {
    const d = await scrape(u);
    put("reference", u, d);
    const $ = load(d.html?.data || "");
    const json = $('script[type="application/ld+json"]')
      .map((i, e) => {
        try {
          return JSON.parse($(e).text());
        } catch {
          return null;
        }
      })
      .get()
      .filter(Boolean)
      .flatMap((x) => x["@graph"] || [x]);
    const ld = json.find((x) => x.datePublished),
      postedAt =
        ld?.datePublished ||
        $('meta[property="article:published_time"]').attr("content");
    const text =
      $("article").text().trim() ||
      ld?.articleBody ||
      d.markdown?.data?.slice(-18000);
    if (postedAt && text) {
      const host = new URL(u).hostname,
        id = "nw-" + hash(u).slice(0, 16);
      put("post", id, {
        id,
        url: u,
        postedAt,
        text,
        platform: "NW",
        handle: host,
        accountId: "nw-" + host,
        language: $("html").attr("lang")?.slice(0, 2) || "en",
        links: $("article a[href]")
          .map((i, e) => $(e).attr("href"))
          .get(),
        collectedAt: new Date().toISOString(),
        call: d._call,
      });
      put("account", "nw-" + host, {
        id: "nw-" + host,
        handle: host,
        url: "https://" + host,
        platform: "NW",
        createdAt: null,
        followers: null,
      });
    }
    if (alternates) {
      const links = $('link[rel="alternate"][hreflang]')
        .map((i, e) => $(e).attr("href"))
        .get()
        .filter((x) => /news-pravda\.com\/.*2026\/11\//.test(x))
        .slice(0, 15);
      for (let i = 0; i < links.length; i += 5)
        await Promise.allSettled(
          links.slice(i, i + 5).map((u) => collect(u, false)),
        );
    }
    console.log(u, postedAt, text?.length);
  } catch (e) {
    console.log(u, e.message);
  }
}
for (let i = 0, arr = [...urls].slice(0, 30); i < arr.length; i += 5)
  await Promise.allSettled(arr.slice(i, i + 5).map((u) => collect(u)));

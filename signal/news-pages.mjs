import { scrape, put, hash } from "./providers.mjs";
import { load } from "cheerio";
export function storeArticle(d, url, persist = true) {
  const $ = load(d.html?.data || ""),
    json = $('script[type="application/ld+json"]')
      .map((i, e) => {
        try {
          return JSON.parse($(e).text());
        } catch {
          return null;
        }
      })
      .get()
      .filter(Boolean)
      .flatMap((x) => x["@graph"] || [x]),
    ld = json.find((x) => x.datePublished),
    postedAt = ld?.datePublished || d.metadata?.publishedTime,
    body = $("[itemprop=articleBody], .article__text").first().clone(),
    text = body.length
      ? (body.find("p,div,br,li").after("\n"), body.text().trim())
      : ld?.articleBody || $("article").text().trim() || d.markdown?.data;
  if (!postedAt || !text) return null;
  const host = new URL(url).hostname,
    id = "nw-" + hash(url).slice(0, 16);
  const sourceLabel = $(".article-meta").text().trim();
  const sourceLinks = $("article a[href]")
    .map((i, e) => $(e).attr("href"))
    .get()
    .filter(
      (u) =>
        u &&
        /^https?:/.test(u) &&
        !u.includes("news-pravda.com") &&
        !/\b(x|twitter)\.com\b/.test(u),
    );
  const p = {
    id,
    url,
    title: $("h1").first().text() || d.metadata?.title,
    sourceLabel,
    declaredSourceURL:
      $("[data-source-url]").first().attr("data-source-url") || null,
    sourceLinks,
    postedAt,
    text,
    platform: host === "telegra.ph" ? "WB" : "NW",
    handle: host,
    accountId: "nw-" + host,
    language: $("html").attr("lang")?.slice(0, 2) || "en",
    links: $("article a[href]")
      .map((i, e) => $(e).attr("href"))
      .get(),
    collectedAt: new Date().toISOString(),
    call: d._call,
  };
  if (persist) {
    put("post", id, p);
    put("account", p.accountId, {
      id: p.accountId,
      handle: host,
      url: "https://" + host,
      platform: host === "telegra.ph" ? "WB" : "NW",
      createdAt: null,
      followers: null,
      kind: "publisher",
    });
  }
  return p;
}
export async function collectNewsPage(d, url) {
  if (!new URL(url).hostname.endsWith("news-pravda.com")) return;
  const $ = load(d.html?.data || ""),
    links = [
      ...new Set(
        $("a[href]")
          .map((i, e) => $(e).attr("href"))
          .get()
          .filter((u) =>
            /news-pravda\.com\/.*\/\d{4}\/\d{2}\/\d{2}\/\d+\.html/.test(u),
          ),
      ),
    ].slice(0, 1);
  for (const article of links) {
    try {
      const page = await scrape(article, null, {}, { fresh: true });
      storeArticle(page, article);
      const html = load(page.html?.data || "");
      const alternates = html('link[rel="alternate"][hreflang]')
        .map((i, e) => ({
          url: html(e).attr("href"),
          lang: html(e).attr("hreflang"),
        }))
        .get()
        .filter((x) => x.url && /news-pravda\.com\//.test(x.url));
      const chosen = [
        ...alternates.filter((a) => a.lang.startsWith("en")).slice(0, 8),
        ...alternates
          .filter((a) => ["lt", "et", "lv"].includes(a.lang.split("-")[0]))
          .slice(0, 3),
      ];
      for (const a of chosen) {
        const variant = await scrape(a.url, null, {}, { fresh: true });
        storeArticle(variant, a.url);
      }
    } catch {}
  }
}

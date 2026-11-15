import fs from "node:fs";
import { search, scrape, hash } from "../signal/providers.mjs";
import { load } from "cheerio";
import { plainText } from "../signal/passages.mjs";
import { sameCopiedStory } from "../signal/overlap.mjs";
const split = process.argv[2];
if (!["dev", "heldout"].includes(split)) throw Error("split required");
if (
  split === "heldout" &&
  !fs.existsSync("artifacts/benchmark/coordination-frozen.json")
)
  throw Error("Freeze first");
const allowed = [
  "err.ee",
  "lrt.lt",
  "lsm.lv",
  "yle.fi",
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "theguardian.com",
  "dw.com",
  "euronews.com",
  "aljazeera.com",
  "france24.com",
  "politico.eu",
  "cnn.com",
  "cbsnews.com",
  "nbcnews.com",
  "abcnews.go.com",
  "pbs.org",
  "independent.co.uk",
  "rferl.org",
  "kyivindependent.com",
  "ukrinform.net",
  "baltictimes.com",
  "balticnews.com",
];
const normal = (u) => {
  try {
    let h = new URL(u).hostname;
    return allowed.some((d) => h === d || h.endsWith("." + d));
  } catch {
    return false;
  }
};
const folder = "work/coordination",
  out = folder + "/" + split + "-controls.json";
fs.mkdirSync(folder, { recursive: true });
let cases = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out)) : [];
const seedfile = folder + "/" + split + "-control-seeds.json";
let seeds;
if (fs.existsSync(seedfile)) seeds = JSON.parse(fs.readFileSync(seedfile));
else {
  seeds = [];
  let dates =
    split === "dev"
      ? ["2026-11-14", "2026-11-13", "2026-11-12", "2026-11-11"]
      : [
          "2026-11-10",
          "2026-11-09",
          "2026-11-08",
          "2026-11-07",
          "2026-11-06",
          "2026-11-05",
          "2026-11-04",
          "2026-11-03",
        ];
  for (let day of dates) {
    let d = await search(
      "Ukraine Russia war NATO " +
        day +
        " (site:news.err.ee OR site:lrt.lt OR site:eng.lsm.lv OR site:yle.fi)",
      20,
    );
    seeds.push(...(d.results || []).filter((x) => normal(x.url)));
  }
  seeds = [...new Map(seeds.map((x) => [x.url, x])).values()].sort((a, b) =>
    hash(a.url).localeCompare(hash(b.url)),
  );
  fs.writeFileSync(seedfile, JSON.stringify(seeds));
}
if (split === "heldout") {
  const inventory = JSON.parse(
    fs.readFileSync("artifacts/benchmark/heldout-manifest.json"),
  ).filter((r) => r.class === "trustworthy" && normal(r.article_url));
  seeds.push(
    ...inventory
      .sort((a, b) => hash(a.article_url).localeCompare(hash(b.article_url)))
      .map((r) => ({ url: r.article_url, title: "", datasetId: r.article_id })),
  );
}
const canonical = (u) => {
  const x = new URL(u);
  return x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/$/, "");
};
const limit = split === "dev" ? 16 : 32,
  earlier =
    split === "heldout"
      ? JSON.parse(fs.readFileSync(folder + "/dev-controls.json"))
      : [];
if (split === "heldout") {
  const urls = new Set(
    earlier.flatMap((c) => c.posts.map((p) => canonical(p.url))),
  );
  cases = cases.filter((c) => !c.posts.some((p) => urls.has(canonical(p.url))));
  fs.writeFileSync(out, JSON.stringify(cases));
  seeds = seeds.filter((s) => !urls.has(canonical(s.url)));
}
async function read(u) {
  let d = await scrape(u, null, {
    formats: { markdown: true, html: true },
    sharedParams: { mainContentOnly: true },
  });
  let $ = load(d.html?.data || "");
  let ld = $('script[type="application/ld+json"]')
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
  let article = ld.find((x) => x.datePublished);
  let text = plainText(d.markdown?.data || "");
  if (
    text.length < 500 ||
    /not found|access denied|captcha/i.test(d.metadata?.title || "")
  )
    return null;
  let at =
    d.metadata?.publishedTime ||
    article?.datePublished ||
    $('meta[property="article:published_time"]').attr("content");
  if (!at || !Number.isFinite(Date.parse(at))) return null;
  return {
    id: hash(u).slice(0, 16),
    url: u,
    text,
    title: $("h1").first().text() || d.metadata?.title,
    postedAt: new Date(at).toISOString(),
    platform: "NW",
    accountId: new URL(u).hostname,
    handle: new URL(u).hostname,
    links: $("a[href]")
      .map((i, e) => $(e).attr("href"))
      .get()
      .filter((x) => /^https?:/.test(x) && !/(twitter|x)\.com/.test(x)),
    language: $("html").attr("lang")?.slice(0, 2) || "en",
    call: d._call,
  };
}
for (let seed of seeds) {
  if (cases.length >= limit) break;
  if (cases.some((c) => c.seed === seed.url)) continue;
  try {
    let main = await read(seed.url);
    if (!main || !/ukrain|украин|ukrain|venäj|nato|russia/i.test(main.text))
      continue;
    let query =
      (seed.title || main.title)
        .replace(/\s*[|–—]\s*(ERR|LRT|LSM|Yle).*$/i, "")
        .slice(0, 160) + " -site:x.com -site:twitter.com";
    let d = await search(query, 30);
    let urls = [
      ...new Set([
        seed.url,
        ...(d.results || []).filter((x) => normal(x.url)).map((x) => x.url),
      ]),
    ].slice(0, 16);
    let posts = [main];
    for (let i = 1; i < urls.length; i += 3) {
      let results = await Promise.allSettled(urls.slice(i, i + 3).map(read));
      for (let r of results)
        if (r.status === "fulfilled" && r.value) posts.push(r.value);
    }
    posts = [...new Map(posts.map((p) => [p.url, p])).values()];
    if (
      [...earlier, ...cases].some(
        (c) =>
          c.posts.some((p) =>
            posts.some((q) => canonical(p.url) === canonical(q.url)),
          ) || sameCopiedStory(c.posts, posts),
      )
    )
      continue;
    cases.push({
      id: hash(seed.url).slice(0, 12),
      seed: seed.url,
      label: "normal_reporting",
      family: "Normal Baltic war reporting",
      selection:
        "Hash-order Baltic public-service headline seeds. Search results restricted to named established news outlets; all retrieved results retained including undersized or mixed-claim groups. No threshold-based selection.",
      query,
      posts,
      accounts: [...new Set(posts.map((p) => p.accountId))].map((id) => ({
        id,
        createdAt: null,
        followers: null,
      })),
      searchCall: d._call,
    });
    fs.writeFileSync(out, JSON.stringify(cases));
    console.log(split, "control", cases.length, posts.length, main.title);
  } catch (e) {
    console.log("control retrieval skipped", e.message.slice(0, 100));
  }
}
console.log(
  "Control collection complete",
  split,
  cases.length,
  "seeds",
  seeds.length,
);

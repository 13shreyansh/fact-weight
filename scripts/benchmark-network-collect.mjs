import fs from "node:fs";
import { get, put, scrape, hash, search } from "../signal/providers.mjs";
import { load } from "cheerio";
import { storeArticle } from "../signal/news-pages.mjs";
import { plainText } from "../signal/passages.mjs";
import { sameCopiedStory } from "../signal/overlap.mjs";
const split = process.argv[2];
if (!["dev", "heldout"].includes(split)) throw Error("split required");
if (
  split === "heldout" &&
  !fs.existsSync("artifacts/benchmark/coordination-frozen.json")
)
  throw Error("Freeze first");
fs.mkdirSync("work/coordination", { recursive: true });
const out = "work/coordination/" + split + "-cases.json";
let cases = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out)) : [];
let urls = get("network-map", "finland")
  .urls.map((x) => x.url)
  .filter(
    (u) =>
      u.includes("/en/") &&
      (split === "dev"
        ? u.includes("/2026/11/14/")
        : !u.includes("/2026/11/14/")),
  )
  .sort((a, b) => hash(a).localeCompare(hash(b)));
const earlier =
  split === "heldout"
    ? JSON.parse(fs.readFileSync("work/coordination/dev-cases.json"))
    : [];
let limit = split === "dev" ? 16 : 32;
const save = () => fs.writeFileSync(out, JSON.stringify(cases));
for (const url of urls) {
  if (cases.filter((c) => c.label === "coordinated").length >= limit) break;
  if (cases.some((c) => c.seed === url)) continue;
  try {
    let d = await scrape(url),
      main = storeArticle(d, url, false);
    if (
      !main ||
      !/ukrain|nato|military|battlefield|war against/i.test(main.text)
    )
      continue;
    let $ = load(d.html?.data || "");
    let alternates = [
      ...new Set(
        $('link[rel="alternate"][hreflang^="en"]')
          .map((i, e) => $(e).attr("href"))
          .get(),
      ),
    ]
      .filter((u) => u && u !== url)
      .sort((a, b) => hash(a).localeCompare(hash(b)))
      .slice(0, 11);
    let posts = [main];
    for (let i = 0; i < alternates.length; i += 3) {
      let results = await Promise.allSettled(
        alternates
          .slice(i, i + 3)
          .map(async (u) => storeArticle(await scrape(u), u, false)),
      );
      for (let r of results)
        if (r.status === "fulfilled" && r.value) posts.push(r.value);
    }
    if ([...earlier, ...cases].some((c) => sameCopiedStory(c.posts, posts)))
      continue;
    cases.push({
      id: hash(url).slice(0, 12),
      seed: url,
      label: "coordinated",
      family: "Pravda / Portal Kombat",
      documentation:
        "https://dfrlab.org/2025/02/24/russia-pravda-network-expands-worldwide/",
      selection:
        "Hash order of mapped article seeds. Publisher-declared language alternates retrieved; copy signal measured from bodies, not from these declarations.",
      posts,
      accounts: [...new Set(posts.map((p) => p.accountId))].map((id) => ({
        id,
        createdAt: null,
        followers: null,
      })),
    });
    save();
    console.log(
      split,
      "network",
      cases.filter((c) => c.label === "coordinated").length,
      posts.length,
      main.title,
    );
  } catch (e) {
    console.log("retrieval skipped", url, e.message.slice(0, 80));
  }
}
console.log("Network collection complete", split, cases.length);

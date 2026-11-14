import {
  all,
  get,
  put,
  scrape,
  search,
  hash,
  judge,
  db,
} from "../signal/providers.mjs";
import { load } from "cheerio";
import { storeArticle } from "../signal/news-pages.mjs";
import { shingles, jaccard, measure } from "../signal/detect.mjs";
import { finalize } from "../signal/store.mjs";
import { enrich } from "../signal/enrich.mjs";
import { ensurePack } from "../signal/packs.mjs";
const ids = ["a6b0d22b1d61", "aa9426e2b5e6", "a97b30b3019f"];
for (const id of ids) {
  const c = get("candidate", id);
  if (!c) continue;
  let posts = [...c.posts];
  const english = posts.find((p) => p.language === "en") || posts[0],
    ref = get("reference", english.url),
    $ = load(ref?.html?.data || "");
  const alternates = $('link[rel="alternate"][hreflang]')
    .map((i, e) => ({ url: $(e).attr("href"), lang: $(e).attr("hreflang") }))
    .get()
    .filter((a) => a.url && a.lang?.startsWith("en"))
    .slice(0, 14);
  for (let i = 0; i < alternates.length; i += 4)
    await Promise.allSettled(
      alternates.slice(i, i + 4).map(async (a) => {
        if (posts.some((p) => p.url === a.url)) return;
        try {
          const d = await scrape(a.url);
          put("reference", a.url, d);
          const p = storeArticle(d, a.url);
          if (p) posts.push(p);
        } catch {}
      }),
    );
  const declared = english.text.match(/Source:\s*(Telegram|MAX)\s*"([^\"]+)"/i);
  let originRecords = [];
  if (declared) {
    const channel =
      declared[1] === "Telegram"
        ? declared[2]
        : english.links
            .find((u) => /^https:\/\/t\.me\//.test(u))
            ?.split("/")
            .at(-1);
    if (channel)
      try {
        const d = await scrape("https://t.me/s/" + channel);
        put("telegram", channel, { ...d, channel });
        const t = load(d.html?.data || "");
        t(".tgme_widget_message").each((i, el) => {
          const e = t(el),
            key = e.attr("data-post"),
            text = e.find(".tgme_widget_message_text").text();
          if (!key || !text) return;
          const similarity = jaccard(shingles(text), shingles(english.text));
          if (similarity < 0.45) return;
          const p = {
            id: "tg-" + key,
            url: "https://t.me/" + key,
            text,
            platform: "TG",
            handle: channel,
            accountId: "tg-" + channel,
            language: "en",
            postedAt: e.find("time").attr("datetime"),
            links: e
              .find(".tgme_widget_message_text a[href]")
              .map((i, a) => t(a).attr("href"))
              .get(),
            call: d._call,
            sourceMatch: similarity,
          };
          if (p.postedAt) {
            put("post", p.id, p);
            put("account", p.accountId, {
              id: p.accountId,
              handle: channel,
              url: "https://t.me/" + channel,
              platform: "TG",
              createdAt: null,
              followers: null,
            });
            originRecords.push(p);
          }
        });
      } catch (e) {
        console.log("origin unavailable", channel, e.message);
      }
  }
  // JSON extraction is checked against captured text, never accepted as a new fact.
  try {
    const extracted = await scrape(english.url, null, {
      formats: { json: true },
      jsonParams: {
        schema: {
          type: "object",
          properties: {
            title: { type: ["string", "null"] },
            published_at: { type: ["string", "null"] },
            source_handle: { type: ["string", "null"] },
            source_url: { type: ["string", "null"] },
          },
        },
        instructions:
          "Extract only the title, publication time and explicitly cited source. Preserve the exact source URL. Use null where absent.",
      },
    });
    put("structured-origin", id, {
      article: english.url,
      call: extracted._call,
      fields: extracted.json?.data || {},
      validatedSourceURL:
        extracted.json?.data?.source_url &&
        ref?.html?.data?.includes(extracted.json.data.source_url)
          ? extracted.json.data.source_url
          : null,
    });
  } catch (e) {
    console.log("structured extraction", e.message);
  }
  const query =
    id === "a6b0d22b1d61"
      ? "Finland leave NATO Baltic military bases Russia"
      : id === "aa9426e2b5e6"
        ? "Medinsky Russian soldier foot territory peace negotiations"
        : "Russia NATO 1997 demands Baltic states Nikotin";
  const pickupCalls = [];
  let pickupCandidates = [];
  for (const [platform, q] of [
    ["RD", "site:reddit.com " + query],
    ["YT", "site:youtube.com/watch " + query],
    ["TT", "site:tiktok.com " + query],
    ["NW", query + " site:news.err.ee OR site:yle.fi OR site:eng.lsm.lv"],
  ]) {
    try {
      const d = await search(q, 4);
      pickupCalls.push(d._call);
      for (const r of d.results || [])
        if (!/\b(x|twitter)\.com\b/.test(r.url))
          pickupCandidates.push({
            id: hash(r.url).slice(0, 16),
            url: r.url,
            text: r.description || r.title,
            title: r.title,
            platform,
            handle: new URL(r.url).hostname,
            call: d._call,
          });
    } catch {}
  }
  // Candidate pickup is explicitly separated from proven copying.
  let pickups = [];
  for (const p of pickupCandidates.slice(0, 10)) {
    try {
      const agreed = await judge({
        posts: [
          { id: "network", text: english.text.slice(0, 5000) },
          { id: "pickup", text: p.text },
        ],
        sources: [],
        task: "Do the network article and candidate public pickup carry the same specific claim? Broad overlap about a conflict is not enough. Do not infer a copying relationship.",
      });
      if (agreed.data.sameNarrative)
        pickups.push({
          ...p,
          match: "same claim",
          copyLinkEstablished: (p.text + " " + p.url).includes(
            "news-pravda.com",
          ),
          judgement: agreed,
        });
    } catch {}
  }
  posts = [
    ...new Map([...posts, ...originRecords].map((p) => [p.id, p])).values(),
  ];
  posts.sort((a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt));
  const accounts = [...new Set(posts.map((p) => p.accountId))]
    .map((a) => get("account", a))
    .filter(Boolean);
  const measured = measure(
    posts,
    all("post").filter((p) => /nato|нато|ukrain|украин|україн/i.test(p.text)),
    accounts,
  );
  const candidate = {
    ...c,
    posts,
    accounts,
    ...measured,
    origins: originRecords,
    pickups,
    pickupCalls,
    sourceDeclaration: declared
      ? { platform: declared[1], handle: declared[2] }
      : null,
  };
  put("candidate", id, candidate);
  try {
    const result = await enrich(candidate, get("watch", "baltics"));
    put("assessed", id, result);
    const p = finalize(result);
    if (p) {
      await ensurePack(p);
      console.log(
        "LIVE FINDING",
        id,
        p.verdict,
        p.posts.length,
        p.accounts.length,
        "origin",
        originRecords.length,
        "pickup",
        pickups.length,
      );
    }
  } catch (e) {
    console.log(id, e.message);
  }
}

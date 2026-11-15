import { collapseDuplicates } from "./duplicates.mjs";
import { scrape, call, get, put, all, hash, judge } from "./providers.mjs";
import { defaultWatch, finalize } from "./store.mjs";
import { groups, measure } from "./detect.mjs";
import { load } from "cheerio";
import { semanticGroups } from "./embeddings.mjs";
import { enrich } from "./enrich.mjs";
import { collectNewsPage, storeArticle } from "./news-pages.mjs";
import { sameCopiedStory } from "./overlap.mjs";
import { ensurePack } from "./packs.mjs";
let queue = Promise.resolve();
export function sweep(w = defaultWatch) {
  const task = queue.then(() => performSweep(w));
  queue = task.catch(() => {});
  return task;
}
async function performSweep(w) {
  if (w.expiresAt && Date.parse(w.expiresAt) <= Date.now()) return;
  const run = {
    id: hash(Date.now() + w.id).slice(0, 12),
    watchId: w.id,
    startedAt: new Date().toISOString(),
    trigger: w.trigger || "Scheduled sweep",
    webhookIds: w.webhookIds || [],
    read: 0,
    errors: [],
    status: "running",
  };
  put("sweep", run.id, run);
  try {
    for (const url of w.sources.slice(0, 25)) {
      try {
        const parser = url.includes("tiktok.com/tag")
          ? "tiktok-feed"
          : url.includes("instagram.com/explore")
            ? "instagram-feed"
            : url.includes("reddit.com")
              ? "reddit-search"
              : null;
        const d = await scrape(url, parser, { maxAgeMs: 0 }, { fresh: true });
        if (
          !(d.parsed?.success && d.parsed.data) &&
          !(d.markdown?.success && d.markdown.data) &&
          !(d.html?.success && d.html.data)
        )
          throw Error("The public source could not be read.");
        const ch = url.match(/t\.me\/(?:s\/)?([^/?]+)/)?.[1];
        if (ch) put("telegram", ch, { ...d, channel: ch });
        else put("discovery", "watch-" + w.id + "-" + hash(url), d);
        await collectNewsPage(d, url);
        if (!parser && !url.includes("t.me/")) storeArticle(d, url);
        run.read++;
        put("sweep", run.id, run);
        const video = d.parsed?.data?.videos?.[0];
        if (video) {
          for (const [u, p] of [
            [video.url, "tiktok-comments"],
            [
              "https://www.tiktok.com/@" + video.author.username,
              "tiktok-profile",
            ],
          ])
            try {
              const detail = await scrape(
                u,
                p,
                { maxAgeMs: 86400000 },
                { fresh: true },
              );
              put("discovery", "detail-" + hash(u), detail);
            } catch (e) {
              run.errors.push({
                source: "Public TikTok detail",
                message: e.message,
              });
            }
        }
        const post = d.parsed?.data?.posts?.[0];
        if (parser === "instagram-feed" && post)
          try {
            put(
              "discovery",
              "detail-" + hash(post.url),
              await scrape(
                post.url,
                "instagram-post",
                { maxAgeMs: 86400000 },
                { fresh: true },
              ),
            );
          } catch {}
      } catch (e) {
        run.errors.push({ source: url, message: e.message });
      }
    }
    if (w.news) {
      const lang = w.languages[0] || "en";
      try {
        const d = await call(
          "context",
          "/news/search",
          {
            searchBy: {
              type: "natural_language",
              query: Object.values(w.keywords).flat().slice(0, 10).join(" "),
            },
            filterBy: {
              date: { from: Date.now() - 14 * 86400000, to: Date.now() },
            },
            limit: 50,
          },
          { fresh: true },
        );
        put("discovery", "watch-" + w.id + "-news", d);
        run.read++;
      } catch (e) {
        run.errors.push({ source: "News search", message: e.message });
      }
    }
    try {
      const d = await call(
        "context",
        "/web/search",
        {
          query:
            "site:youtube.com/watch " +
            Object.values(w.keywords).flat().slice(0, 4).join(" "),
          numResults: 2,
        },
        { fresh: true },
      );
      for (const r of d.results || [])
        try {
          const video = await scrape(
            r.url,
            null,
            { formats: { markdown: true } },
            { fresh: true },
          );
          put("discovery", "youtube-" + hash(r.url), video);
        } catch {}
    } catch (e) {
      run.errors.push({ source: "Public YouTube search", message: e.message });
    }
    // The same durable normalizer is used in backfill and scheduled collection.
    await import("../scripts/normalize.mjs?run=" + Date.now());
    const allPosts = all("post").filter(
      (p) => p.postedAt && Date.parse(p.postedAt) > Date.now() - 14 * 86400000,
    );
    const keys = Object.values(w.keywords)
      .flat()
      .map((s) => s.toLowerCase());
    const relevant = allPosts.filter((p) =>
      keys.some((k) => p.text.toLowerCase().includes(k)),
    );
    for (let posts of (
      await semanticGroups(
        [...relevant]
          .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
          .slice(0, 2000),
      )
    ).slice(0, 12)) {
      const incomingIds = new Set(posts.map((p) => p.id));
      const previous = all("push")
        .filter(
          (p) =>
            p.watchId === w.id &&
            p.mode !== "replay" &&
            !p.excluded &&
            (p.posts.filter((x) => incomingIds.has(x.id)).length /
              Math.max(1, Math.min(p.posts.length, posts.length)) >=
              0.7 ||
              sameCopiedStory(p.posts, posts)),
        )
        .sort(
          (a, b) =>
            (b.origins?.length || 0) - (a.origins?.length || 0) ||
            b.posts.length - a.posts.length,
        )[0];
      if (previous)
        posts = [
          ...new Map(
            [...previous.posts, ...posts].map((p) => [p.id, p]),
          ).values(),
        ];
      posts.sort((a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt));
      const accounts = [...new Set(posts.map((p) => p.accountId))]
        .map((id) => get("account", id))
        .filter(Boolean);
      const measured = measure(posts, relevant, accounts);
      const id =
        previous?.id || hash({ watch: w.id, seed: posts[0].id }).slice(0, 12);
      if (
        previous &&
        !w.recheck &&
        hash(previous.posts.map((p) => [p.id, p.text])) ===
          hash(posts.map((p) => [p.id, p.text]))
      )
        continue;
      try {
        const candidate = { ...previous, id, posts, accounts, ...measured };
        const result = await enrich(candidate, w);
        put("assessed", id, result);
        const published = finalize({ ...result, trigger: w.trigger }, w.id);
        if (published) await ensurePack(published);
      } catch (e) {
        run.errors.push({ source: "Narrative check", message: e.message });
      }
    }
    collapseDuplicates(w.id);
    run.status = run.errors.length ? "partial" : "complete";
  } catch (e) {
    run.status = "failed";
    run.errors.push({ message: e.message });
  } finally {
    run.finishedAt = new Date().toISOString();
    put("sweep", run.id, run);
  }
  return run;
}

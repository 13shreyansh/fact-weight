import { recordPost } from "../signal/scopes.mjs";
import { all, get, put, hash, db } from "../signal/providers.mjs";
import { load } from "cheerio";
const dbCallURL = (id) => {
  try {
    return (
      JSON.parse(
        db.prepare("SELECT params FROM calls WHERE id=?").get(id)?.params ||
          "{}",
      ).url || "https://www.tiktok.com/"
    );
  } catch {
    return "https://www.tiktok.com/";
  }
};
export const language = (s) =>
  /[а-яё]/i.test(s)
    ? /[іїєґ]/i.test(s)
      ? "uk"
      : "ru"
    : /[ėųį]/i.test(s)
      ? "lt"
      : /[ķļģ]/i.test(s)
        ? "lv"
        : /[õ]/i.test(s)
          ? "et"
          : "en";
let activeWatchId = "baltics";
const store = (p) => {
  if (!p.text?.trim() || !p.url) return;
  recordPost(
    {
      ...p,
      id: p.id || hash(p.url),
      language: p.language || language(p.text),
      links: [
        ...new Set(
          (p.text.match(/https?:\/\/[^\s<>]+/g) || []).concat(p.links || []),
        ),
      ],
      collectedAt: p.collectedAt || new Date().toISOString(),
    },
    activeWatchId,
  );
};
for (const { id: recordId } of db
  .prepare("SELECT id FROM records WHERE kind='discovery'")
  .all()) {
  const d = get("discovery", recordId);
  activeWatchId =
    d.watchId ||
    recordId.match(/^watch-([a-f0-9]{16}|baltics)(?:-|$)/)?.[1] ||
    "baltics";
  const p = d.parsed?.data;
  if (p?.comments) {
    const parent = dbCallURL(d._call);
    for (const c of p.comments)
      store({
        id: "tt-comment-" + c.id,
        text: c.text,
        url: parent + "?comment_id=" + c.id,
        platform: "TT",
        handle: c.author.username,
        accountId: "tt-" + c.author.id,
        postedAt: c.posted_at,
        views: null,
        kind: "comment",
        call: d._call,
      });
  }
  if (
    d.metadata?.canonicalUrl?.includes("youtube.com/watch") &&
    d.metadata.publishedTime
  )
    store({
      id: "yt-" + hash(d.metadata.canonicalUrl).slice(0, 16),
      text: d.markdown?.data || d.metadata.title,
      url: d.metadata.canonicalUrl,
      platform: "YT",
      handle:
        (d.markdown?.data || "").match(/\*\*Channel\*\*:\s*([^\n]+)/)?.[1] ||
        "YouTube channel",
      accountId:
        "yt-" +
        hash(
          (d.markdown?.data || "").match(/\*\*Channel\*\*:\s*([^\n]+)/)?.[1] ||
            d.metadata.title,
        ).slice(0, 12),
      postedAt: d.metadata.publishedTime,
      views: null,
      call: d._call,
    });
  if (p?.videos)
    for (const v of p.videos)
      store({
        id: "tt-" + v.id,
        text: v.caption,
        url: v.url,
        platform: "TT",
        handle: v.author.username,
        accountId: "tt-" + v.author.id,
        postedAt: v.posted_at,
        views: v.view_count,
        call: d._call,
      });
  if (p?.posts)
    for (const v of p.posts)
      store({
        id: (v.subreddit ? "rd-" : "ig-") + v.id,
        text: [v.title, v.body, v.caption].filter(Boolean).join("\n"),
        url: v.url,
        platform: v.subreddit ? "RD" : "IG",
        handle: v.author || v.owner?.username,
        accountId: v.subreddit ? "rd-" + v.author : "ig-" + v.owner?.id,
        postedAt: v.posted_at,
        views: v.view_count,
        links: v.link_url ? [v.link_url] : [],
        call: d._call,
      });
  if (Array.isArray(d.data))
    for (const v of d.data)
      if (v.published_at && v.url)
        store({
          id: "nw-" + v.id,
          text: v.title + "\n" + (v.description || ""),
          url: v.url,
          platform: "NW",
          handle: v.source?.name || new URL(v.url).hostname,
          accountId: "nw-" + (v.source?.domain || new URL(v.url).hostname),
          postedAt: v.published_at,
          language: v.language,
          sourceStory: v.story_id,
          call: d._call,
        });
  if (p?.username)
    put("account", "tt-" + p.id, {
      id: "tt-" + p.id,
      handle: p.username,
      platform: "TT",
      url: "https://www.tiktok.com/@" + p.username,
      createdAt: p.created_at,
      followers: p.follower_count,
    });
}
for (const { id: recordId } of db
  .prepare("SELECT id FROM records WHERE kind='telegram'")
  .all()) {
  const d = get("telegram", recordId);
  activeWatchId = d.watchId || "baltics";
  const $ = load(d.html?.data || "");
  $(".tgme_widget_message").each((i, el) => {
    const e = $(el),
      id = e.attr("data-post");
    if (!id) return;
    store({
      id: "tg-" + id,
      text: e.find(".tgme_widget_message_text").text(),
      url: "https://t.me/" + id,
      platform: "TG",
      handle: d.channel,
      accountId: "tg-" + d.channel,
      postedAt: e.find("time").attr("datetime"),
      views: e.find(".tgme_widget_message_views").text() || null,
      links: e
        .find(".tgme_widget_message_text a")
        .map((i, a) => $(a).attr("href"))
        .get(),
      call: d._call,
    });
  });
}
const knownAccounts = new Set(all("account").map((a) => a.id));
for (const p of all("post"))
  if (p.accountId && !knownAccounts.has(p.accountId))
    put("account", p.accountId, {
      id: p.accountId,
      handle: p.handle,
      platform: p.platform,
      url: p.platform === "TG" ? "https://t.me/" + p.handle : p.url,
      createdAt: null,
      followers: null,
    });
console.log(
  "posts",
  all("post").length,
  "accounts",
  all("account").length,
  "dates",
  all("post").filter((p) => p.postedAt).length,
);

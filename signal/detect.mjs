import config from "./signals.config.ts";
import { all, put, get, hash, judge } from "./providers.mjs";
export { config };
export const tokens = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .match(/[\p{L}\p{N}]+/gu) || [];
export function shingles(s) {
  const t = tokens(s),
    set = new Set();
  for (let i = 0; i < t.length - 3; i++) set.add(t.slice(i, i + 4).join(" "));
  return set;
}
export function jaccard(a, b) {
  let n = 0;
  for (const s of a) if (b.has(s)) n++;
  return n / (a.size + b.size - n || 1);
}
export function verdict(signals, n, accounts) {
  if (n < config.minPosts || accounts < config.minAccounts) return "not-enough";
  let f = signals.filter((s) => s.fired);
  return f.length >= 3 && f.some((s) => ["timing", "same_text"].includes(s.key))
    ? "strong"
    : f.length === 2
      ? "moderate"
      : "organic";
}
export const names = {
  timing: "Same minute",
  new_accounts: "New accounts",
  same_text: "Same text",
  shared_links: "Same links",
  ties: "Linked accounts",
};
export function measure(posts, universe, accounts) {
  const times = posts
      .filter((p) => p.postedAt)
      .map((p) => Date.parse(p.postedAt))
      .sort((a, b) => a - b),
    start = times[0],
    end = times.at(-1);
  let peak = 0,
    peakAt = start;
  for (let i = 0, j = 0; i < times.length; i++) {
    while (times[i] - times[j] > config.burstWindowMinutes * 60000) j++;
    if (i - j + 1 > peak) {
      peak = i - j + 1;
      peakAt = times[j];
    }
  }
  const family = (p) =>
    p.platform === "NW"
      ? String(p.url || "").includes("news-pravda.com/")
        ? "NW:news-pravda"
        : "NW:news-search"
      : p.platform;
  const families = new Set(posts.map(family));
  const prior = universe.filter(
    (p) =>
      families.has(family(p)) &&
      p.postedAt &&
      Date.parse(p.postedAt) < start &&
      Date.parse(p.postedAt) >= start - 14 * 86400000,
  );
  // Same topic matches by lexical or embedding candidate membership supplied by grouping.
  const baseDays = new Set(prior.map((p) => p.postedAt.slice(0, 10))).size;
  const sameHour = prior.filter(
    (p) =>
      new Date(p.postedAt).getUTCHours() === new Date(peakAt).getUTCHours() &&
      new Date(p.postedAt).getUTCDay() === new Date(peakAt).getUTCDay(),
  );
  const comparable = [...families].every(
    (sourceFamily) =>
      new Set(
        prior
          .filter((p) => family(p) === sourceFamily)
          .map((p) => p.postedAt.slice(0, 10)),
      ).size >= 7 && sameHour.some((p) => family(p) === sourceFamily),
  );
  const usual = comparable
    ? sameHour.length /
      (new Set(sameHour.map((p) => p.postedAt.slice(0, 10))).size * 6)
    : null;
  const variants = [];
  for (const p of posts) {
    const tokens = shingles(p.text);
    const variant = variants.find(
      (v) => jaccard(v.shingles, tokens) >= config.textJaccard,
    );
    if (variant) variant.posts.push(p);
    else variants.push({ shingles: tokens, posts: [p] });
  }
  const repeated = variants
    .filter((v) => v.posts.length >= 2)
    .sort((a, b) => b.posts.length - a.posts.length);
  const copied = repeated.flatMap((v) => v.posts);
  const known = accounts.filter((a) => a.createdAt),
    young = known.filter(
      (a) =>
        start - Date.parse(a.createdAt) >= 0 &&
        start - Date.parse(a.createdAt) < 30 * 86400000,
    );
  const urls = new Map();
  for (const p of posts)
    for (const url of new Set(p.links || [])) {
      try {
        const u = new URL(url);
        if (["t.me", "telegram.me"].includes(u.hostname)) continue;
        u.hash = "";
        const key = u.href;
        urls.set(key, (urls.get(key) || 0) + 1);
      } catch {}
    }
  const top = [...urls].sort((a, b) => b[1] - a[1])[0];
  const signals = [
    {
      key: "timing",
      fired:
        usual !== null &&
        peak >= config.minBurstPosts &&
        peak >= Math.max(1, usual) * config.burstRatio,
      measured: peak,
      baseline: usual,
      reason:
        usual === null
          ? "A same-hour and weekday baseline for these collection sources is still being collected."
          : `${peak} posts in ${config.burstWindowMinutes} minutes. The usual rate for this topic is ${usual.toFixed(1)} per 10 minutes.`,
    },
    {
      key: "new_accounts",
      fired: false,
      measured: young.length,
      known: known.length,
      reason: known.length
        ? `${young.length} of ${known.length} accounts with public creation dates were created in the last 30 days. A comparable baseline is not yet available.`
        : "Account creation dates could not be measured on these public pages.",
    },
    {
      key: "same_text",
      fired:
        copied.length >= config.minCopies &&
        copied.length / posts.length >= config.minCopyShare,
      measured: copied.length,
      reason: `${copied.length} of ${posts.length} posts repeat near-identical wording in ${repeated.length} text variants, measured with four-word shingles.`,
    },
    {
      key: "shared_links",
      fired:
        !!top &&
        top[1] >= config.minLinkedPosts &&
        top[1] / posts.length >= config.minLinkShare,
      measured: top?.[1] || 0,
      url: top?.[0],
      reason: top
        ? `${top[1]} posts share ${top[0]}. A shared link alone can also reflect ordinary reporting.`
        : "No repeated external link was found.",
    },
    {
      key: "ties",
      fired: false,
      reason:
        "Mutual follower lists could not be measured on these public pages.",
    },
  ].map((s) => ({ ...s, name: names[s.key] }));
  return {
    signals,
    verdict: verdict(signals, posts.length, accounts.length),
    peak,
    peakAt: new Date(peakAt).toISOString(),
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    copied: copied.map((p) => p.id),
    variants: repeated.map((v, i) => ({
      id: "v" + i,
      count: v.posts.length,
      posts: v.posts.map((p) => p.id),
    })),
    topLink: top?.[0],
  };
}
export function groups(posts) {
  const clusters = [],
    sets = posts.map((p) => shingles(p.text));
  for (let i = 0; i < posts.length; i++) {
    if (sets[i].size < 8) continue;
    let c = clusters.find(
      (c) =>
        jaccard(sets[i], sets[c[0]]) >= config.textJaccard &&
        Math.abs(
          Date.parse(posts[i].postedAt) - Date.parse(posts[c[0]].postedAt),
        ) <
          48 * 3600000,
    );
    if (c) c.push(i);
    else clusters.push([i]);
  }
  return clusters
    .filter((c) => c.length >= 3)
    .map((c) => c.map((i) => posts[i]));
}
if (process.argv[1]?.endsWith("/detect.mjs")) {
  const posts = all("post").filter(
    (p) =>
      p.postedAt &&
      Date.parse(p.postedAt) >= Date.parse("2026-11-01") &&
      tokens(p.text).length >= 12,
  );
  const clusters = groups(posts).sort((a, b) => b.length - a.length);
  for (const c of clusters) {
    const accounts = [...new Set(c.map((p) => p.accountId))]
      .map((id) => get("account", id))
      .filter(Boolean);
    const m = measure(
      c,
      posts.filter(
        (p) => jaccard(shingles(p.text), shingles(c[0].text)) > 0.12,
      ),
      accounts,
    );
    const id = hash(c.map((p) => p.id).sort()).slice(0, 12);
    put("candidate", id, { id, posts: c, accounts, ...m });
  }
  console.log("candidates", clusters.length);
  for (const c of all("candidate")
    .sort((a, b) => b.posts.length - a.posts.length)
    .slice(0, 10))
    console.log(
      c.id,
      c.verdict,
      c.posts.length,
      c.accounts.length,
      c.peak,
      c.posts[0].text.slice(0, 170),
    );
}

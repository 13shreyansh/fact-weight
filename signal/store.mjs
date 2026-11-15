import { inWatch } from "./scopes.mjs";
import { all, get, put, db, spend, hash } from "./providers.mjs";
import { techniqueName } from "./techniques.mjs";
import { networkSites, networkEvidence } from "./network.mjs";
export const defaultId = "baltics";
export const defaultWatch = {
  id: defaultId,
  conflict: "Russia–Ukraine war",
  audience: "the Baltics and Finland",
  name: "Russia–Ukraine war · aimed at the Baltics and Finland",
  countries: ["Lithuania", "Latvia", "Estonia", "Finland"],
  languages: ["lt", "lv", "et", "fi", "ru", "uk", "en"],
  networkName: "Pravda network",
  networkEvidence,
  keywords: {
    fi: ["Ukraina", "Venäjä", "Nato", "Baltia", "Suomi"],
    en: ["Ukraine", "Baltic states", "NATO"],
    ru: ["Украина", "страны Балтии", "НАТО"],
    lt: ["Ukraina", "Baltijos šalys"],
    lv: ["Ukraina", "Baltijas valstis"],
    et: ["Ukraina", "Balti riigid"],
    uk: ["Україна", "країни Балтії"],
  },
  sources: [
    "https://t.me/s/antifalivland",
    "https://t.me/s/latvijasbalzams",
    "https://t.me/s/news_lv",
    "https://t.me/s/kotreal",
    "https://t.me/s/rybar",
    "https://www.tiktok.com/tag/ukrainewar",
    "https://www.instagram.com/explore/tags/baltics/",
    "https://www.reddit.com/search/?q=Ukraine%20Baltic&sort=new&t=month",
    "https://lt.news-pravda.com/",
    "https://latvia.news-pravda.com/",
    "https://estonia.news-pravda.com/",
  ],
  trusted: [
    "ISW daily assessments",
    "Oryx loss lists",
    "ERR (Estonia)",
    "LSM (Latvia)",
    "LRT (Lithuania)",
    "Yle",
    "Official defence statements",
  ],
  news: true,
  seenBefore: true,
  createdAt: new Date().toISOString(),
  public: true,
};
if (!get("watch", defaultId))
  put("watch", defaultId, {
    ...defaultWatch,
    sources: [...new Set([...defaultWatch.sources, ...networkSites])],
  });
else {
  const stored = get("watch", defaultId);
  put("watch", defaultId, {
    ...stored,
    conflict: defaultWatch.conflict,
    audience: defaultWatch.audience,
    name: defaultWatch.name,
    countries: defaultWatch.countries,
    languages: defaultWatch.languages,
    keywords: { ...stored.keywords, ...defaultWatch.keywords },
    networkName: "Pravda network",
    networkEvidence,
    sources: [
      ...new Set([...stored.sources, ...defaultWatch.sources, ...networkSites]),
    ],
  });
}
export function watch(id, owner) {
  const w = get("watch", id);
  return w &&
    (w.public || w.owner === owner) &&
    (!w.expiresAt || Date.parse(w.expiresAt) > Date.now())
    ? w
    : null;
}
export function pushes(w = defaultId) {
  return all("push")
    .filter((p) => p.watchId === w && !p.excluded)
    .map((p) => ({ ...p, review: get("review", p.id) }));
}
export function metrics(w = defaultId) {
  const calls = db
    .prepare(
      "SELECT provider,count(*) n FROM calls WHERE at>=? GROUP BY provider",
    )
    .all(new Date().toISOString().slice(0, 10));
  const sweeps = all("sweep")
    .filter((s) => s.watchId === w)
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  return {
    asOf: new Date().toISOString(),
    posts: db
      .prepare(
        "SELECT count(*) n FROM records WHERE kind='post' AND EXISTS(SELECT 1 FROM json_each(coalesce(json_extract(data,'$.watchIds'),'[\"baltics\"]')) WHERE value=?)",
      )
      .get(w).n,
    accounts: db
      .prepare(
        "SELECT count(distinct json_extract(data,'$.accountId')) n FROM records WHERE kind='post' AND EXISTS(SELECT 1 FROM json_each(coalesce(json_extract(data,'$.watchIds'),'[\"baltics\"]')) WHERE value=?)",
      )
      .get(w).n,
    sources: (get("watch", w)?.sources || []).filter((url) =>
      db
        .prepare(
          "SELECT 1 FROM calls WHERE provider='context' AND endpoint='/web/scrape' AND status=200 AND json_extract(params,'$.url')=? AND (json_extract(response,'$.parsed.success')=1 OR json_extract(response,'$.markdown.success')=1 OR json_extract(response,'$.html.success')=1) LIMIT 1",
        )
        .get(url),
    ).length,
    sweeps: sweeps.length,
    lastSweep:
      sweeps.at(-1) ||
      (w === defaultId ? get("meta", "initialCollection") : null),
    lastReadAt:
      sweeps.filter((s) => s.finishedAt).at(-1)?.finishedAt ||
      (w === defaultId ? get("meta", "initialCollection")?.finishedAt : null),
    sweeping: sweeps.at(-1)?.status === "running",
    calls,
    credits: spend(),
    watches: all("watch").filter(
      (w) => w.public || Date.parse(w.expiresAt) > Date.now(),
    ).length,
    disputed: all("review").filter((r) => !r.reopened).length,
    coverage: all("coverage"),
    embedding: get("meta", "embedding"),
    models: [
      ...new Set(
        pushes(w)
          .flatMap((p) => [
            p.reading?.model,
            p.judgement?.model,
            p.judgement?.verification?.model,
          ])
          .filter(Boolean),
      ),
    ],
  };
}
const candidateText = (c) => c.posts.map((p) => p.text.slice(0, 400)).join(" ");
export function wordingFor(c) {
  const labels = c.judgement?.data?.techniques?.length
    ? c.judgement.data.techniques
    : (c.reading?.data?.techniques || []).slice(0, 1);
  return labels
    .filter(
      (t) =>
        techniqueName(t.name) &&
        typeof t.phrase === "string" &&
        t.phrase.length >= 8 &&
        c.posts.some((p) => p.text.includes(t.phrase)),
    )
    .map((t) => ({ ...t, name: techniqueName(t.name) }));
}
export function restoreWording() {
  for (const p of all("push").filter(
    (p) => !p.excluded && !p.techniques?.length,
  )) {
    const techniques = wordingFor(p);
    if (techniques.length)
      put("push", p.id, { ...p, techniques, techniqueSource: p.reading });
  }
}
export function finalize(c, watchId = defaultId) {
  if (
    watchId !== defaultId &&
    get("watch", watchId)?.expiresAt &&
    Date.parse(get("watch", watchId).expiresAt) <= Date.now()
  )
    return null;
  const j = c.judgement;
  if (!j?.data.sameNarrative) {
    const old = get("push", c.id);
    if (old)
      put("push", c.id, {
        ...old,
        excluded: true,
        excludedReason: "The latest reading did not confirm one narrative",
        recheckedAt: new Date().toISOString(),
      });
    return null;
  }
  if (
    watchId === defaultId &&
    !/ukrain|украин|україн|nato|нато|войн|війна|military|battlefield/i.test(
      (j.data.claim || "") + " " + candidateText(c),
    )
  ) {
    const previous = get("push", c.id);
    if (previous)
      put("push", c.id, {
        ...previous,
        excluded: true,
        excludedReason: "Outside the war narrative scope of this watch",
      });
    return null;
  }
  let sources = (j.data.evidence || [])
    .map((e) => {
      const s = c.sources.find((s) => s.id === e.sourceId);
      return s &&
        typeof e.quote === "string" &&
        e.quote.length >= 12 &&
        s.text.includes(e.quote)
        ? {
            ...e,
            name: s.name,
            url: s.url,
            sourceId: s.id,
            publishedAt: s.publishedAt || null,
          }
        : null;
    })
    .filter(Boolean);
  const groups = new Map();
  for (const e of sources) {
    const host = new URL(e.url).hostname.replace(/^www\./, "");
    const domain = host.split(".").slice(-2).join(".");
    const origin =
      e.stance === "for" &&
      (/bild/i.test(e.name + " " + e.quote) ||
        (j.data.claimType === "attribution" && /bild/i.test(j.data.claim)))
        ? "report:bild"
        : e.stance === "against" && /peskov|kremlin|песков|кремл/i.test(e.quote)
          ? "statement:kremlin"
          : domain;
    const key = origin + ":" + e.stance;
    if (!groups.has(key)) groups.set(key, { ...e, publisherGroup: origin });
  }
  sources = [...groups.values()];
  const now = new Date().toISOString();
  const previous = get("push", c.id);
  const rawTitle =
    /\b(fake|propaganda|disinformation|lie|bot|troll|enemy)\b/i.test(
      j.data.title,
    )
      ? "Posts about " + j.data.claim
      : j.data.title;
  const title =
    rawTitle.length <= 90
      ? rawTitle
      : rawTitle.slice(0, 89).replace(/\s+\S*$/, "") + "…";
  const p = {
    ...c,
    watchId,
    title,
    claim: j.data.claim,
    evidence: sources,
    techniques: wordingFor(c),
    techniqueSource: j.data.techniques?.length ? j : c.reading || j,
    innocentExplanations: j.data.innocentExplanations || [],
    firstSeen: c.start,
    lastSeen: c.end,
    flaggedAt: previous?.flaggedAt || now,
    firstAlertAt: previous?.firstAlertAt || null,
    checkedAt: now,
    createdAt: now,
    mode: c.mode || "live",
    ruleVersion: "sf-signals-v2",
    seenBefore: c.seenBefore || [],
    sites: c.sites || [],
    enrichment: c.enrichment || {
      trusted: "historical check",
      seenBefore: "not checked",
      sites: "not checked",
    },
    reading: c.reading || null,
    trail: [],
    packId: "SF-" + now.slice(0, 4) + "-" + c.id.slice(0, 8),
  };
  const pushIds = new Set(p.posts.map((x) => x.id));
  const topic = /nato|нато/i.test(p.posts.map((x) => x.text).join(" "))
    ? /nato|нато/i
    : /ukrain|украин|україн/i;
  p.backgroundPosts = all("post")
    .filter(
      (x) =>
        inWatch(x, watchId) &&
        !pushIds.has(x.id) &&
        x.postedAt &&
        Date.parse(x.postedAt) >= Date.parse(p.firstSeen) - 2 * 3600000 &&
        Date.parse(x.postedAt) <= Date.parse(p.lastSeen) + 2 * 3600000 &&
        topic.test(x.text),
    )
    .map((x) => ({ ...x, inPush: false }));
  // Only the explicit verdict rule can publish a coordinated push. Under-minimum samples remain available as checked records.
  put("push", p.id, p);
  return p;
}

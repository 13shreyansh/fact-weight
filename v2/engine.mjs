// Engine v2: starts from no list of actors. Sites reveal themselves by publishing
// near-identical text about a country's top stories within minutes of each other.
import dns from "node:dns/promises";
import { call, llm, pool, put, get, all, hash, setContext, db, CapReached, addEvent, embed, cosine } from "./db.mjs";
import { country as countryInfo } from "./countries.mjs";
import { tokens, shingles, jaccard, containment, windowJaccard, headlineSim, cleanTitle, mainText, sentences, site, registrable, median } from "./text.mjs";

// Stories the owner asked to always follow, by country (searched, never invented).
const WATCHED = {
  US: ["Jensen Huang resigns Nvidia CEO", "midterm election integrity", "Will DePue Blackwell fingerprint report"],
  FI: ["Bild Russia demands Finland leave NATO"],
};
// Known sources checked for every story beside open search: state outlets, plus the documented network list fetched at runtime.
const STATE_OUTLETS = ["rt.com", "sputnikglobe.com", "tass.com", "tass.ru", "ria.ru", "presstv.ir", "irna.ir", "tasnimnews.com", "globaltimes.cn", "cgtn.com"];
export const T = {
  days: 7,
  maxStories: 60,
  copyThreshold: 0.6,
  edgeMinutes: 60,
  clusterMinSites: 3,
  clusterMinStories: 3,
  scrapesPerStory: 9,
  organicMinOutlets: 3,
  strong: { sites: 5, stories: 5, medianGapMin: 30 },
};
const SPORT = /\b(hockey|football|soccer|nhl|nba|nfl|uefa|fifa|league|olympic|grand prix|tennis|golf|cricket|rugby|semifinal|quarterfinal|match report|stats & head-to-head|vs\.? )\b/i;
const SKIP_HOSTS = /(^|\.)(x\.com|twitter\.com|facebook\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|reddit\.com|wikipedia\.org|google\.[a-z.]+|bing\.com|msn\.com|yahoo\.com|news\.google\.com|linkedin\.com|t\.me|telegram\.me|vk\.com|ok\.ru)$/i;
const WIRE = /\((AP|Reuters|AFP|dpa|STT|TT|NTB|Ritzau|ANSA|EFE|PAP|ČTK|CTK|MTI|Kyodo|Yonhap|PTI|ANI|IANS|Bernama|Xinhua|TASS|Interfax|Ukrinform|Agerpres|LETA|BNS|ERR|AAP|CP|PA|UNI|IANS|ANI)\)|\bAssociated Press\b|\bReuters\b|Agence France-Presse|Canadian Press|PA Media|Press Association|Press Trust of India|Asian News International|Bloomberg News|\bAFP\b|PR Newswire|PRNewswire|Business Wire|GlobeNewswire|EIN Presswire|Cision|press release|Pressemitteilung|tiedote|pressmeddelande|\b(STT|NTB|Ritzau|dpa|ANSA|PAP)\b\s*[-–—:]/;
const normUrl = (u) => {
  try {
    const x = new URL(u);
    return x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/$/, "");
  } catch {
    return u;
  }
};
// Exa gives date-only values as midnight UTC; those cannot be used for minute-level timing.
const preciseIso = (t) => (/T00:00:00(\.000)?Z$/.test(String(t)) ? null : iso(t));
const iso = (t) => {
  const d = Date.parse(t);
  return Number.isFinite(d) ? new Date(d).toISOString() : null;
};
// Publishers seen as direct editorial sources in the news index (persisted across builds).
const all_publishers = new Set(get("meta", "indexed_publishers") || []);
const savePublishers = () => put("meta", "indexed_publishers", [...all_publishers]);
const minutes = (a, b) => (Date.parse(b) - Date.parse(a)) / 60000;

async function step(build, name, fn) {
  const s = { name, started_at: new Date().toISOString(), ms: null, calls: 0, cached: 0, credits: 0, note: null, status: "running" };
  build.steps.push(s);
  saveBuild(build);
  setContext({ build: build.id, step: name });
  const t0 = Date.now();
  try {
    const out = await fn(s);
    s.status = "done";
    return out;
  } catch (e) {
    s.status = "failed";
    s.note = e.message;
    throw e;
  } finally {
    s.ms = Date.now() - t0;
    const r = db.prepare("SELECT count(*) n, coalesce(sum(coalesce(credits,reserved)),0) c FROM calls WHERE build_id=? AND step=?").get(build.id, name);
    s.calls = r.n;
    const per = db.prepare("SELECT provider, count(*) n FROM calls WHERE build_id=? AND step=? GROUP BY provider").all(build.id, name);
    s.calls_context = per.find((x) => x.provider === "context")?.n || 0;
    s.calls_exa = per.find((x) => x.provider === "exa")?.n || 0;
    s.credits = Math.round(r.c * 1000) / 1000;
    saveBuild(build);
  }
}
export function saveBuild(b) {
  db.prepare("INSERT OR REPLACE INTO builds VALUES(?,?,?,?,?,?,?,?,?)").run(b.id, b.cc, b.status, b.requested_at, b.started_at, b.finished_at, b.source, JSON.stringify(b.steps), b.error);
}
export function loadBuild(id) {
  const r = db.prepare("SELECT * FROM builds WHERE id=?").get(id);
  return r ? { ...r, steps: JSON.parse(r.steps || "[]") } : null;
}

// 1. Top stories about or for the country over the last week.
async function collectStories(c) {
  const to = Math.floor(Date.now() / 3600e3) * 3600e3,
    from = to - T.days * 86400e3;
  const queries = [c.name, `${c.name} politics government`, `${c.name} election`, `${c.name} economy technology business`, `${c.name} Russia China security`];
  const reqs = queries.map((query) => ({ searchBy: { type: "natural_language", query }, filterBy: { date: { from, to } }, limit: 100 }));
  for (const l of c.langs.slice(0, 2)) reqs.push({ searchBy: { type: "natural_language", query: c.local || c.name }, filterBy: { date: { from, to }, articleLanguage: [l] }, limit: 100 });
  const local = reqs.length;
  reqs.push({ searchBy: { type: "natural_language", query: c.local || c.name }, filterBy: { date: { from, to }, sourceCountry: [c.code.toLowerCase()] }, limit: 100 });
  reqs.push({ searchBy: { type: "natural_language", query: `${c.name} news` }, filterBy: { date: { from, to }, sourceCountry: [c.code.toLowerCase()] }, limit: 100 });
  const results = await pool(reqs, 4, (p) => call("context", "/news/search", p).catch((e) => ({ data: [], error: e.message })));
  const byStory = new Map(),
    seen = new Set(),
    indexedPublishers = new Set();
  results.forEach((r, qi) =>
    (r?.data || []).forEach((a) => {
      if (!a.url || seen.has(normUrl(a.url))) return;
      if (qi < local && !c.about.test(a.title + " " + a.description)) return;
      seen.add(normUrl(a.url));
      if (a.source?.direct) indexedPublishers.add(site(a.url));
      const sid = a.story_id || hash(a.url);
      if (!byStory.has(sid)) byStory.set(sid, []);
      byStory.get(sid).push({
        outlet: a.source?.name || site(a.url),
        domain: site(a.url),
        url: a.url,
        published_at: iso(a.published_at),
        headline: cleanTitle(a.title),
        description: a.description || "",
        lang: a.language || null,
        direct: !!a.source?.direct,
      });
    }),
  );
  // Exa news search adds articles the Context.dev index misses; they join a story when the headline matches.
  if (process.env.EXA_API_KEY) {
    const exaQ = [`${c.name} news this week`, `${c.name} politics government election`, `${c.name} technology business companies CEO`, `${c.name} security defence Russia China`, `top ${c.name} news stories elections integrity`, `${c.name} AI chips tech industry`];
    const ex = await pool(exaQ, 4, (query) =>
      call("exa", "/search", { query, type: "auto", category: "news", numResults: 25, startPublishedDate: new Date(from).toISOString(), endPublishedDate: new Date(to).toISOString(), contents: { text: { maxCharacters: 1200 } } }).catch(() => ({ results: [] })),
    );
    const heads = [...byStory.entries()].map(([sid, arts]) => [sid, arts.map((a) => a.headline)]);
    for (const r of ex)
      for (const x of r?.results || []) {
        if (!x.url || seen.has(normUrl(x.url)) || SKIP_HOSTS.test(site(x.url) || "")) continue;
        const text = x.text || "";
        if (!c.about.test((x.title || "") + " " + text)) continue;
        seen.add(normUrl(x.url));
        const art = { outlet: site(x.url), domain: site(x.url), url: x.url, published_at: preciseIso(x.publishedDate), headline: cleanTitle(x.title), description: text.slice(0, 600), lang: null, direct: false, via: "exa" };
        const hit = heads.find(([, hs]) => hs.some((h) => headlineSim(h, art.headline) >= 0.45));
        const sid = hit ? hit[0] : "x" + hash(x.url);
        if (!byStory.has(sid)) {
          byStory.set(sid, []);
          heads.push([sid, [art.headline]]);
        } else if (hit) hit[1].push(art.headline);
        byStory.get(sid).push(art);
      }
  }
  // Watched stories: always searched and kept, even outside the top stories (owner's list plus the
  // week's most obvious influence stories for the country).
  const watchedIds = new Set();
  if (process.env.EXA_API_KEY) {
    const wq = [...(WATCHED[c.code] || []), `${c.name} disinformation influence campaign this week`, `${c.name} Russian state media claims this week`];
    const wr = await pool(wq, 4, (query) =>
      call("exa", "/search", { query, type: "auto", numResults: 15, startPublishedDate: new Date(from - 2 * 864e5).toISOString(), endPublishedDate: new Date(to).toISOString(), contents: { text: { maxCharacters: 1200 } } }).catch(() => ({ results: [] })),
    );
    const heads = [...byStory.entries()].map(([sid, arts]) => [sid, arts.map((a) => a.headline)]);
    wr.forEach((r, qi) => {
      const rows = (r?.results || []).filter((x) => x.url && !SKIP_HOSTS.test(site(x.url) || ""));
      if (!rows.length) return;
      const lead = cleanTitle(rows[0].title);
      let sid = heads.find(([, hs]) => hs.some((h) => headlineSim(h, lead) >= 0.45))?.[0];
      if (!sid) {
        sid = "w" + hash(wq[qi] + rows[0].url);
        byStory.set(sid, []);
        heads.push([sid, [lead]]);
      }
      for (const x of rows.slice(0, 8)) {
        if (seen.has(normUrl(x.url))) continue;
        seen.add(normUrl(x.url));
        byStory.get(sid).push({ outlet: site(x.url), domain: site(x.url), url: x.url, published_at: preciseIso(x.publishedDate), headline: cleanTitle(x.title), description: (x.text || "").slice(0, 600), lang: null, direct: false, via: "exa" });
      }
      if (byStory.get(sid).length) watchedIds.add(sid.slice(0, 16));
    });
  }
  const stories = [...byStory.entries()]
    .map(([sid, articles]) => {
      articles.sort((a, b) => String(a.published_at).localeCompare(String(b.published_at)));
      return { id: sid.slice(0, 16), articles, outlets: new Set(articles.map((a) => a.domain)).size, title: articles[0].headline };
    })
    .filter((s) => !SPORT.test(s.articles.map((a) => a.headline).join(" ")));
  stories.sort((a, b) => b.outlets - a.outlets || String(b.articles.at(-1).published_at).localeCompare(String(a.articles.at(-1).published_at)));
  const pool80 = stories.slice(0, 150);
  const drop = await llm(
    "gemini-3.5-flash-lite",
    `From these news stories found for ${c.name}, list the ones to SET ASIDE: sports results and sports business, entertainment, celebrity, lifestyle, recipes, local crime, and stories with no connection to ${c.name}. Keep politics, government, elections, security, defence, foreign relations, war, economy, companies, technology, health and society. Return JSON {"drop":[int]}.`,
    { stories: pool80.map((s, i) => ({ i, title: s.title })) },
    800,
  ).catch(() => null);
  const dropped = new Set(Array.isArray(drop?.drop) ? drop.drop : []);
  const kept = pool80.filter((_, i) => !dropped.has(i));
  const watched = stories.filter((st) => watchedIds.has(st.id));
  for (const w of watched) w.watched = true;
  const top = kept.filter((st) => !st.watched).slice(0, T.maxStories - Math.min(watched.length, 10));
  for (const s of indexedPublishers) all_publishers.add(s);
  return { stories: [...watched.slice(0, 10), ...top], indexed: seen.size, queries: reqs.length, filtered: pool80.length - kept.length };
}

function scrapeInfo(d, url) {
  const md = d.markdown?.data || "",
    html = d.html?.data || "",
    meta = d.metadata || {};
  const text = mainText(md);
  let published =
    preciseIso(meta.publishedTime) ||
    iso(meta.additionalMeta?.["article:published_time"]) ||
    iso((html.match(/"datePublished"\s*:\s*"([^"]+)"/) || [])[1]) ||
    iso((html.match(/<time[^>]+datetime="([^"]+)"/) || [])[1]);
  if (published && (Date.parse(published) > Date.now() + 864e5 || Date.parse(published) < Date.now() - 400 * 864e5)) published = null;
  const links = [...md.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
  const own = site(url);
  const origins = [
    ...new Set(
      links
        .filter((l) => !/sharer|share\?|intent\/|whatsapp|mailto|\/share/i.test(l))
        .map((l) => {
          const t = l.match(/^https?:\/\/(?:t\.me|telegram\.me)\/(?:s\/)?([A-Za-z0-9_]{4,})/);
          if (t) return "t.me/" + t[1];
          const s = site(l);
          return s && s !== own && registrable(s) !== registrable(own) ? s : null;
        })
        .filter(Boolean),
    ),
  ];
  const ids = [...new Set((html.match(/\b(UA-\d{4,10}-\d{1,4}|G-[A-Z0-9]{8,12}|GTM-[A-Z0-9]{5,8}|ca-pub-\d{10,20})\b/g) || []).concat([...html.matchAll(/ym\((\d{6,10}),/g)].map((m) => "ym-" + m[1])))];
  const generator = (html.match(/<meta[^>]+name="generator"[^>]+content="([^"]{2,60})"/i) || [])[1] || null;
  const theme = (html.match(/\/wp-content\/themes\/([\w-]{2,40})\//) || [])[1] || null;
  return {
    url,
    site: own,
    title: cleanTitle(meta.title || meta.openGraph?.title || ""),
    text,
    published_at: published,
    lang: (meta.language || meta.openGraph?.locale || "").slice(0, 2).toLowerCase() || null,
    origins,
    ids,
    template: theme ? "wp-theme:" + theme : generator,
    wire: (WIRE.exec(md.slice(0, 6000)) || (/\/ap-|\/apnews|-ap-|\/reuters\//i.test(url) ? ["AP/Reuters feed"] : null) || [])[0]?.replace(/[()]/g, "").trim() || null,
  };
}

// 2. Search the open web for near-identical text of each story's headline and lead.
async function findCopies(story, c) {
  const titles = [];
  const prefer = [...c.langs, "en"];
  const byLang = new Map();
  for (const a of story.articles) if (!byLang.has(a.lang)) byLang.set(a.lang, a.headline);
  for (const l of prefer) if (byLang.has(l)) titles.push(byLang.get(l));
  for (const t of byLang.values()) if (titles.length < 2 && !titles.includes(t)) titles.push(t);
  if (!titles.length) titles.push(story.title);
  const lead = story.articles.map((a) => sentences(a.description)[0]).find(Boolean);
  const frags = [...new Set(titles.filter((t) => tokens(t).length >= 4))].slice(0, 2);
  if (lead) frags.push(lead);
  const quote = (s) => {
    const w = s.replace(/["“”«»]/g, "").split(/\s+/);
    return `"${w.slice(0, 14).join(" ")}"`;
  };
  // Quoted phrases find verbatim copies; one plain-keyword search per headline widens the pool so
  // pages that copy each other (rather than the mainstream wording) can be compared pairwise.
  const queries = [...frags.slice(0, process.env.EXA_API_KEY ? 2 : 3).map((f) => ({ q: quote(f), quoted: true })), ...(process.env.EXA_API_KEY ? [] : frags.slice(0, 2).map((f) => ({ q: tokens(f).slice(0, 12).join(" "), quoted: false })))];
  const results = await pool(queries, 3, (x) => call("context", "/web/search", { query: x.q + " -site:x.com -site:twitter.com", numResults: 20 }).then((r) => ({ ...r, quoted: x.quoted })));
  const known = new Set(story.articles.map((a) => normUrl(a.url)));
  const exaPages = [];
  let exaSearches = 0;
  if (process.env.EXA_API_KEY) {
    const sents = [...new Set(story.articles.flatMap((a) => sentences(a.description)).filter((x) => x.length >= 60))].sort((a, b) => b.length - a.length).slice(0, 2);
    const head = story.articles.find((a) => c.langs.includes(a.lang))?.headline;
    const ents = entities(story.title);
    const qs = [...sents.slice(0, 1), ...(head ? [head] : []), ...(story.translations || [])].slice(0, 3);
    if (ents.length >= 3) qs.push(`${ents.join(" ")} ${c.name}`);
    if (sents.length > 1 && qs.length < 3) qs.push(sents[1]);
    const t0 = Date.parse(story.articles[0].published_at || Date.now());
    const res = await pool(qs, 3, (q) => {
      const w = tokens(q).filter((x) => x.length > 3);
      const span = w.slice(Math.max(0, (w.length >> 1) - 2), (w.length >> 1) + 3).join(" ");
      return call("exa", "/search", { query: q, type: "auto", numResults: 20, startPublishedDate: new Date(t0 - 864e5).toISOString(), endPublishedDate: new Date(t0 + 3 * 864e5).toISOString(), contents: { text: { maxCharacters: 2500 } } }).catch(() => ({ results: [] }));
    });
    exaSearches = qs.length;
    const docs = await documentedLists();
    const knownDomains = [...new Set([...STATE_OUTLETS, ...docs.lists.flatMap((l) => [...l.registrables])])].slice(0, 200);
    const ks = await call("exa", "/search", { query: story.title, type: "auto", numResults: 15, includeDomains: knownDomains, startPublishedDate: new Date(t0 - 864e5).toISOString(), endPublishedDate: new Date(t0 + 3 * 864e5).toISOString(), contents: { text: { maxCharacters: 2500 } } }).catch(() => ({ results: [] }));
    exaSearches++;
    res.push({ ...ks, knownSource: true });
    for (const r of res)
      for (const x of r?.results || []) {
        const sx = site(x.url);
        if (!sx || SKIP_HOSTS.test(sx) || known.has(normUrl(x.url)) || exaPages.some((p) => normUrl(p.url) === normUrl(x.url))) continue;
        exaPages.push({ url: x.url, site: sx, title: cleanTitle(x.title || ""), text: x.text || "", published_at: preciseIso(x.publishedDate), lang: null, origins: [], ids: [], template: null, wire: (WIRE.exec((x.text || "").slice(0, 2500)) || [])[0]?.replace(/[()]/g, "").trim() || null, via: "exa", known_source: !!r.knownSource });
      }
  }
  const cands = new Map();
  for (const r of results)
    for (const x of r?.results || []) {
      const s = site(x.url);
      if (!s || SKIP_HOSTS.test(s) || known.has(normUrl(x.url)) || cands.has(normUrl(x.url))) continue;
      const sim = Math.max(...frags.map((f) => Math.max(headlineSim(f, x.title || ""), windowJaccard(f, (x.title || "") + " " + (x.description || ""), 3))));
      if (sim >= (r.quoted ? 0.3 : 0.2)) cands.set(normUrl(x.url), { url: x.url, sim });
    }
  const exaSet = new Set(exaPages.map((p) => normUrl(p.url)));
  const picked = [...cands.values()].filter((x) => !exaSet.has(normUrl(x.url))).sort((a, b) => b.sim - a.sim).slice(0, exaPages.length ? 3 : T.scrapesPerStory);
  const pages = (
    await pool(picked, 6, async (p) => {
      const d = await call("context", "/web/scrape", { url: p.url, formats: { markdown: true, html: true }, sharedParams: { mainContentOnly: false } }, { maxAgeMs: 30 * 86400e3 });
      return scrapeInfo(d, p.url);
    })
  ).filter((p) => p && !p.error && p.text);
  return { searches: queries.length + exaSearches, candidates: cands.size, pages: [...pages, ...exaPages] };
}

// Groups of near-identical pages within one story (union-find over pairwise similarity).
function identicalGroups(story) {
  const nodes = [
    ...story.articles.map((a) => ({ kind: "mainstream", site: a.domain, url: a.url, t: a.published_at, headline: a.headline, text: a.description })),
    ...story.pages.map((p) => ({ kind: "copy", site: p.site, url: p.url, t: p.published_at, headline: p.title, text: p.text, page: p })),
  ];
  const parent = nodes.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const score = new Map();
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i],
        b = nodes[j];
      if (a.site === b.site) continue;
      const [short, long] = tokens(a.text).length <= tokens(b.text).length ? [a, b] : [b, a];
      const lead = tokens(short.text).slice(0, 120).join(" ");
      let s = windowJaccard(lead, long.text);
      if (s < T.copyThreshold && tokens(a.headline).length >= 6) s = Math.max(s, headlineSim(a.headline, b.headline) >= 0.85 ? headlineSim(a.headline, b.headline) : 0);
      if (s >= T.copyThreshold) {
        parent[find(i)] = find(j);
        score.set(i, Math.max(score.get(i) || 0, s));
        score.set(j, Math.max(score.get(j) || 0, s));
      }
    }
  const groups = new Map();
  nodes.forEach((n, i) => {
    n.similarity = score.get(i) || 0;
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(n);
  });
  return [...groups.values()].filter((g) => new Set(g.map((n) => n.site)).size >= 2);
}

// 3. Site graph and clusters.
export function cluster(stories, keepSite = () => true, minWeight = 1) {
  const edges = new Map();
  const ek = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
  for (const s of stories)
    for (const g of s.groups) {
      const timed = g.filter((n) => n.t);
      for (let i = 0; i < timed.length; i++)
        for (let j = i + 1; j < timed.length; j++) {
          const a = timed[i],
            b = timed[j];
          if (a.site === b.site || (a.kind === "mainstream" && b.kind === "mainstream") || !keepSite(a.site) || !keepSite(b.site)) continue;
          const gap = Math.abs(minutes(a.t, b.t));
          if (gap > T.edgeMinutes) continue;
          const k = ek(a.site, b.site);
          if (!edges.has(k)) edges.set(k, { stories: new Set(), gaps: [] });
          edges.get(k).stories.add(s.id);
          edges.get(k).gaps.push(gap);
        }
    }
  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    return parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x));
  };
  for (const [k, e] of edges) {
    if (e.stories.size < minWeight) continue;
    const [a, b] = k.split("|");
    parent.set(find(a), find(b));
  }
  const comps = new Map();
  for (const x of parent.keys()) {
    const r = find(x);
    if (!comps.has(r)) comps.set(r, new Set());
    comps.get(r).add(x);
  }
  // Split each connected component into communities with Louvain (local moving, modularity gain),
  // so a chain of loosely linked sites does not become one giant group.
  const communities = [];
  for (const comp of comps.values()) {
    if (comp.size < 6) {
      communities.push(comp);
      continue;
    }
    const w = new Map();
    let m2 = 0;
    for (const [k, e] of edges) {
      const [a, b] = k.split("|");
      if (!comp.has(a) || !comp.has(b) || e.stories.size < minWeight) continue;
      const x = e.stories.size;
      (w.get(a) || w.set(a, new Map()).get(a)).set(b, x);
      (w.get(b) || w.set(b, new Map()).get(b)).set(a, x);
      m2 += 2 * x;
    }
    const deg = new Map([...comp].map((n) => [n, [...(w.get(n) || new Map()).values()].reduce((a, b) => a + b, 0)]));
    const com = new Map([...comp].map((n) => [n, n]));
    const tot = new Map([...comp].map((n) => [n, deg.get(n)]));
    for (let pass = 0, moved = true; moved && pass < 20; pass++) {
      moved = false;
      for (const n of comp) {
        const cur = com.get(n), kn = deg.get(n);
        const links = new Map();
        for (const [nb, x] of w.get(n) || []) links.set(com.get(nb), (links.get(com.get(nb)) || 0) + x);
        tot.set(cur, tot.get(cur) - kn);
        let best = cur, gain = (links.get(cur) || 0) - (tot.get(cur) * kn) / m2;
        for (const [c, kin] of links) {
          const g = kin - (tot.get(c) * kn) / m2;
          if (g > gain) (gain = g), (best = c);
        }
        tot.set(best, tot.get(best) + kn);
        if (best !== cur) (com.set(n, best), (moved = true));
      }
    }
    const groups = new Map();
    for (const [n, c] of com) (groups.get(c) || groups.set(c, new Set()).get(c)).add(n);
    communities.push(...groups.values());
  }
  const out = [];
  for (const sites of communities) {
    const storiesShared = new Set(),
      gaps = [];
    for (const [k, e] of edges) {
      const [a, b] = k.split("|");
      if (sites.has(a) && sites.has(b) && e.stories.size >= minWeight) {
        e.stories.forEach((x) => storiesShared.add(x));
        gaps.push(...e.gaps);
      }
    }
    if (sites.size >= T.clusterMinSites && storiesShared.size >= T.clusterMinStories)
      out.push({ sites: [...sites].sort(), stories: [...storiesShared], gaps, edges: [...edges].filter(([k, e]) => e.stories.size >= minWeight && k.split("|").every((s) => sites.has(s))).map(([k, e]) => ({ a: k.split("|")[0], b: k.split("|")[1], stories: e.stories.size })) });
  }
  return { clusters: out, edges: edges.size };
}

const oldShare = (w) => {
  const d = w.domain_ages.domains.filter((x) => x.age_days !== null);
  return d.length >= 3 ? d.filter((x) => x.age_days >= 15 * 365).length / d.length : 0;
};
// 4. Who: registration age, shared hosting and tracking IDs, cited origins.
let documented = null;
async function documentedLists() {
  if (documented && Date.now() - documented.at < 864e5) return documented;
  const lists = [];
  try {
    const r = await fetch("https://api.github.com/repos/CheckFirstHQ/pravda-network/git/trees/HEAD?recursive=1", { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "signal-fire-engine" } });
    const d = await r.json();
    const domains = (d.tree || []).map((t) => (t.path.match(/^json\/(.+)_viz\.json$/) || [])[1]).filter(Boolean);
    if (domains.length)
      lists.push({
        name: "Pravda network (Portal Kombat)",
        by: [
          { name: "CheckFirst public dataset", url: "https://github.com/CheckFirstHQ/pravda-network" },
          { name: "VIGINUM, Feb 2024", url: "https://www.sgdsn.gouv.fr/publications/portal-kombat-un-reseau-structure-et-coordonne-de-propagande-prorusse" },
          { name: "DFRLab, Feb 2025", url: "https://dfrlab.org/2025/02/24/russia-pravda-network-expands-worldwide/" },
        ],
        domains: new Set(domains),
        registrables: new Set(domains.map(registrable)),
      });
  } catch {}
  documented = { at: Date.now(), lists };
  put("meta", "documented_lists", { fetched_at: new Date().toISOString(), lists: lists.map((l) => ({ name: l.name, by: l.by, domains: l.domains.size })) });
  return documented;
}
let bootstrap = null;
async function rdapBase(tld) {
  if (!bootstrap) {
    try {
      const d = await (await fetch("https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(15000) })).json();
      bootstrap = new Map(d.services.flatMap(([tlds, urls]) => tlds.map((t) => [t, urls.find((u) => u.startsWith("https")) || urls[0]])));
    } catch {
      return null;
    }
  }
  return bootstrap.get(tld) || null;
}
async function rdap(domain) {
  const cached = get("rdap", domain);
  if (cached && (cached.registered_at || cached.reason === "The registry does not publish a creation date")) return cached;
  let out = { domain, registered_at: null, registrar: null, reason: null };
  const base = await rdapBase(domain.split(".").at(-1));
  if (!base) out.reason = "This domain's registry does not offer a public RDAP service";
  else
    try {
      const r = await fetch(base.replace(/\/?$/, "/") + "domain/" + domain, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/rdap+json", "User-Agent": "signal-fire-engine/2" } });
      if (r.ok) {
        const d = await r.json();
        out.registered_at = iso(d.events?.find((e) => e.eventAction === "registration")?.eventDate);
        out.registrar = d.entities?.find((e) => e.roles?.includes("registrar"))?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] || null;
        if (!out.registered_at) out.reason = "The registry does not publish a creation date";
      } else out.reason = r.status === 404 ? "The registry has no public record for this domain" : `The registry refused the lookup (${r.status})`;
    } catch {
      out.reason = "Registry lookup timed out";
    }
  put("rdap", domain, out);
  return out;
}
async function who(cl, pagesBySite) {
  const docs = await documentedLists();
  const regs = [...new Set(cl.sites.map(registrable))];
  const ages = await pool(regs, 4, rdap);
  const ips = await pool(cl.sites, 6, async (s) => {
    try {
      return { site: s, ips: await dns.resolve4(s) };
    } catch {
      return { site: s, ips: [] };
    }
  });
  const shared = [];
  const share = (type, pairs) => {
    const m = new Map();
    for (const [s, v] of pairs) {
      if (!m.has(v)) m.set(v, new Set());
      m.get(v).add(s);
    }
    for (const [v, ss] of m) if (ss.size >= 2) shared.push({ type, value: v, sites: [...ss].sort() });
  };
  share("ip", ips.flatMap((x) => (x?.ips || []).map((ip) => [x.site, ip])));
  const uniqIps = [...new Set(ips.map((x) => x?.ips?.[0]).filter(Boolean))].slice(0, 25);
  const asn = new Map(
    await pool(uniqIps, 5, async (ip) => {
      const c = get("asn", ip);
      if (c) return [ip, c.org];
      try {
        const d = await (await fetch(`https://ipinfo.io/${ip}/json`, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } })).json();
        put("asn", ip, { org: d.org || null, country: d.country || null });
        return [ip, d.org || null];
      } catch {
        return [ip, null];
      }
    }),
  );
  share("network (ASN)", ips.filter((x) => x?.ips?.[0] && asn.get(x.ips[0])).map((x) => [x.site, asn.get(x.ips[0])]));
  for (const s of cl.sites) {
    const ps = pagesBySite.get(s) || [];
    if (ps.length && ps.every((p) => p.via === "exa")) {
      try {
        const d = await call("context", "/web/scrape", { url: ps[0].url, formats: { markdown: true, html: true }, sharedParams: { mainContentOnly: false } }, { maxAgeMs: 30 * 86400e3 });
        const info = scrapeInfo(d, ps[0].url);
        Object.assign(ps[0], { origins: info.origins, ids: info.ids, template: info.template, lang: info.lang, published_at: ps[0].published_at || info.published_at });
      } catch {}
    }
  }
  const pages = cl.sites.flatMap((s) => pagesBySite.get(s) || []);
  share("analytics_id", pages.flatMap((p) => p.ids.map((i) => [p.site, i])));
  share("template", pages.filter((p) => p.template).map((p) => [p.site, p.template]));
  const regPairs = cl.sites.map((s) => [s, registrable(s)]).filter(([s, r]) => s !== r);
  share("parent_domain", regPairs);
  const originCount = new Map();
  for (const p of pages) for (const o of p.origins) originCount.set(o, (originCount.get(o) || 0) + 1);
  const origins_top = [...originCount].filter(([o]) => !cl.sites.includes(o)).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([o, n]) => ({ origin: o, url: "https://" + o, citations: n, type: o.startsWith("t.me/") ? "telegram" : "website" }));
  const langs = {};
  for (const p of pages) if (p.lang) langs[p.lang] = (langs[p.lang] || 0) + 1;
  const documented_by = [];
  for (const l of docs.lists) {
    const hit = cl.sites.filter((s) => l.domains.has(s) || l.registrables.has(registrable(s)));
    if (hit.length) documented_by.push({ network: l.name, matched_sites: hit, sources: l.by });
  }
  const now = Date.now();
  const dated = ages.filter((a) => a?.registered_at);
  return {
    domain_ages: {
      domains: ages.filter(Boolean).map((a) => ({ domain: a.domain, registered_at: a.registered_at, age_days: a.registered_at ? Math.round((now - Date.parse(a.registered_at)) / 864e5) : null, reason: a.reason })),
      median_age_days: median(dated.map((a) => (now - Date.parse(a.registered_at)) / 864e5)) === null ? null : Math.round(median(dated.map((a) => (now - Date.parse(a.registered_at)) / 864e5))),
      registered_last_year: dated.filter((a) => now - Date.parse(a.registered_at) < 365 * 864e5).length,
    },
    shared_infra: shared,
    origins_top,
    languages: langs,
    documented_by,
    asn: Object.fromEntries(ips.filter((x) => x?.ips?.[0]).map((x) => [x.site, asn.get(x.ips[0]) || null])),
    asn_reason: "IP addresses from DNS A records; network owner (ASN) from ipinfo.io",
  };
}

// 5. What they want: narratives, agreed by two model families.
async function narratives(cl, titles, cc) {
  if (titles.length < 2) return [];
  const list = titles.slice(0, 60).map((t, i) => ({ i, title: t.headline }));
  const g = await llm(
    "gemini-3.5-flash",
    `You group news headlines published by one cluster of websites about ${cc}. Return JSON {"narratives":[{"label":string,"items":[int]}]} with at most 5 narratives. A label is a neutral sentence (max 14 words) stating what the headlines push about ${cc}, e.g. "Finland's NATO membership makes it a target". Do not use the words fake, propaganda, bot or disinformation. Every item index belongs to at most one narrative; skip unrelated items.`,
    { headlines: list },
    1200,
  );
  const props = (g?.narratives || []).filter((n) => n.label && n.items?.length).slice(0, 5);
  if (!props.length) return [];
  const checkSys = `You check labels. For each proposed narrative, answer whether the label is a fair, neutral summary of what the listed headlines say. Return JSON {"verdicts":[{"index":int,"agree":boolean}]}.`;
  const payload = { narratives: props.map((n, index) => ({ index, label: n.label, headlines: n.items.map((i) => list[i]?.title).filter(Boolean) })) };
  const [a, b] = await Promise.all([llm("gpt-4.1-mini", checkSys, payload, 400), llm("claude-haiku-4.5", checkSys, payload, 400)]);
  const ok = (v, i) => !!v?.verdicts?.find((x) => x.index === i)?.agree;
  return props.map((n, i) => {
    const items = n.items.map((k) => titles[k]).filter(Boolean);
    const agreed = ok(a, i) && ok(b, i);
    return {
      id: hash(cl.id + n.label).slice(0, 10),
      label: agreed ? n.label : null,
      label_reason: agreed ? null : "The two checking models (OpenAI and Anthropic families) did not both accept the proposed label",
      proposed_label: n.label,
      models: { grouped_by: "gemini-3.5-flash", checked_by: ["gpt-4.1-mini", "claude-haiku-4.5"], agree: [ok(a, i), ok(b, i)] },
      cluster_id: cl.id,
      articles: items.length,
      first_seen: items.map((x) => x.t).filter(Boolean).sort()[0] || null,
      examples: items.slice(0, 5).map((x) => ({ url: x.url, site: x.site, headline: x.headline, published_at: x.t })),
      urls: items.map((x) => x.url),
    };
  });
}

// Spin: sentences in the copy that the closest mainstream article does not contain.
async function spinFor(story) {
  const copies = story.groups.flat().filter((n) => n.kind === "copy" && n.cluster_id);
  if (!copies.length) return [];
  const ms = story.articles[0];
  let mainstreamText = story.articles.map((a) => a.headline + ". " + a.description).join("\n");
  try {
    const d = await call("context", "/web/scrape", { url: ms.url, formats: { markdown: true, html: true }, sharedParams: { mainContentOnly: false } }, { maxAgeMs: 30 * 86400e3 });
    mainstreamText += "\n" + mainText(d.markdown?.data || "");
  } catch {}
  const M = shingles(tokens(mainstreamText), 3);
  const ents = [...entities(story.title), ...story.title.split(/\s+/).filter((w) => w.length > 6)].map((e) => e.toLowerCase());
  return copies.slice(0, 3).map((c) => ({
    copy_url: c.url,
    compared_with: ms.url,
    added_phrases: sentences(c.text.slice(0, 4000))
      .filter((s) => containment(shingles(tokens(s), 3), M) < 0.15)
      .filter((s) => tokens(s).length >= 8 && (s.match(/\//g) || []).length < 2 && !BOILER.test(s))
      .filter((s) => { const low = s.toLowerCase(); return ents.some((e) => low.includes(e)); })
      .slice(0, 3),
    labels: [],
  }));
}
async function labelSpin(spins) {
  const items = spins.flatMap((s) => s.added_phrases.map((p) => ({ id: s.copy_url + "#" + p.slice(0, 30), phrase: p })));
  if (!items.length) return;
  const r = await llm(
    "gpt-4.1-mini",
    `Label each phrase that a copying site added to a news story. Allowed labels: "Added claim", "Added attribution", "Loaded language", "Fear appeal", "Added context", "Boilerplate". Return JSON {"labels":[{"i":int,"labels":[string]}]}. Never use fake, propaganda or bot.`,
    { phrases: items.map((x, i) => ({ i, phrase: x.phrase })) },
    800,
  );
  let k = 0;
  for (const s of spins)
    s.labels = s.added_phrases.map(() => {
      const l = r?.labels?.find((x) => x.i === k++)?.labels || [];
      return l;
    });
}

// 7. Pickup: the same text, link or hashtag reaching people on public platforms (samples).
function walk(o, out = []) {
  if (Array.isArray(o)) o.forEach((x) => walk(x, out));
  else if (o && typeof o === "object") {
    const url = o.url || o.permalink || o.link || o.videoUrl || o.webVideoUrl;
    const text = o.title || o.text || o.description || o.caption || o.selftext || o.body;
    if (url && text) out.push({ url: String(url).startsWith("/") ? "https://www.reddit.com" + url : url, text: String(text), author: o.author || o.authorName || o.username || o.author_name || o.authorMeta?.name || null, published_at: iso(o.created_utc ? o.created_utc * 1000 : o.createdAt || o.created_at || o.createTime * 1000 || o.date) });
    Object.values(o).forEach((v) => typeof v === "object" && walk(v, out));
  }
  return out;
}
const BOILER = /cookie|sign up|signing up|subscribe|newsletter|terms of service|privacy policy|all rights reserved|©|published:|updated?:|read more|advertis|click here|follow us|share this|download the app|log in|javascript/i;
const STOP = new Set("The A An In On Of For To And But After Before Over With From As At By Is Are Was Says Say Report Reports New Why How What Who".split(" "));
function entities(headline) {
  return [...new Set((headline.match(/\b[\p{Lu}][\p{L}\p{N}'-]{1,}/gu) || []).filter((w) => !STOP.has(w)).map((w) => w.replace(/'s$/, "")))].slice(0, 5);
}
const viewsOf = (o) => o?.stats?.play_count ?? o?.stats?.views ?? o?.play_count ?? o?.views ?? o?.view_count ?? o?.video_view_count ?? null;
async function pickup(story) {
  const headline = story.copyHeadline || story.title;
  const ents = entities(headline);
  const q = ents.length >= 2 ? ents.join(" ") : tokens(headline).slice(0, 8).join(" ");
  const keys = new Set(ents.map((e) => e.toLowerCase()));
  const copyUrls = story.groups.flat().filter((n) => n.kind === "copy").map((n) => n.url);
  const out = [];
  const seenUrl = new Set();
  const match = (p, platform, viaTag) => {
    if (!p.url || seenUrl.has(p.url)) return;
    const low = p.text.toLowerCase();
    const shared = [...keys].filter((k) => low.includes(k)).length;
    let type = null;
    if (copyUrls.some((u) => p.text.includes(u))) type = "same link";
    else if (headlineSim(p.text.slice(0, 300), headline) >= 0.4 || windowJaccard(headline, p.text, 3) >= 0.4) type = "same text";
    else if (viaTag && shared >= 2) type = "same hashtag and topic";
    else if (shared >= Math.min(3, keys.size) && keys.size >= 2) type = "same topic";
    if (!type) return;
    seenUrl.add(p.url);
    out.push({ platform, url: p.url, title: p.text.slice(0, 220), author: p.author, published_at: p.published_at, views: p.views ?? null, match_type: type, found_via: p.via });
  };
  const tags = [...new Set([ents.slice(0, 2).join(""), ents.slice(1, 3).join(""), ents[0]].filter((t) => t && t.length >= 4).map((t) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")))].slice(0, 2);
  const jobs = [
    async () => {
      const d = await call("context", "/web/scrape", { url: `https://www.reddit.com/search/?q=${encodeURIComponent(q)}&sort=new&t=week`, formats: { parse: true }, parseParams: { type: "prebuilt", parser: "reddit-search" } });
      walk(d.parsed?.data).forEach((p) => match({ ...p, via: "Context.dev reddit-search parser" }, "reddit"));
    },
    ...tags.map((t) => async () => {
      const d = await call("context", "/web/scrape", { url: `https://www.tiktok.com/tag/${encodeURIComponent(t)}`, formats: { parse: true }, parseParams: { type: "prebuilt", parser: "tiktok-feed" } });
      for (const v of d.parsed?.data?.videos || []) match({ url: v.url, text: [v.caption, ...(v.hashtags || []).map((h) => "#" + (h.name || h))].join(" "), author: v.author?.username ? "@" + v.author.username : null, published_at: iso(v.posted_at), views: viewsOf(v), via: `Context.dev tiktok-feed parser, #${t}` }, "tiktok", true);
    }),
    async () => {
      const d = await call("exa", "/search", { query: `${q} YouTube video`, numResults: 10, includeDomains: ["youtube.com"], startPublishedDate: new Date(Date.parse(story.articles[0].published_at || Date.now()) - 864e5).toISOString() }).catch(() => ({ results: [] }));
      (d.results || []).forEach((r) => match({ url: r.url, text: r.title || "", author: r.author || null, published_at: iso(r.publishedDate), via: "Exa search, youtube.com" }, "youtube"));
    },
    async () => {
      const d = await call("context", "/web/search", { query: `site:instagram.com ${q}`, numResults: 8 });
      const posts = (d.results || []).filter((r) => /instagram\.com\/(p|reel)\//.test(r.url)).slice(0, 3);
      for (const r of posts) {
        let info = { url: r.url, text: (r.title || "") + " " + (r.description || ""), author: null, published_at: null, via: "Context.dev web search, instagram.com" };
        try {
          const pd = await call("context", "/web/scrape", { url: r.url, formats: { parse: true }, parseParams: { type: "prebuilt", parser: "instagram-post" } });
          const x = pd.parsed?.data || {};
          info = { ...info, text: x.caption || x.text || info.text, author: x.owner?.username ? "@" + x.owner.username : x.username ? "@" + x.username : null, published_at: iso(x.taken_at || x.posted_at || x.timestamp), views: viewsOf(x), via: "Context.dev instagram-post parser" };
        } catch {}
        match(info, "instagram");
      }
    },
  ];
  await pool(jobs, 4, (f) => f());
  return out;
}

export async function buildCountry(cc, build) {
  const c = countryInfo(cc);
  if (!c) throw Error("Unknown country code");
  build.status = "running";
  build.started_at = new Date().toISOString();
  saveBuild(build);
  const computed_at = () => new Date().toISOString();
  try {
    const { stories, indexed } = await step(build, "Find top stories", async (s) => {
      const r = await collectStories(c);
      savePublishers();
      s.note = `${r.indexed} news articles from ${r.queries} searches; ${r.stories.length} public-affairs stories kept (${r.filtered} set aside as sport, entertainment or unrelated)`;
      return r;
    });
    await step(build, "Search the web for near-identical copies", async (s) => {
      const tl = c.langs.filter((l) => l !== "en").slice(0, 2);
      if (tl.length) {
        const tr = await llm(
          "gemini-3.5-flash-lite",
          `Translate each news headline into these languages: ${tl.join(", ")}. Keep names. Return JSON {"items":[{"i":int,"t":{"<lang>":string}}]}.`,
          { headlines: stories.map((st, i) => ({ i, h: st.title })) },
          3000,
        ).catch(() => null);
        for (const it of tr?.items || []) if (stories[it.i]) stories[it.i].translations = Object.values(it.t || {}).filter((x) => typeof x === "string" && x.length > 10);
      }
      const res = await pool(stories, 4, (st) => findCopies(st, c));
      let searches = 0,
        pages = 0;
      stories.forEach((st, i) => {
        st.pages = res[i]?.pages || [];
        searches += res[i]?.searches || 0;
        pages += st.pages.length;
      });
      s.note = `${searches} searches (quoted phrases and keywords), ${pages} candidate pages read`;
    });
    let graph;
    await step(build, "Confirm copies and build the site graph", async (s) => {
      // Exa often gives only a date. For pages that already sit in a near-identical group, read the page
    // itself for its published time (article:published_time, JSON-LD, <time>) before building timed links.
    for (const st of stories) st.groups = identicalGroups(st);
    const needTime = stories.flatMap((st) => st.groups.flat().filter((n) => n.kind === "copy" && !n.t && n.page?.via === "exa").map((n) => n.page)).slice(0, 120);
    await pool(needTime, 6, async (pg) => {
      const d = await call("context", "/web/scrape", { url: pg.url, formats: { markdown: true, html: true }, sharedParams: { mainContentOnly: false } }, { maxAgeMs: 30 * 86400e3 });
      const info = scrapeInfo(d, pg.url);
      Object.assign(pg, { published_at: info.published_at, time_source: info.published_at ? "page metadata" : null, origins: info.origins, ids: info.ids, template: info.template, lang: info.lang || pg.lang });
    });
    for (const st of stories) st.groups = identicalGroups(st);
      // Coordination is looked for among sites that are not established publishers in the news index;
      // publisher-to-publisher copying (syndication) is profiled separately and reported as organic.
      const a = cluster(stories, (x) => !all_publishers.has(x), 1),
        b = cluster(stories, (x) => all_publishers.has(x), 2);
      graph = { clusters: [...a.clusters, ...b.clusters], edges: a.edges + b.edges };
      s.note = `${stories.reduce((n, st) => n + st.groups.reduce((m, g) => m + g.length, 0), 0)} pages in near-identical groups; ${graph.edges} site pairs within ${T.edgeMinutes} min; ${graph.clusters.length} clusters`;
    });
    const pagesBySite = new Map();
    for (const st of stories) for (const n of st.groups.flat()) if (n.page) (pagesBySite.get(n.site) || pagesBySite.set(n.site, []).get(n.site)).push(n.page);
    const clusters = [];
    await step(build, "Who: domains, hosting, origins", async (s) => {
      for (const g of graph.clusters) {
        const id = "c" + hash(g.sites.join(",")).slice(0, 9);
        const w = await who({ ...g, id }, pagesBySite);
        const nodes = stories.flatMap((st) => st.groups.flat().filter((n) => g.sites.includes(n.site) && n.kind === "copy").map((n) => ({ ...n, story: st })));
        for (const st of stories) for (const n of st.groups.flat()) if (g.sites.includes(n.site)) n.cluster_id = id;
        const lags = nodes.map((n) => (n.t && n.story.articles[0].published_at ? minutes(n.story.articles[0].published_at, n.t) : null)).filter((x) => x !== null && x >= 0);
        const wireCredits = nodes.filter((n) => n.page?.wire);
        const medGap = median(g.gaps);
        const wireShare = nodes.length ? wireCredits.length / nodes.length : 0;
        let verdict, reasons = [];
        reasons.push(`${g.sites.length} sites published near-identical text (shingle Jaccard ≥ ${T.copyThreshold}) on ${g.stories.length} of the ${stories.length} stories checked, within ${T.edgeMinutes} minutes of each other`);
        if (medGap !== null) reasons.push(`Median gap between sites: ${Math.round(medGap)} min`);
        const pubShare = g.sites.filter((x) => all_publishers.has(x)).length / g.sites.length;
        // Copies whose near-identical group was first published by an established publisher outside the group.
        const origin = new Map();
        for (const st of stories)
          for (const grp of st.groups) {
            const first = grp.filter((n) => n.t).sort((a, b) => a.t.localeCompare(b.t))[0];
            if (first && all_publishers.has(first.site) && !g.sites.includes(first.site)) for (const n of grp) origin.set(n.url, first.site);
          }
        const republished = nodes.filter((n) => origin.has(n.url));
        const repShare = nodes.length ? republished.length / nodes.length : 0;
        if (repShare >= 0.6 && wireShare < 0.5 && pubShare < 0.5) {
          verdict = "Looks organic";
          const srcs = [...new Set(republished.map((n) => origin.get(n.url)))].slice(0, 3).join(", ");
          reasons.push(`${Math.round(repShare * 100)}% of the copies follow an original first published by an established outlet (${srcs}); automated republication or licensing explains the identical text`);
        } else if (pubShare >= 0.5 && wireShare < 0.5) {
          verdict = "Looks organic";
          reasons.push(`${Math.round(pubShare * 100)}% of these sites are established publishers in the news index; shared or licensed copy explains identical text`);
        } else if (wireShare >= 0.5) {
          verdict = "Looks organic";
          const agencies = [...new Set(wireCredits.map((n) => n.page.wire))].slice(0, 3).join(", ");
          reasons.push(`${Math.round(wireShare * 100)}% of the copies credit a news agency (${agencies}); licensed wire copy explains identical text`);
        } else if (oldShare(w) >= 0.6) {
          verdict = "Looks organic";
          reasons.push(`${Math.round(oldShare(w) * 100)}% of the dated domains are long-established outlets (15+ years old); a shared news agency feed or common ownership is the likely explanation`);
        } else if (g.sites.length >= T.strong.sites && g.stories.length >= T.strong.stories && medGap !== null && medGap <= T.strong.medianGapMin) verdict = "Looks coordinated: strong";
        else verdict = "Looks coordinated: moderate";
        if (w.domain_ages.registered_last_year) reasons.push(`${w.domain_ages.registered_last_year} of ${w.domain_ages.domains.length} domains were registered in the last 12 months`);
        for (const x of w.shared_infra.slice(0, 3)) reasons.push(`Shared ${x.type.replace("_", " ")} ${x.value} across ${x.sites.length} sites`);
        if (w.documented_by.length) reasons.push(`Matches a published list: ${w.documented_by.map((d) => d.network).join(", ")}`);
        if (verdict !== "Looks organic") reasons.push("Innocent explanations not excluded: shared ownership, syndication agreements or a common press release");
        clusters.push({
          id,
          label: null,
          sites: g.sites,
          site_count: g.sites.length,
          documented_by: w.documented_by,
          origins_top: w.origins_top,
          domain_ages: w.domain_ages,
          shared_infra: w.shared_infra,
          asn: w.asn,
          asn_reason: w.asn_reason,
          languages: w.languages,
          stories_copied: g.stories.length,
          story_ids: g.stories,
          median_copy_lag_min: lags.length ? Math.round(median(lags)) : null,
          median_copy_lag_reason: lags.length ? null : "No copy carried a publication time after the first mainstream report",
          median_site_gap_min: medGap === null ? null : Math.round(medGap),
          verdict,
          reasons,
          edges: g.edges,
          computed_at: computed_at(),
          _nodes: nodes,
        });
      }
      s.note = `${clusters.length} clusters profiled`;
    });
    let narr = [];
    await step(build, "What they want: narratives", async (s) => {
      for (const cl of clusters) {
        if (cl.verdict === "Looks organic") continue;
        const titles = cl._nodes.map((n) => ({ headline: n.headline || n.story.title, url: n.url, site: n.site, t: n.t }));
        const ns = await narratives(cl, titles, c.name);
        narr.push(...ns);
        const lab = ns.find((n) => n.label);
        cl.label = lab ? lab.label : null;
        cl.label_reason = lab ? null : "No narrative label was accepted by both checking models";
      }
      const history = get("copies", c.code) || [];
      const nowCopies = clusters.flatMap((cl) => cl._nodes.map((n) => ({ url: n.url, cluster_id: cl.id, t: n.t })));
      const merged = [...new Map([...history, ...nowCopies].map((x) => [x.url, x])).values()];
      put("copies", c.code, merged);
      for (const n of narr) {
        const days = [];
        for (let d = 29; d >= 0; d--) {
          const day = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
          days.push({ date: day, articles: merged.filter((x) => n.urls.includes(x.url) && x.t?.slice(0, 10) === day).length });
        }
        n.trend_30d = days;
        n.trend_note = "Counts copies observed by this engine; days before the first build are unobserved, not zero";
        n.computed_at = computed_at();
      }
      s.note = `${narr.length} narratives proposed, ${narr.filter((n) => n.label).length} accepted by both checking models`;
    });
    const spins = new Map();
    await step(build, "Spin: what copies add", async (s) => {
      const clustered = stories.filter((st) => st.groups.flat().some((n) => n.cluster_id && n.kind === "copy")).slice(0, 8);
      const res = await pool(clustered, 4, spinFor);
      const flat = res.flat().filter((x) => x && !x.error);
      await labelSpin(flat);
      clustered.forEach((st, i) => spins.set(st.id, Array.isArray(res[i]) ? res[i] : []));
      s.note = `${flat.length} copies compared with the closest mainstream article`;
    });
    const organic = [];
    await step(build, "Organic control", async (s) => {
      for (const st of stories) {
        const outlets = new Set(st.articles.map((a) => a.domain));
        const inGroups = new Set(st.groups.flat().map((n) => n.url));
        const independent = st.articles.filter((a) => !inGroups.has(a.url));
        const times = st.articles.map((a) => Date.parse(a.published_at)).filter(Number.isFinite);
        const spreadH = times.length ? (Math.max(...times) - Math.min(...times)) / 36e5 : 0;
        if (outlets.size >= T.organicMinOutlets && independent.length >= 0.6 * st.articles.length && !st.groups.flat().some((n) => n.cluster_id))
          organic.push({
            story_id: st.id,
            title: st.title,
            outlets: outlets.size,
            verdict: "Looks organic",
            reasons: [`${outlets.size} outlets covered it`, `${independent.length} of ${st.articles.length} articles use independent wording (no near-identical partner)`, `Coverage spread over ${spreadH.toFixed(1)} hours`],
            examples: st.articles.slice(0, 4).map((a) => ({ outlet: a.outlet, url: a.url, published_at: a.published_at, headline: a.headline })),
            computed_at: computed_at(),
          });
      }
      s.note = `${organic.length} stories look organic`;
    });
    const pick = [];
    await step(build, "Pickup on public platforms", async (s) => {
      const coordinated = new Set(clusters.filter((x) => x.verdict.startsWith("Looks coordinated")).flatMap((x) => x.story_ids));
      const top = [...stories.filter((st) => coordinated.has(st.id)), ...stories.filter((st) => !coordinated.has(st.id) && st.groups.flat().length >= 3)].slice(0, 5);
      for (const st of top) st.copyHeadline = st.groups.flat().find((n) => n.kind === "copy" && n.cluster_id)?.headline;
      const res = await pool(top, 3, pickup);
      res.forEach((r, i) => Array.isArray(r) && pick.push(...r.map((p) => ({ ...p, story_id: top[i].id, story_title: top[i].title, sample: true, computed_at: computed_at() }))));
      const by = {};
      for (const p of pick) by[p.platform] = (by[p.platform] || 0) + 1;
      s.note = `${pick.length} matching public posts across ${top.length} stories (${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}); samples from public search pages, not totals`;
    });
    // Second similarity check: embedding cosine between each copy and the story's first mainstream text.
    const cos = new Map();
    await step(build, "Second check: embedding similarity", async (s) => {
      const withCopies = stories.filter((st) => st.groups.flat().some((n) => n.kind === "copy"));
      await pool(withCopies, 4, async (st) => {
        const copies = st.groups.flat().filter((n) => n.kind === "copy").slice(0, 30);
        const ref = st.articles[0].headline + ". " + st.articles[0].description;
        const v = await embed([ref, ...copies.map((n) => (n.headline || "") + ". " + n.text.slice(0, 1200))]);
        copies.forEach((n, i) => v[i + 1] && cos.set(n.url, Math.round(cosine(v[0], v[i + 1]) * 100) / 100));
      });
      s.note = `${cos.size} copies embedded with text-embedding-3-small; median cosine ${[...cos.values()].sort()[cos.size >> 1] ?? "n/a"}`;
    });
    const docsNow = await documentedLists();
    // Persist stories and the country record.
    for (const st of stories) {
      const nodes = st.groups.flat();
      const copies = nodes.filter((n) => n.kind === "copy").concat(nodes.filter((n) => n.kind === "mainstream" && n.cluster_id));
      const first_mainstream_at = st.articles.map((a) => a.published_at).filter(Boolean).sort()[0] || null;
      const first_copy_at = copies.map((n) => n.t).filter(Boolean).sort()[0] || null;
      const cl = clusters.find((x) => x.story_ids.includes(st.id));
      const org = organic.find((o) => o.story_id === st.id);
      const prev = get("story", st.id);
      const reached = new Set([...(prev?.countries_reached || []), c.code]);
      put("story", st.id, {
        id: st.id,
        title: st.title,
        watched: !!st.watched,
        country: c.code,
        mainstream: st.articles.map(({ outlet, url, published_at, headline, lang }) => ({ outlet, url, published_at, headline, lang })),
        copies: copies.map((n) => ({ site: n.site, cluster_id: n.cluster_id || null, url: n.url, published_at: n.t || null, published_reason: n.t ? null : "The page carries no machine-readable publication time", headline: n.headline, lang: n.page?.lang || null, country: c.code, similarity: Math.round(n.similarity * 100) / 100, jaccard: Math.round(n.similarity * 100) / 100, cosine: cos.get(n.url) ?? null, time_source: n.page?.time_source || (n.t ? (n.page?.via === "exa" ? "Exa index" : n.kind === "mainstream" ? "news index" : "page metadata") : null), documented_network: docsNow.lists.find((l) => l.domains.has(n.site) || l.registrables.has(registrable(n.site)))?.name || null, found_by: n.page?.known_source ? "Known-source check (Exa)" : n.page?.via === "exa" ? "Exa" : n.kind === "mainstream" ? "Context.dev news search" : "Context.dev search + scrape", credits_agency: n.page?.wire || null })),
        first_mainstream_at,
        first_copy_at,
        lag_minutes: first_mainstream_at && first_copy_at ? Math.round(minutes(first_mainstream_at, first_copy_at)) : null,
        countries_reached: [...reached].sort(),
        spin: spins.get(st.id) || [],
        verdict: cl ? cl.verdict : org ? "Looks organic" : copies.length ? "Not enough data" : st.articles.length >= T.organicMinOutlets ? "Looks organic" : "Not enough data",
        reasons: cl ? cl.reasons : org ? org.reasons : copies.length ? [`${copies.length} near-identical copies found, but not on enough stories by the same sites to form a cluster`] : [`${st.articles.length} articles from ${new Set(st.articles.map((a) => a.domain)).size} outlets; no near-identical copies found by phrase search`],
        pickup: pick.filter((p) => p.story_id === st.id),
        method_note: `Phrase search on ${st.pages.length} candidate pages; copies confirmed at shingle Jaccard ≥ ${T.copyThreshold}; sites linked when they published within ${T.edgeMinutes} min.`,
        computed_at: computed_at(),
      });
    }
    const result = {
      code: c.code,
      name: c.name,
      stories_checked: stories.length,
      articles_indexed: indexed,
      story_ids: stories.map((s) => s.id),
      clusters: clusters.map(({ _nodes, ...x }) => x),
      narratives: narr.map(({ urls, ...n }) => n),
      organic_examples: organic.slice(0, 6),
      pickup: pick,
      coverage_note: stories.reduce((n, st) => n + st.pages.length, 0) < 5 ? "Not enough data: phrase search returned very few candidate pages for this country" : null,
      build_id: build.id,
      computed_at: computed_at(),
    };
    // Site graph (all near-identical, timed pairs) for the graph view.
    const full = new Map();
    for (const st of stories)
      for (const g of st.groups) {
        const timed = g.filter((n) => n.t);
        for (let i = 0; i < timed.length; i++)
          for (let j = i + 1; j < timed.length; j++) {
            const [a, b] = [timed[i].site, timed[j].site].sort();
            if (a === b || Math.abs(minutes(timed[i].t, timed[j].t)) > T.edgeMinutes) continue;
            const k = a + "|" + b;
            if (!full.has(k)) full.set(k, new Set());
            full.get(k).add(st.id);
          }
      }
    const nodeStories = new Map(), nodeLang = new Map();
    for (const st of stories) for (const n of st.groups.flat()) {
      (nodeStories.get(n.site) || nodeStories.set(n.site, new Set()).get(n.site)).add(st.id);
      if (n.page?.lang) nodeLang.set(n.site, n.page.lang);
    }
    const docs = await documentedLists();
    const siteCluster = new Map(clusters.flatMap((cl) => cl.sites.map((x) => [x, cl.id])));
    put("graph", c.code, {
      nodes: [...nodeStories].map(([id, ss]) => ({ id, cluster_id: siteCluster.get(id) || null, stories: ss.size, lang: nodeLang.get(id) || null, documented: docs.lists.some((l) => l.domains.has(id) || l.registrables.has(registrable(id))), publisher: all_publishers.has(id) })),
      edges: [...full].map(([k, ss]) => ({ a: k.split("|")[0], b: k.split("|")[1], w: ss.size })),
      method: `Edge weight = stories two sites published near-identical text for within ${T.edgeMinutes} minutes. Clusters = Louvain communities within connected components among non-publisher sites with at least ${T.clusterMinSites} sites and ${T.clusterMinStories} shared stories.`,
      computed_at: computed_at(),
    });
    const before = get("country", c.code);
    const oldStories = new Set(before?.story_ids || []);
    const oldCopies = new Set((before?.story_ids || []).flatMap((id) => (get("story", id)?.copies || []).map((x) => x.url)));
    for (const st of stories) if (!oldStories.has(st.id)) addEvent("new_story", c.code, { country: c.code, story_id: st.id, headline: st.title, url: st.articles[0].url, site: st.articles[0].domain, source: st.articles.some((a) => a.via === "exa") ? "Exa" : "Context.dev news search", at: st.articles[0].published_at || computed_at() });
    for (const cl of clusters)
      for (const n of cl._nodes)
        if (!oldCopies.has(n.url))
          addEvent("copy_detected", c.code, { country: c.code, site: n.site, url: n.url, headline: n.headline, story_id: n.story.id, cluster_id: cl.id, lag_min: n.t && n.story.articles[0].published_at ? Math.round(minutes(n.story.articles[0].published_at, n.t)) : null, source: n.page?.via === "exa" ? "Exa" : "Context.dev search", at: n.t || computed_at() });
    put("country", c.code, result);
    try {
      const { briefCountry } = await import("./briefing.mjs");
      await step(build, "Briefing", async (s) => {
        const b = await briefCountry(c.code);
        s.note = b ? `${b.pushes.length} pushes briefed, ${b.pushes.reduce((n, p) => n + p.claims.length, 0)} claims checked` : "No briefing";
      });
    } catch (e) {
      console.error("briefing", c.code, e.message);
    }
    addEvent("build_done", c.code, { country: c.code, source: "scheduler", headline: `${c.name}: ${stories.length} stories checked, ${clusters.filter((x) => x.verdict.startsWith("Looks coordinated")).length} coordinated groups`, at: computed_at() });
    build.status = "done";
    return result;
  } catch (e) {
    build.status = e instanceof CapReached ? "paused" : "failed";
    build.error = e instanceof CapReached ? "Spending cap reached for tonight. Builds resume tomorrow." : e.message;
    throw e;
  } finally {
    build.finished_at = new Date().toISOString();
    saveBuild(build);
    setContext({ build: null, step: null });
  }
}

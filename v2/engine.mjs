// Engine v2: starts from no list of actors. Sites reveal themselves by publishing
// near-identical text about a country's top stories within minutes of each other.
import dns from "node:dns/promises";
import { call, llm, pool, put, get, all, hash, setContext, db, CapReached, addEvent } from "./db.mjs";
import { country as countryInfo } from "./countries.mjs";
import { tokens, shingles, jaccard, containment, windowJaccard, headlineSim, cleanTitle, mainText, sentences, site, registrable, median } from "./text.mjs";

export const T = {
  days: 7,
  maxStories: 30,
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
const WIRE = /\((AP|Reuters|AFP|dpa|STT|TT|NTB|Ritzau|ANSA|EFE|PAP|ČTK|CTK|MTI|Kyodo|Yonhap|PTI|ANI|IANS|Bernama|Xinhua|TASS|Interfax|Ukrinform|Agerpres|LETA|BNS|ERR|AAP|CP|PA|UNI|IANS|ANI)\)|\bAssociated Press\b|\bReuters\b|Agence France-Presse|Canadian Press|PA Media|Press Association|Press Trust of India|Asian News International|Bloomberg News|\bAFP\b|\b(STT|NTB|Ritzau|dpa|ANSA|PAP)\b\s*[-–—:]/;
const normUrl = (u) => {
  try {
    const x = new URL(u);
    return x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/$/, "");
  } catch {
    return u;
  }
};
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
    const exaQ = [`${c.name} news this week`, `${c.name} politics government election`, `${c.name} technology business companies`, `${c.name} security defence Russia China`];
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
        const art = { outlet: site(x.url), domain: site(x.url), url: x.url, published_at: iso(x.publishedDate), headline: cleanTitle(x.title), description: text.slice(0, 600), lang: null, direct: false, via: "exa" };
        const hit = heads.find(([, hs]) => hs.some((h) => headlineSim(h, art.headline) >= 0.45));
        const sid = hit ? hit[0] : "x" + hash(x.url);
        if (!byStory.has(sid)) {
          byStory.set(sid, []);
          heads.push([sid, [art.headline]]);
        } else if (hit) hit[1].push(art.headline);
        byStory.get(sid).push(art);
      }
  }
  const stories = [...byStory.entries()]
    .map(([sid, articles]) => {
      articles.sort((a, b) => String(a.published_at).localeCompare(String(b.published_at)));
      return { id: sid.slice(0, 16), articles, outlets: new Set(articles.map((a) => a.domain)).size, title: articles[0].headline };
    })
    .filter((s) => !SPORT.test(s.articles.map((a) => a.headline).join(" ")));
  stories.sort((a, b) => b.outlets - a.outlets || String(b.articles.at(-1).published_at).localeCompare(String(a.articles.at(-1).published_at)));
  const pool80 = stories.slice(0, 110);
  const drop = await llm(
    "gemini-3.5-flash-lite",
    `From these news stories found for ${c.name}, list the ones to SET ASIDE: sports results and sports business, entertainment, celebrity, lifestyle, recipes, local crime, and stories with no connection to ${c.name}. Keep politics, government, elections, security, defence, foreign relations, war, economy, companies, technology, health and society. Return JSON {"drop":[int]}.`,
    { stories: pool80.map((s, i) => ({ i, title: s.title })) },
    800,
  ).catch(() => null);
  const dropped = new Set(Array.isArray(drop?.drop) ? drop.drop : []);
  const kept = pool80.filter((_, i) => !dropped.has(i));
  for (const s of indexedPublishers) all_publishers.add(s);
  return { stories: kept.slice(0, T.maxStories), indexed: seen.size, queries: reqs.length, filtered: pool80.length - kept.length };
}

function scrapeInfo(d, url) {
  const md = d.markdown?.data || "",
    html = d.html?.data || "",
    meta = d.metadata || {};
  const text = mainText(md);
  let published =
    iso(meta.publishedTime) ||
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
  const queries = [...frags.map((f) => ({ q: quote(f), quoted: true })), ...frags.slice(0, 2).map((f) => ({ q: tokens(f).slice(0, 12).join(" "), quoted: false }))];
  const results = await pool(queries, 3, (x) => call("context", "/web/search", { query: x.q + " -site:x.com -site:twitter.com", numResults: 20 }).then((r) => ({ ...r, quoted: x.quoted })));
  const known = new Set(story.articles.map((a) => normUrl(a.url)));
  const exaPages = [];
  let exaSearches = 0;
  if (process.env.EXA_API_KEY) {
    const sents = [...new Set(story.articles.flatMap((a) => sentences(a.description)).filter((x) => x.length >= 60))].sort((a, b) => b.length - a.length).slice(0, 2);
    const head = story.articles.find((a) => c.langs.includes(a.lang))?.headline;
    const qs = [...sents, ...(head ? [head] : [])].slice(0, 3);
    const t0 = Date.parse(story.articles[0].published_at || Date.now());
    const res = await pool(qs, 3, (q) => {
      const w = tokens(q).filter((x) => x.length > 3);
      const span = w.slice(Math.max(0, (w.length >> 1) - 2), (w.length >> 1) + 3).join(" ");
      return call("exa", "/search", { query: q, type: "auto", numResults: 20, startPublishedDate: new Date(t0 - 864e5).toISOString(), endPublishedDate: new Date(t0 + 3 * 864e5).toISOString(), contents: { text: { maxCharacters: 2500 } } }).catch(() => ({ results: [] }));
    });
    exaSearches = qs.length;
    for (const r of res)
      for (const x of r?.results || []) {
        const sx = site(x.url);
        if (!sx || SKIP_HOSTS.test(sx) || known.has(normUrl(x.url)) || exaPages.some((p) => normUrl(p.url) === normUrl(x.url))) continue;
        exaPages.push({ url: x.url, site: sx, title: cleanTitle(x.title || ""), text: x.text || "", published_at: iso(x.publishedDate), lang: null, origins: [], ids: [], template: null, wire: (WIRE.exec((x.text || "").slice(0, 2500)) || [])[0]?.replace(/[()]/g, "").trim() || null, via: "exa" });
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
  const picked = [...cands.values()].filter((x) => !exaSet.has(normUrl(x.url))).sort((a, b) => b.sim - a.sim).slice(0, exaPages.length ? 5 : T.scrapesPerStory);
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
function cluster(stories, keepSite = () => true, minWeight = 1) {
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
  const out = [];
  for (const sites of comps.values()) {
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
async function rdap(domain) {
  const cached = get("rdap", domain);
  if (cached) return cached;
  let out = { domain, registered_at: null, registrar: null, reason: null };
  try {
    const r = await fetch("https://rdap.org/domain/" + domain, { signal: AbortSignal.timeout(15000), redirect: "follow" });
    if (r.ok) {
      const d = await r.json();
      out.registered_at = iso(d.events?.find((e) => e.eventAction === "registration")?.eventDate);
      out.registrar = d.entities?.find((e) => e.roles?.includes("registrar"))?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] || null;
      if (!out.registered_at) out.reason = "The registry does not publish a creation date";
    } else out.reason = r.status === 404 ? "The registry has no public RDAP record for this domain" : "RDAP lookup failed";
  } catch {
    out.reason = "RDAP lookup timed out";
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
    asn: null,
    asn_reason: "ASN lookup is not run; shared IP addresses are reported instead",
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
  return copies.slice(0, 3).map((c) => ({
    copy_url: c.url,
    compared_with: ms.url,
    added_phrases: sentences(c.text.slice(0, 3000))
      .filter((s) => containment(shingles(tokens(s), 3), M) < 0.15)
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
async function pickup(story) {
  const headline = story.copyHeadline || story.title;
  const q = tokens(headline).slice(0, 8).join(" ");
  const copyUrls = story.groups.flat().filter((n) => n.kind === "copy").map((n) => n.url);
  const out = [];
  const match = (p, platform) => {
    let type = null;
    if (copyUrls.some((u) => p.text.includes(u) || p.url === u)) type = "same link";
    else if (headlineSim(p.text.slice(0, 300), headline) >= 0.5 || windowJaccard(headline, p.text, 3) >= 0.5) type = "same text";
    if (type) out.push({ platform, url: p.url, author: p.author, published_at: p.published_at, match_type: type, text: p.text.slice(0, 200) });
  };
  const jobs = [
    async () => {
      const d = await call("context", "/web/scrape", { url: `https://www.reddit.com/search/?q=${encodeURIComponent(q)}&sort=new&t=month`, formats: { parse: true }, parseParams: { type: "prebuilt", parser: "reddit-search" } });
      walk(d.parsed?.data).forEach((p) => match(p, "reddit"));
    },
    async () => {
      const d = await call("context", "/web/search", { query: `site:youtube.com ${q}`, numResults: 10 });
      (d.results || []).map((r) => ({ url: r.url, text: (r.title || "") + " " + (r.description || ""), author: null, published_at: null })).forEach((p) => match(p, "youtube"));
    },
    async () => {
      const d = await call("context", "/web/search", { query: `site:tiktok.com ${q}`, numResults: 10 });
      (d.results || []).map((r) => ({ url: r.url, text: (r.title || "") + " " + (r.description || ""), author: null, published_at: null })).forEach((p) => match(p, "tiktok"));
    },
  ];
  await pool(jobs, 3, (f) => f());
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
        if (pubShare >= 0.5 && wireShare < 0.5) {
          verdict = "Looks organic";
          reasons.push(`${Math.round(pubShare * 100)}% of these sites are established publishers in the news index; shared or licensed copy explains identical text`);
        } else if (wireShare >= 0.5) {
          verdict = "Looks organic";
          const agencies = [...new Set(wireCredits.map((n) => n.page.wire))].slice(0, 3).join(", ");
          reasons.push(`${Math.round(wireShare * 100)}% of the copies credit a news agency (${agencies}); licensed wire copy explains identical text`);
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
      const top = stories.filter((st) => st.groups.flat().some((n) => n.cluster_id && n.kind === "copy")).slice(0, 3);
      for (const st of top) st.copyHeadline = st.groups.flat().find((n) => n.kind === "copy" && n.cluster_id)?.headline;
      const res = await pool(top, 3, pickup);
      res.forEach((r, i) => Array.isArray(r) && pick.push(...r.map((p) => ({ ...p, story_id: top[i].id, sample: true, computed_at: computed_at() }))));
      s.note = `${pick.length} matching public posts found across ${top.length} stories (samples, not totals)`;
    });
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
        country: c.code,
        mainstream: st.articles.map(({ outlet, url, published_at, headline, lang }) => ({ outlet, url, published_at, headline, lang })),
        copies: copies.map((n) => ({ site: n.site, cluster_id: n.cluster_id || null, url: n.url, published_at: n.t || null, published_reason: n.t ? null : "The page carries no machine-readable publication time", headline: n.headline, lang: n.page?.lang || null, country: c.code, similarity: Math.round(n.similarity * 100) / 100, credits_agency: n.page?.wire || null })),
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
      method: `Edge weight = stories two sites published near-identical text for within ${T.edgeMinutes} minutes. Clusters = connected components among non-publisher sites with at least ${T.clusterMinSites} sites and ${T.clusterMinStories} shared stories.`,
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

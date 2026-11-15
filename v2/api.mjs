// Engine v2 HTTP API. Returns true when it handled the request.
import crypto from "node:crypto";
import { db, get, all, put, spendSummary, CAPS, spent } from "./db.mjs";
import { country as countryInfo, PRECOMPUTED } from "./countries.mjs";
import { T, saveBuild, loadBuild } from "./engine.mjs";

const send = (res, status, d) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(d));
  return true;
};
const now = () => new Date().toISOString();
const days = (iso) => (iso ? Math.round((Date.now() - Date.parse(iso)) / 864e5) : null);

function latestBuild(cc) {
  return db.prepare("SELECT id,status,requested_at,finished_at,error FROM builds WHERE cc=? ORDER BY requested_at DESC LIMIT 1").get(cc);
}
function statusOf(cc) {
  const r = get("country", cc),
    b = latestBuild(cc);
  if (b && (b.status === "queued" || b.status === "running")) return { status: r ? "refreshing" : "building", build_id: b.id };
  return { status: r ? "built" : "not_built", build_id: b?.id || null };
}
import { registrable } from "./text.mjs";
const GENERIC_CC = new Set(["co", "io", "tv", "me", "ai", "ly", "fm", "cc", "ws", "to", "eu", "gg", "is", "la", "nu", "ac", "app"]);
export function reach(st) {
  const set = new Set(st.countries_reached || []);
  for (const c of st.copies || []) {
    const t = String(c.site || "").split(".").at(-1);
    if (t.length === 2 && !GENERIC_CC.has(t)) set.add(t.toUpperCase() === "UK" ? "GB" : t.toUpperCase());
  }
  return [...set].sort();
}
export function clusterName(c) {
  const doc = c.documented_by?.[0]?.network;
  const reg = new Map();
  for (const x of c.sites) reg.set(registrable(x), (reg.get(registrable(x)) || 0) + 1);
  const [top, n] = [...reg].sort((a, b) => b[1] - a[1])[0] || [c.sites[0], 1];
  if (doc) return `${doc}, ${c.site_count} sites`;
  if (n >= 3) return `${top} network, ${c.site_count} sites`;
  return `${c.sites[0]} and ${c.site_count - 1} other site${c.site_count === 2 ? "" : "s"}`;
}
function clusterOut(c) {
  const ages = c.domain_ages?.domains?.filter((d) => d.age_days !== null).map((d) => d.age_days) || [];
  return {
    ...c,
    label: clusterName(c),
    narrative: c.label || null,
    documented_by: (c.documented_by || []).flatMap((d) => d.sources.map((s) => ({ name: `${d.network}: ${s.name}`, url: s.url, network: d.network, matched_sites: d.matched_sites }))),
    origins_top: (c.origins_top || []).map((o) => ({ name: o.origin, count: o.citations, url: o.url, type: o.type })),
    domain_ages: ages.length
      ? { median_days: c.domain_ages.median_age_days, min_days: Math.min(...ages), registered_last_year: c.domain_ages.registered_last_year, domains: c.domain_ages.domains }
      : { reason: "No registry published a creation date for these domains", domains: c.domain_ages?.domains || [] },
    shared_infra: (c.shared_infra || []).map((x) => `${x.type.replace("_", " ")} ${x.value} (${x.sites.length} sites)`),
    shared_infra_detail: c.shared_infra || [],
  };
}
function countryOut(cc) {
  const info = countryInfo(cc);
  const r = get("country", cc);
  const st = statusOf(cc);
  if (!r) return { code: cc, name: info?.name, status: st.status, build_id: st.build_id, built_at: null, computed_at: now() };
  const stories = (r.story_ids || []).map((id) => get("story", id)).filter(Boolean);
  return {
    ...r,
    status: st.status,
    build_id: st.status === "built" ? r.build_id : st.build_id,
    built_at: r.computed_at,
    copies_found: stories.reduce((n, s) => n + s.copies.length, 0),
    clusters: [...r.clusters.filter((c) => c.verdict.startsWith("Looks coordinated")), ...r.clusters.filter((c) => !c.verdict.startsWith("Looks coordinated")).slice(0, 2)].map(clusterOut),
    clusters_total: r.clusters.length,
    narratives: r.narratives.map((n) => ({ ...n, trend_30d: (n.trend_30d || []).map((d) => d.articles), trend_dates: (n.trend_30d || []).map((d) => d.date) })),
    pickup: r.pickup.map((p) => ({ ...p, title: p.title || p.text, views_reason: p.views == null ? "The platform page did not show a view count" : null })),
  };
}
function summary(cc) {
  const r = get("country", cc),
    st = statusOf(cc),
    info = countryInfo(cc);
  const coord = (r?.clusters || []).filter((c) => c.verdict.startsWith("Looks coordinated")).sort((a, b) => b.site_count - a.site_count);
  const top = coord[0];
  return {
    code: cc,
    name: info?.name || cc,
    status: st.status,
    built_at: r?.computed_at || null,
    stories_checked: r?.stories_checked ?? null,
    clusters: r ? coord.length : null,
    top_actor: top ? clusterName(top) : null,
    top_narrative: r?.narratives?.find((n) => n.label)?.label || null,
    precomputed: PRECOMPUTED.includes(cc),
    computed_at: now(),
  };
}

const visitors = new Map();
export function requestBuild(cc, source, ip) {
  const info = countryInfo(cc);
  if (!info) return { status: 404, body: { error: "That is not a country code we recognise." } };
  if (spent("context") >= CAPS.context - 300 || spent("router") >= CAPS.router - 5 || spent("exa") >= CAPS.exa - 1)
    return { status: 429, body: { error: "Tonight's research budget is used up. Builds resume tomorrow." } };
  const b = latestBuild(info.code);
  if (b && (b.status === "queued" || b.status === "running")) return { status: 200, body: { id: b.id, status: b.status } };
  if (ip) {
    const last = visitors.get(ip) || [];
    const recent = last.filter((t) => Date.now() - t < 3600e3);
    if (recent.length >= 3) return { status: 429, body: { error: "You can start three country builds an hour. Try again later." } };
    visitors.set(ip, [...recent, Date.now()]);
  }
  const build = { id: "b" + crypto.randomUUID().replace(/-/g, "").slice(0, 12), cc: info.code, status: "queued", requested_at: now(), started_at: null, finished_at: null, source, steps: [], error: null };
  saveBuild(build);
  return { status: 202, body: { id: build.id, status: "queued" } };
}

export async function handleV2(req, res, url) {
  const p = url.pathname;
  if (req.method === "OPTIONS" && p.startsWith("/api/")) return send(res, 204, {});
  if (p === "/api/countries" && req.method === "GET") {
    const built = all("country").map((c) => c.code);
    const codes = [...new Set([...PRECOMPUTED, ...built])];
    return send(res, 200, codes.map(summary));
  }
  let m = p.match(/^\/api\/countries\/([A-Za-z]{2})$/);
  if (m && req.method === "GET") {
    const cc = m[1].toUpperCase();
    if (!countryInfo(cc)) return send(res, 404, { error: "That is not a country code we recognise." });
    return send(res, 200, countryOut(cc));
  }
  m = p.match(/^\/api\/countries\/([A-Za-z]{2})\/build$/);
  if (m && req.method === "POST") {
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    const r = requestBuild(m[1].toUpperCase(), "visitor", ip);
    return send(res, r.status, r.body);
  }
  m = p.match(/^\/api\/builds\/([a-z0-9]{6,20})$/);
  if (m && req.method === "GET") {
    const b = loadBuild(m[1]);
    if (!b) return send(res, 404, { error: "No such build." });
    const ahead = b.status === "queued" ? db.prepare("SELECT count(*) n FROM builds WHERE status IN ('queued','running') AND requested_at<?").get(b.requested_at).n : 0;
    return send(res, 200, {
      id: b.id,
      country: b.cc,
      status: b.status === "paused" ? "failed" : b.status,
      message: b.status === "queued" ? (ahead ? `Waiting for ${ahead} build${ahead > 1 ? "s" : ""} ahead` : "Starting") : null,
      error: b.error,
      requested_at: b.requested_at,
      started_at: b.started_at,
      finished_at: b.finished_at,
      steps: b.steps.map((s) => ({ name: s.name, label: s.name, status: s.status, ms: s.ms, calls: { context_dev: s.calls_context ?? s.calls, exa: s.calls_exa ?? 0 }, calls_total: s.calls, credits: s.credits, detail: s.note, started_at: s.started_at })),
      computed_at: now(),
    });
  }
  if (p === "/api/stories" && req.method === "GET") {
    const cc = (url.searchParams.get("country") || "").toUpperCase();
    const r = get("country", cc);
    if (!r) return send(res, 200, []);
    return send(
      res,
      200,
      r.story_ids.map((id) => get("story", id)).filter(Boolean).map((s) => ({
        id: s.id,
        title: s.title,
        outlet: s.mainstream[0]?.outlet || null,
        published_at: s.first_mainstream_at,
        copies: s.copies.length,
        countries_reached: reach(s).length,
        countries_reached_list: reach(s),
        verdict: s.verdict,
        cluster_id: s.copies.find((c) => c.cluster_id)?.cluster_id || null,
        computed_at: s.computed_at,
      })),
    );
  }
  m = p.match(/^\/api\/stories\/([A-Za-z0-9_-]{4,80})$/);
  if (m && req.method === "GET") {
    const s = get("story", m[1]);
    if (!s) return send(res, 404, { error: "That story could not be found." });
    return send(res, 200, { ...s, countries_reached: reach(s).length, countries_reached_list: reach(s), countries_note: "Countries are the engine's own country reads plus the national domain (.fi, .se, …) of copying sites; .com sites are not assigned a country", back_country: s.country });
  }
  m = p.match(/^\/api\/countries\/([A-Za-z]{2})\/graph$/);
  if (m && req.method === "GET") {
    const g = get("graph", m[1].toUpperCase());
    return g ? send(res, 200, g) : send(res, 404, { error: "This country has not been read yet." });
  }
  if (p === "/api/live" && req.method === "GET") {
    const limit = Math.min(100, Number(url.searchParams.get("limit")) || 20);
    const cc = (url.searchParams.get("country") || "").toUpperCase();
    const rows = cc
      ? db.prepare("SELECT * FROM events WHERE country=? ORDER BY at DESC LIMIT ?").all(cc, limit)
      : db.prepare("SELECT * FROM events ORDER BY at DESC LIMIT ?").all(limit);
    return send(res, 200, rows.map((r) => ({ id: r.id, type: r.type, country: r.country, ...JSON.parse(r.data), at: r.at })));
  }
  if (p === "/api/stats" && req.method === "GET") {
    const cs = all("country");
    const stories = all("story");
    const pages = db.prepare("SELECT count(*) n FROM calls WHERE status=200 AND (endpoint='/web/scrape' OR provider='exa')").get().n;
    const exaPages = db.prepare("SELECT coalesce(sum(json_array_length(json_extract(response,'$.results'))),0) n FROM calls WHERE provider='exa' AND status=200").get().n;
    const copies = stories.reduce((n, s) => n + s.copies.length, 0);
    const sites = new Set(stories.flatMap((s) => s.copies.map((c) => c.site)));
    const langs = new Set(stories.flatMap((s) => [...s.copies.map((c) => c.lang), ...s.mainstream.map((m) => m.lang)]).filter(Boolean));
    const sp = Object.fromEntries(spendSummary().map((r) => [r.provider, r]));
    const last = db.prepare("SELECT max(at) a FROM events").get().a;
    return send(res, 200, {
      computed_at: now(),
      stories_read: stories.length,
      pages_fetched: db.prepare("SELECT count(*) n FROM calls WHERE status=200 AND endpoint='/web/scrape'").get().n + exaPages,
      copies_confirmed: copies,
      sites_seen: sites.size,
      groups: cs.reduce((n, c) => n + c.clusters.length, 0),
      groups_coordinated: cs.reduce((n, c) => n + c.clusters.filter((x) => x.verdict.startsWith("Looks coordinated")).length, 0),
      monitors_live: 0,
      monitors_note: "Context.dev monitors for engine v2 are not set up yet; countries refresh every 6 hours",
      hook_events_24h: 0,
      languages: langs.size,
      countries_ready: cs.length,
      last_event_at: last,
      spend: { exa_usd: Math.round((sp.exa?.charged_or_reserved || 0) * 100) / 100, exa_cap_usd: CAPS.exa, context_dev_credits: Math.round(sp.context?.charged_or_reserved || 0), context_dev_cap: CAPS.context, router_calls: sp.router?.calls || 0, router_credits: Math.round((sp.router?.charged_or_reserved || 0) * 100) / 100, router_cap: CAPS.router },
    });
  }
  if (p === "/api/method" && req.method === "GET") {
    const builds = db.prepare("SELECT status,count(*) n FROM builds GROUP BY status").all();
    const countries = all("country");
    const spend = Object.fromEntries(spendSummary().map((r) => [{ context: "context_dev", router: "hostinger_router", exa: "exa" }[r.provider], { used: r.charged_or_reserved, measured: r.measured, calls: r.calls, cap: r.cap }]));
    return send(res, 200, {
      computed_at: now(),
      thresholds: { jaccard: T.copyThreshold, window_min: T.edgeMinutes, min_sites: T.clusterMinSites, min_stories: T.clusterMinStories, stories_per_country: T.maxStories, days: T.days, strong: T.strong, organic_min_outlets: T.organicMinOutlets },
      spend: Object.fromEntries(Object.entries(spend).map(([k, v]) => [k === "exa" ? "exa" : k, k === "exa" ? { ...v, unit: "USD" } : { ...v, unit: "credits" }])),
      counts: { countries_built: countries.length, stories_checked: countries.reduce((n, c) => n + c.stories_checked, 0), clusters: countries.reduce((n, c) => n + c.clusters.length, 0), builds },
      documented_lists: get("meta", "documented_lists"),
      eval: get("meta", "must_surface") || { note: "Held-out evaluation has not been run for engine v2 yet" },
      not_covered: [
        "X/Twitter is not read",
        "Telegram is read only where a copy links to a public channel",
        "Phrase search finds pages a web search engine has indexed; unindexed sites are invisible",
        "Pages without a machine-readable publication time cannot form timed links",
        "ASN lookups are not run; shared IP addresses are shown instead",
        "Platform pickup is a sample from public search pages, not a total",
      ],
      models: { story_filter: "gemini-3.5-flash-lite", narrative_grouping: "gemini-3.5-flash", label_check: ["gpt-4.1-mini", "claude-haiku-4.5"], spin_labels: "gpt-4.1-mini" },
    });
  }
  return false;
}

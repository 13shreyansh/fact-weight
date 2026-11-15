// Real-time layer: Context.dev monitors -> signed webhooks -> copy check -> events -> newsroom webhooks.
import crypto from "node:crypto";
import { db, get, put, all, call, addEvent, CAPS, spent } from "./db.mjs";
import { country as countryInfo, PRECOMPUTED } from "./countries.mjs";
import { encryptSecret, decryptSecret, verifySignature } from "../signal/secrets.mjs";
import { windowJaccard, headlineSim, mainText, cleanTitle, site, tokens } from "./text.mjs";

db.exec(`CREATE TABLE IF NOT EXISTS hooks(id TEXT PRIMARY KEY, route TEXT, received_at TEXT, event TEXT, status TEXT, payload TEXT);
CREATE TABLE IF NOT EXISTS watches(id TEXT PRIMARY KEY, country TEXT, url TEXT, created_at TEXT, last_event_id INTEGER, last_sent_at TEXT, sent INTEGER, failures INTEGER);`);
const BASE = process.env.SIGNAL_PUBLIC_URL || "https://signal-fire.72.61.22.106.sslip.io";
const MAX_MONITORS = Number(process.env.V2_MAX_MONITORS || 40);

export const monitors = () => all("v2monitor");

async function createMonitor(kind, cc, target, extra = {}) {
  const key = JSON.stringify(target);
  if (monitors().some((m) => m.key === key)) return null;
  if (monitors().length >= MAX_MONITORS) return null;
  const route = crypto.randomBytes(16).toString("hex");
  const d = await call("context", "/monitors", {
    name: `Signal Fire v2 · ${cc} · ${kind} · ${route.slice(0, 6)}`,
    target,
    change_detection: { type: "exact" },
    schedule: { type: "interval", frequency: 60, unit: "minutes" },
    tags: ["signal-fire-v2", "country-" + cc],
    webhook: { url: `${BASE}/api/hooks/contextdev/${route}`, events: ["change.detected", "run.completed"], retry: {} },
  }, { maxAgeMs: 0 });
  if (!d.id || !d.webhook?.secret) throw Error("Monitor was not created");
  const m = { route, key, kind, country: cc, target, id: d.id, status: d.status || "active", created_at: new Date().toISOString(), secret: encryptSecret(d.webhook.secret), ...extra };
  put("v2monitor", route, m);
  addEvent("monitor_started", cc, { country: cc, source: "Context.dev monitor", headline: `Watching ${target.url || "news search: " + target.query} every 60 min`, url: target.url || null });
  return m;
}

// One news-search monitor per built precomputed country, plus the home page of the two biggest sites
// of every coordinated cluster (where new copies appear first).
let ensuring = false;
export async function ensureMonitors() {
  if (ensuring) return;
  ensuring = true;
  try {
    await ensureMonitorsOnce();
  } finally {
    ensuring = false;
  }
}
async function ensureMonitorsOnce() {
  if (spent("context") > CAPS.context - 1500) return;
  for (const cc of PRECOMPUTED) {
    const r = get("country", cc);
    if (!r) continue;
    const c = countryInfo(cc);
    try {
      await createMonitor("news search", cc, { type: "search", query: `${c.name} news -site:x.com -site:twitter.com` });
      for (const cl of r.clusters.filter((x) => x.verdict.startsWith("Looks coordinated")).slice(0, 2))
        for (const s of cl.sites.slice(0, 2)) await createMonitor("cluster site", cc, { type: "page", url: `https://${s}/` }, { cluster_id: cl.id, site: s });
    } catch (e) {
      console.error("v2 monitor setup", cc, e.message);
      return;
    }
  }
}

export function receiveHook(route, raw, headers) {
  const m = get("v2monitor", route);
  if (!m) return { status: 404, error: "Unknown hook." };
  if (!verifySignature(raw, headers["x-context-signature"], decryptSecret(m.secret))) return { status: 401, error: "Invalid webhook signature." };
  let ev;
  try {
    ev = JSON.parse(raw.toString("utf8"));
  } catch {
    return { status: 400, error: "Invalid body." };
  }
  if (!ev?.id) return { status: 400, error: "Invalid body." };
  db.prepare("INSERT OR IGNORE INTO hooks VALUES(?,?,?,?,?,?)").run(ev.id, route, new Date().toISOString(), ev.event, ev.event === "change.detected" ? "pending" : "recorded", JSON.stringify(ev).slice(0, 200000));
  put("v2monitor", route, { ...m, last_event_at: new Date().toISOString(), last_event: ev.event });
  return { status: 204 };
}

function urlsIn(o, out = new Set()) {
  if (typeof o === "string") {
    for (const u of o.match(/https?:\/\/[^\s"'<>)\]]+/g) || []) out.add(u.replace(/[.,]$/, ""));
  } else if (Array.isArray(o)) o.forEach((x) => urlsIn(x, out));
  else if (o && typeof o === "object") Object.values(o).forEach((x) => urlsIn(x, out));
  return out;
}

// Confirm each new article URL against the stored stories of that country with the same shingle check.
async function checkUrl(cc, url, m) {
  if (get("seenurl", url)) return;
  put("seenurl", url, { at: new Date().toISOString() });
  const r = get("country", cc);
  if (!r) return;
  let d;
  try {
    d = await call("context", "/web/scrape", { url, formats: { markdown: true }, sharedParams: { mainContentOnly: true } }, { maxAgeMs: 864e5 });
  } catch {
    return;
  }
  const text = mainText(d.markdown?.data || ""),
    title = cleanTitle(d.metadata?.title || "");
  if (tokens(text).length < 40) return;
  const published = d.metadata?.publishedTime ? new Date(d.metadata.publishedTime).toISOString() : null;
  let best = null;
  for (const id of r.story_ids) {
    const st = get("story", id);
    if (!st) continue;
    const refs = [...st.mainstream.map((x) => x.headline), ...st.copies.map((x) => x.headline)];
    const j = Math.max(headlineSim(title, st.title), ...refs.map((h) => headlineSim(title, h || "")), windowJaccard(st.title, text, 3));
    if (!best || j > best.j) best = { j, st };
  }
  if (!best || best.j < 0.6) return;
  const st = best.st;
  if (st.copies.some((x) => x.url === url)) return;
  const first = st.first_mainstream_at;
  const copy = { site: site(url), cluster_id: m.cluster_id || null, url, published_at: published, headline: title, lang: null, country: cc, similarity: Math.round(best.j * 100) / 100, found_by: "Context.dev monitor" };
  st.copies.push(copy);
  put("story", st.id, st);
  addEvent(st.copies.length >= 3 ? "group_grew" : "copy_detected", cc, { country: cc, site: copy.site, url, headline: title, story_id: st.id, cluster_id: copy.cluster_id, lag_min: published && first ? Math.round((Date.parse(published) - Date.parse(first)) / 60000) : null, source: "Context.dev monitor", at: published || new Date().toISOString() });
}

let busy = false;
export async function processHooks() {
  if (busy) return;
  busy = true;
  try {
    for (const h of db.prepare("SELECT * FROM hooks WHERE status='pending' ORDER BY received_at LIMIT 10").all()) {
      db.prepare("UPDATE hooks SET status='processing' WHERE id=?").run(h.id);
      const m = get("v2monitor", h.route);
      try {
        const payload = JSON.parse(h.payload);
        let urls = [...urlsIn(payload.data)].filter((u) => !/context\.dev|\.(png|jpe?g|gif|svg|css|js|webp)(\?|$)/i.test(u));
        if (m.target.type === "page") urls = urls.filter((u) => site(u) === m.site && new URL(u).pathname.length > 12);
        for (const u of urls.slice(0, 8)) await checkUrl(m.country, u, m);
        db.prepare("UPDATE hooks SET status='done' WHERE id=?").run(h.id);
      } catch (e) {
        db.prepare("UPDATE hooks SET status='failed' WHERE id=?").run(h.id);
      }
    }
  } finally {
    busy = false;
  }
}

// Newsroom alerts: POST each new event for a watched country to the registered HTTPS URL.
export function addWatch(cc, url) {
  const info = countryInfo(cc);
  if (!info) return { status: 404, body: { error: "That is not a country code we recognise." } };
  let u;
  try {
    u = new URL(url);
  } catch {
    return { status: 422, body: { error: "Give an https webhook address." } };
  }
  if (u.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname)) return { status: 422, body: { error: "Give a public https webhook address." } };
  if (db.prepare("SELECT count(*) n FROM watches").get().n >= 200) return { status: 429, body: { error: "Watch limit reached." } };
  const id = "w" + crypto.randomBytes(6).toString("hex");
  const last = db.prepare("SELECT coalesce(max(id),0) n FROM events").get().n;
  db.prepare("INSERT INTO watches VALUES(?,?,?,?,?,?,?,?)").run(id, info.code, u.toString(), new Date().toISOString(), last, null, 0, 0);
  return { status: 201, body: { id, country: info.code, webhook_url: u.toString(), delivers: "Each new event for this country as JSON, at most one POST every 10 seconds" } };
}
export async function deliverWatches() {
  for (const w of db.prepare("SELECT * FROM watches WHERE failures < 20").all()) {
    if (w.last_sent_at && Date.now() - Date.parse(w.last_sent_at) < 10000) continue;
    const ev = db.prepare("SELECT * FROM events WHERE id>? AND country=? ORDER BY id LIMIT 1").get(w.last_event_id, w.country);
    if (!ev) continue;
    const body = JSON.stringify({ watch_id: w.id, id: ev.id, type: ev.type, country: ev.country, ...JSON.parse(ev.data), at: ev.at });
    let ok = false;
    try {
      const r = await fetch(w.url, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "signal-fire-alerts/2" }, body, signal: AbortSignal.timeout(8000), redirect: "manual" });
      ok = r.status < 400;
    } catch {}
    db.prepare("UPDATE watches SET last_event_id=?, last_sent_at=?, sent=sent+?, failures=? WHERE id=?").run(ok ? ev.id : w.last_event_id, new Date().toISOString(), ok ? 1 : 0, ok ? 0 : w.failures + 1, w.id);
  }
}

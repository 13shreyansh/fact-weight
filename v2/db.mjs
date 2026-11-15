// Engine v2 storage, provider ledger and spend caps. Separate from the v1 database.
import fs from "node:fs";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

for (const line of (fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
const dir = process.env.SIGNAL_DATA || "data";
fs.mkdirSync(dir, { recursive: true });
export const db = new DatabaseSync(`${dir}/engine-v2.sqlite`);
db.exec(`PRAGMA busy_timeout=20000; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS calls(id TEXT PRIMARY KEY, provider TEXT, at TEXT, endpoint TEXT, params TEXT, status INTEGER, ms INTEGER, credits REAL, reserved REAL, cache_key TEXT, build_id TEXT, step TEXT, response TEXT);
CREATE INDEX IF NOT EXISTS calls_cache ON calls(cache_key);
CREATE TABLE IF NOT EXISTS kv(kind TEXT, id TEXT, data TEXT, at TEXT, PRIMARY KEY(kind,id));
CREATE TABLE IF NOT EXISTS builds(id TEXT PRIMARY KEY, cc TEXT, status TEXT, requested_at TEXT, started_at TEXT, finished_at TEXT, source TEXT, steps TEXT, error TEXT);`);

export const CAPS = {
  context: Number(process.env.V2_CONTEXT_CAP || 15000),
  router: Number(process.env.V2_ROUTER_CAP || 800),
};
export const hash = (x) =>
  crypto.createHash("sha256").update(typeof x === "string" ? x : JSON.stringify(x)).digest("hex");
export const put = (kind, id, data) =>
  db.prepare("INSERT OR REPLACE INTO kv VALUES(?,?,?,?)").run(kind, id, JSON.stringify(data), new Date().toISOString());
export const get = (kind, id) => {
  const r = db.prepare("SELECT data FROM kv WHERE kind=? AND id=?").get(kind, id);
  return r ? JSON.parse(r.data) : null;
};
export const all = (kind) => db.prepare("SELECT data FROM kv WHERE kind=?").all(kind).map((r) => JSON.parse(r.data));

export function spent(provider) {
  return db
    .prepare("SELECT coalesce(sum(CASE WHEN credits IS NULL THEN reserved ELSE credits END),0) n FROM calls WHERE provider=? AND status!=-1")
    .get(provider).n;
}
export function spendSummary() {
  return db
    .prepare(
      "SELECT provider, count(*) calls, round(sum(coalesce(credits,0)),3) measured, round(sum(CASE WHEN credits IS NULL THEN reserved ELSE credits END),3) charged_or_reserved, sum(CASE WHEN status=200 THEN 1 ELSE 0 END) ok FROM calls WHERE status!=-1 GROUP BY provider",
    )
    .all()
    .map((r) => ({ ...r, cap: CAPS[r.provider] ?? null }));
}
export class CapReached extends Error {}

// Per-token Router prices (credits), from the live /models listing, 15 Nov 2026.
const routerPrices = {
  "gpt-4.1-mini": [0.000048, 0.000192],
  "claude-haiku-4.5": [0.000132, 0.00066],
  "gemini-3.5-flash": [0.000198, 0.001188],
  "gemini-3.5-flash-lite": [0.000036, 0.0003],
};
function reserve(provider, endpoint, params) {
  if (provider === "context") return endpoint === "/news/search" ? 10 : endpoint === "/web/search" ? 3 : 2;
  const p = routerPrices[params.model] || [0.0003, 0.0015];
  const input = Buffer.byteLength(JSON.stringify(params.messages || []), "utf8") / 3 + 200;
  return Math.max(0.05, 1.5 * (input * p[0] + (params.max_tokens || 2000) * p[1]));
}

let ctx = { build: null, step: null };
// Context.dev allows 100 request units per minute per key; stay under it across this process.
const stamps = [];
async function throttle() {
  for (;;) {
    const now = Date.now();
    while (stamps.length && now - stamps[0] > 60000) stamps.shift();
    if (stamps.length < Number(process.env.V2_CONTEXT_RPM || 80)) {
      stamps.push(now);
      return;
    }
    await new Promise((r) => setTimeout(r, 60000 - (now - stamps[0]) + 50));
  }
}
export const setContext = (c) => (ctx = { ...ctx, ...c });
const inflight = new Map();

export async function call(provider, endpoint, params = {}, opts = {}) {
  const key = hash({ provider, endpoint, params });
  const maxAge = opts.maxAgeMs ?? 6 * 3600e3;
  const cached = db
    .prepare("SELECT id,response,at FROM calls WHERE cache_key=? AND status=200 ORDER BY at DESC LIMIT 1")
    .get(key);
  if (cached && Date.now() - Date.parse(cached.at) < maxAge) return { ...JSON.parse(cached.response), _call: cached.id, _cached: true };
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
   for (let attempt = 0; ; attempt++) {
    if (provider === "context") await throttle();
    const reserved = reserve(provider, endpoint, params);
    const id = crypto.randomUUID();
    db.exec("BEGIN IMMEDIATE");
    try {
      if (spent(provider) + reserved > CAPS[provider]) throw new CapReached(`${provider} cap reached`);
      db.prepare("INSERT INTO calls(id,provider,at,endpoint,params,status,ms,credits,reserved,cache_key,build_id,step,response) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
        id, provider, new Date().toISOString(), endpoint, JSON.stringify(params).slice(0, 4000), 0, 0, null, reserved, key, ctx.build, ctx.step, "{}",
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    const start = Date.now();
    let status = 0;
    try {
      const token = process.env[provider === "context" ? "CONTEXT_DEV_API_KEY" : "HOSTINGER_AI_ROUTER_API_KEY"];
      if (!token) throw Error("Provider key unavailable");
      const r = await fetch((provider === "context" ? "https://api.context.dev/v1" : "https://router.hostinger.com/v1") + endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(opts.timeout || 60000),
      });
      status = r.status;
      const response = await r.json().catch(() => ({}));
      let credits = provider === "context" ? response.key_metadata?.credits_consumed : response.usage?.credits_charged ?? response.usage?.cost;
      if (!Number.isFinite(credits)) credits = null;
      if (provider === "context" && credits === null && status >= 400) credits = 0;
      const stored = { ...response };
      if (stored.html?.data) stored.html = { ...stored.html, data: stored.html.data.slice(0, 150000) };
      db.prepare("UPDATE calls SET status=?,ms=?,credits=?,response=? WHERE id=?").run(status, Date.now() - start, credits, JSON.stringify(stored), id);
      if (!r.ok) throw Object.assign(Error(`${provider} ${endpoint} returned ${status}`), { status, response });
      return { ...response, _call: id };
    } catch (e) {
      db.prepare("UPDATE calls SET status=?,ms=? WHERE id=? AND status=0").run(status || -2, Date.now() - start, id);
      if (e.status === 429 && attempt < 4) {
        const wait = Number((JSON.stringify(e.response || {}).match(/Retry in (\d+) seconds/) || [])[1] || 30);
        await new Promise((r) => setTimeout(r, (wait + 2) * 1000));
        continue;
      }
      throw e;
    }
   }
  })();
  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}

export async function llm(model, system, user, max_tokens = 1500) {
  const d = await call("router", "/chat/completions", {
    model,
    temperature: 0,
    max_tokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: typeof user === "string" ? user : JSON.stringify(user) },
    ],
  }, { maxAgeMs: 7 * 86400e3, timeout: 120000 });
  let text = d.choices?.[0]?.message?.content || "{}";
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1];
  else text = (text.match(/\{[\s\S]*\}/) || ["{}"])[0];
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        try {
          out[k] = await fn(items[k], k);
        } catch (e) {
          if (e instanceof CapReached) throw e;
          out[k] = { error: e.message };
        }
      }
    }),
  );
  return out;
}

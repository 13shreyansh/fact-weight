// Engine v2 worker: runs queued builds one at a time and refreshes precomputed countries every 6h.
import { db, get, CapReached, als } from "./db.mjs";
import { PRECOMPUTED } from "./countries.mjs";
import { buildCountry, loadBuild, saveBuild } from "./engine.mjs";
import { requestBuild } from "./api.mjs";
import { ensureMonitors, processHooks, deliverWatches } from "./live.mjs";

setInterval(() => processHooks().catch(() => {}), 15000);
setInterval(() => deliverWatches().catch(() => {}), 5000);
ensureMonitors().catch((e) => console.error("v2 monitors", e.message));

db.prepare("UPDATE builds SET status='queued', steps='[]' WHERE status='running'").run();
let stopping = false;
process.on("SIGTERM", () => (stopping = true));
const REFRESH = 6 * 3600e3;

const PARALLEL = Number(process.env.V2_PARALLEL || 3);
const running = new Set();
function nextBuild() {
  const busy = [...running];
  let next = db.prepare(`SELECT id,cc FROM builds WHERE status='queued' ${busy.length ? `AND cc NOT IN (${busy.map(() => "?").join(",")})` : ""} ORDER BY CASE source WHEN 'visitor' THEN 0 ELSE 1 END, requested_at LIMIT 1`).get(...busy);
  if (next) return next;
  const stale = PRECOMPUTED.find((cc) => {
    if (running.has(cc)) return false;
    const r = get("country", cc);
    const last = db.prepare("SELECT requested_at,status FROM builds WHERE cc=? ORDER BY requested_at DESC LIMIT 1").get(cc);
    if (last && (last.status === "queued" || last.status === "running")) return false;
    if (last?.status === "paused" && Date.now() - Date.parse(last.requested_at) < 12 * 3600e3) return false;
    if (last?.status === "failed" && Date.now() - Date.parse(last.requested_at) < 3600e3) return false;
    return !r || Date.now() - Date.parse(r.computed_at) > REFRESH;
  });
  if (!stale) return null;
  const r = requestBuild(stale, "schedule");
  return r.status === 202 ? { id: r.body.id, cc: stale } : null;
}
async function runOne(next) {
  const b = loadBuild(next.id);
  running.add(b.cc);
  try {
    await als.run({ build: b.id, step: null }, () => buildCountry(b.cc, b));
    console.log("v2 build done", b.cc, b.id, process.memoryUsage().rss >> 20, "MB");
    ensureMonitors().catch((e) => console.error("v2 monitors", e.message));
  } catch (e) {
    console.error("v2 build failed", b.cc, e.message);
  } finally {
    running.delete(b.cc);
  }
}
for (;;) {
  if (stopping) process.exit(0);
  while (running.size < PARALLEL) {
    const n = nextBuild();
    if (!n) break;
    runOne(n);
    await new Promise((r) => setTimeout(r, 500));
  }
  await new Promise((r) => setTimeout(r, 5000));
}

// Engine v2 worker: runs queued builds one at a time and refreshes precomputed countries every 6h.
import { db, get, CapReached } from "./db.mjs";
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

for (;;) {
  if (stopping) process.exit(0);
  let next = db.prepare("SELECT id FROM builds WHERE status='queued' ORDER BY CASE source WHEN 'visitor' THEN 0 ELSE 1 END, requested_at LIMIT 1").get();
  if (!next) {
    const stale = PRECOMPUTED.find((cc) => {
      const r = get("country", cc);
      const last = db.prepare("SELECT requested_at,status FROM builds WHERE cc=? ORDER BY requested_at DESC LIMIT 1").get(cc);
      if (last?.status === "paused" && Date.now() - Date.parse(last.requested_at) < 12 * 3600e3) return false;
      if (last?.status === "failed" && Date.now() - Date.parse(last.requested_at) < 3600e3) return false;
      return !r || Date.now() - Date.parse(r.computed_at) > REFRESH;
    });
    if (stale) {
      const r = requestBuild(stale, "schedule");
      if (r.status === 202) next = { id: r.body.id };
    }
  }
  if (!next) {
    await new Promise((r) => setTimeout(r, 5000));
    continue;
  }
  const b = loadBuild(next.id);
  try {
    await buildCountry(b.cc, b);
    console.log("v2 build done", b.cc, b.id);
    ensureMonitors().catch((e) => console.error("v2 monitors", e.message));
  } catch (e) {
    console.error("v2 build failed", b.cc, e.message);
    if (e instanceof CapReached) await new Promise((r) => setTimeout(r, 600000));
  }
}

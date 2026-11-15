// Usage: node v2/cli.mjs FI  — runs one country build in this process.
import crypto from "node:crypto";
import { buildCountry, saveBuild } from "./engine.mjs";
import { spendSummary } from "./db.mjs";
const cc = process.argv[2];
const b = { id: "b" + crypto.randomUUID().slice(0, 12), cc, status: "queued", requested_at: new Date().toISOString(), started_at: null, finished_at: null, source: "cli", steps: [], error: null };
saveBuild(b);
try {
  const r = await buildCountry(cc, b);
  console.log(JSON.stringify({ stories: r.stories_checked, clusters: r.clusters.map((c) => [c.site_count, c.stories_copied, c.verdict, c.sites.slice(0, 6), c.documented_by.map((d) => d.network)]), narratives: r.narratives.map((n) => n.label || "(" + n.proposed_label + ")"), organic: r.organic_examples.length, pickup: r.pickup.length }, null, 1));
} catch (e) { console.error("FAILED", e.message); }
for (const s of b.steps) console.log(s.name, s.status, s.ms + "ms", s.calls + " calls", s.credits + " cr", s.note);
console.log(spendSummary());

import { db, all } from "./providers.mjs";
const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((a, b) => a - b),
    i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
export function runtimeMetrics() {
  const calls = db
    .prepare(
      "SELECT provider,endpoint,params,status,ms,credits,reserved FROM calls",
    )
    .all();
  const timing = new Map();
  for (const c of calls.filter(
    (c) =>
      c.provider === "context" && c.status >= 200 && c.status < 300 && c.ms > 0,
  )) {
    const endpoint = c.endpoint
      .split("?")[0]
      .replace(/\/(?:mon_[a-zA-Z0-9_-]+|batch_[a-zA-Z0-9_-]+)/g, "/:id");
    const list = timing.get(endpoint) || [];
    list.push(c.ms);
    timing.set(endpoint, list);
  }
  const latencies = all("latency").filter(
    (l) => l.mode !== "replay" && Number.isFinite(l.firstPostToAlertMs),
  );
  const features = new Map();
  for (const c of calls.filter((c) => c.provider === "context")) {
    let p;
    try {
      p = JSON.parse(c.params);
    } catch {
      p = {};
    }
    let name = c.endpoint.startsWith("/web/urls")
      ? "Site URL discovery"
      : c.endpoint === "/web/scrape"
        ? p.parseParams?.parser
          ? "Public " + p.parseParams.parser + " parser"
          : p.formats?.json
            ? "Structured page extraction"
            : "Page scrape"
        : c.endpoint === "/web/search"
          ? "Web search"
          : c.endpoint === "/news/search"
            ? "News search"
            : c.endpoint.startsWith("/batch")
              ? "Batch collection"
              : c.endpoint.startsWith("/monitors")
                ? "Page and search monitors"
                : null;
    if (!name) continue;
    const f = features.get(name) || { name, calls: 0, credits: 0, reserved: 0 };
    f.calls++;
    f.credits += c.credits ?? 0;
    if (c.credits === null) f.reserved += c.reserved;
    features.set(name, f);
  }
  return {
    speed: {
      sampleSize: latencies.length,
      medianFirstPostToAlertMs: median(
        latencies.map((l) => l.firstPostToAlertMs),
      ),
      slowestFirstPostToAlertMs: latencies.length
        ? Math.max(...latencies.map((l) => l.firstPostToAlertMs))
        : null,
      perEndpoint: [...timing].map(([endpoint, times]) => ({
        endpoint,
        calls: times.length,
        medianMs: median(times),
        slowestMs: Math.max(...times),
      })),
      note: "Times include historical posts collected after publication. They are observed delays, not early-warning lead times.",
    },
    features: [...features.values()],
  };
}

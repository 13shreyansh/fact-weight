import { safeURL, normalize, digest } from "./engine.mjs";
const cache = new Map();
export async function scrape(
  url,
  { fresh = false, key = process.env.CONTEXT_DEV_API_KEY, signal } = {},
) {
  url = safeURL(url);
  if (!url) throw new Error("Use a public HTTPS article URL.");
  if (!key) throw new Error("Context.dev is not configured.");
  const previous = cache.get(url);
  if (!fresh && previous && Date.now() - previous.at < 300000)
    return { ...previous.value, cached: true };
  const r = await fetch("https://api.context.dev/v1/web/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "User-Agent": "FactWeight/0.1",
    },
    body: JSON.stringify({
      url,
      formats: { markdown: true },
      sharedParams: { mainContentOnly: true },
      maxAgeMs: 0,
    }),
    signal: AbortSignal.any([
      AbortSignal.timeout(45000),
      ...(signal ? [signal] : []),
    ]),
  });
  if (!r.ok) throw new Error(`Context.dev returned HTTP ${r.status}.`);
  const d = await r.json();
  if (d.markdown?.success !== true || typeof d.markdown.data !== "string")
    throw new Error(
      "Context.dev could not extract this page. Try another article.",
    );
  const fullText = normalize(d.markdown.data);
  const text = fullText.slice(0, 18000);
  if (text.length < 80)
    throw new Error("The page contains too little usable text.");
  const hash = digest(fullText);
  const value = {
    url,
    title: d.metadata?.title || new URL(url).hostname,
    text,
    fetchedAt: new Date().toISOString(),
    publishedAt: d.metadata?.publishedTime || d.metadata?.published_at || null,
    hash,
    requestId: d.request_id,
    extractedCharacters: fullText.length,
    truncated: fullText.length > 18000,
    creditsConsumed: d.key_metadata?.credits_consumed ?? null,
    providerCache: d.cache_metadata ?? null,
    changed: previous ? previous.value.hash !== hash : null,
    cached: false,
  };
  cache.set(url, { at: Date.now(), value });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return value;
}
// Discovery is optional. Explicit article URLs remain inspectable and predictable.
export async function search(
  query,
  { key = process.env.CONTEXT_DEV_API_KEY, signal } = {},
) {
  if (!key) throw new Error("Context.dev is not configured.");
  const r = await fetch("https://api.context.dev/v1/web/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "User-Agent": "FactWeight/0.1",
    },
    body: JSON.stringify({
      query,
      numResults: 4,
      includeDomains: [
        "news.err.ee",
        "www.lrt.lt",
        "eng.lsm.lv",
        "consilium.europa.eu",
        "nato.int",
        "understandingwar.org",
      ],
    }),
    signal: AbortSignal.any([
      AbortSignal.timeout(25000),
      ...(signal ? [signal] : []),
    ]),
  });
  if (!r.ok) throw new Error(`Context.dev search returned HTTP ${r.status}.`);
  const d = await r.json();
  const rows = d.results ?? d.data ?? d.web ?? [];
  return {
    query,
    requestId: d.request_id,
    creditsConsumed: d.key_metadata?.credits_consumed ?? null,
    results: (Array.isArray(rows) ? rows : [])
      .map((x) => ({ url: safeURL(x.url), title: x.title }))
      .filter((x) => x.url)
      .slice(0, 4),
  };
}

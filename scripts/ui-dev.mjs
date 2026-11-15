// Local preview of public/ against fixture JSON in test/ui-fixtures. Dev only.
import http from "node:http"; import fs from "node:fs/promises"; import path from "node:path";
const root = path.resolve(import.meta.dirname, ".."), fx = path.join(root, "test/ui-fixtures");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json" };
const page = { "/": "index.html", "/country": "country.html", "/story": "story.html", "/method": "method.html" };
const builds = new Map();
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"); const p = u.pathname;
  const json = (o, s = 200) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(o)); };
  const fix = async (n) => JSON.parse(await fs.readFile(path.join(fx, n), "utf8"));
  try {
    if (p === "/api/countries") return json(await fix("countries.json"));
    let m;
    if ((m = p.match(/^\/api\/countries\/([A-Z]{2})\/build$/)) && req.method === "POST") { const id = "b" + Date.now(); builds.set(id, Date.now()); return json({ id }); }
    if ((m = p.match(/^\/api\/countries\/([A-Z]{2})$/))) { try { return json(await fix(`country-${m[1]}.json`)); } catch { return json({ code: m[1], status: "not_built" }); } }
    if (p === "/api/stories") { try { return json(await fix(`stories-${u.searchParams.get("country")}.json`)); } catch { return json([]); } }
    if ((m = p.match(/^\/api\/stories\/(.+)$/))) { try { return json(await fix(`story-${m[1]}.json`)); } catch { return json({ error: "Story not found" }, 404); } }
    if ((m = p.match(/^\/api\/builds\/(.+)$/))) { const t = (Date.now() - (builds.get(m[1]) || Date.now())) / 1000; const names = ["stories", "copies", "clusters", "who", "narratives", "organic"]; return json({ id: m[1], status: "running", steps: names.map((n, i) => ({ name: n, status: t > (i + 1) * 3 ? "done" : t > i * 3 ? "running" : "waiting", ms: t > (i + 1) * 3 ? 3000 : null })) }); }
    if (p === "/api/method") return json({ computed_at: new Date().toISOString(), thresholds: { jaccard: 0.6, window_min: 60, min_sites: 3, min_stories: 3 } });
    if (p.startsWith("/api/")) return json({ error: "Not found" }, 404);
    const f = page[p] || p.slice(1);
    const data = await fs.readFile(path.join(root, "public", f));
    res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); res.end(data);
  } catch { json({ error: "Not found" }, 404); }
}).listen(process.env.PORT || 4321, () => console.log("ui-dev on", process.env.PORT || 4321));

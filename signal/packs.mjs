import fs from "node:fs/promises";
import path from "node:path";
import { get, put, hash } from "./providers.mjs";
import { pdf } from "./export.mjs";
export async function ensurePack(input) {
  const review = get("review", input.id),
    p = { ...input, review },
    cacheKey = hash({
      rendererVersion: "sf-pack-v2",
      posts: p.posts,
      accounts: p.accounts,
      signals: p.signals,
      evidence: p.evidence,
      review,
    });
  const root = process.env.SIGNAL_DATA || "data",
    file = path.join(root, "packs", p.id + ".pdf");
  if (p.pack?.cacheKey === cacheKey) {
    try {
      return { push: p, bytes: await fs.readFile(file) };
    } catch {}
  }
  const startedAt = new Date().toISOString(),
    start = performance.now();
  const bytes = await pdf(p);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  const finishedAt = new Date().toISOString();
  p.pipeline = {
    ...(p.pipeline || {}),
    packed: {
      startedAt,
      finishedAt,
      ms: Math.round(performance.now() - start),
    },
  };
  p.pack = {
    builtAt: finishedAt,
    sha256: hash(bytes),
    size: bytes.length,
    cacheKey,
  };
  p.firstAlertAt = p.firstAlertAt || finishedAt;
  p.ready = true;
  put("push", p.id, p);
  put("latency", p.id, {
    id: p.id,
    watchId: p.watchId,
    firstPostAt: p.firstSeen,
    alertAt: p.firstAlertAt,
    packAt: finishedAt,
    firstPostToAlertMs: Math.max(
      0,
      Date.parse(p.firstAlertAt) - Date.parse(p.firstSeen),
    ),
    firstPostToPackMs: Math.max(
      0,
      Date.parse(finishedAt) - Date.parse(p.firstSeen),
    ),
    mode: p.mode,
    trigger: p.trigger || "Initial collection",
    pipeline: p.pipeline,
  });
  return { push: p, bytes };
}

import fs from "node:fs/promises";
import path from "node:path";
import { get, put, hash, db } from "./providers.mjs";
import { pdf } from "./export.mjs";
export function packKey(input, review) {
  const { pack, pipeline, ready, firstAlertAt, ...content } = input;
  return hash({ rendererVersion: "sf-pack-v4", ...content, review });
}
export async function ensurePack(input) {
  const review = get("review", input.id),
    p = { ...input, review },
    cacheKey = packKey(input, review);
  const root = process.env.SIGNAL_DATA || "data",
    file = path.join(root, "packs", p.id + "-" + cacheKey + ".pdf");
  if (p.pack?.cacheKey === cacheKey) {
    try {
      const bytes = await fs.readFile(file);
      if (p.pack.sha256 === hash(bytes)) return { push: p, bytes };
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
  p.firstAlertAt = ["moderate", "strong"].includes(p.verdict)
    ? p.firstAlertAt || finishedAt
    : null;
  p.ready = true;
  db.exec("BEGIN IMMEDIATE");
  const current = get("push", p.id);
  if (current && packKey(current, get("review", p.id)) !== cacheKey) {
    db.exec("ROLLBACK");
    if (current.excluded) throw Error("This finding has been withdrawn.");
    return ensurePack(current);
  }
  put("push", p.id, p);
  put("latency", p.id, {
    id: p.id,
    watchId: p.watchId,
    firstPostAt: p.firstSeen,
    alertAt: p.firstAlertAt,
    packAt: finishedAt,
    firstPostToAlertMs: p.firstAlertAt
      ? Math.max(0, Date.parse(p.firstAlertAt) - Date.parse(p.firstSeen))
      : null,
    firstPostToPackMs: Math.max(
      0,
      Date.parse(finishedAt) - Date.parse(p.firstSeen),
    ),
    mode: p.mode,
    trigger: p.trigger || "Initial collection",
    pipeline: p.pipeline,
  });
  db.exec("COMMIT");
  return { push: p, bytes };
}

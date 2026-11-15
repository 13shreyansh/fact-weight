import { get, put, all, db } from "./providers.mjs";
export const inWatch = (p, id) =>
  !!p && (p.watchIds || ["baltics"]).includes(id);
export function recordPost(p, watchId = "baltics") {
  const w = get("watch", watchId);
  if (w?.expiresAt && Date.parse(w.expiresAt) <= Date.now()) return null;
  const old = get("post", p.id),
    ids = [...new Set([...(old ? old.watchIds || ["baltics"] : []), watchId])];
  const row = p.call
    ? db.prepare("SELECT at,ms FROM calls WHERE id=?").get(p.call)
    : null;
  const result = {
    ...p,
    watchIds: ids,
    collectedAt: row
      ? new Date(Date.parse(row.at) + row.ms).toISOString()
      : p.collectedAt || old?.collectedAt || new Date().toISOString(),
  };
  put("post", p.id, result);
  return result;
}
export function purgeWatch(id) {
  const w = get("watch", id);
  if (!w || w.public) return;
  put("watch", id, { ...w, expiresAt: new Date(0).toISOString() });
  for (const p of all("post").filter((p) => p.watchIds?.includes(id))) {
    const ids = p.watchIds.filter((x) => x !== id);
    if (ids.length) put("post", p.id, { ...p, watchIds: ids });
    else db.prepare("DELETE FROM records WHERE kind='post' AND id=?").run(p.id);
  }
  for (const kind of ["push", "assessed", "candidate", "latency", "sweep"])
    for (const r of all(kind).filter((x) => x.watchId === id))
      db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(kind, r.id);
  for (const r of db
    .prepare("SELECT id FROM records WHERE kind='discovery' AND id LIKE ?")
    .all("watch-" + id + "-%"))
    db.prepare("DELETE FROM records WHERE kind='discovery' AND id=?").run(r.id);
}
export const safeWatch = ({ owner, ...w }) => w;

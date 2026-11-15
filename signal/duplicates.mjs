import { all, put } from "./providers.mjs";
export function collapseDuplicates(watchId) {
  const rows = all("push")
    .filter((p) => p.watchId === watchId && !p.excluded)
    .sort(
      (a, b) =>
        (b.origins?.length || 0) - (a.origins?.length || 0) ||
        b.posts.length - a.posts.length ||
        Date.parse(a.flaggedAt) - Date.parse(b.flaggedAt),
    );
  const retained = [];
  let merged = 0;
  for (const p of rows) {
    const ids = new Set(p.posts.map((x) => x.id));
    const canonical = retained.find(
      (q) =>
        q.posts.filter((x) => ids.has(x.id)).length /
          Math.min(p.posts.length, q.posts.length) >=
        0.7,
    );
    if (canonical) {
      put("push", p.id, {
        ...p,
        excluded: true,
        mergedInto: canonical.id,
        excludedReason:
          "Same source posts are already included in this finding",
      });
      merged++;
    } else retained.push(p);
  }
  return merged;
}

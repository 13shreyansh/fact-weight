export function reconcileTiming(firstPostAt, packAt, pipeline) {
  const first = Date.parse(firstPostAt),
    end = Date.parse(packAt);
  if (!Number.isFinite(first) || !Number.isFinite(end) || end < first)
    return null;
  const intervals = Object.values(pipeline || {})
    .filter(Boolean)
    .map((s) => ({
      from: Math.max(first, Date.parse(s.startedAt)),
      to: Math.min(end, Date.parse(s.finishedAt)),
      ms: s.ms,
    }))
    .filter(
      (s) => Number.isFinite(s.from) && Number.isFinite(s.to) && s.to >= s.from,
    )
    .sort((a, b) => a.from - b.from);
  let covered = 0,
    last = first;
  for (const s of intervals) {
    covered += Math.max(0, s.to - Math.max(last, s.from));
    last = Math.max(last, s.to);
  }
  const workMs = intervals.reduce(
      (n, s) => n + (Number.isFinite(s.ms) ? s.ms : s.to - s.from),
      0,
    ),
    overlapMs = Math.max(0, workMs - covered),
    elapsedMs = end - first,
    waitMs = elapsedMs - workMs + overlapMs,
    beforeCollectionMs = intervals.length
      ? intervals[0].from - first
      : elapsedMs;
  return {
    elapsedMs,
    workMs,
    overlapMs,
    waitMs,
    beforeCollectionMs,
    betweenStepsMs: Math.max(0, waitMs - beforeCollectionMs),
  };
}

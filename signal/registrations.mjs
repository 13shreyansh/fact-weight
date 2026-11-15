import { all, get, put } from "./providers.mjs";
import { setupMonitors } from "./monitors.mjs";
export function enqueueRegistration(watchId) {
  const existing = get("monitor-registration", watchId);
  if (existing) return existing;
  const job = {
    id: watchId,
    watchId,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  put("monitor-registration", watchId, job);
  return job;
}
export async function registerPending(setup = setupMonitors) {
  for (const job of all("monitor-registration").filter(
    (j) =>
      j.status === "pending" &&
      (!j.nextAttemptAt || Date.parse(j.nextAttemptAt) <= Date.now()),
  )) {
    const w = get("watch", job.watchId);
    if (!w || (w.expiresAt && Date.parse(w.expiresAt) <= Date.now())) {
      put("monitor-registration", job.id, { ...job, status: "expired" });
      continue;
    }
    try {
      await setup(w, process.env.SIGNAL_PUBLIC_URL);
      put("monitor-registration", job.id, {
        ...job,
        status: "complete",
        finishedAt: new Date().toISOString(),
      });
    } catch {
      const attempts = (job.attempts || 0) + 1;
      put("monitor-registration", job.id, {
        ...job,
        status: "pending",
        attempts,
        nextAttemptAt: new Date(
          Date.now() +
            Math.min(1800000, 60000 * 2 ** Math.min(5, attempts - 1)),
        ).toISOString(),
        lastError: "Monitor registration will retry.",
      });
    }
  }
}

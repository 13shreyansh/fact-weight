import { put, get } from "./providers.mjs";
export function enqueueWatch(watchId, trigger = "New watch") {
  const id = watchId + ":" + trigger;
  const old = get("sweep-request", id);
  if (old && ["pending", "processing"].includes(old.status)) return old;
  const job = {
    id,
    watchId,
    trigger,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  put("sweep-request", id, job);
  return job;
}

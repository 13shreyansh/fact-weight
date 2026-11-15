import { enqueueRegistration, registerPending } from "./registrations.mjs";
import { all, get, put } from "./providers.mjs";
import { sweep } from "./sweep.mjs";
import {
  processInbox,
  monitorBudgetGuard,
  setupMonitors,
} from "./monitors.mjs";
import { enqueueWatch } from "./jobs.mjs";
for (const event of all("webhook").filter((e) => e.status === "processing"))
  put("webhook", event.id, { ...event, status: "pending" });
for (const job of all("sweep-request").filter((e) => e.status === "processing"))
  put("sweep-request", job.id, { ...job, status: "pending" });
for (const w of all("watch").filter(
  (w) => !w.public && Date.parse(w.expiresAt) > Date.now(),
))
  enqueueRegistration(w.id);
let busy = false;
async function work() {
  if (busy) return;
  busy = true;
  try {
    if (process.env.SIGNAL_PUBLIC_URL) await registerPending();
    for (const job of all("sweep-request").filter(
      (j) => j.status === "pending",
    )) {
      const w = get("watch", job.watchId);
      if (!w || (w.expiresAt && Date.parse(w.expiresAt) <= Date.now())) {
        put("sweep-request", job.id, { ...job, status: "expired" });
        continue;
      }
      put("sweep-request", job.id, { ...job, status: "processing" });
      let sources =
        job.trigger === "Platform safety-net sweep"
          ? w.sources.filter((u) =>
              /tiktok\.com|instagram\.com|youtube\.com|reddit\.com/.test(u),
            )
          : w.sources;
      const result = await sweep({
        ...w,
        sources,
        news: job.trigger === "Platform safety-net sweep" ? false : w.news,
        trigger: job.trigger,
      });
      put("sweep-request", job.id, {
        ...job,
        status: result?.status || "failed",
        finishedAt: new Date().toISOString(),
      });
    }
    await processInbox(sweep);
  } catch (error) {
    console.error(
      "Monitor worker:",
      error.message.replace(/ctxt_secret_\S+|sk-\S+/g, "[redacted]"),
    );
  } finally {
    busy = false;
  }
}
function poll() {
  for (const w of all("watch").filter(
    (w) => w.public || Date.parse(w.expiresAt) > Date.now(),
  ))
    enqueueWatch(w.id, "Platform safety-net sweep");
}
setInterval(() => work(), 5000);
setInterval(poll, 30 * 60000);
setInterval(() => monitorBudgetGuard().catch(() => {}), 60000);
setTimeout(poll, 10000);
await work();

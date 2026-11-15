import crypto from "node:crypto";
import { all, get, put, call, db, hash } from "./providers.mjs";
import {
  encryptSecret,
  decryptSecret,
  verifySignature,
  redact,
} from "./secrets.mjs";
export async function setupMonitors(watch, baseURL) {
  const targets = [];
  for (const url of watch.sources)
    if (!/tiktok\.com|instagram\.com|youtube\.com|reddit\.com/.test(url))
      targets.push({
        kind: url.includes("t.me/") ? "Telegram pages" : "News pages",
        target: { type: "page", url },
      });
  for (const [lang, keywords] of Object.entries(watch.keywords))
    if (keywords.length)
      targets.push({
        kind: "News search · " + lang,
        target: {
          type: "search",
          query:
            keywords.slice(0, 4).join(" ") + " -site:x.com -site:twitter.com",
        },
      });
  for (const url of [
    "https://www.understandingwar.org/",
    "https://news.err.ee/",
    "https://www.lrt.lt/en/news-in-english",
    "https://eng.lsm.lv/",
    "https://yle.fi/news",
  ])
    targets.push({
      kind: "Trusted tracker pages",
      target: { type: "page", url },
    });
  for (const url of ["https://spiegel.agency/", "https://lemonde.ltd/"])
    targets.push({
      kind: "Documented look-alike domains",
      target: { type: "page", url },
    });
  for (const item of targets) {
    const key = hash({ watchId: watch.id, target: item.target });
    const existing = all("monitor").find((m) => m.key === key);
    if (existing?.id) continue;
    const routeId = existing?.routeId || crypto.randomBytes(16).toString("hex");
    put("monitor", routeId, {
      key,
      routeId,
      watchId: watch.id,
      ...item,
      status: "configuring",
    });
    const d = await call(
      "context",
      "/monitors",
      {
        name:
          "Signal Fire · " +
          watch.id +
          " · " +
          item.kind +
          " · " +
          key.slice(0, 8),
        target: item.target,
        change_detection: { type: "exact" },
        schedule: { type: "interval", frequency: 30, unit: "minutes" },
        tags: ["signal-fire", "watch-" + watch.id],
        webhook: {
          url: baseURL + "/webhooks/context/" + routeId,
          events: ["change.detected", "run.completed"],
          retry: {},
        },
      },
      { fresh: true },
    );
    if (!d.webhook?.secret)
      throw Error("Monitor signing secret was not returned.");
    put("monitor", routeId, {
      key,
      routeId,
      watchId: watch.id,
      ...item,
      id: d.id,
      status: d.status || "active",
      createdAt: new Date().toISOString(),
      secret: encryptSecret(d.webhook.secret),
      call: d._call,
    });
  }
  return all("monitor")
    .filter((m) => m.watchId === watch.id)
    .map(({ secret, ...m }) => m);
}
function accountRun(config, run, event) {
  if (!run?.id) return;
  const id = "monitor-run:" + run.id,
    existing = db.prepare("SELECT id FROM calls WHERE id=?").get(id);
  const credits = Number.isFinite(run.credits_charged)
      ? run.credits_charged
      : null,
    ms =
      run.started_at && run.completed_at
        ? Math.max(0, Date.parse(run.completed_at) - Date.parse(run.started_at))
        : 0;
  const params = JSON.stringify({
      monitorId: config.id,
      target: config.target,
    }),
    response = JSON.stringify(redact(run));
  if (!existing)
    db.prepare(
      "INSERT INTO calls(id,provider,at,endpoint,params,status,ms,credits,reserved,response,cache_key) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      id,
      "context",
      run.started_at || event.created_at,
      "/monitors/run",
      params,
      run.status === "failed" ? 500 : 200,
      ms,
      credits,
      config.target.type === "search" ? 2 : 1,
      response,
      id,
    );
  else
    db.prepare(
      "UPDATE calls SET status=?,ms=?,credits=?,response=? WHERE id=?",
    ).run(run.status === "failed" ? 500 : 200, ms, credits, response, id);
}
export function receiveWebhook(routeId, raw, headers) {
  const config = get("monitor", routeId);
  if (!config?.secret)
    return { status: 503, error: "Monitor registration is still finishing." };
  if (
    !verifySignature(
      raw,
      headers["x-context-signature"],
      decryptSecret(config.secret),
    )
  )
    return { status: 401, error: "Invalid webhook signature." };
  let event;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    return { status: 400, error: "Invalid webhook envelope." };
  }
  if (
    !event?.id ||
    event.id !== headers["x-context-id"] ||
    event.event !== headers["x-context-event"]
  )
    return { status: 400, error: "Invalid webhook envelope." };
  const monitorId =
    event.data?.run?.monitor_id ||
    event.data?.change?.monitor_id ||
    event.data?.monitor_id ||
    event.data?.monitor?.id;
  if (!monitorId)
    return { status: 400, error: "The monitor identity is missing." };
  if (monitorId !== config.id)
    return { status: 403, error: "This event belongs to a different monitor." };
  if (!["change.detected", "run.completed"].includes(event.event))
    return { status: 400, error: "Unsupported webhook event." };
  const exists = get("webhook", event.id);
  if (exists) return { status: 204, duplicate: true };
  const record = {
    id: event.id,
    routeId,
    watchId: config.watchId,
    monitorId: config.id,
    receivedAt: new Date().toISOString(),
    event: event.event,
    payload: redact(event),
    status: event.event === "change.detected" ? "pending" : "recorded",
  };
  db.prepare("INSERT OR IGNORE INTO records(kind,id,data) VALUES(?,?,?)").run(
    "webhook",
    event.id,
    JSON.stringify(record),
  );
  accountRun(config, event.data?.run, event);
  put("monitor", routeId, {
    ...config,
    lastEventAt: record.receivedAt,
    lastEvent: event.event,
  });
  return { status: 204, queued: record.status === "pending" };
}
let inboxBusy = false;
export async function processInbox(sweep) {
  if (inboxBusy) return;
  inboxBusy = true;
  try {
    const pending = all("webhook").filter(
      (e) =>
        e.status === "pending" &&
        (!e.nextAttemptAt || Date.parse(e.nextAttemptAt) <= Date.now()),
    );
    for (const watchId of new Set(pending.map((e) => e.watchId))) {
      const events = pending.filter((e) => e.watchId === watchId),
        watch = get("watch", watchId);
      if (
        !watch ||
        (watch.expiresAt && Date.parse(watch.expiresAt) < Date.now())
      ) {
        events.forEach((e) =>
          put("webhook", e.id, { ...e, status: "expired" }),
        );
        continue;
      }
      const configs = events
        .map((e) => get("monitor", e.routeId))
        .filter(Boolean);
      const urls = [
        ...new Set(configs.map((c) => c.target.url).filter(Boolean)),
      ];
      events.forEach((e) =>
        put("webhook", e.id, { ...e, status: "processing" }),
      );
      try {
        const result = await sweep({
          ...watch,
          sources: urls,
          news: configs.some((c) => c.target.type === "search"),
          trigger: "Context.dev webhook",
          recheck: configs.some(
            (c) =>
              c.kind === "Trusted tracker pages" ||
              c.kind === "Documented look-alike domains",
          ),
          webhookIds: events.map((e) => e.id),
        });
        if (result?.status !== "complete") throw Error("Collection incomplete");
        for (const e of events)
          put("webhook", e.id, {
            ...e,
            status: "processed",
            finishedAt: new Date().toISOString(),
            sweepId: result?.id,
          });
      } catch (e) {
        for (const event of events)
          put("webhook", event.id, {
            ...event,
            status: "pending",
            attempts: (event.attempts || 0) + 1,
            nextAttemptAt: new Date(
              Date.now() +
                Math.min(
                  3600000,
                  60000 * 2 ** Math.min(6, event.attempts || 0),
                ),
            ).toISOString(),
            lastError: "Collection will retry.",
          });
      }
    }
  } finally {
    inboxBusy = false;
  }
}
export async function monitorBudgetGuard() {
  const today = new Date().toISOString().slice(0, 10),
    used = db
      .prepare(
        "SELECT coalesce(sum(coalesce(credits,reserved)),0) n FROM calls WHERE provider='context'",
      )
      .get().n,
    daily = db
      .prepare(
        "SELECT coalesce(sum(coalesce(credits,reserved)),0) n FROM calls WHERE provider='context' AND at>=?",
      )
      .get(today).n,
    cap = Number(process.env.CONTEXT_DAILY_CAP || 1500),
    pause = used >= 28000 || daily >= cap - 150;
  for (const m of all("monitor")) {
    if (!m.id) continue;
    const expired =
      get("watch", m.watchId)?.expiresAt &&
      Date.parse(get("watch", m.watchId).expiresAt) < Date.now();
    const status = pause || expired ? "paused" : "active";
    if (m.status === status) continue;
    await call(
      "context",
      "/monitors/" + m.id,
      { status },
      { method: "PATCH", fresh: true, management: true },
    );
    put("monitor", m.routeId, {
      ...m,
      status,
      budgetCheckedAt: new Date().toISOString(),
    });
  }
  put("meta", "monitorBudget", {
    at: new Date().toISOString(),
    daily,
    used,
    paused: pause,
  });
}
export function monitorMetrics(watchId) {
  const m = all("monitor").filter((m) => !watchId || m.watchId === watchId),
    events = all("webhook").filter((e) => !watchId || e.watchId === watchId);
  return {
    registered: m.filter((x) => x.id).length,
    active: m.filter((x) => x.status === "active").length,
    events: events.length,
    verifiedEvents: events.length,
    changes: events.filter((e) => e.event === "change.detected").length,
    processed: events.filter((e) => e.status === "processed").length,
    kinds: [...new Set(m.map((x) => x.kind))],
    lastEvent:
      events
        .map((e) => e.receivedAt)
        .sort()
        .at(-1) || null,
    budget: get("meta", "monitorBudget"),
  };
}

export async function cleanExpiredMonitors() {
  for (const m of all("monitor")) {
    const w = get("watch", m.watchId);
    if (!m.id || !w?.expiresAt || Date.parse(w.expiresAt) > Date.now())
      continue;
    try {
      await call(
        "context",
        "/monitors/" + m.id,
        {},
        { method: "DELETE", fresh: true, management: true },
      );
      db.prepare("DELETE FROM records WHERE kind='monitor' AND id=?").run(
        m.routeId,
      );
    } catch (error) {
      if (error.status === 404)
        db.prepare("DELETE FROM records WHERE kind='monitor' AND id=?").run(
          m.routeId,
        );
    }
  }
}

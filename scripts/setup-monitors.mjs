import { get } from "../signal/providers.mjs";
import { setupMonitors, monitorMetrics } from "../signal/monitors.mjs";
await setupMonitors(
  get("watch", process.argv[2] || "baltics"),
  process.env.SIGNAL_PUBLIC_URL || "https://signal-fire.72.61.22.106.sslip.io",
);
console.log(monitorMetrics());

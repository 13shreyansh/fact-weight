import { execFileSync } from "node:child_process";
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
if (!/^[a-f0-9]{40}$/.test(sha)) throw Error("Invalid release commit");
execFileSync(
  "git",
  [
    "diff",
    "--exit-code",
    "--",
    "signal",
    "public",
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "deploy/signal-fire.sh",
  ],
  { stdio: "inherit" },
);
const archive = "work/signal-" + sha + ".tgz";
execFileSync("git", ["archive", "--format=tar.gz", "-o", archive, sha]);
execFileSync(
  "scp",
  ["-q", archive, "root@72.61.22.106:/opt/signal-fire/release-" + sha + ".tgz"],
  { stdio: "inherit" },
);
const command = `mkdir -p /opt/signal-fire/releases/${sha}\ntar -xzf /opt/signal-fire/release-${sha}.tgz -C /opt/signal-fire/releases/${sha}\ncd /opt/signal-fire/releases/${sha}\nSIGNAL_SHA=${sha} sh deploy/signal-fire.sh`;
execFileSync("ssh", ["-o", "BatchMode=yes", "root@72.61.22.106", command], {
  stdio: "inherit",
});
let verified = false;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(
      "https://signal-fire.72.61.22.106.sslip.io/api/health",
      { signal: AbortSignal.timeout(5000) },
    );
    if (r.ok && (await r.json()).commit === sha) {
      verified = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 2000));
}
if (!verified)
  throw Error("Release did not pass public HTTPS commit verification");
console.log("VERIFIED_DEPLOYED_COMMIT", sha);

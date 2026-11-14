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
console.log("RELEASED_COMMIT", sha);

import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = new URL("../../", import.meta.url),
  manifest = JSON.parse(
    await fs.readFile(new URL("manifest.json", import.meta.url), "utf8"),
  );
const target = new URL(
  `work/c16-replay-${new Date().toISOString().replace(/[:.]/g, "-")}/`,
  root,
);
await fs.mkdir(target, { recursive: false });
for (const relative of [
  ...Object.keys(manifest.hashes),
  "eval/c16/manifest.json",
]) {
  const to = new URL(relative, target);
  await fs.mkdir(new URL("./", to), { recursive: true });
  await fs.copyFile(new URL(relative, root), to);
}
await fs.mkdir(new URL("work/c16/", target), { recursive: true });
await fs.copyFile(
  new URL("work/c16/sources.json", root),
  new URL("work/c16/sources.json", target),
);
await fs.symlink(fileURLToPath(new URL(".env", root)), new URL(".env", target));
console.log("New replay directory:", fileURLToPath(target));
console.log(
  "Uses configured provider credentials and credits. Original frozen results are not changed.",
);
const child = spawn(
  process.execPath,
  [fileURLToPath(new URL("eval/c16/run.mjs", target))],
  { stdio: "inherit" },
);
child.on("exit", (code) => (process.exitCode = code ?? 1));

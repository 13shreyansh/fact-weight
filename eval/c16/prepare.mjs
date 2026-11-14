import fs from "node:fs/promises";
import { scrape } from "../../retrieval.mjs";
for (const l of (
  await fs.readFile(new URL("../../.env", import.meta.url), "utf8")
).split("\n")) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
const at = new URL("./", import.meta.url),
  work = new URL("../../work/c16/", import.meta.url);
// Reconstruct only the sealed source bodies. Never overwrite frozen public metadata.
const metadata = JSON.parse(
  await fs.readFile(new URL("sources.json", at), "utf8"),
);
const manifest = JSON.parse(
  await fs.readFile(new URL("manifest.json", at), "utf8"),
);
const live = await Promise.all(
  metadata.map(async (m) => ({
    frozen: m,
    fetched: await scrape(m.url, { fresh: true }),
  })),
);
for (const { frozen, fetched } of live)
  if (fetched.hash !== manifest.sources.find((s) => s.id === frozen.id)?.hash)
    throw Error(
      `Source drift: ${frozen.id}. Refuse to replace sealed evidence.`,
    );
await fs.mkdir(work, { recursive: true });
await fs.writeFile(
  new URL("sources.json", work),
  JSON.stringify(
    live.map(({ frozen, fetched }) => ({
      ...frozen,
      text: fetched.text,
      replayFetch: { at: fetched.fetchedAt, requestId: fetched.requestId },
    })),
    null,
    2,
  ) + "\n",
);
console.log({
  verifiedSourceBodies: live.length,
  scope: "Same-hash source replay. No frozen metadata changed.",
});

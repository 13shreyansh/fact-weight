import fs from "node:fs/promises";
import { scrape } from "../retrieval.mjs";
try {
  for (const l of (
    await fs.readFile(new URL("../.env", import.meta.url), "utf8")
  ).split("\n")) {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]])
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
} catch {}
await fs.mkdir(new URL("../work/", import.meta.url), { recursive: true });
const docs = [
  [
    "live-v4.json",
    "https://data.consilium.europa.eu/doc/document/ST-6668-2025-INIT/en/pdf",
  ],
  [
    "source2-record.json",
    "https://www.consilium.europa.eu/en/press/press-releases/2025/06/13/eu-member-states-agree-to-extend-temporary-protection-for-refugees-from-ukraine/",
  ],
];
for (const [file, url] of docs) {
  const source = { ...(await scrape(url, { fresh: true })), id: "S1" };
  await fs.writeFile(
    new URL("../work/" + file, import.meta.url),
    JSON.stringify({ sources: [source] }, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      url,
      requestId: source.requestId,
      hash: source.hash,
      fetchedAt: source.fetchedAt,
    }),
  );
}

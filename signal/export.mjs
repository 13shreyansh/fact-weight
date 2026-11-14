import PDFDocument from "pdfkit";
import { ZipArchive } from "archiver";
import { hash } from "./providers.mjs";
export const csv = (items, fields) =>
  [
    fields.join(","),
    ...items.map((p) =>
      fields
        .map(
          (f) =>
            '"' +
            String(
              typeof p[f] === "string" && /^[=+@\-\t\r]/.test(p[f])
                ? "'" + p[f]
                : (p[f] ?? ""),
            ).replaceAll('"', '""') +
            '"',
        )
        .join(","),
    ),
  ].join("\r\n");
export const labels = {
  strong: "Looks coordinated: strong",
  moderate: "Looks coordinated: moderate",
  organic: "Looks organic",
  "not-enough": "Not enough data",
};
export async function pdf(p) {
  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const ready = new Promise((r) =>
    doc.on("end", () => r(Buffer.concat(chunks))),
  );
  // Embedded Golos covers the watch's Latin and Cyrillic scripts.
  doc.registerFont("Golos", "public/fonts/golos-text.ttf");
  doc.font("Golos");
  const h = (s) => {
    if (/^[1-9]\. /.test(s) || doc.y > 700) doc.addPage();
    doc.moveDown().fontSize(15).text(s).moveDown(0.4).fontSize(10);
  };
  const when = (value) =>
    value
      ? new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Vilnius",
        }).format(new Date(value))
      : "could not be measured";
  const excerpt = (value) => {
    const clean = value.replace(/^[^\p{L}\p{N}]+/u, "");
    const emoji = clean.search(
      /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u,
    );
    const end = Math.min(900, emoji < 0 ? clean.length : emoji);
    return (
      clean.slice(0, end).trim() +
      (end < clean.length || clean !== value ? "…" : "")
    );
  };
  const text = (s) =>
    doc
      .fontSize(10)
      .text(String(s || ""), { width: 499, lineGap: 3 })
      .moveDown(0.4);
  h("Signal Fire evidence pack");
  doc.fontSize(21).text(p.title);
  text(p.packId + " · built " + when(p.checkedAt) + " · Vilnius time");
  h(labels[p.verdict]);
  text(
    `${p.posts.length} public posts from ${p.accounts.length} publishing identities. First observed ${when(p.firstSeen)}.`,
  );
  text(
    "Signal Fire flags coordination and weak evidence, whoever is behind it. It does not say who is responsible. Nothing was reported or removed.",
  );
  if (p.mode === "replay") text(p.replayLabel);
  h("1. Timeline");
  const times = p.posts
    .filter((x) => x.postedAt)
    .map((x) => Date.parse(x.postedAt));
  if (times.length) {
    const first = Math.min(...times),
      last = Math.max(...times);
    const chart = (label, min, max) => {
      text(label);
      const bins = Array(90).fill(0);
      times
        .filter((t) => t >= min && t <= max)
        .forEach(
          (t) =>
            bins[Math.min(89, Math.floor(((t - min) / (max - min)) * 90))]++,
        );
      const unit = Math.max(1, Math.ceil(Math.max(...bins) / 24));
      const y = doc.y + 125;
      bins.forEach((n, i) => {
        for (let j = 0; j < n; j += unit)
          doc
            .fillColor(p.verdict === "organic" ? "#7C8993" : "#E8590C")
            .rect(48 + i * 5, y - Math.floor(j / unit) * 5, 4, 4)
            .fill();
      });
      doc
        .strokeColor("#D5DBDF")
        .moveTo(48, y + 6)
        .lineTo(499, y + 6)
        .stroke();
      doc
        .fillColor("#46535C")
        .fontSize(9)
        .text(when(new Date(min).toISOString()), 48, y + 14, {
          width: 220,
          lineBreak: false,
        })
        .text(when(new Date(max).toISOString()), 280, y + 14, {
          width: 220,
          align: "right",
          lineBreak: false,
        });
      doc.y = y + 35;
      doc.fillColor("#111B21");
      text(
        `One square = ${unit} ${unit === 1 ? "post" : "posts"}. Vilnius time.`,
      );
    };
    chart(
      "Whole push",
      first - 2 * 3600000,
      Math.max(last + 2 * 3600000, first + 4 * 3600000),
    );
    chart(
      "Peak 10 minutes",
      Date.parse(p.peakAt),
      Date.parse(p.peakAt) + 600000,
    );
  }
  h("2. Why it looks coordinated");
  for (const s of p.signals) text(s.name + ". " + s.reason);
  h("What could explain it innocently");
  for (const s of p.innocentExplanations) text(s);
  h("3. Accounts");
  for (const a of p.accounts.slice(0, 25))
    text(
      `${a.handle} · ${a.platform} · Created: ${a.createdAt || "could not be measured"} · Followers: ${a.followers ?? "could not be measured"}\n${a.url}`,
    );
  h("4. The text");
  for (const post of p.posts.slice(0, 10)) {
    text(post.handle + " · " + when(post.postedAt));
    text(excerpt(post.text));
    doc
      .fillColor("#0B6B74")
      .text(post.url, { link: post.url, underline: true })
      .fillColor("#111B21");
  }
  text(`All ${p.posts.length} public posts are in posts.csv.`);
  h("5. The site");
  text(
    p.sites.length
      ? "See the linked domain records in the data export."
      : "No post in this push links to a verified look-alike site.",
  );
  h("6. Claims and sources");
  text(p.claim);
  for (const e of p.evidence) {
    text(e.stance + " · " + e.name);
    text(e.quote);
    doc
      .fillColor("#0B6B74")
      .text(e.url, { link: e.url, underline: true })
      .fillColor("#111B21");
  }
  h("7. Wording");
  for (const t of p.techniques) {
    text(t.name + ": " + t.explanation);
    text(t.phrase);
  }
  text("Wording is described, not scored. It does not affect the verdict.");
  h("8. Seen before");
  for (const c of p.seenBefore) text(c.title + "\n" + c.url);
  if (!p.seenBefore.length)
    text(
      "No earlier case of this claim in the retrieved EUvsDisinfo cases. That does not mean it is new.",
    );
  h("9. How to check this yourself");
  text(
    "Open the public post links in part 4 and the source links in part 6. Account creation dates and follows are often unavailable. A real community can post fast and alike. Trusted sources can be wrong or silent. A person decides.",
  );
  text(
    "Evidence data SHA-256: " +
      hash({
        posts: p.posts,
        accounts: p.accounts,
        claim: p.claim,
        evidence: p.evidence,
        signals: p.signals,
      }),
  );
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .text(`${p.packId} · page ${i + 1} of ${range.count}`, 48, 795, {
        lineBreak: false,
      });
  }
  doc.end();
  return ready;
}
export async function zip(p, res, pdfBytes) {
  const a = new ZipArchive({ zlib: { level: 6 } });
  a.pipe(res);
  a.append(pdfBytes || (await pdf(p)), { name: "pack.pdf" });
  a.append(
    csv(p.posts, [
      "id",
      "postedAt",
      "handle",
      "platform",
      "language",
      "text",
      "url",
      "views",
    ]),
    { name: "posts.csv" },
  );
  a.append(
    csv(p.accounts, [
      "id",
      "handle",
      "platform",
      "url",
      "createdAt",
      "followers",
    ]),
    { name: "accounts.csv" },
  );
  a.append(JSON.stringify(p.posts, null, 2), { name: "posts-original.json" });
  a.append(
    JSON.stringify(
      {
        claim: p.claim,
        evidence: p.evidence,
        signals: p.signals,
        judgement: p.judgement,
      },
      null,
      2,
    ),
    { name: "claims.json" },
  );
  a.append(
    `Signal Fire ${p.packId}\nPublic source evidence. Unknown dates and counts are empty in CSV.\nNo posts were reported or removed. Quotes remain the property of their publishers.\n`,
    { name: "README.txt" },
  );
  await a.finalize();
}

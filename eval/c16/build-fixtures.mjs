import fs from "node:fs/promises";
const at = new URL("./", import.meta.url),
  work = new URL("../../work/c16/", import.meta.url);
try {
  await fs.access(new URL("manifest.json", at));
  throw Error("Audit already sealed; do not regenerate fixtures.");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const docs = JSON.parse(
  await fs.readFile(new URL("sources.json", work), "utf8"),
);
const definitions = [
  [
    "grid-date-support",
    "entsoe",
    "supported",
    1,
    "Estonia, Latvia and Lithuania synchronised their electricity grids with continental Europe on 9 February 2025.",
    "On 9 February 2025, the electricity grids of Estonia, Latvia and Lithuania joined the Continental Europe Synchronous Area.",
    {
      subject: "Estonia, Latvia, Lithuania",
      event: "grid synchronisation with continental Europe",
      date: "2025-02-09",
    },
  ],
  [
    "grid-date-conflict",
    "entsoe",
    "contradicted",
    1,
    "Estonia, Latvia and Lithuania synchronised their electricity grids with continental Europe on 10 February 2025.",
    "The Baltic countries Estonia, Latvia and Lithuania completed their grid synchronisation with continental Europe on 10 February 2025.",
    {
      subject: "Estonia, Latvia, Lithuania",
      event: "grid synchronisation with continental Europe",
      date: "2025-02-10",
    },
  ],
  [
    "grid-count-gap",
    "entsoe",
    "unsupported",
    1,
    "Exactly 47 electrical substations in Lithuania were replaced on 9 February 2025 as part of the Baltic synchronisation.",
    "The Baltic grid synchronisation involved replacing precisely 47 Lithuanian electrical substations on 9 February 2025.",
    {
      subject: "Lithuanian electrical substations",
      event: "replacement in Baltic synchronisation",
      quantity: 47,
      date: "2025-02-09",
    },
  ],
  [
    "grid-opinion",
    "entsoe",
    "unsupported",
    0,
    "I think the Baltic grid synchronisation was a wonderful idea.",
    "In my opinion, synchronising the Baltic electricity grids was an excellent idea.",
    { opinion: true },
  ],
  [
    "accession-date-support",
    "nato-act",
    "supported",
    1,
    "Finland joined NATO on 4 April 2023.",
    "Finland became a member of NATO on 4 April 2023.",
    { subject: "Finland", event: "NATO accession", date: "2023-04-04" },
  ],
  [
    "accession-date-conflict",
    "nato-act",
    "contradicted",
    1,
    "Finland joined NATO on 5 April 2023.",
    "Finland became a member of NATO on 5 April 2023.",
    { subject: "Finland", event: "NATO accession", date: "2023-04-05" },
  ],
  [
    "accession-fee-gap",
    "nato-act",
    "unsupported",
    1,
    "Finland paid exactly 13 million euros as an accession fee on 4 April 2023.",
    "On 4 April 2023, Finland paid a NATO entry fee of precisely 13 million euros.",
    {
      subject: "Finland",
      event: "NATO accession fee payment",
      quantity: "13 million euros",
      date: "2023-04-04",
    },
  ],
  [
    "flag-opinion",
    "nato-act",
    "unsupported",
    0,
    "I personally like the design of the Finnish flag.",
    "The Finnish flag has a design that I personally find appealing.",
    { opinion: true },
  ],
];
const variants = [
  "original",
  "rephrased",
  "neutral-wrapper",
  "source-rename",
  "source-reorder",
  "publisher-redacted",
];
const cases = [];
function add(def, slice = "main") {
  const [
    familyId,
    sourceKey,
    expectedStatus,
    expectedCount,
    post,
    rephrased,
    meaning,
  ] = def;
  const primary = docs.find((s) => s.id === sourceKey),
    other = docs.find(
      (s) => s.id === (sourceKey === "entsoe" ? "nato-act" : "entsoe"),
    );
  for (const variant of variants) {
    let refs = [
      { key: sourceKey, id: "S1", url: primary.url, title: primary.title },
    ];
    if (slice === "main")
      refs.push({
        key: other.id,
        id: "S2",
        url: other.url,
        title: other.title,
      });
    let text =
      variant === "rephrased"
        ? rephrased
        : variant === "neutral-wrapper"
          ? `Statement to inspect against the supplied documents: ${post}`
          : post;
    if (variant === "source-rename")
      refs = refs.map((r, i) => ({
        ...r,
        id: `EVIDENCE_${41 + i * 31}`,
        title: `Evidence file ${i + 1}`,
      }));
    if (variant === "source-reorder") refs.reverse();
    if (variant === "publisher-redacted")
      refs = refs.map((r, i) => ({
        ...r,
        title: `Document ${i + 1}`,
        url: `https://document-${i + 1}.${i === 0 ? "example.org" : "example.net"}/record`,
      }));
    cases.push({
      id: `${slice}-${familyId}-${variant}`,
      slice,
      familyId,
      publisher: primary.publisher,
      sourceKey,
      variant,
      post: text,
      reference: {
        expectedStatus,
        expectedClaimCount: expectedCount,
        meaning,
        labelProvenance:
          "agent-authored source-derived reference; independent review pending; no human labels",
      },
      inputSources: refs.map((r) => ({
        ...r,
        canonicalUrl: docs.find((s) => s.id === r.key).url,
        bodySha256: docs.find((s) => s.id === r.key).hash,
      })),
      primaryInputId: refs.find((r) => r.key === sourceKey).id,
    });
  }
}
for (const def of definitions) add(def);
add(
  [
    "missing-article",
    "nato",
    "unsupported",
    1,
    "Finland joined NATO on 4 April 2023.",
    "Finland became a member of NATO on 4 April 2023.",
    {
      subject: "Finland",
      event: "NATO accession",
      date: "2023-04-04",
      intendedArticleStatus: "supported",
      suppliedModalStatus: "unsupported",
    },
  ],
  "retrieval-failure-probe",
);
await fs.writeFile(
  new URL("fixtures.json", at),
  JSON.stringify(cases, null, 2) + "\n",
);
console.log({
  cases: cases.length,
  main: cases.filter((c) => c.slice === "main").length,
  families: definitions.length,
  variants,
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAnalysis, groupSources, safeURL } from "../engine.mjs";
const text =
  "The grid operator reported that all three Baltic states disconnected on 8 February 2025.";
const source = {
  id: "S1",
  url: "https://example.org/report",
  text,
  title: "Report",
  fetchedAt: "2026-11-14T15:00:00Z",
};
test("made-up source IDs and nonverbatim quotes cannot create contradiction", () => {
  const r = validateAnalysis(
    {
      claims: [
        {
          claim: "A claim",
          evidence: [
            {
              sourceId: "S99",
              quote: text,
              relation: "contradicts",
              basis: "direct_record",
            },
            {
              sourceId: "S1",
              quote: "This invented passage does not occur anywhere.",
              relation: "contradicts",
            },
          ],
        },
      ],
    },
    [source],
  );
  assert.equal(r.claims[0].status, "unsupported");
  assert.equal(r.rejectedCitations, 2);
});
test("duplicate publications count as one group", () => {
  const sources = groupSources([
    source,
    { ...source, id: "S2", url: "https://mirror.example.net/report" },
  ]);
  assert.equal(sources[0].group, sources[1].group);
});
test("same-domain publications collapse even with different words", () => {
  const sources = groupSources([
    source,
    {
      ...source,
      id: "S2",
      url: "https://news.example.org/new",
      text: "A different passage",
    },
  ]);
  assert.equal(sources[0].group, sources[1].group);
});
test("contrary evidence stays contested even inside one group", () => {
  const r = validateAnalysis(
    {
      claims: [
        {
          claim: "X",
          evidence: [
            {
              sourceId: "S1",
              quote: text,
              relation: "supports",
              basis: "direct_record",
            },
            {
              sourceId: "S1",
              quote: text,
              relation: "contradicts",
              basis: "direct_record",
            },
          ],
        },
      ],
    },
    [source],
  );
  assert.equal(r.claims[0].status, "contested");
});
test("private literal targets and credentials rejected", () => {
  for (const s of [
    "http://example.org/",
    "https://127.0.0.1",
    "https://169.254.169.254/latest",
    "https://localhost/",
    "https://name:pass@example.org/",
    "https://[::1]/",
  ])
    assert.equal(safeURL(s), null);
  assert.equal(safeURL("https://news.err.ee/abc"), "https://news.err.ee/abc");
});

test("absence and allegations cannot support or contradict an event", () => {
  const r = validateAnalysis(
    {
      claims: [
        {
          claim: "X",
          claimType: "event",
          evidence: [
            {
              sourceId: "S1",
              quote: text,
              relation: "contradicts",
              basis: "absence",
            },
            {
              sourceId: "S1",
              quote: text,
              relation: "supports",
              basis: "allegation",
            },
          ],
        },
      ],
    },
    [source],
  );
  assert.equal(r.claims[0].status, "unsupported");
});

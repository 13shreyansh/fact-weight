import test from "node:test";
import assert from "node:assert/strict";
import { summaryPush } from "../signal/summary.mjs";
test("home payload retains measured chart rows and quotes without full source documents", () => {
  const p = {
    id: "x",
    posts: [
      { id: "p", text: "Original quote", postedAt: "2026-11-14T00:00:00Z" },
      { id: "q", text: "Other text" },
    ],
    accounts: [{ id: "a" }],
    evidence: [
      {
        stance: "for",
        quote: "private large source document",
        publisherGroup: "source",
      },
    ],
    sources: [{ text: "large" }],
    copied: ["p"],
    backgroundPosts: [{ id: "b", text: "large background" }],
  };
  let s = summaryPush(p);
  assert.equal(s.posts.length, 2);
  assert.equal(s.posts[0].text, "Original quote");
  assert.equal(s.posts[1].text, undefined);
  assert.equal(s.sources, undefined);
  assert.equal(s.backgroundPosts[0].text, undefined);
  assert.equal(s.evidence[0].stance, "for");
});

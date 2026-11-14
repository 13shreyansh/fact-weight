import test from "node:test";
import assert from "node:assert/strict";
import { storeArticle } from "../signal/news-pages.mjs";
import { sameCopiedStory } from "../signal/overlap.mjs";
test("article extraction excludes navigation and preserves the declared original source", () => {
  const p = storeArticle(
    {
      metadata: { publishedTime: "2026-11-14T12:00:00Z" },
      html: {
        data: '<html lang="fi"><article>Site navigation<h1>Story title</h1><div itemprop="articleBody"><p>First paragraph.</p><p>Second paragraph.</p></div><span data-source-url="https://t.me/source">Source</span></article></html>',
      },
    },
    "https://finland.news-pravda.com/world/2026/11/14/1.html",
    false,
  );
  assert.equal(p.title, "Story title");
  assert.equal(p.text, "First paragraph.\nSecond paragraph.");
  assert.equal(p.declaredSourceURL, "https://t.me/source");
  assert.ok(!p.text.includes("navigation"));
});
test("the same copied story merges even when language edition URLs differ", () => {
  let a = Array.from({ length: 8 }, (_, i) => ({
    id: "a" + i,
    text: "this is a long shared report about a specific event with many exact words repeated",
  }));
  let b = a.map((p, i) => ({ ...p, id: "b" + i }));
  assert.equal(sameCopiedStory(a, b), true);
  assert.equal(
    sameCopiedStory(
      a,
      b.map((p) => ({
        ...p,
        text: "a wholly separate report on another event has distinct words and sentences here",
      })),
    ),
    false,
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { db, put, get } from "../signal/providers.mjs";
test("database waits for a concurrent collector instead of failing immediately", () => {
  assert.equal(db.prepare("PRAGMA busy_timeout").get().timeout, 15000);
});
test("unknown account creation dates never fire the account-age signal", async () => {
  const { measure } = await import("../signal/detect.mjs");
  let p = Array.from({ length: 8 }, (_, i) => ({
    id: "" + i,
    text: "one two three four five six seven eight nine ten eleven twelve",
    postedAt: new Date(1794690000000 + i * 1000).toISOString(),
    links: [],
  }));
  assert.equal(
    measure(p, [], [{ createdAt: null }]).signals.find(
      (s) => s.key === "new_accounts",
    ).fired,
    false,
  );
});
test("language alternate metadata cannot fire a text signal without measured copies", async () => {
  const { measure } = await import("../signal/detect.mjs");
  const posts = Array.from({ length: 15 }, (_, i) => ({
    id: String(i),
    text: Array.from({ length: 20 }, (_, j) => "word" + i + "variant" + j).join(
      " ",
    ),
    postedAt: new Date(1794690000000 + i * 1000).toISOString(),
    links: [],
    alternates: ["https://same.example"],
  }));
  assert.equal(
    measure(posts, [], []).signals.find((s) => s.key === "same_text").fired,
    false,
  );
});
test("text signal counts exact variant members rather than all narrative posts", async () => {
  const { measure } = await import("../signal/detect.mjs");
  const texts = [
    "one two three four five six seven eight nine ten",
    "alpha bravo charlie delta echo foxtrot golf hotel india",
  ];
  const posts = Array.from({ length: 15 }, (_, i) => ({
    id: String(i),
    text:
      i < 7
        ? texts[0]
        : i < 9
          ? texts[1]
          : "unique-" + i + " completely different message " + i,
    postedAt: new Date(1794690000000 + i * 1000).toISOString(),
    links: [],
  }));
  const m = measure(posts, [], []);
  assert.equal(m.copied.length, 9);
  assert.equal(m.signals.find((s) => s.key === "same_text").measured, 9);
  assert.equal(m.signals.find((s) => s.key === "same_text").fired, true);
});
test("missing same-hour/weekday observations stay unknown rather than becoming zero", async () => {
  const { measure } = await import("../signal/detect.mjs");
  const posts = Array.from({ length: 8 }, (_, i) => ({
    id: "new" + i,
    platform: "TG",
    text: "a b c d e f g h i j",
    postedAt: new Date(
      Date.parse("2026-11-14T12:00:00Z") + i * 1000,
    ).toISOString(),
    links: [],
  }));
  const prior = Array.from({ length: 7 }, (_, i) => ({
    id: "old" + i,
    platform: "TG",
    text: "a b c d e f g h i j",
    postedAt: new Date(
      Date.parse("2026-11-13T00:00:00Z") - i * 86400000,
    ).toISOString(),
  }));
  let s = measure(posts, prior, []).signals.find((s) => s.key === "timing");
  assert.equal(s.baseline, null);
  assert.equal(s.fired, false);
});
test("adding a platform without a historical baseline cannot create a burst signal", async () => {
  const { measure } = await import("../signal/detect.mjs");
  const posts = Array.from({ length: 15 }, (_, i) => ({
    id: "new" + i,
    platform: "NW",
    text: "a b c d e f g h i j",
    postedAt: new Date(
      Date.parse("2026-11-14T12:00:00Z") + i * 1000,
    ).toISOString(),
    links: [],
  }));
  const prior = Array.from({ length: 7 }, (_, i) => ({
    id: "old" + i,
    platform: "TG",
    text: "a b c d e f g h i j",
    postedAt: new Date(
      Date.parse("2026-11-13T12:00:00Z") - i * 86400000,
    ).toISOString(),
  }));
  assert.equal(
    measure(posts, prior, []).signals.find((s) => s.key === "timing").fired,
    false,
  );
});
test("peak bin keeps a post exactly ten minutes after the first", async () => {
  const { measure } = await import("../signal/detect.mjs");
  const p = [
    {
      id: "a",
      postedAt: "2026-11-14T12:00:00Z",
      platform: "TG",
      text: "one two three four five six seven eight nine ten",
      links: [],
    },
    {
      id: "b",
      postedAt: "2026-11-14T12:10:00Z",
      platform: "TG",
      text: "other words",
      links: [],
    },
  ];
  assert.equal(measure(p, [], []).peak, 2);
});
test("newly sampled network is not compared with a different news collection", async () => {
  const { measure } = await import("../signal/detect.mjs");
  const posts = Array.from({ length: 15 }, (_, i) => ({
    id: "new" + i,
    platform: "NW",
    url: "https://lt.news-pravda.com/" + i,
    text: "a b c d e f g h i j",
    postedAt: new Date(
      Date.parse("2026-11-14T12:00:00Z") + i * 1000,
    ).toISOString(),
    links: [],
  }));
  const prior = Array.from({ length: 7 }, (_, i) => ({
    id: "old" + i,
    platform: "NW",
    url: "https://news.err.ee/" + i,
    text: "a b c d e f g h i j",
    postedAt: new Date(
      Date.parse("2026-11-13T12:00:00Z") - i * 86400000,
    ).toISOString(),
  }));
  assert.equal(
    measure(posts, prior, []).signals.find((s) => s.key === "timing").fired,
    false,
  );
});

import { scrape, get, put, all, search } from "../signal/providers.mjs";
const seeds = new Set([
  "antifalivland",
  "latvijasbalzams",
  "baltic_province",
  "Pravda_Latvia",
  "estlatlitv",
  "alekseystefanov",
  "cop_lt",
  "rybar",
  "OstashkoNews",
  "kotreal",
  "news_lv",
  "errnews",
  "lrtnews",
  "lsm_lv",
]);
for (const d of all("discovery"))
  if (
    d.metadata?.title?.includes("Telegram") ||
    d.metadata?.title?.includes("Baltic")
  )
    for (const m of (d.markdown?.data || "").matchAll(
      /https?:\/\/t\.me\/(?:s\/)?([A-Za-z0-9_]+)/g,
    ))
      seeds.add(m[1]);
for (let i = 0, arr = [...seeds]; i < arr.length; i += 6)
  await Promise.allSettled(
    arr.slice(i, i + 6).map(async (ch) => {
      try {
        const d = await scrape("https://t.me/s/" + ch);
        put("telegram", ch, { ...d, channel: ch });
        console.log(ch, JSON.stringify(d).length);
      } catch (e) {
        put("failure", "tg-" + ch, { error: e.message });
        console.log(ch, e.message);
      }
    }),
  );

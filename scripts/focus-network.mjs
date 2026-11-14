import { call, get, put, scrape, hash } from "../signal/providers.mjs";
import { load } from "cheerio";
import { storeArticle } from "../signal/news-pages.mjs";
const urls = [
  "https://estonia.news-pravda.com/",
  "https://latvia.news-pravda.com/",
  "https://lithuania.news-pravda.com/",
  "https://finland.news-pravda.com/",
  "https://pravda-ee.com/",
  "https://pravda-lv.com/",
  "https://pravda-lt.com/",
  "https://pravda-fi.com/",
  "https://news-estonia.com/",
  "https://latvia-news.com/",
  "https://lithuania-news.com/",
];
const submitted = await call("context", "/batch/submit", {
  input: {
    mode: "scrape",
    data: {
      urls: urls.map((url, i) => ({ url, itemId: "index-" + i })),
      formats: { markdown: true, html: true },
      sharedParams: { mainContentOnly: false },
    },
  },
});
put("batch", "network-indices", {
  ...submitted,
  submitCall: submitted._call,
  urls,
});
console.log("batch", submitted.id, submitted.status);
for (let i = 0; i < 30; i++) {
  const status = await call(
    "context",
    "/batch/" + submitted.id,
    {},
    { method: "GET", fresh: true },
  );
  if (["completed", "failed", "cancelled"].includes(status.status)) {
    put("batch", "network-indices-status", status);
    console.log("batch status", status.status);
    break;
  }
  await new Promise((r) => setTimeout(r, 2000));
}
const results = await call(
  "context",
  "/batch/" + submitted.id + "/results",
  {},
  { method: "GET", fresh: true },
);
put("batch", "network-indices-results", results);
console.log("result keys", Object.keys(results));
const rows = results.data || results.results || [];
for (const row of rows) {
  const d = row.result || row.data || row;
  const url =
    row.url || row.input?.url || urls[Number(row.itemId?.split("-")[1])];
  if (url && d.markdown) {
    put("network-index", url, { ...d, url, _call: submitted._call });
    console.log(url, d.metadata?.canonicalUrl, d.markdown?.data?.length);
  }
}

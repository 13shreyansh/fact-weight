import { marked } from "marked";
import { load } from "cheerio";
export function plainText(markdown) {
  return load(marked.parse(markdown || ""))
    .text()
    .replace(/\s+/g, " ")
    .trim();
}
export function passages(text, query, sourceId) {
  const words = (query.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []).filter(
    (w) =>
      ![
        "that",
        "this",
        "with",
        "from",
        "have",
        "been",
        "russia",
        "russian",
        "ukraine",
      ].includes(w),
  );
  const sentences = [
    ...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text),
  ]
    .map((s, i) => ({
      id: sourceId + "-p" + i,
      text: s.segment.trim(),
      index: s.index,
    }))
    .filter((s) => s.text.length >= 30 && s.text.length < 1500);
  return sentences
    .map((s) => ({
      ...s,
      relevance: words.reduce(
        (n, w) => n + (s.text.toLowerCase().includes(w) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.relevance - a.relevance || a.index - b.index)
    .slice(0, 16)
    .sort((a, b) => a.index - b.index)
    .map(({ relevance, ...p }) => p);
}

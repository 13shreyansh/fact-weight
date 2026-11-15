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
  const segments = [
    ...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text),
  ];
  const sentences = segments
    .map((s, i) => {
      const end = segments[Math.min(segments.length - 1, i + 2)],
        stop = end.index + end.segment.length;
      return {
        id: sourceId + "-p" + i,
        text: text.slice(s.index, stop).trim(),
        index: s.index,
      };
    })
    .filter((s) => s.text.length >= 30 && s.text.length < 1800);
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

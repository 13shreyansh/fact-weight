import { shingles, jaccard } from "./detect.mjs";
export function sameCopiedStory(a, b) {
  const smaller = a.length <= b.length ? a : b,
    larger = a.length <= b.length ? b : a;
  const groups = larger.map((p) => shingles(p.text));
  const matched = smaller.filter((p) => {
    const s = shingles(p.text);
    return s.size >= 8 && groups.some((g) => jaccard(s, g) >= 0.72);
  }).length;
  return matched >= 3 && matched / smaller.length >= 0.5;
}

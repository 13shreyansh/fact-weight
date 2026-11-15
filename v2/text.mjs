// Text normalisation, shingles and similarity used to confirm near-identical copies.
const CJK = /[぀-ヿ㐀-鿿가-힯]/u;
export function tokens(text) {
  const out = [];
  for (const w of String(text || "").toLowerCase().match(/[\p{L}\p{N}]+/gu) || []) {
    if (CJK.test(w)) out.push(...w);
    else out.push(w);
  }
  return out;
}
export function shingles(toks, k = 4) {
  const s = new Set();
  if (toks.length < k) {
    if (toks.length) s.add(toks.join(" "));
    return s;
  }
  for (let i = 0; i + k <= toks.length; i++) s.add(toks.slice(i, i + k).join(" "));
  return s;
}
export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n);
}
export function containment(a, b) {
  if (!a.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / a.size;
}
// Best Jaccard between a short reference passage and any equally long window of a document.
export function windowJaccard(refText, docText, k = 4) {
  const r = tokens(refText),
    d = tokens(docText).slice(0, 1500);
  if (r.length < 8 || d.length < 8) return 0;
  const R = shingles(r, k),
    w = r.length;
  if (d.length <= w) return jaccard(R, shingles(d, k));
  let best = 0;
  const step = Math.max(1, Math.floor(w / 6));
  for (let i = 0; i + w <= d.length + step; i += step) {
    const j = jaccard(R, shingles(d.slice(i, i + w), k));
    if (j > best) best = j;
    if (best >= 0.95) break;
  }
  return best;
}
export const headlineSim = (a, b) => jaccard(shingles(tokens(a), 2), shingles(tokens(b), 2));
export function cleanTitle(t) {
  let s = String(t || "").replace(/\s+/g, " ").trim();
  const m = s.match(/^(.*\S)\s+[-|–—:]\s+([^-|–—]{2,40})$/);
  if (m && m[1].length > 25) s = m[1];
  return s;
}
export function mainText(markdown) {
  return String(markdown || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split("\n")
    .map((l) => l.replace(/^[#>*\-\s|]+/, "").trim())
    .filter((l) => l.length >= 60 || /[.!?。]$/.test(l))
    .join("\n")
    .slice(0, 12000);
}
export function sentences(text) {
  return String(text || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 260);
}
const SLD = new Set(["co", "com", "org", "net", "gov", "ac", "edu", "ne", "or", "go"]);
export function site(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\d?\./, "").toLowerCase();
    const p = h.split(".");
    if (p.length > 2 && SLD.has(p.at(-2)) && p.at(-1).length === 2) return p.slice(-3).join(".");
    return h;
  } catch {
    return null;
  }
}
export function registrable(host) {
  const p = String(host).split(".");
  if (p.length > 2 && SLD.has(p.at(-2)) && p.at(-1).length === 2) return p.slice(-3).join(".");
  return p.slice(-2).join(".");
}
export const median = (xs) => {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

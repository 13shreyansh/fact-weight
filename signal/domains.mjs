import { scrape, get, put, all, hash } from "./providers.mjs";
import { load } from "cheerio";
import { shingles, jaccard } from "./detect.mjs";
export const publishers = [
  { domain: "err.ee", name: "ERR" },
  { domain: "lrt.lt", name: "LRT" },
  { domain: "lsm.lv", name: "LSM" },
  { domain: "delfi.lt", name: "Delfi" },
  { domain: "delfi.lv", name: "Delfi" },
  { domain: "delfi.ee", name: "Delfi" },
  { domain: "postimees.ee", name: "Postimees" },
  { domain: "yle.fi", name: "Yle" },
];
export function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (a[i - 1] !== b[j - 1]),
      );
    prev = next;
  }
  return prev[b.length];
}
export function lookalike(domain) {
  domain = domain.toLowerCase().replace(/^www\./, "");
  if (
    publishers.some(
      (p) => domain === p.domain || domain.endsWith("." + p.domain),
    )
  )
    return null;
  return (
    publishers.find((p) => {
      const brand = p.domain.split(".")[0],
        label = domain.split(".")[0];
      return (
        (label.includes(brand) && label !== brand) ||
        (distance(label, brand) <= 1 && brand.length >= 4) ||
        domain.endsWith("." + p.domain + ".com")
      );
    }) || null
  );
}
export async function inspectDomain(domain) {
  const cached = get("domain", domain);
  if (cached) return cached;
  const brand = lookalike(domain);
  if (!brand) return null;
  const result = {
    domain,
    realDomain: brand.domain,
    realOwner: brand.name,
    checkedAt: new Date().toISOString(),
    verifiedClone: false,
    createdAt: null,
  };
  try {
    const r = await fetch(
      "https://rdap.org/domain/" + encodeURIComponent(domain),
      { signal: AbortSignal.timeout(12000) },
    );
    if (r.ok) {
      const d = await r.json();
      result.createdAt =
        d.events?.find((e) => e.eventAction === "registration")?.eventDate ||
        null;
      result.rdapURL = r.url;
      result.rdapHash = hash(d);
    }
  } catch {
    result.registrationNote = "Creation date could not be measured.";
  }
  try {
    const [candidate, real] = await Promise.all([
      scrape("https://" + domain),
      scrape("https://" + brand.domain),
    ]);
    const a = load(candidate.html?.data || ""),
      b = load(real.html?.data || "");
    result.textSimilarity = jaccard(
      shingles(candidate.markdown?.data || ""),
      shingles(real.markdown?.data || ""),
    );
    const logos = ($) =>
      new Set(
        $("img[src]")
          .map((i, e) => $(e).attr("src"))
          .get()
          .filter((x) => /logo/i.test(x)),
      );
    const realLogos = logos(b),
      shared = [...logos(a)].filter((x) => realLogos.has(x));
    result.sameLogoFiles = shared;
    result.verifiedClone = result.textSimilarity > 0.8 || shared.length > 0;
    result.scrapeCalls = [candidate._call, real._call];
    result.note = result.verifiedClone
      ? "Public page text or logo files match the publisher."
      : "The name looks similar. Copied content or layout was not established.";
  } catch {
    result.note =
      "The name looks similar. The public page could not be compared.";
  }
  put("domain", domain, result);
  return result;
}
if (process.argv[1]?.endsWith("/domains.mjs")) {
  const domains = new Set();
  for (const p of all("post"))
    for (const link of p.links || [])
      try {
        const u = new URL(link);
        if (lookalike(u.hostname)) domains.add(u.hostname);
      } catch {}
  console.log("look-alike name candidates", domains.size);
  for (const domain of [...domains].slice(0, 30)) {
    const d = await inspectDomain(domain);
    console.log(domain, d?.verifiedClone, d?.createdAt);
  }
}

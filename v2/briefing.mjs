// Country briefing: an evidence-bound summary of what is being pushed, what mainstream reporting
// confirms, what the copies add, who is behind it and where it spread. Written only from stored evidence.
import { get, put, llm, call } from "./db.mjs";
import { site } from "./text.mjs";
import { reach, clusterName, evidenceInfra } from "./api.mjs";
import { country as countryInfo } from "./countries.mjs";

const STATUSES = ["Matches mainstream reporting", "Adds claims not in mainstream reporting", "Contradicted by mainstream reporting", "Unclear"];

function evidence(cc) {
  const r = get("country", cc);
  if (!r) return null;
  const coord = r.clusters.filter((c) => c.verdict.startsWith("Looks coordinated"));
  const coordIds = new Set(coord.flatMap((c) => c.story_ids));
  const stories = r.story_ids.map((id) => get("story", id)).filter(Boolean);
  const pushed = stories
    .filter((s) => coordIds.has(s.id))
    .sort((a, b) => (b.copies.some((c) => c.documented_network) - a.copies.some((c) => c.documented_network)) || (!!b.watched - !!a.watched) || b.copies.length - a.copies.length)
    .slice(0, 6);
  const watched = stories.filter((s) => s.watched && !coordIds.has(s.id)).slice(0, 4);
  const pick = (s) => ({
    story_id: s.id,
    title: s.title,
    verdict: s.verdict,
    copies: s.copies.length,
    countries: s.countries_reached,
    first_mainstream_at: s.first_mainstream_at,
    first_copy_at: s.first_copy_at,
    mainstream: s.mainstream.slice(0, 5).map((m) => ({ outlet: m.outlet, url: m.url, headline: m.headline })),
    copy_sites: [...new Set(s.copies.map((c) => c.site))].slice(0, 12),
    documented_copies: s.copies.filter((c) => c.documented_network).map((c) => ({ site: c.site, url: c.url, network: c.documented_network })).slice(0, 6),
    added_by_copies: s.spin.flatMap((x) => x.added_phrases.map((p, i) => ({ copy_url: x.copy_url, phrase: p, labels: x.labels?.[i] || [] }))).slice(0, 6),
    pickup: (s.pickup || []).slice(0, 6).map((p) => ({ platform: p.platform, url: p.url, match: p.match_type })),
  });
  return {
    country: countryInfo(cc).name,
    stories_checked: r.stories_checked,
    groups: coord.map((c) => ({
      cluster_id: c.id,
      sites: c.sites,
      site_count: c.site_count,
      verdict: c.verdict,
      documented_by: c.documented_by.map((d) => ({ network: d.network, sources: d.sources.map((x) => x.name) })),
      shared_infra: evidenceInfra(c.shared_infra).kept.slice(0, 5).map((x) => `${x.type} ${x.value} across ${x.sites.length} sites`),
      cdn_note: evidenceInfra(c.shared_infra).cdn.length ? "Shared CDN hosting (" + evidenceInfra(c.shared_infra).cdn.join(", ") + ") is common and not evidence" : null,
      origins_top: c.origins_top.slice(0, 6).map((o) => ({ origin: o.origin, citations: o.citations, type: o.type })),
      median_site_gap_min: c.median_site_gap_min,
      stories_copied: c.stories_copied,
      narrative: c.label,
    })),
    pushed: pushed.map(pick),
    watched: watched.map(pick),
    organic: r.organic_examples.slice(0, 3).map((o) => ({ title: o.title, outlets: o.outlets })),
    pickup_counts: r.pickup.reduce((m, p) => ((m[p.platform] = (m[p.platform] || 0) + 1), m), {}),
  };
}

const SYSTEM = `You write a short, factual intelligence briefing for a general reader about what is being pushed at one country this week. Use ONLY the JSON evidence supplied; never add outside facts, names, numbers or dates. Never use the words fake, propaganda, bot or disinformation; describe behaviour. Return JSON:
{"summary": string (3-4 plain sentences: what is being pushed at the country this week, by which group of sites (name documented networks), and what the pushed stories emphasise; if no coordinated groups, say so plainly),
 "pushes": [{"story_id": string (from evidence.pushed),
   "headline": string,
   "confirmed": [{"text": string (a substantive fact the mainstream headlines report, max 25 words; not a statement about who reported it), "source_urls": [string] (urls from that story's mainstream list)}] (1-4),
   "claims": [string] (2-4 substantive claims the copies added or emphasised, taken from added_by_copies or copy headlines; each max 25 words, phrased as a checkable statement about events; never a claim about which outlet reported something),
   "want": string (one line: what the pushing sites emphasise about the country)}] (max 3, in the order given in evidence.pushed)}
If evidence is thin, say so in the summary.`;

const isoOk = (t) => (t && Number.isFinite(Date.parse(t)) ? new Date(t).toISOString() : null);
const norm = (t) => String(t || "").replace(/\s+/g, " ").trim();

// Check one claim against established outlets and fact-checkers with Exa, then keep only verbatim quotes.
async function checkClaim(claim, story, excludeSites) {
  const t0 = Date.parse(story.first_mainstream_at || story.first_copy_at || Date.now());
  const r = await call("exa", "/search", {
    query: claim,
    type: "auto",
    numResults: 8,
    startPublishedDate: new Date(t0 - 3 * 864e5).toISOString(),
    endPublishedDate: new Date(t0 + 5 * 864e5).toISOString(),
    excludeDomains: excludeSites.slice(0, 50),
    contents: { text: { maxCharacters: 4000 } },
  }).catch(() => ({ results: [] }));
  const docs = (r.results || []).filter((x) => x.text).slice(0, 6).map((x, i) => ({ i, outlet: site(x.url), url: x.url, text: norm(x.text).slice(0, 3500) }));
  if (!docs.length) return { text: claim, status: "only_copies", evidence: [], note: "No established outlet found reporting this" };
  const v = await llm(
    "gpt-4.1",
    `Decide whether established news outlets or fact-checkers in the documents report the claim ("reported"), say otherwise or deny it ("contradicted"), or do not address it ("only_copies"). Ignore documents that are themselves low-quality aggregators. Give up to 2 short verbatim quotes (copied exactly, 8-40 words) from the documents that support your decision. Return JSON {"status":"reported"|"contradicted"|"only_copies","evidence":[{"i":int,"quote":string}]}.`,
    { claim, documents: docs },
    700,
  );
  const status = ["reported", "contradicted", "only_copies"].includes(v?.status) ? v.status : "only_copies";
  const evidence = (v?.evidence || [])
    .map((e) => ({ ...docs.find((d) => d.i === e.i), quote: norm(e.quote) }))
    .filter((e) => e.url && e.quote && e.text.includes(e.quote))
    // The quote must be about the claim: at least two of the claim's content words appear in it.
    .filter((e) => {
      const words = [...new Set(claim.toLowerCase().match(/[\p{L}\p{N}]{5,}/gu) || [])];
      const q = e.quote.toLowerCase();
      return words.filter((w) => q.includes(w)).length >= Math.min(2, words.length);
    })
    .map(({ outlet, url, quote }) => ({ outlet, url, quote }));
  // Without a verbatim quote, a reported/contradicted decision is not shown as such.
  return { text: claim, status: evidence.length ? status : "only_copies", evidence, checked_by: "Exa search + gpt-4.1, quotes verified verbatim" };
}

export async function briefCountry(cc) {
  const ev = evidence(cc);
  if (!ev) return null;
  const r = get("country", cc);
  const draft = await llm("claude-opus-5.5", SYSTEM, ev, 8000);
  if (!draft?.summary) return null;
  const pushes = [];
  for (const p of (draft.pushes || []).slice(0, 3)) {
    const s = get("story", p.story_id);
    const e = ev.pushed.find((x) => x.story_id === p.story_id);
    if (!s || !e) continue;
    const msUrls = new Set(s.mainstream.map((m) => m.url));
    const confirmed = (p.confirmed || []).slice(0, 4).map((c) => ({ text: c.text, sources: (c.source_urls || []).filter((u) => msUrls.has(u)).map((u) => ({ outlet: s.mainstream.find((m) => m.url === u).outlet, url: u })) })).filter((c) => c.sources.length);
    const copySites = [...new Set(s.copies.map((c) => c.site))];
    const claims = [];
    for (const cl of (p.claims || []).slice(0, 4)) claims.push(await checkClaim(cl, s, copySites));
    const cluster = r.clusters.find((c) => c.story_ids.includes(s.id) && c.verdict.startsWith("Looks coordinated"));
    // Spread time is measured on the coordinated group's own copies (first to 80% of them).
    const groupCopies = cluster ? s.copies.filter((c) => cluster.sites.includes(c.site)) : s.copies;
    const times = (groupCopies.length >= 2 ? groupCopies : s.copies).map((c) => c.published_at).filter(Boolean).sort();
    pushes.push({
      story_id: s.id,
      headline: p.headline || s.title,
      verdict: s.verdict,
      confirmed,
      claims,
      spread: {
        sites: copySites.length,
        group_sites: cluster ? groupCopies.map((c) => c.site).filter((x, i, a) => a.indexOf(x) === i).length : null,
        countries: reach(s).length,
        first_copy_at: isoOk(times[0]),
        minutes_to_spread: times.length > 1 ? Math.round((Date.parse(times[Math.min(times.length - 1, Math.floor(times.length * 0.8))]) - Date.parse(times[0])) / 60000) : null,
        telegram: (cluster?.origins_top || []).filter((o) => o.type === "telegram").map((o) => ({ channel: o.origin.replace("t.me/", "@"), url: o.url })),
        platforms: (s.pickup || []).reduce((m, x) => ((m[x.platform] = (m[x.platform] || 0) + 1), m), { tiktok: 0, youtube: 0, reddit: 0, instagram: 0 }),
      },
      behind: cluster
        ? {
            cluster_id: cluster.id,
            network: cluster.documented_by[0]?.network || clusterName(cluster),
            documented_by: cluster.documented_by.flatMap((d) => d.sources.map((x) => x.name)),
            infra: [
              ...evidenceInfra(cluster.shared_infra).kept.slice(0, 4).map((x) => `${x.sites.length} sites share the same ${x.type.replace("_", " ")} (${x.value})`),
              ...evidenceInfra(cluster.shared_infra).cdn.map((o) => `Behind the same CDN (${o}), which is common and not evidence on its own`),
            ],
            sites: cluster.sites,
          }
        : null,
      want: p.want || cluster?.label || null,
    });
  }
  // At a glance: four plain lines per push, written after the claim checks so "what's wrong" rests on them.
  if (pushes.length) {
    const g = await llm(
      "claude-opus-5.5",
      `For a reader with ten seconds, write four plain lines per pushed story, each max 18 words, from the JSON only. Never use the words fake, propaganda, bot or disinformation.
"wrong": what is false or unsupported, based ONLY on claims with status contradicted (say what the outlets say instead) or only_copies (say "Only the copying sites say …"). If none, write "Nothing false found: the facts are real, but they're being re-pushed to …" (say to whom/where).
"pushed": what the copying sites want readers to believe, in plain words.
"why": why it spreads, as the mechanism with numbers from the evidence (e.g. "7 linked sites reposted it within 2 minutes in 5 languages, plus 3 Telegram channels").
"who": who is behind it (network name and documented-by, or the group of sites), plus one fingerprint that is not CDN hosting.
"true": the core fact that established outlets confirm, from "confirmed" or reported claims.
Also "country_line": at most 2 short sentences for the whole country: what is being pushed and by whom. Return JSON {"country_line":string,"items":[{"story_id":string,"wrong":string,"pushed":string,"true":string,"why":string,"who":string}]}.`,
      { pushes: pushes.map((p) => ({ story_id: p.story_id, headline: p.headline, confirmed: p.confirmed.map((c) => c.text), claims: p.claims.map((c) => ({ text: c.text, status: c.status, evidence: c.evidence.map((e) => e.outlet + ": " + e.quote) })), spread: p.spread, behind: p.behind, want: p.want })) },
      6000,
    );
    for (const p of pushes) {
      const x = g?.items?.find((i) => i.story_id === p.story_id);
      if (x) p.plain = { wrong: x.wrong, message: x.pushed, true: x.true || p.confirmed[0]?.text || null, why: x.why, who: x.who };
    }
    if (g?.country_line) draft.country_line = g.country_line;
  }
  const out = { country: cc, summary: draft.summary, plain_summary: draft.country_line || null, generated_at: new Date().toISOString(), pushes, method: "Summary and claims drafted by claude-opus-5.5 from stored evidence; each claim checked with Exa against outlets outside the copying group and judged by gpt-4.1; quotes are kept only if they appear verbatim in the fetched page.", computed_at: new Date().toISOString() };
  put("briefing", cc, out);
  return out;
}

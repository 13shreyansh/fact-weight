import { verifyEvidence } from "./verify.mjs";
import { judge, search, scrape, put, hash, all, db } from "./providers.mjs";
import { embedPosts, similarity } from "./embeddings.mjs";
import { measure } from "./detect.mjs";
import { plainText, passages } from "./passages.mjs";
import { lookalike, inspectDomain } from "./domains.mjs";
const domainsFor = {
  "ISW daily assessments": "understandingwar.org",
  "Oryx loss lists": "oryxspioenkop.com",
  "ERR (Estonia)": "err.ee",
  "LSM (Latvia)": "lsm.lv",
  "LRT (Lithuania)": "lrt.lt",
  Yle: "yle.fi",
  "Official defence statements": "nato.int",
};
export async function enrich(candidate, watch) {
  const check = {
    startedAt: new Date().toISOString(),
    trusted: "pending",
    seenBefore: watch.seenBefore ? "pending" : "disabled",
    sites: "pending",
    errors: [],
    calls: [],
  };
  const sample = [
    ...candidate.posts.filter((p) => p.language === "en"),
    ...candidate.posts,
  ]
    .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i)
    .slice(0, 12)
    .map((p) => ({ id: p.id, text: p.text.slice(0, 5000) }));
  const readStartedAt = new Date().toISOString(),
    readStart = performance.now();
  const reading = await judge({
    posts: sample,
    sources: [],
    task: "Read the shared narrative and extract the checkable event or attribution claim. A translated article is a potential copy chain, not proof of hidden intent.",
  });
  const readFinishedAt = new Date().toISOString();
  const checkStartedAt = new Date().toISOString(),
    checkStart = performance.now();
  const text = candidate.posts.map((p) => p.text).join(" "),
    topic = /nato|нато/i.test(text) ? /nato|нато/i : /ukrain|украин|україн/i;
  candidate = {
    ...candidate,
    ...measure(
      candidate.posts,
      all("post").filter((p) => topic.test(p.text)),
      candidate.accounts,
    ),
  };
  const checkedStep = {
    startedAt: checkStartedAt,
    finishedAt: new Date().toISOString(),
    ms: Math.round(performance.now() - checkStart),
  };
  if (!["moderate", "strong"].includes(candidate.verdict)) {
    return {
      ...candidate,
      reading,
      judgement: reading,
      sources: [],
      seenBefore: [],
      sites: [],
      enrichment: {
        ...check,
        finishedAt: new Date().toISOString(),
        trusted: "below sample",
        seenBefore: "below sample",
        sites: "below sample",
      },
      pipeline: {
        read: {
          startedAt: readStartedAt,
          finishedAt: readFinishedAt,
          ms: Date.parse(readFinishedAt) - Date.parse(readStartedAt),
        },
        checked: checkedStep,
      },
    };
  }
  const weighStartedAt = new Date().toISOString(),
    weighStart = performance.now();
  const query = (reading.data.title || reading.data.claim).slice(0, 160),
    domains = (watch.trusted || [])
      .map(
        (t) =>
          domainsFor[t] ||
          (() => {
            try {
              return new URL(t).hostname;
            } catch {
              return null;
            }
          })(),
      )
      .filter(Boolean);
  let sources = [];
  if (domains.length) {
    try {
      const queries = [
        domains.slice(0, 3),
        domains.slice(3, 6),
        domains.slice(6, 9),
      ].filter((a) => a.length);
      for (const group of queries) {
        const result = await search(
          query + " " + group.map((d) => "site:" + d).join(" OR "),
          3,
        );
        check.calls.push(result._call);
        for (const r of result.results || []) {
          if (sources.some((s) => s.url === r.url)) continue;
          try {
            const s = await scrape(r.url, null, {
              formats: { markdown: true },
              sharedParams: { mainContentOnly: true },
            });
            if (s.markdown?.data?.length > 300) {
              sources.push({
                id: "s" + sources.length,
                name: r.title,
                url: r.url,
                text: plainText(s.markdown.data).slice(0, 24000),
                markdown: s.markdown.data.slice(0, 28000),
                call: s._call,
                publishedAt: s.metadata?.publishedTime,
              });
              check.calls.push(s._call);
            }
          } catch (e) {
            check.errors.push({ stage: "trusted", message: e.message });
          }
        }
      }
      check.trusted = "complete";
    } catch (e) {
      check.trusted = "failed";
      check.errors.push({ stage: "trusted", message: e.message });
    }
  } else check.trusted = "no trusted sources selected";
  let seenBefore = [];
  if (watch.seenBefore)
    try {
      const result = await search("site:euvsdisinfo.eu/report/ " + query, 5);
      check.calls.push(result._call);
      const cases = [];
      for (const r of result.results || []) {
        if (!r.url.includes("/report/")) continue;
        try {
          const d = await scrape(r.url, null, {
            formats: { markdown: true },
            sharedParams: { mainContentOnly: true },
          });
          check.calls.push(d._call);
          if (d.markdown?.data)
            cases.push({
              id: hash(r.url),
              text: r.title + " " + d.markdown.data.slice(0, 250),
              title: r.title,
              url: r.url,
              recordedAt: d.metadata?.publishedTime || null,
              call: d._call,
            });
        } catch {}
      }
      const vectors = await embedPosts([
        { id: "query", text: query.repeat(query.length < 60 ? 2 : 1) },
        ...cases,
      ]);
      const q = vectors.find((v) => v.id === "query");
      if (q)
        seenBefore = cases
          .map((c) => {
            const v = vectors.find((v) => v.id === c.id);
            const score = v ? similarity(q.embedding, v.embedding) : 0;
            return { ...c, score, match: score >= 0.88 ? "close" : "loose" };
          })
          .filter((c) => c.score >= 0.78)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map(({ score, text, ...c }) => c);
      check.seenBefore = "complete";
      check.seenCasesRead = cases.length;
    } catch (e) {
      check.seenBefore = "failed";
      check.errors.push({ stage: "seenBefore", message: e.message });
    }
  let sites = [];
  try {
    const candidates = new Set();
    for (const p of candidate.posts)
      for (const url of p.links || [])
        try {
          const host = new URL(url).hostname;
          if (lookalike(host)) candidates.add(host);
        } catch {}
    for (const host of [...candidates].slice(0, 5)) {
      const site = await inspectDomain(host);
      if (site?.verifiedClone) sites.push(site);
    }
    check.sites = "complete";
    check.siteCandidates = candidates.size;
  } catch (e) {
    check.sites = "failed";
    check.errors.push({ stage: "sites", message: e.message });
  }
  for (const source of sources)
    source.passages = passages(
      source.text,
      reading.data.claim || query,
      source.id,
    );
  const judgement = await judge({
    posts: sample,
    sources: sources.map(({ text, markdown, ...s }) => s),
    signals: candidate.signals,
    task: "Confirm the same narrative and weigh each exact claim against the provided trusted sources. Include ordinary syndication/translation as an innocent explanation where applicable.",
  });
  judgement.rawEvidence = structuredClone(judgement.data.evidence || []);
  judgement.quoteResolution = "Exact source passage selected by passageId";
  for (const item of judgement.data.evidence || []) {
    const source = sources.find((s) => s.id === item.sourceId),
      span = source?.passages?.find((p) => p.id === item.passageId);
    if (span) item.quote = span.text;
  }
  await verifyEvidence(judgement, candidate.posts, sources);
  if (judgement.verification?.call)
    check.calls.push(judgement.verification.call);
  check.finishedAt = new Date().toISOString();
  const collectionCalls = [
    ...new Set(candidate.posts.map((p) => p.call).filter(Boolean)),
  ]
    .map((id) => db.prepare("SELECT at,ms FROM calls WHERE id=?").get(id))
    .filter(Boolean);
  const starts = collectionCalls.map((c) => Date.parse(c.at)),
    ends = collectionCalls.map((c) => Date.parse(c.at) + c.ms);
  const collected = starts.length
    ? {
        startedAt: new Date(Math.min(...starts)).toISOString(),
        finishedAt: new Date(Math.max(...ends)).toISOString(),
        ms: Math.max(...ends) - Math.min(...starts),
      }
    : null;
  return {
    ...candidate,
    reading,
    judgement,
    sources,
    seenBefore,
    sites,
    enrichment: check,
    pipeline: {
      collected,
      read: {
        startedAt: readStartedAt,
        finishedAt: readFinishedAt,
        ms: Date.parse(readFinishedAt) - Date.parse(readStartedAt),
      },
      checked: checkedStep,
      weighed: {
        startedAt: weighStartedAt,
        finishedAt: check.finishedAt,
        ms: Math.round(performance.now() - weighStart),
      },
    },
  };
}

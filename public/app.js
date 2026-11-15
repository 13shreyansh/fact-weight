"use strict";
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icon = (n) =>
  `<i data-lucide="${n}" class="icon" aria-hidden="true"></i>`;
const labels = {
  strong: "Looks coordinated: strong",
  moderate: "Looks coordinated: moderate",
  organic: "Looks organic",
  "not-enough": "Not enough data",
};
const platforms = {
  TG: "Telegram",
  TT: "TikTok",
  IG: "Instagram",
  YT: "YouTube",
  RD: "Reddit",
  NW: "News",
  WB: "Web",
};
const langs = {
  en: "English",
  ru: "Russian",
  uk: "Ukrainian",
  lt: "Lithuanian",
  lv: "Latvian",
  et: "Estonian",
  fi: "Finnish",
  ar: "Arabic",
  fr: "French",
  de: "German",
};
const sections = [
  "Timeline",
  "Accounts",
  "Same text",
  "Site",
  "Claims",
  "Wording",
  "Seen before",
];
const ids = [
  "timeline",
  "accounts",
  "same-text",
  "site",
  "claims",
  "wording",
  "seen-before",
];
const duration = (ms) =>
  ms === null || ms === undefined
    ? "not measured"
    : ms >= 3600000
      ? Math.floor(ms / 3600000) +
        " h " +
        Math.floor((ms % 3600000) / 60000) +
        " min"
      : ms < 1000
        ? Math.round(ms) + " ms"
        : ms < 60000
          ? (ms / 1000).toFixed(1) + " s"
          : Math.floor(ms / 60000) +
            " min " +
            Math.round((ms % 60000) / 1000) +
            " s";
const fmt = (n) => Number(n).toLocaleString("en-GB");
const epoch = (s) =>
  Date.parse(
    typeof s === "string"
      ? s.replace(/EEST$/, "+03:00").replace(/EET$/, "+02:00")
      : s,
  );
const date = (s, time = false) =>
  s && Number.isFinite(epoch(s))
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
        timeZone: "Europe/Vilnius",
      }).format(new Date(epoch(s)))
    : "could not be measured";
const clock = (s) =>
  s && Number.isFinite(epoch(s))
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Europe/Vilnius",
      }).format(new Date(epoch(s)))
    : "";
const relative = (s) => {
  if (!s) return "not yet completed";
  const min = Math.max(0, Math.floor((Date.now() - Date.parse(s)) / 60000));
  return min < 1
    ? "just now"
    : min < 60
      ? `${min} min ago`
      : min < 1440
        ? `${Math.floor(min / 60)} h ago`
        : date(s);
};
const external = (url, text) =>
  `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)} ${icon("arrow-up-right")}</a>`;
const tag = (s, lang = false) =>
  `<span class="tag ${lang ? "lang" : ""}" title="${esc(lang ? langs[s] || s : platforms[s] || s)}">${esc(s)}</span>`;
const mark = (v) =>
  `<svg viewBox="0 0 16 12" aria-hidden="true">${[0, 6, 12].map((x, i) => `<rect x="${x}" y=".5" width="3" height="11" rx="1" fill="${["strong", "moderate"].includes(v) && i < (v === "strong" ? 3 : 2) ? "#E8590C" : "none"}" stroke="${["strong", "moderate"].includes(v) ? "#D5DBDF" : "#5C6A73"}" ${v === "not-enough" ? 'stroke-dasharray="2 1"' : ""}/>`).join("")}</svg>`;
const verdict = (v) =>
  `<span class="verdict ${v}">${mark(v)}${labels[v] || labels["not-enough"]}</span>`;
const footer = () =>
  `<p class="footer">Signal Fire reads public posts and pages only. It flags coordination and weak evidence, whoever is behind it. It never reports or removes anything.</p>`;
const pathPush = (p) => `/w/${p.watchId}/p/${p.id}`;
let state,
  push,
  route,
  url = new URL(location.href),
  selected = -1,
  formDirty = false,
  stopPlots = [];
async function api(path, body, method) {
  const r = await fetch(path, {
    ...(body
      ? {
          method: method || "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
    ...(method && !body ? { method } : {}),
  });
  const d = await r.json();
  if (!r.ok) {
    const error = Error(d.error || "This request could not finish.");
    error.userFacing = true;
    throw error;
  }
  return d;
}
function notice(s) {
  $("#notice").textContent = s;
  $("#notice").classList.add("on");
  setTimeout(() => $("#notice").classList.remove("on"), 4000);
}
function icons() {
  window.lucide?.createIcons({ attrs: { "stroke-width": 1.5 } });
}
function setQuery(k, v) {
  url = new URL(location.href);
  v === null ? url.searchParams.delete(k) : url.searchParams.set(k, v);
  history.replaceState({}, "", url);
}
function renderShell() {
  const m = state.metrics,
    w = state.watch,
    last = m.lastReadAt || m.lastSweep?.finishedAt,
    late = last && Date.now() - Date.parse(last) > 90 * 60000;
  $("#shell").innerHTML =
    `<a class="brand" href="/w/${w.id}"><img src="/mark.svg" alt=""><span>Signal Fire</span></a><button class="quiet" id="switcher" aria-expanded="false">${esc(w.name)} ${icon("chevron-down")}</button><nav aria-label="Main"><a href="/w/${w.id}" class="${route === "home" ? "current" : ""}">Pushes</a><a href="/method" class="${route === "method" ? "current" : ""}">Method</a></nav><a class="live-status" href="/method#running">${late ? icon("triangle-alert") : `<span class="live-dot ${m.sweeping ? "sweeping" : ""}"></span>`}${last ? `Reading ${fmt(w.sources.length)} sources · last sweep ${relative(last)}${late ? ". Collection is behind." : m.sweeping ? " · reading now" : ""}` : "First sweep is running"}</a><button class="mobile-menu" aria-label="Open navigation">${icon("chevron-down")}</button>`;
  const toggle = () => {
    const open = $("#watch-dropdown");
    if (open) {
      open.remove();
      $("#switcher").setAttribute("aria-expanded", "false");
      return;
    }
    const menu = document.createElement("div");
    menu.className = "dropdown";
    menu.id = "watch-dropdown";
    menu.innerHTML =
      state.watches
        .map((w) => `<a href="/w/${w.id}">${esc(w.name)}</a>`)
        .join("") +
      `<hr><a href="/watches/new?from=${w.id}">${icon("plus")}New watch</a><a href="/w/${w.id}">Pushes</a><a href="/method">Method</a><p class="small secondary">${last ? "Last sweep " + relative(last) : "First sweep is running"}</p>`;
    $("#shell").append(menu);
    $("#switcher").setAttribute("aria-expanded", "true");
    $("a", menu).focus();
    icons();
  };
  $("#switcher").onclick = toggle;
  $(".mobile-menu").onclick = toggle;
}
function quote(p, { diff = false, phrase = "" } = {}) {
  let text = esc(p.text);
  if (phrase && p.text.includes(phrase))
    text = text.replace(
      esc(phrase),
      `<mark class="technique">${esc(phrase)}</mark>`,
    );
  return `<div class="quote"><div class="quote-source">${tag(p.platform)}<a class="handle" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.handle)}</a>${tag(p.language || "en", true)}<time>${clock(p.postedAt)}</time></div><div class="slab" lang="${esc(p.language || "en")}">${text}</div>${p.gloss ? `<p class="gloss">In English: ${esc(p.gloss)}</p>` : ""}</div>`;
}
function filtered() {
  const allowed = (url.searchParams.get("verdict") || "strong,moderate").split(
    ",",
  );
  let rows = state.pushes.filter((p) => allowed.includes(p.verdict));
  const platform = url.searchParams.get("platform"),
    lang = url.searchParams.get("lang");
  if (platform)
    rows = rows.filter((p) => p.posts.some((x) => x.platform === platform));
  if (lang) rows = rows.filter((p) => p.posts.some((x) => x.language === lang));
  return rows.sort((a, b) =>
    url.searchParams.get("sort") === "largest"
      ? b.posts.length - a.posts.length
      : Date.parse(b.firstSeen) - Date.parse(a.firstSeen),
  );
}
function home() {
  const w = state.watch;
  const coordinated = state.pushes.filter((p) =>
    ["strong", "moderate"].includes(p.verdict),
  );
  const strongest = coordinated.sort(
    (a, b) =>
      (a.verdict === "strong" ? -1 : 1) - (b.verdict === "strong" ? -1 : 1) ||
      Date.parse(b.firstSeen) - Date.parse(a.firstSeen),
  )[0];
  const sweepStatus = state.metrics.lastSweep?.status;
  const waiting =
    !w.public &&
    (!state.metrics.lastSweep || ["running", "queued"].includes(sweepStatus));
  const rows = filtered();
  const allowed = (url.searchParams.get("verdict") || "strong,moderate").split(
    ",",
  );
  const windowDays = coordinated.some(
    (p) => Date.now() - Date.parse(p.firstSeen) < 7 * 86400000,
  )
    ? 7
    : 30;
  const recent = coordinated.filter(
    (p) => Date.now() - Date.parse(p.firstSeen) < windowDays * 86400000,
  );
  const top = recent.sort((a, b) => b.peak - a.peak).slice(0, 1);
  const textFinding = recent
    .filter((p) => p.id !== top[0]?.id)
    .sort((a, b) => b.copied.length - a.copied.length)[0];
  let findings = top.length
    ? `<section class="findings"><h2>Found in the last ${windowDays} days</h2><div class="finding-grid">${top.map((p) => `<article class="finding"><h3 class="title">${fmt(p.posts.length)} public posts carry one story across ${fmt(p.accounts.length)} publishing sources.</h3><div class="fragment"><canvas class="burst mini" data-push="${p.id}" aria-label="${p.posts.length} real posts" role="img"></canvas><span class="mini-unit small secondary"></span></div><div class="row between">${verdict(p.verdict)}<a href="${pathPush(p)}#timeline" class="text-button">See the evidence ${icon("chevron-right")}</a></div></article>`).join("")}${
        textFinding
          ? `<article class="finding"><h3 class="title">${textFinding.copied.length} posts repeat near-identical wording in ${textFinding.variants?.length || 1} text variants.</h3><div class="fragment finding-quotes">${textFinding.posts
              .filter((x) =>
                (
                  textFinding.variants?.[0]?.posts || textFinding.copied
                ).includes(x.id),
              )
              .slice(0, 2)
              .map(
                (x) =>
                  `<div class="quote"><div class="quote-source">${tag(x.platform)} <time>${clock(x.postedAt)}</time></div><div class="slab" lang="${esc(x.language)}">${esc(x.text)}</div></div>`,
              )
              .join(
                "",
              )}</div><div class="row between">${verdict(textFinding.verdict)}<a class="text-button" href="${pathPush(textFinding)}#same-text">See the evidence ${icon("chevron-right")}</a></div></article>`
          : ""
      }</div></section>`
    : `<section class="empty-band"><h2>${waiting ? "The first sweep is running." : !w.public && sweepStatus === "failed" ? "The first sweep could not finish." : "No coordinated push has cleared the checks yet."}</h2><p>${waiting ? `${state.metrics.lastSweep?.read || 0} of ${w.sources.length} sources read so far. Pushes appear here as soon as something stands out from the usual rate, which takes about a day of reading to learn.` : `${fmt(state.metrics.posts)} public posts and pages collected. The same-hour and weekday baseline is still being learned. Small repeat clusters stay marked "Not enough data". No finding is promoted to fill this space.`}</p>${waiting ? '<div class="progress"><span style="width:0%"></span></div>' : `<a class="text-button" href="/method#running">See what is being read ${icon("chevron-right")}</a>`}</section>`;
  $("#main").innerHTML =
    `<div class="page"><div class="page-head"><div class="intro"><h1>${esc(w.conflict)}, as it is pushed at ${esc(w.audience)}</h1><p>Signal Fire reads public posts, channels and news sites in ${esc(w.languages.map((l) => langs[l] || l).join(", "))}. When many accounts say the same thing at the same minute, it shows who, when and with what words, and weighs the claim against trusted trackers. It never reports or removes anything.</p>${
      w.networkName
        ? `<p class="small secondary" style="margin-top:12px">Known network: ${esc(w.networkName)}, documented by ${(
            w.networkEvidence || []
          )
            .slice(0, 1)
            .concat(
              (w.networkEvidence || []).slice(2, 3),
              (w.networkEvidence || []).slice(4, 5),
            )
            .map((e) => external(e.url, e.name.split(",")[0]))
            .join(", ")}.</p>`
        : ""
    }</div>${strongest ? `<a class="primary" href="${pathPush(strongest)}">Open the strongest push</a>` : ""}</div>${findings}<div class="controls"><div class="chips">${["strong", "moderate", "organic", "not-enough"].map((v) => `<button class="chip" data-filter="${v}" aria-pressed="${allowed.includes(v)}">${v === "strong" ? "Strong" : v === "moderate" ? "Moderate" : labels[v]} ${state.pushes.filter((p) => p.verdict === v).length}</button>`).join("")}<span class="divider"></span><select id="platform" aria-label="Platform"><option value="">Platform: all</option>${Object.entries(
      platforms,
    )
      .map(
        ([k, v]) =>
          `<option value="${k}" ${url.searchParams.get("platform") === k ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select><select id="language" aria-label="Language"><option value="">Language: all</option>${w.languages.map((l) => `<option value="${l}" ${url.searchParams.get("lang") === l ? "selected" : ""}>${langs[l] || l}</option>`).join("")}</select></div><div class="segmented">${["newest", "largest"].map((s) => `<button data-sort="${s}" aria-pressed="${(url.searchParams.get("sort") || "newest") === s}">${s === "newest" ? "Newest" : "Largest"}</button>`).join("")}</div></div><table class="push-list"><thead><tr><th style="width:196px">Verdict</th><th>Push</th><th class="optional" style="width:96px">Aimed at</th><th class="optional" style="width:112px">Seen on</th><th style="width:72px;text-align:right">Posts</th><th style="width:84px;text-align:right">Accounts</th><th class="optional" style="width:128px">Evidence</th><th style="width:120px">First seen</th></tr></thead><tbody>${
      rows.length
        ? rows
            .map(
              (p) =>
                `<tr tabindex="0" data-push="${p.id}"><td class="verdict-cell">${verdict(p.verdict)}</td><td class="push-cell"><a class="push-name truncate" href="${pathPush(p)}">${esc(p.title)}</a><div class="small muted truncate push-detail">${esc(p.signals.find((s) => s.fired)?.reason || `${p.posts.length} posts · the minimum sample is not reached`)}</div></td><td class="optional">${[
                  ...new Set(p.posts.map((p) => p.language)),
                ]
                  .slice(0, 3)
                  .map((s) => tag(s, true))
                  .join("")}</td><td class="optional">${[
                  ...new Set(p.posts.map((p) => p.platform)),
                ]
                  .slice(0, 3)
                  .map((s) => tag(s))
                  .join(
                    "",
                  )}</td><td style="text-align:right">${fmt(p.posts.length)}</td><td style="text-align:right">${fmt(p.accounts.length)}</td><td class="optional small">${p.evidence.filter((e) => e.stance === "for").length} for · ${p.evidence.filter((e) => e.stance === "against").length} against</td><td class="small secondary" title="${date(p.firstSeen, true)}">${relative(p.firstSeen)}</td></tr>`,
            )
            .join("")
        : `<tr><td colspan="8" class="no-data">${state.pushes.length ? 'No pushes match these filters. <button class="text-button" id="clear-filters">Clear filters</button>' : "Nothing yet."}</td></tr>`
    }</tbody></table><div class="footnote"><span>${state.pushes.length} repeat clusters checked · ${coordinated.length} look coordinated · ${state.pushes.filter((p) => p.verdict === "organic").length} look organic. <a href="/method#rule">How the verdict is decided</a></span><span>Vilnius time</span></div>${footer()}</div>`;
  $$("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        let a = new Set(
          (url.searchParams.get("verdict") || "strong,moderate").split(","),
        );
        a.has(b.dataset.filter)
          ? a.delete(b.dataset.filter)
          : a.add(b.dataset.filter);
        setQuery("verdict", [...a].join(",") || "none");
        home();
      }),
  );
  $$("[data-sort]").forEach(
    (b) =>
      (b.onclick = () => {
        setQuery("sort", b.dataset.sort);
        home();
      }),
  );
  $("#platform").onchange = (e) => {
    setQuery("platform", e.target.value || null);
    home();
  };
  $("#language").onchange = (e) => {
    setQuery("lang", e.target.value || null);
    home();
  };
  if ($("#clear-filters"))
    $("#clear-filters").onclick = () => {
      setQuery("verdict", "strong,moderate,organic,not-enough");
      setQuery("platform", null);
      setQuery("lang", null);
      home();
    };
  $$("tr[data-push]").forEach((tr) => {
    tr.onclick = (e) => {
      if (!e.target.closest("a"))
        location.href = pathPush(
          state.pushes.find((p) => p.id === tr.dataset.push),
        );
    };
    tr.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        tr.click();
      }
    };
  });
  $$("canvas.mini").forEach((c) =>
    drawPlot(
      c,
      state.pushes.find((p) => p.id === c.dataset.push),
      { mini: true },
    ),
  );
  icons();
}
function section(id, name, description, content) {
  return `<section class="evidence-section" id="${id}"><h2>${name}</h2><p class="description">${description}</p>${content}</section>`;
}
function postsTable(posts) {
  return `<table class="data-table"><thead><tr><th style="width:80px">Time</th><th style="width:170px">Account</th><th style="width:50px">Seen on</th><th>Post</th><th style="width:70px">Views</th></tr></thead><tbody>${posts.map((p) => `<tr><td><time>${clock(p.postedAt)}</time></td><td>${external(p.url, p.handle)}</td><td>${tag(p.platform)}${tag(p.language, true)}</td><td lang="${esc(p.language)}">${esc(p.text.slice(0, 260))}${p.text.length > 260 ? "…" : ""}</td><td>${p.views === null || p.views === undefined ? "not public" : esc(p.views)}</td></tr>`).join("")}</tbody></table>`;
}
function claims(p) {
  if (!p.claim)
    return '<p class="no-data">No checkable claim was found in these posts.</p>';
  const pendingNote =
    p.enrichment?.trusted === "below sample"
      ? '<p class="small secondary">Source checks start when a cluster reaches the coordinated rule. This smaller cluster has not been weighed against trackers.</p>'
      : "";
  const tally = (stance) =>
    new Set(
      p.evidence
        .filter((e) => e.stance === stance)
        .map((e) => e.publisherGroup || new URL(e.url).hostname),
    ).size;
  return `${pendingNote}<div class="claims-block"><h3>${esc(p.claim)}</h3><p class="tally">${tally("for")} sources for, ${tally("against")} against, ${tally("not reported")} do not address it.</p><p class="small secondary">Evidence: ${!tally("for") && !tally("against") ? "unchecked" : tally("for") && tally("against") ? "disputed" : tally("for") > tally("against") ? "supported" : "weak"}</p>${[
    ...p.evidence,
  ]
    .sort(
      (a, b) =>
        (a.stance === "against" ? -1 : 1) - (b.stance === "against" ? -1 : 1),
    )
    .map(
      (e) =>
        `<div class="source"><div class="small secondary">${icon(e.stance === "against" ? "x" : e.stance === "for" ? "check" : "minus")} <strong>${esc(e.name)}</strong>${e.publishedAt ? " · " + date(e.publishedAt) : ""} · ${esc(e.stance)}</div><div class="slab">${esc(e.quote)}</div>${e.reason ? `<p class="small secondary">${esc(e.reason)}</p>` : ""}<div class="small">${external(e.url, "Read the source")}</div></div>`,
    )
    .join("")}</div>`;
}
function accounts(p) {
  const known = p.accounts.filter((a) => a.createdAt),
    young = known.filter(
      (a) => Date.parse(p.firstSeen) - Date.parse(a.createdAt) < 30 * 86400000,
    );
  return `<p class="small secondary">${p.accounts.length} accounts posted in this push. ${known.length ? `${young.length} of the ${known.length} with public dates were created in the preceding 30 days.` : "Account creation dates could not be measured on these public pages."}</p><div class="two-panels" style="margin-top:16px"><div class="panel panel-pad"><h3>When the accounts were created</h3>${known.length ? '<canvas class="account-chart" id="account-chart" role="img" aria-label="Account creation dates"></canvas>' : '<p class="no-data">Creation dates could not be measured on these public pages.</p>'}</div><div class="panel panel-pad"><h3>Who follows whom</h3><p class="no-data">Mutual follower lists could not be read on these public pages. No network is inferred.</p></div></div><table class="data-table"><thead><tr><th>Account</th><th style="width:70px">Platform</th><th>Created</th><th>Followers</th><th>Posts in this push</th></tr></thead><tbody>${p.accounts.map((a) => `<tr><td>${external(a.url, a.handle)}</td><td>${tag(a.platform)}</td><td>${a.createdAt ? date(a.createdAt) : "could not be measured"}</td><td>${a.followers === null ? "not public" : fmt(a.followers)}</td><td>${p.posts.filter((x) => x.accountId === a.id).length}</td></tr>`).join("")}</tbody></table>`;
}
function sameText(p) {
  const variants = p.variants || [];
  const chosen =
    variants.find((v) => v.id === url.searchParams.get("variant")) ||
    variants[0];
  const copies = p.posts.filter((x) =>
    chosen ? chosen.posts.includes(x.id) : p.copied.includes(x.id),
  );
  if (copies.length < 2)
    return '<p class="no-data">No repeated text. The posts share a claim but not their wording.</p>';
  const base = copies[0].text.split(/\s+/);
  return `${variants.length > 1 ? `<div class="segmented">${variants.map((v, i) => `<button data-variant="${v.id}" aria-pressed="${v.id === chosen.id}">Text ${i + 1} · ${v.count} posts</button>`).join("")}</div>` : ""}<p class="small secondary">${copies.length} posts repeat this text variant. Words that differ from the earliest copy are shaded.</p><div class="quotes" style="margin-top:16px">${copies
    .slice(0, 3)
    .map((x, i) => {
      let html = quote(x);
      if (i) {
        const words = x.text.split(/(\s+)/);
        const amended = words
          .map((w) =>
            /^\s+$/.test(w) || base.includes(w)
              ? esc(w)
              : `<mark>${esc(w)}</mark>`,
          )
          .join("");
        html = html.replace(esc(x.text), amended);
      }
      return html;
    })
    .join(
      "",
    )}</div><details><summary>Show all ${copies.length} copies</summary>${postsTable(copies)}</details>`;
}
function wording(p) {
  return (
    (p.techniques.length
      ? p.techniques
          .map(
            (t) =>
              `<div class="technique-block"><h3 class="technique-title">${esc(t.name)}</h3><p>${esc(t.explanation)}</p>${quote(
                p.posts.find((x) => x.text.includes(t.phrase)),
                { phrase: t.phrase },
              )}</div>`,
          )
          .join("")
      : '<p class="no-data">No wording technique was established from exact phrases in these posts.</p>') +
    '<p class="small muted">Wording is described, not scored. It does not affect the verdict.</p>'
  );
}
function seen(p) {
  return p.seenBefore.length
    ? p.seenBefore
        .map(
          (c) =>
            `<div class="source small">${c.recordedAt ? date(c.recordedAt) : "Date could not be read"} · ${external(c.url, c.title)} · ${esc(c.match)} match</div>`,
        )
        .join("")
    : `<p class="no-data">${p.enrichment?.seenBefore === "complete" ? "No close match among the retrieved EUvsDisinfo cases. That does not mean it is new." : "Earlier-case matching has not finished for this push."}</p>`;
}
function site(p) {
  return p.sites.length
    ? p.sites
        .map(
          (s) =>
            `<div class="panel panel-pad"><p class="small secondary">The real site</p><p class="domain">${esc(s.realDomain)}</p><p class="small secondary">The site linked in this push</p><p class="domain">${external("https://" + s.domain, s.domain)}</p><p>Registration: ${s.createdAt ? date(s.createdAt) : "could not be measured"}</p></div>`,
        )
        .join("")
    : `<p class="no-data">${p.enrichment?.sites === "complete" ? "No verified look-alike site was found among the links in this push." : p.enrichment?.sites === "below sample" ? "Site checks start when a cluster reaches the coordinated rule. This cluster has not reached it." : "The look-alike site check has not finished for this push."}</p>`;
}
function rail(p) {
  return `<aside class="rail"><h2>${p.verdict === "organic" ? "Why it looks organic" : p.verdict === "not-enough" ? "What could be checked" : "Why it looks coordinated"}</h2>${p.verdict === "not-enough" ? `<p>${p.posts.length} posts from ${p.accounts.length} accounts. Signal Fire needs at least ${state.config.minPosts} posts from ${state.config.minAccounts} accounts to judge.</p>` : ""}${[
    ...p.signals,
  ]
    .sort((a, b) => Number(b.fired) - Number(a.fired))
    .map(
      (s) =>
        `<button class="signal ${s.fired ? "fired" : ""}" data-signal="${{ timing: "timeline", new_accounts: "accounts", same_text: "same-text", shared_links: "site", ties: "accounts" }[s.key]}"><span><i class="signal-mark"></i>${esc(s.name)}</span>${esc(s.reason)}</button>`,
    )
    .join(
      "",
    )}<h2>What could explain it innocently</h2>${p.innocentExplanations.length ? p.innocentExplanations.map((s) => `<p>${icon("minus")}${esc(s)}</p>`).join("") : "<p>Nothing found that would explain the timing.</p>"}<p>${icon("clock")}Collected after publication. Detection lead time cannot be claimed. Checked ${date(p.checkedAt, true)}.</p><div id="review-slot"></div><div class="actions"><button class="text-button" id="review-open">This looks organic to me</button><button class="text-button copy-link">${icon("copy")}Copy link</button></div></aside>`;
}
function pushPage() {
  const p = push;
  $("#main").innerHTML =
    `<div class="push-header"><div class="row between"><h1>${esc(p.title)}</h1>${["strong", "moderate"].includes(p.verdict) ? `<a class="primary" href="${pathPush(p)}/pack">${icon("file-text")}Open evidence pack</a>` : ""}</div><div class="row" style="margin-top:8px">${verdict(p.verdict)}<span id="review-header" class="small secondary"></span></div><div class="meta">${p.posts.length} posts · ${p.accounts.length} accounts · ${[...new Set(p.posts.map((p) => p.platform))].map((s) => tag(s)).join("")} · ${[...new Set(p.posts.map((p) => p.language))].map((s) => tag(s, true)).join("")} · first seen ${date(p.firstSeen, true)} · Vilnius time</div>${p.mode === "replay" ? `<div class="replay">${icon("rotate-cw")}${esc(p.replayLabel)}</div>` : ""}</div><nav class="section-bar" aria-label="Evidence sections"><div class="section-tabs">${sections.map((s, i) => `<a href="#${ids[i]}">${s}</a>`).join("")}</div><a href="${pathPush(p)}/trail" class="text-button">${icon("route")}How we found this</a></nav><div class="evidence-layout"><div class="evidence-main">${section("timeline", "Timeline", "Each square is one post. Ember squares belong to this push. Grey squares are other posts on the same keywords.", `<div class="panel"><div class="plot-header"><div><strong>${p.posts.length} posts in ${duration(Date.parse(p.lastSeen) - Date.parse(p.firstSeen))}</strong> <span class="small secondary">· peak ${p.peak} in 10 minutes at ${clock(p.peakAt)}</span></div><div class="plot-tools"><div class="segmented">${["Whole push", "Peak hour", "Peak 10 minutes"].map((s, i) => `<button data-zoom="${["whole", "hour", "10min"][i]}" aria-pressed="${(url.searchParams.get("zoom") || "whole") === ["whole", "hour", "10min"][i]}">${s}</button>`).join("")}</div><div class="segmented"><button id="together" aria-pressed="${url.searchParams.get("lanes") !== "1"}">Together</button><button id="lanes" aria-pressed="${url.searchParams.get("lanes") === "1"}">By platform</button></div><button class="quiet" id="plot-table" title="Show as a table" aria-label="Show as a table">${icon("table")}</button><button class="quiet" id="plot-larger" title="Larger" aria-label="Larger">${icon("maximize-2")}</button></div></div><p class="small secondary" id="lane-order" style="padding:0 16px"></p><div class="plot-wrap"><canvas id="burst" class="burst" tabindex="0" role="img" aria-label="${p.posts.length} public posts, peak ${p.peak} in ten minutes"></canvas><div id="bins-table" hidden></div></div><div class="plot-note"><span id="unit">one square = 1 post · Vilnius time</span><span><i class="legend-mark"></i>this push <i class="legend-mark other"></i>other posts on these keywords</span></div></div><div class="copy-chain" style="margin-top:16px"><h3>Origin and public pickup</h3>${p.origins?.length ? p.origins.map((o) => `<p class="small secondary">${esc(o.relationship || "Cited source")} · ${external(o.url, o.handle || o.title || new URL(o.url).hostname)}${o.postedAt ? " · " + date(o.postedAt, true) : ""}</p>`).join("") : `<p class="small secondary">${p.sourceDeclaration ? "The pages name " + esc(typeof p.sourceDeclaration === "string" ? p.sourceDeclaration : p.sourceDeclaration.platform + " " + p.sourceDeclaration.handle) + ". The original post has not yet been matched." : "The original source has not yet been matched."}</p>`}${p.pickups?.length ? `<details><summary>${p.pickups.length} public items carry a matching claim</summary><p class="small secondary">A matching claim does not show that this network caused the pickup. Direct copying is stated only when a shared link establishes it.</p>${p.pickups.map((x) => `<div class="source"><div class="quote-source">${tag(x.platform)}${external(x.url, x.title || x.handle)}</div><div class="slab">${esc(x.text)}</div><p class="small secondary">${x.copyLinkEstablished ? "A network link is present." : "Matching claim. A direct copy connection was not established."}</p></div>`).join("")}</details>` : '<p class="small secondary">No matching public pickup was established in the searches so far.</p>'}</div><div id="slice-label" class="small secondary" style="margin-top:16px"></div><div id="posts-table">${postsTable(p.posts.slice(0, 10))}</div>${p.posts.length > 10 ? `<button class="text-button" id="all-posts">Show all ${p.posts.length}</button>` : ""}`)}${section("accounts", "Accounts", "Public account records, with missing data stated plainly.", accounts(p))}${section("same-text", "Same text", "Compare the wording across the original public posts.", sameText(p))}${section("site", "Site", "Look-alike domains, checked against the real publisher.", site(p))}${section("claims", "Claims", "What the posts state as fact, weighed against sources this watch trusts.", claims(p))}${section("wording", "Wording", "How the text tries to move the reader, named in plain words.", wording(p))}${section("seen-before", "Seen before", "Earlier recorded cases of the same claim.", seen(p))}</div>${rail(p)}</div>`;
  $$("[data-signal]").forEach(
    (b) =>
      (b.onclick = () => {
        const el = $("#" + b.dataset.signal);
        el.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
        el.classList.remove("highlight");
        void el.offsetWidth;
        el.classList.add("highlight");
      }),
  );
  $(".copy-link").onclick = copyLink;
  $("#review-open").onclick = () => reviewForm();
  renderReview();
  $$("[data-variant]").forEach(
    (b) =>
      (b.onclick = () => {
        setQuery("variant", b.dataset.variant);
        stopPlots.forEach((f) => f());
        stopPlots = [];
        pushPage();
        $("#same-text").scrollIntoView();
      }),
  );
  const c = $("#burst");
  let plot = drawPlot(c, p, {
    zoom: url.searchParams.get("zoom") || "whole",
    lanes: url.searchParams.get("lanes") === "1",
  });
  $$("[data-zoom]").forEach(
    (b) =>
      (b.onclick = () => {
        setQuery("zoom", b.dataset.zoom);
        $$("[data-zoom]").forEach((x) =>
          x.setAttribute("aria-pressed", x === b),
        );
        plot.update({ zoom: b.dataset.zoom });
      }),
  );
  $("#lanes").onclick = () => {
    setQuery("lanes", "1");
    $("#lanes").setAttribute("aria-pressed", "true");
    $("#together").setAttribute("aria-pressed", "false");
    plot.update({ lanes: true });
    const ps = [
      ...new Set(
        [...p.posts]
          .sort((a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt))
          .map((x) => x.platform),
      ),
    ];
    const firstTimes = ps
      .map((platform) => ({
        platform,
        at: Math.min(
          ...p.posts
            .filter((x) => x.platform === platform)
            .map((x) => Date.parse(x.postedAt)),
        ),
      }))
      .sort((a, b) => a.at - b.at);
    $("#lane-order").textContent =
      "Started on " +
      platforms[firstTimes[0].platform] +
      "." +
      firstTimes
        .slice(1)
        .map(
          (x) =>
            " " +
            platforms[x.platform] +
            " followed " +
            duration(x.at - firstTimes[0].at) +
            " later.",
        )
        .join("");
  };
  $("#together").onclick = () => {
    setQuery("lanes", null);
    $("#together").setAttribute("aria-pressed", "true");
    $("#lanes").setAttribute("aria-pressed", "false");
    $("#lane-order").textContent = "";
    plot.update({ lanes: false });
  };
  $("#plot-larger").onclick = () => {
    c.classList.toggle("enlarged");
    plot.update({});
  };
  $("#plot-table").onclick = () => {
    c.hidden = !c.hidden;
    $("#bins-table").hidden = !c.hidden;
    $("#bins-table").innerHTML = plot.table();
  };
  $("#all-posts")?.addEventListener("click", () => {
    $("#posts-table").innerHTML = postsTable(p.posts);
    $("#all-posts").remove();
    icons();
  });
  icons();
  if (location.hash) setTimeout(() => $(location.hash)?.scrollIntoView(), 30);
}
async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href);
    notice("Copied");
  } catch {
    notice("Select and copy this page address.");
  }
}
function renderReview() {
  const r = push.review;
  if (r && !r.reopened) {
    $("#review-slot").innerHTML =
      `<p>A reviewer marked this as organic on ${date(r.at, true)}. Reason: ${esc(r.reason)}.</p><button class="text-button" id="review-reopen">${icon("undo-2")}Reopen</button>`;
    $("#review-open").hidden = true;
    $("#review-header").textContent = "· disputed by a reviewer";
    $("#review-reopen").onclick = async () => {
      await api("/api/push/" + push.id + "/review", { reopen: true });
      push.review = null;
      $("#review-open").hidden = false;
      $("#review-header").textContent = "";
      $("#review-slot").innerHTML = "";
    };
  } else $("#review-slot").innerHTML = "";
  icons();
}
function reviewForm() {
  $("#review-slot").innerHTML =
    `<form class="review-form"><h2>Why does it look organic?</h2>${["A real event explains the spike", "These accounts are a real community", "The check misread the posts"].map((r, i) => `<label><input type="radio" name="reason" value="${r}" ${i ? "" : "checked"}>${r}</label>`).join("")}<button class="quiet" type="submit">Save</button> <button class="text-button" type="button" id="review-cancel">Cancel</button><p class="error" id="review-error"></p></form>`;
  $("#review-open").hidden = true;
  $("#review-cancel").onclick = () => {
    $("#review-slot").innerHTML = "";
    $("#review-open").hidden = false;
  };
  $(".review-form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const reason = $("input[name=reason]:checked").value;
      await api("/api/push/" + push.id + "/review", { reason });
      push.review = { at: new Date().toISOString(), reason };
      renderReview();
    } catch {
      $("#review-error").textContent =
        "Could not save. Nothing was changed. Try again.";
    }
  };
}
function drawPlot(canvas, p, options = {}) {
  let opts = { zoom: "whole", lanes: false, ...options },
    bins = [],
    points = [],
    old = [],
    animation = 0,
    selectedBin = -1,
    hover = -1;
  const ctx = canvas.getContext("2d"),
    ro = new ResizeObserver(() => render(false));
  ro.observe(canvas);
  stopPlots.push(() => {
    ro.disconnect();
    cancelAnimationFrame(animation);
  });
  function layout() {
    let times = p.posts
      .filter((p) => p.postedAt)
      .map((p) => Date.parse(p.postedAt));
    let first = Math.min(...times),
      last = Math.max(...times),
      peak = Date.parse(p.peakAt || p.firstSeen),
      min,
      max;
    if (opts.zoom === "10min") {
      min = peak;
      max = min + 600000;
    } else if (opts.zoom === "hour") {
      min = peak - 25 * 60000;
      max = min + 3600000;
    } else {
      min = first - 2 * 3600000;
      max = Math.max(last + 2 * 3600000, min + 6 * 3600000);
    }
    let w = canvas.clientWidth,
      h = canvas.clientHeight,
      dpr = devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let lanes = opts.lanes
      ? [...new Set(p.posts.map((p) => p.platform))]
      : ["all"];
    let plotH = h - 30,
      columns = Math.max(1, Math.floor((w - (opts.lanes ? 32 : 0)) / 5));
    bins = Array.from({ length: columns }, (_, i) => ({
      from: min + (i * (max - min)) / columns,
      to: min + ((i + 1) * (max - min)) / columns,
      posts: [],
    }));
    for (const post of [
      ...p.posts.map((x) => ({ ...x, inPush: true })),
      ...(p.backgroundPosts || []).map((x) => ({ ...x, inPush: false })),
    ]) {
      let t = Date.parse(post.postedAt),
        bin = Math.floor(((t - min) / (max - min)) * columns);
      if (bin === columns && t === max) bin = columns - 1;
      if (bin >= 0 && bin < columns) bins[bin].posts.push(post);
    }
    let largest = Math.max(
      1,
      ...bins.flatMap((b) =>
        lanes.map(
          (l) => b.posts.filter((p) => l === "all" || p.platform === l).length,
        ),
      ),
    );
    let laneHeight = plotH / lanes.length,
      unit = Math.max(
        1,
        Math.ceil(largest / Math.max(1, Math.floor((laneHeight - 15) / 5))),
      );
    let dots = [];
    bins.forEach((b, i) =>
      lanes.forEach((l, k) => {
        let items = b.posts
          .filter((p) => l === "all" || p.platform === l)
          .sort((a, b) => Number(b.inPush) - Number(a.inPush));
        let row = 0;
        for (const inPush of [true, false]) {
          const selected = items.filter((x) => x.inPush === inPush);
          for (let j = 0; j < selected.length; j += unit)
            dots.push({
              id: selected[j].id,
              inPush,
              x: (opts.lanes ? 32 : 0) + i * 5,
              y: (k + 1) * laneHeight - 10 - row++ * 5,
              bin: i,
            });
        }
      }),
    );
    if ($("#unit") && canvas.id === "burst")
      $("#unit").textContent =
        `one square = ${unit} ${unit === 1 ? "post" : "posts"} · Vilnius time`;
    if (canvas.id === "pack-burst" && $("#pack-unit"))
      $("#pack-unit").textContent =
        `One square = ${unit} ${unit === 1 ? "post" : "posts"}. Vilnius time.`;
    if (opts.mini && canvas.parentElement.querySelector(".mini-unit"))
      canvas.parentElement.querySelector(".mini-unit").textContent =
        `one square = ${unit} ${unit === 1 ? "post" : "posts"}`;
    canvas.dataset.unit = unit;
    return { w, h, plotH, columns, unit, lanes, laneHeight, min, max, dots };
  }
  function render(animate = true) {
    cancelAnimationFrame(animation);
    const box = layout(),
      previous = new Map(points.map((p) => [p.id, p]));
    old = points;
    points = box.dots;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
      duration = animate && !reduced ? 700 : 0,
      start = performance.now();
    function paint(now) {
      let t = duration ? Math.min(1, (now - start) / duration) : 1,
        ease = 1 - Math.pow(1 - t, 5);
      ctx.clearRect(0, 0, box.w, box.h);
      if (hover >= 0 || selectedBin >= 0) {
        ctx.fillStyle = "#FDE8DA";
        ctx.fillRect(
          (opts.lanes ? 32 : 0) + (selectedBin >= 0 ? selectedBin : hover) * 5,
          0,
          5,
          box.plotH,
        );
      }
      ctx.strokeStyle = "#D5DBDF";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, box.plotH);
      ctx.lineTo(box.w, box.plotH);
      ctx.stroke();
      ctx.font = '11px "JetBrains Mono Variable"';
      ctx.fillStyle = "#5C6A73";
      const tickMs =
        opts.zoom === "10min" ? 60000 : opts.zoom === "hour" ? 600000 : 3600000;
      const labelEvery = Math.max(
        1,
        Math.ceil(48 / ((tickMs / (box.max - box.min)) * box.w)),
      );
      let tickIndex = 0;
      for (
        let at = Math.ceil(box.min / tickMs) * tickMs;
        at <= box.max;
        at += tickMs
      ) {
        const x = ((at - box.min) / (box.max - box.min)) * box.w;
        ctx.strokeStyle = "#D5DBDF";
        ctx.beginPath();
        ctx.moveTo(x, box.plotH);
        ctx.lineTo(x, box.plotH + 4);
        ctx.stroke();
        if (tickIndex++ % labelEvery === 0) {
          ctx.fillText(
            clock(new Date(at).toISOString()).slice(0, 5),
            Math.min(box.w - 38, Math.max(0, x)),
            box.h - 8,
          );
        }
      }
      if (!opts.mini) {
        const events = [
          { at: p.firstSeen, label: "first post " + clock(p.firstSeen) },
          { at: p.flaggedAt, label: "flagged " + clock(p.flaggedAt) },
        ];
        for (const event of events) {
          const at = Date.parse(event.at);
          if (at < box.min || at > box.max || !Number.isFinite(at)) continue;
          const x = ((at - box.min) / (box.max - box.min)) * box.w;
          ctx.strokeStyle = "#132026";
          ctx.beginPath();
          ctx.moveTo(x, 16);
          ctx.lineTo(x, box.plotH);
          ctx.stroke();
          ctx.fillStyle = "#132026";
          const width = ctx.measureText(event.label).width;
          ctx.fillText(
            event.label,
            Math.max(0, Math.min(box.w - width, x + 4)),
            11,
          );
        }
      }
      if (opts.lanes)
        box.lanes.forEach((l, i) =>
          ctx.fillText(l, 0, (i + 0.5) * box.laneHeight),
        );
      for (const dot of points) {
        const from = previous.get(dot.id) || dot;
        ctx.fillStyle = ["strong", "moderate"].includes(p.verdict)
          ? "#E8590C"
          : "#7C8993";
        if (dot.inPush)
          ctx.fillRect(
            from.x + (dot.x - from.x) * ease,
            from.y + (dot.y - from.y) * ease,
            4,
            4,
          );
        else {
          ctx.strokeStyle = "#7C8993";
          ctx.strokeRect(
            from.x + (dot.x - from.x) * ease + 0.5,
            from.y + (dot.y - from.y) * ease + 0.5,
            3,
            3,
          );
        }
      }
      if (t < 1) animation = requestAnimationFrame(paint);
    }
    paint(performance.now());
  }
  function pick(index) {
    selectedBin = index;
    const b = bins[index];
    if (!b) return;
    setQuery("slice", index);
    if ($("#posts-table")) {
      $("#slice-label").innerHTML =
        `Posts from ${clock(new Date(b.from).toISOString())} to ${clock(new Date(b.to).toISOString())} <button class="text-button" id="slice-clear">Show all</button>`;
      $("#posts-table").innerHTML = postsTable(b.posts);
      $("#slice-clear").onclick = () => {
        selectedBin = -1;
        setQuery("slice", null);
        $("#slice-label").textContent = "";
        $("#posts-table").innerHTML = postsTable(p.posts.slice(0, 10));
        render(false);
        icons();
      };
      icons();
    }
    render(false);
  }
  canvas.onmousemove = (e) => {
    hover = Math.max(
      0,
      Math.min(
        bins.length - 1,
        Math.floor((e.offsetX - (opts.lanes ? 32 : 0)) / 5),
      ),
    );
    const b = bins[hover];
    canvas.title = b
      ? `${clock(new Date(b.from).toISOString())} to ${clock(new Date(b.to).toISOString())} · ${b.posts.length} posts, ${b.posts.filter((p) => p.inPush).length} in this push`
      : "";
    render(false);
  };
  canvas.onmouseleave = () => {
    hover = -1;
    render(false);
  };
  canvas.onclick = (e) =>
    pick(
      Math.max(
        0,
        Math.min(
          bins.length - 1,
          Math.floor((e.offsetX - (opts.lanes ? 32 : 0)) / 5),
        ),
      ),
    );
  canvas.onkeydown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      hover = Math.max(
        0,
        Math.min(bins.length - 1, hover + (e.key === "ArrowRight" ? 1 : -1)),
      );
      render(false);
    }
    if (e.key === "Enter") pick(hover);
    if (e.key === "Escape") $("#slice-clear")?.click();
  };
  render(false);
  if (canvas.id === "burst" && url.searchParams.has("slice"))
    pick(
      Math.max(
        0,
        Math.min(bins.length - 1, Number(url.searchParams.get("slice")) || 0),
      ),
    );
  return {
    update(o) {
      if (o.zoom && $("#slice-clear")) $("#slice-clear").click();
      Object.assign(opts, o);
      render(true);
    },
    table() {
      return `<table><thead><tr><th>Time slice</th><th>Posts in push</th><th>Other posts</th></tr></thead><tbody>${bins
        .filter((b) => b.posts.length)
        .map(
          (b) =>
            `<tr><td>${clock(new Date(b.from).toISOString())}</td><td>${b.posts.filter((p) => p.inPush).length}</td><td>${b.posts.filter((p) => !p.inPush).length}</td></tr>`,
        )
        .join("")}</tbody></table>`;
    },
  };
}
async function trail() {
  const d = await api("/api/push/" + push.id + "/trail");
  let step = Number(url.searchParams.get("step") || 1);
  const names = ["Collected", "Read", "Checked", "Weighed", "Packed"];
  const pipelineKeys = ["collected", "read", "checked", "weighed", "packed"];
  function show() {
    let calls = d.calls.filter((c) => c.step === step);
    let content = "",
      sentence = "";
    if (step === 1) {
      sentence = `${push.posts.length} public posts were retrieved after their publication.`;
      content = `<table class="facts">${Object.entries(platforms)
        .map(
          ([k, v]) =>
            `<tr><td>${v}</td><td>${push.posts.filter((p) => p.platform === k).length} posts</td></tr>`,
        )
        .join("")}</table><p class="small secondary">${esc(d.reason)}</p>`;
    }
    if (step === 2) {
      sentence = `The Hostinger AI Router checked whether these posts carry the same narrative.`;
      content = `<table class="facts"><tr><td>Model for reading</td><td>${esc((push.reading || push.judgement).model)}</td></tr><tr><td>Model for claim checking</td><td>${esc(push.judgement.model)}</td></tr>${push.judgement.verification?.model ? `<tr><td>Evidence relation check</td><td>${esc(push.judgement.verification.model)} · ${esc(push.judgement.verification.promptVersion)}</td></tr>` : ""}<tr><td>Prompt version</td><td>${esc(push.judgement.promptVersion)}</td></tr><tr><td>Checked at</td><td>${date(push.judgement.at, true)}</td></tr><tr><td>Same narrative</td><td>${push.judgement.data.sameNarrative ? "agreed" : "not agreed"}</td></tr><tr><td>Router credits</td><td>${push.judgement.usage?.credits_charged ?? "not measured"}</td></tr></table>`;
    }
    if (step === 3) {
      sentence = `${push.signals.filter((s) => s.fired).length} of 5 signals fired. The verdict is "${labels[push.verdict]}".`;
      content = `<table class="facts">${push.signals.map((s) => `<tr><td>${s.name}</td><td>${s.fired ? "found" : "not found or could not be measured"}</td></tr>`).join("")}</table><p>Models read and label. The verdict comes from the counts above, by a fixed rule. <a href="/method#rule">See the rule</a>.</p>`;
    }
    if (step === 4) {
      sentence = `${push.sources.length} retrieved sources were supplied for the claim check.`;
      content = claims(push);
    }
    if (step === 5) {
      sentence = `The pack holds ${push.posts.length} posts, ${push.accounts.length} accounts and ${push.evidence.length} verified source quotes.`;
      content = `<table class="facts"><tr><td>PDF</td><td>${external("/api/push/" + push.id + "/pdf", "Download evidence pack")}</td></tr><tr><td>Source data</td><td>${external("/api/push/" + push.id + "/zip", "Download data")}</td></tr></table>`;
    }
    $("#main").innerHTML =
      `<div class="trail-head"><a class="text-button" href="${pathPush(push)}">${icon("chevron-left")}Back to the push</a><div class="row between"><h1>How Signal Fire found this push</h1><p class="title">${d.firstPostToPackMs === null ? "First-post-to-pack time is not measured." : Math.ceil(d.firstPostToPackMs / 60000) + " min from first post to evidence pack"}</p></div>${d.timing ? `<p class="small secondary">The recorded steps span ${duration(d.timing.workMs)} in total. ${duration(d.timing.beforeCollectionMs)} elapsed before collection, ${duration(d.timing.betweenStepsMs)} between steps, and ${duration(d.timing.overlapMs)} of steps overlap. These measured intervals account for the full first-post delay.</p>` : ""}</div><div class="trail-chain">${names.map((n, i) => `<button class="station" data-step="${i + 1}" aria-pressed="${step === i + 1}"><strong>${n}</strong><i class="circle"></i><time>${d.pipeline?.[pipelineKeys[i]]?.finishedAt ? clock(d.pipeline[pipelineKeys[i]].finishedAt) : ""}</time></button>`).join("")}</div><div class="trail-body"><div><h2 class="title">${sentence}</h2><p class="small secondary" style="margin-bottom:16px">Step time: ${duration(d.pipeline?.[pipelineKeys[step - 1]]?.ms)}</p>${content}${step === 5 && d.pack ? `<p class="small secondary">PDF: ${fmt(d.pack.size)} bytes · built ${date(d.pack.builtAt, true)}</p><p class="mono" style="overflow-wrap:anywhere">SHA-256 ${esc(d.pack.sha256)}</p>` : ""}</div><div><h2>The actual requests</h2>${calls.length ? calls.map((c) => `<details><summary><time>${clock(c.at)}</time> · ${esc(c.provider === "context" ? "context.dev" : "Hostinger AI Router")} ${esc(c.endpoint === "/web/scrape" ? "Page retrieval" : c.endpoint === "/web/search" ? "Web search" : c.endpoint === "/chat/completions" ? "Narrative or claim check" : "Source request")} · ${c.ms} ms · ${c.status}</summary><pre>${esc(c.endpoint + "\n" + JSON.stringify(c.params, null, 2) + "\n\n" + c.response)}</pre><button class="quiet copy-record">Copy</button></details>`).join("") : '<p class="small secondary">This step runs locally. No external request was made.</p>'}</div></div>`;
    $$("[data-step]").forEach(
      (b) =>
        (b.onclick = () => {
          step = Number(b.dataset.step);
          setQuery("step", step);
          show();
        }),
    );
    $$(".copy-record").forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            await navigator.clipboard.writeText(
              $("pre", b.parentElement).textContent,
            );
            notice("Copied");
          } catch {
            notice("Select the record text to copy it.");
          }
        }),
    );
    icons();
  }
  show();
}
function pack() {
  const p = push;
  $("#main").innerHTML =
    `<div class="pack-ground"><div class="pack-toolbar"><a class="text-button" href="${pathPush(p)}">${icon("chevron-left")}Back to the push</a><div class="row"><button class="quiet copy-link">${icon("copy")}Copy link</button><a class="quiet" href="/api/push/${p.id}/zip">${icon("download")}Data (.zip)</a><a class="primary" id="pdf-download" href="/api/push/${p.id}/pdf">${icon("download")}Download PDF</a></div></div><article class="sheet"><div class="row"><img src="/mark.svg" width="20" height="20" alt=""><h2 style="margin:0">Signal Fire evidence pack</h2></div><h1 style="margin-top:24px">${esc(p.title)}</h1><p class="small secondary" style="margin:12px 0">Pack ${esc(p.packId)} · built ${date(p.checkedAt, true)} Vilnius time · watch: ${esc(state.watch.name)}</p>${verdict(p.verdict)}<p style="margin-top:12px">${p.posts.length} public posts from ${p.accounts.length} accounts shared this narrative. ${esc(
      p.signals
        .filter((s) => s.fired)
        .map((s) => s.reason)
        .join(" "),
    )}</p><p class="small muted" style="margin-top:12px">Signal Fire flags coordination and weak evidence, whoever is behind it. It does not say who is responsible. Nothing was reported or removed.</p><h2>1. Timeline</h2><canvas class="burst" id="pack-burst" role="img" aria-label="${p.posts.length} real public posts"></canvas><p class="small muted" id="pack-unit">Vilnius time.</p><h2>2. Why it looks coordinated</h2>${p.signals.map((s) => `<p><strong>${s.name}</strong>. ${esc(s.reason)}</p>`).join("")}<h2>3. Accounts</h2>${accounts(p)}<h2>4. The text</h2>${p.posts
      .slice(0, 10)
      .map((x) => quote(x))
      .join(
        "",
      )}<h2>5. The site</h2>${site(p)}<h2>6. Claims and sources</h2>${claims(p)}<h2>7. Wording</h2>${wording(p)}<h2>8. Seen before</h2>${seen(p)}<h2>9. How to check this yourself</h2><p>Open any post link in part 4. Read the sources in part 6 at their links. A real community can post fast and alike. A person decides.</p></article></div>`;
  $(".copy-link").onclick = copyLink;
  $("#pdf-download").onclick = async (e) => {
    e.preventDefault();
    const button = e.currentTarget;
    button.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(button.href);
      if (!response.ok) throw Error("download failed");
      const blob = await response.blob(),
        href = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = href;
      link.download = p.packId + ".pdf";
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 30000);
      button.innerHTML = icon("check") + "Downloaded";
      button.classList.add("downloaded");
      icons();
      setTimeout(() => {
        button.innerHTML = icon("download") + "Download PDF";
        button.classList.remove("downloaded");
        icons();
      }, 4000);
    } catch {
      notice("The PDF could not be downloaded. Try again.");
    } finally {
      button.removeAttribute("aria-busy");
    }
  };
  drawPlot($("#pack-burst"), p);
  icons();
}
let draft = {
    conflict: "",
    name: "",
    countries: [],
    languages: [],
    keywords: {},
    sources: [],
    trusted: [
      "ISW daily assessments",
      "ERR (Estonia)",
      "LSM (Latvia)",
      "LRT (Lithuania)",
    ],
    news: true,
    seenBefore: true,
  },
  checks = {},
  previewTimer,
  autoName = true;
const countryLanguages = {
  Lithuania: ["lt"],
  Latvia: ["lv"],
  Estonia: ["et"],
  Finland: ["fi"],
  Ukraine: ["uk", "ru"],
  Sudan: ["ar", "en"],
  "South Sudan": ["en"],
  Russia: ["ru"],
  Israel: ["he", "ar"],
  Palestine: ["ar"],
  France: ["fr"],
  Germany: ["de"],
  Poland: ["pl"],
  "United States": ["en"],
};
const countryNames = (() => {
  const names = new Intl.DisplayNames(["en"], { type: "region" }),
    out = [];
  for (let a = 65; a <= 90; a++)
    for (let b = 65; b <= 90; b++) {
      const c = String.fromCharCode(a, b),
        n = names.of(c);
      if (n !== c && !["EU", "UN", "EZ", "QO", "XA", "XB", "ZZ"].includes(c))
        out.push(n);
    }
  return [...new Set(out)].sort();
})();
function tokensField(key, values, placeholder = "Type a word and press Enter") {
  return `<div class="token-field" data-token-field="${key}">${values.map((v, i) => `<span class="token">${esc(v)}<button type="button" data-remove="${i}" aria-label="Remove ${esc(v)}">${icon("x")}</button></span>`).join("")}<input type="text" aria-label="${key.startsWith("keyword-") ? "Keywords in " + (langs[key.slice(8)] || key.slice(8)) : key}" placeholder="${placeholder}" ${key === "countries" ? 'list="countries-list"' : ""}></div>`;
}
function newWatch() {
  const allTrusted = [
    ...new Set([
      "ISW daily assessments",
      "Oryx loss lists",
      "ERR (Estonia)",
      "LSM (Latvia)",
      "LRT (Lithuania)",
      "Yle",
      "Official defence statements",
      ...draft.trusted,
    ]),
  ];
  $("#main").innerHTML =
    `<div class="new-layout"><form id="watch-form" class="new-form"><h1>New watch</h1><p style="font-size:15px;line-height:24px;margin-top:8px">Tell Signal Fire which conflict to watch and who it is aimed at. It starts reading at once and needs about a day to learn what is usual.</p><label class="row small">Start from <select id="copy-watch"><option value="">A blank watch</option>${state.watches.map((w) => `<option value="${w.id}">${esc(w.name)}</option>`).join("")}</select></label><h2>The conflict</h2><p>Name it the way a neutral encyclopedia would.</p><label class="field"><span>Conflict</span><input type="text" name="conflict" placeholder="for example: Sudan civil war" value="${esc(draft.conflict)}" required maxlength="100"></label><label class="field"><span>Watch name</span><input type="text" name="name" value="${esc(draft.name)}" maxlength="180"></label><h2>Who it is aimed at</h2><p>The countries whose public the messaging is trying to reach.</p><label class="field"><span>Countries</span>${tokensField("countries", draft.countries, "Type a country and press Enter")}</label><datalist id="countries-list">${countryNames.map((c) => `<option value="${esc(c)}">`).join("")}</datalist><label class="field"><span>Languages</span>${tokensField("languages", draft.languages, "Language code, for example en")}</label><h2>What to listen for</h2><p>Words and phrases, in each language.</p><div id="keyword-fields">${draft.languages.map((l) => `<label class="field"><span>${tag(l, true)}${langs[l] || l}</span>${tokensField("keyword-" + l, draft.keywords[l] || [])}</label>`).join("")}</div><button class="quiet" id="suggest-languages" type="button">Suggest in the other languages</button><p id="translation-note" class="small muted"></p><h2>Where to listen</h2><label class="field"><span>Known network, optional</span><input type="text" name="networkName" value="${esc(draft.networkName || "")}" placeholder="A documented publishing network"></label><label class="field"><span>Network documentation address, optional</span><input type="text" name="networkDocument" value="${esc(draft.networkEvidence?.[0]?.url || "")}" placeholder="https://"></label><p>Paste links to public channels, hashtags, subreddits or sites. One per line.</p><textarea name="sources" aria-label="Public source links" placeholder="https://t.me/s/channel\nhttps://www.reddit.com/r/worldnews/">${esc(draft.sources.join("\n"))}</textarea><div id="source-checks"></div><label class="check-row"><input type="checkbox" name="news" ${draft.news ? "checked" : ""}>Also search news in these languages for the keywords.</label><h2>Whom to trust</h2><p>Claims are weighed against these. Pick sources that publish corrections and name their evidence.</p>${allTrusted.map((t) => `<label class="check-row"><input type="checkbox" name="trusted" value="${esc(t)}" ${draft.trusted.includes(t) ? "checked" : ""}>${esc(t)}</label>`).join("")}<label class="field"><span>Add a source by address</span><input type="text" name="extra-trusted" placeholder="https://"></label><label class="check-row"><input type="checkbox" name="seenBefore" ${draft.seenBefore ? "checked" : ""}>Compare with the EUvsDisinfo database of recorded cases.</label><div class="row wrap" style="margin-top:32px"><button class="primary" type="submit">Start watching</button><span class="small muted">You can change all of this later.</span></div><p id="form-error" class="error" role="alert"></p>${footer()}</form><aside class="preview"><h2>What this watch will read</h2><table class="facts"><tr><td>Sources</td><td id="preview-source-count">${draft.sources.length}</td></tr><tr><td>Languages</td><td id="preview-languages">${draft.languages.map((l) => tag(l, true)).join("")}</td></tr><tr><td>Keywords</td><td id="preview-keyword-count">${Object.values(draft.keywords).flat().length}</td></tr><tr><td>Trusted sources</td><td id="preview-trusted-count">${draft.trusted.length}</td></tr><tr><td>Sweep every</td><td>30 min</td></tr></table><div id="preview-posts"><p class="small secondary">Add keywords and a public source to read matching examples.</p></div><p class="small muted" style="margin-top:16px">Your watch is private to this browser and expires after 24 hours.</p></aside></div>`;
  bindForm();
  icons();
  renderChecks();
}
function collectDraft() {
  const f = $("#watch-form");
  if (!f) return;
  draft.conflict = f.elements.conflict.value;
  draft.networkName = f.elements.networkName?.value || "";
  const documentURL = f.elements.networkDocument?.value?.trim();
  if (documentURL && /^https:\/\//.test(documentURL))
    draft.networkEvidence = [
      { name: "Network documentation", url: documentURL },
    ];
  draft.name = f.elements.name.value;
  draft.sources = [
    ...new Set(
      f.elements.sources.value
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ];
  draft.trusted = $$("input[name=trusted]:checked").map((x) => x.value);
  draft.news = f.elements.news.checked;
  draft.seenBefore = f.elements.seenBefore.checked;
}
function preview() {
  collectDraft();
  $("#preview-source-count").textContent = draft.sources.length;
  $("#preview-keyword-count").textContent = Object.values(
    draft.keywords,
  ).flat().length;
  $("#preview-trusted-count").textContent = draft.trusted.length;
  clearTimeout(previewTimer);
  if (
    Object.values(draft.keywords).flat().length &&
    (draft.sources.length || draft.news)
  )
    previewTimer = setTimeout(async () => {
      if (!$("#preview-posts")) return;
      $("#preview-posts").innerHTML = '<p class="small secondary">Looking…</p>';
      try {
        const d = await api("/api/preview", { keywords: draft.keywords });
        if (!$("#preview-posts")) return;
        $("#preview-posts").innerHTML =
          `<p class="small secondary">${esc(d.note || "Matching public search results")}</p>${d.posts.map((p) => `<div class="source"><div class="small">${external(p.url, p.title)}</div><div class="slab small">${esc(p.text)}</div></div>`).join("") || '<p class="small secondary">Nothing matched in the last 24 hours. Add keywords or sources, or start anyway.</p>'}`;
        icons();
      } catch {
        if ($("#preview-posts"))
          $("#preview-posts").textContent =
            "A preview could not be read. You can start anyway.";
      }
    }, 1000);
}
function renderChecks() {
  const el = $("#source-checks");
  if (!el) return;
  el.innerHTML = draft.sources
    .map(
      (s, i) =>
        `<div class="source-row">${tag(checks[s]?.platform || "WB")}<span class="mono">${esc(s)}</span><span class="${checks[s]?.reachable ? "success" : checks[s] ? "error" : "muted"}">${esc(checks[s]?.message || "checking")}</span><button class="text-button" type="button" data-remove-source="${i}" aria-label="Remove source">${icon("x")}</button></div>`,
    )
    .join("");
  $$("[data-remove-source]").forEach(
    (b) =>
      (b.onclick = () => {
        draft.sources.splice(Number(b.dataset.removeSource), 1);
        $("textarea[name=sources]").value = draft.sources.join("\n");
        renderChecks();
        preview();
      }),
  );
  icons();
}
async function checkSources() {
  collectDraft();
  for (const s of draft.sources.slice(0, 25)) {
    if (!checks[s]) {
      checks[s] = { message: "checking" };
      renderChecks();
      try {
        checks[s] = await api("/api/source-check", { url: s });
      } catch (e) {
        checks[s] = { message: e.message, reachable: false };
      }
      renderChecks();
    }
  }
  preview();
}
function bindForm() {
  const f = $("#watch-form");
  f.oninput = () => {
    formDirty = true;
    collectDraft();
    if (autoName) {
      draft.name =
        draft.conflict +
        (draft.countries.length
          ? " · aimed at " + draft.countries.join(", ")
          : "");
      f.elements.name.value = draft.name;
    }
    preview();
  };
  f.elements.name.oninput = () => (autoName = false);
  f.elements.sources.onblur = checkSources;
  f.elements["extra-trusted"].onblur = () => {
    const value = f.elements["extra-trusted"].value.trim();
    try {
      const u = new URL(value);
      if (u.protocol === "https:" && u.hostname.includes(".")) {
        collectDraft();
        if (!draft.trusted.includes(u.href)) draft.trusted.push(u.href);
        newWatch();
        preview();
      }
    } catch {}
  };
  f.elements.sources.onpaste = () => setTimeout(checkSources, 0);
  $("#copy-watch").onchange = (e) => {
    const w = state.watches.find((w) => w.id === e.target.value);
    if (w) {
      draft = structuredClone(w);
      delete draft.id;
      formDirty = true;
      newWatch();
    }
  };
  $$("[data-token-field]").forEach((el) => {
    const key = el.dataset.tokenField,
      input = $("input", el),
      arr = key.startsWith("keyword-")
        ? (draft.keywords[key.slice(8)] ??= [])
        : draft[key];
    const add = () => {
      let v = input.value.trim().replace(/,$/, "");
      if (!v) return;
      if (key === "languages") v = v.toLowerCase();
      if (key === "countries" && !countryNames.includes(v)) {
        notice("Choose a country from the suggestions.");
        return;
      }
      if (
        Object.values(draft.keywords).flat().length >= 60 &&
        key.startsWith("keyword-")
      ) {
        notice("A watch can hold up to 60 keywords.");
        return;
      }
      collectDraft();
      if (!arr.includes(v)) arr.push(v);
      if (key === "countries") {
        for (const l of countryLanguages[v] || ["en"])
          if (!draft.languages.includes(l)) draft.languages.push(l);
      }
      if (autoName)
        draft.name =
          draft.conflict + " · aimed at " + draft.countries.join(", ");
      formDirty = true;
      newWatch();
      const field = $(`[data-token-field="${key}"] input`);
      field?.focus();
      preview();
    };
    input.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        add();
      }
      if (e.key === "Backspace" && !input.value && arr.length) {
        arr.pop();
        collectDraft();
        newWatch();
      }
    };
    $$("[data-remove]", el).forEach(
      (b) =>
        (b.onclick = () => {
          collectDraft();
          arr.splice(Number(b.dataset.remove), 1);
          newWatch();
          preview();
        }),
    );
  });
  $("#suggest-languages").onclick = async () => {
    $("#translation-note").textContent = "Reading the keyword suggestions…";
    try {
      const d = await api("/api/translate", {
        keywords: draft.keywords,
        languages: draft.languages,
      });
      for (const [l, words] of Object.entries(d.translations || {}))
        if (draft.languages.includes(l) && Array.isArray(words))
          draft.keywords[l] = [
            ...new Set([
              ...(draft.keywords[l] || []),
              ...words.filter((w) => typeof w === "string").slice(0, 10),
            ]),
          ];
      newWatch();
      $("#translation-note").textContent =
        "Suggested keywords added. Edit or remove any of them before starting.";
      preview();
    } catch {
      $("#translation-note").textContent =
        "Suggestions could not be read. Enter keywords in each language.";
    }
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    collectDraft();
    const error = !draft.conflict.trim()
      ? "Give the conflict a name."
      : !draft.countries.length
        ? "Add at least one country."
        : !Object.values(draft.keywords).flat().length
          ? "Add at least one keyword in at least one language."
          : !draft.news && !draft.sources.some((s) => checks[s]?.reachable)
            ? "Add at least one reachable source, or keep news search on."
            : null;
    if (error) {
      $("#form-error").textContent = error;
      $("#form-error").scrollIntoView();
      return;
    }
    const b = $("button[type=submit]", f);
    b.disabled = true;
    b.textContent = "Starting…";
    try {
      const d = await api("/api/watch", draft);
      formDirty = false;
      location.href = "/w/" + d.id;
    } catch (e) {
      $("#form-error").textContent = e.message;
      b.disabled = false;
      b.textContent = "Start watching";
    }
  };
}
function method() {
  const m = state.metrics,
    b = state.benchmark;
  const coordinated = state.pushes.filter((p) =>
      ["strong", "moderate"].includes(p.verdict),
    ),
    strongest = coordinated[0];
  const methodSections = [
    ["replay", "The replay"],
    ["lead", "Hours before the first public debunk"],
    ["cases", "The cases"],
    ["wrong", "One it got wrong"],
    ["rule", "The rule"],
    ["speed", "Speed"],
    ["live-web", "Built on live web data"],
    ["network", "Known network"],
    ["running", "Running now"],
    ["limits", "Where it fails"],
  ];
  const measured = b.coordination,
    counts =
      measured?.[
        url.searchParams.get("count") === "strong" ? "strong" : "both"
      ];
  let replay = measured
    ? `<p>The fixed rule was developed on ${b.development.n} publication sets, then frozen before a separate ${measured.n}-set replay: ${measured.both.positive} documented-network sets and ${measured.both.negative} normal-reporting controls.</p><p>${counts.tp} of ${counts.positive} documented-network sets were caught (${(counts.catchRate * 100).toFixed(1)}%). ${counts.fp} of ${counts.negative} reporting controls were falsely flagged (${(counts.falseFlagRate * 100).toFixed(1)}%).</p><p class="small secondary">Development caught ${b.development.both.tp} of ${b.development.both.positive} network sets (${(b.development.both.catchRate * 100).toFixed(1)}%), with ${b.development.both.fp} of ${b.development.both.negative} controls falsely flagged. Both splits had ${b.development.failed + measured.failed} failed checks in total.</p><p class="small secondary">${measured.positiveEligible} network sets and ${measured.negativeEligible} controls met the minimum sample. Small retrieved sets count as misses; unavailable account histories and baselines cannot fire. This is a test of supplied publication sets, not end-to-end discovery. Zero observed false flags in ${counts.negative} controls does not establish a general rate below 5%.</p><p class="small secondary">${esc(measured.limitations)}</p>`
    : "<p>Campaign replay catch rate and false-flag rate are not measured. The retrieved domain lists document networks, but domain membership is not proof that an individual post was coordinated. No campaign replay is presented as live detection.</p>";
  $("#main").innerHTML =
    `<div class="method-layout"><nav class="method-nav">${methodSections.map(([id, title]) => `<a href="#${id}">${title}</a>`).join("")}</nav><article class="method"><h1>How Signal Fire decides, and how often it is right</h1><p class="secondary">The rule behind every verdict, the evidence collected so far, and where it fails.</p><section id="replay"><h2>The replay</h2>${replay}<div class="row wrap"><span class="small secondary">Count as flagged:</span><div class="segmented"><button data-count="both" aria-pressed="${url.searchParams.get("count") !== "strong"}">Strong and moderate</button><button data-count="strong" aria-pressed="${url.searchParams.get("count") === "strong"}">Strong only</button></div></div><table class="confusion" style="margin-top:16px"><thead><tr><th></th><th>Flagged</th><th>Not flagged</th></tr></thead><tbody><tr><th>Documented as coordinated</th><td>${counts ? counts.tp : "not measured"}</td><td>${counts ? counts.fn : "not measured"}</td></tr><tr><th>Ordinary discussion</th><td>${counts ? counts.fp : "not measured"}</td><td>${counts ? counts.tn : "not measured"}</td></tr></tbody></table><p>Catch rate: ${counts ? (counts.catchRate * 100).toFixed(1) + "%" : "not measured"}.<br>False-flag rate: ${counts ? (counts.falseFlagRate * 100).toFixed(1) + "%" : "not measured"}.<br>Precision: ${counts?.precision === null || !counts ? "not measured" : (counts.precision * 100).toFixed(1) + "%"}.</p>${b.content ? `<p>Content inventory: ${fmt(b.content.war)} war-related article records from the CIKM 2024 dataset, with ${fmt(b.content.trustworthy)} labelled trustworthy and ${fmt(b.content.disinformation)} labelled as disputed by the source dataset. These labels do not establish coordination.</p><p class="small muted">${external(b.content.url, "Dataset and collection method")}</p>` : ""}${
      b.content?.heldoutExperiment
        ? `<h3 style="margin-top:24px">Content-only screening experiment</h3><p>This separate article task uses source labels, not coordination ground truth. It does not decide which pushes appear.</p><table><thead><tr><th>Split</th><th>Source-labelled disputed articles caught</th><th>Trustworthy articles falsely flagged</th><th>Failed outputs</th></tr></thead><tbody>${[
            "devExperiment",
            "heldoutExperiment",
          ]
            .map((key) => {
              const x = b.content[key];
              return x
                ? `<tr><td>${key === "devExperiment" ? "Development" : "Held out"}</td><td>${x.caught} of ${x.positive} · ${(x.catchRate * 100).toFixed(1)}%</td><td>${x.falseFlags} of ${x.negative} · ${(x.falseFlagRate * 100).toFixed(1)}%</td><td>${x.failed}</td></tr>`
                : "";
            })
            .join(
              "",
            )}</tbody></table><p class="small secondary">The held-out false-flag rate exceeds 5%. Retrieval attrition, balanced sampling and article-level source labels limit these results. Failed outputs remain in the denominator. Prompt and configuration were frozen before the held-out run.</p>`
        : ""
    }</section><section id="lead"><h2>Hours before the first public debunk</h2><p>Not measured. ${b.leadSubset ?? 0} replay cases have both a verified first-post timestamp and a first public debunk date. Fetching an old post today does not show how early Signal Fire would have found it.</p></section><section id="cases"><h2>The cases</h2><p>Public campaign documentation is used to discover sources and check look-alike domains.</p><table><thead><tr><th>Campaign</th><th>Documented by</th><th>Replay</th></tr></thead><tbody><tr><td>Pravda / Portal Kombat</td><td>${external("https://dfrlab.org/2025/02/24/russia-pravda-network-expands-worldwide/", "DFRLab")}</td><td>${measured ? measured.both.positive + " held-out publication sets" : "not measured"}</td></tr><tr><td>Doppelganger</td><td>${external("https://www.disinfo.eu/doppelganger-hub/", "EU DisinfoLab")}</td><td>not measured</td></tr><tr><td>Operation Overload</td><td>${external("https://checkfirst.network/wp-content/uploads/2024/06/Operation_Overload_WEB.pdf", "CheckFirst")}</td><td>not measured</td></tr></tbody></table></section><section id="wrong"><h2>One it got wrong</h2>${
      measured?.wrong
        ? `<h3>${external(measured.wrong.url, measured.wrong.title)}</h3><p>This documented-network set was missed. It contained ${measured.wrong.posts} retrieved posts from ${measured.wrong.accounts} publishing identities. The rule returned “${labels[measured.wrong.verdict]}”. ${esc(
            measured.wrong.signals
              .filter((s) => s.fired)
              .map((s) => s.reason)
              .join(" "),
          )}</p><p class="small secondary">Sparse public retrieval is a real failure for a monitor. It is retained in the denominator.</p>`
        : `<p>No campaign replay has finished, so neither a false flag nor a miss is claimed.</p>`
    }</section><section id="rule"><h2>The rule</h2><p>Strong means three or more signals fired, including Same minute or Same text. Moderate means exactly two. One or none means Looks organic. Under ${state.config.minPosts} posts or ${state.config.minAccounts} accounts means Not enough data. A coordinated push is shown only after the Router agrees that the posts carry the same narrative.</p><table><thead><tr><th>Signal</th><th>Threshold and availability</th></tr></thead><tbody><tr><td>Same minute</td><td>At least ${state.config.minBurstPosts} posts in ${state.config.burstWindowMinutes} minutes and ${state.config.burstRatio} times the same-topic, same-hour and weekday baseline. At least 7 observed days are required.</td></tr><tr><td>New accounts</td><td>Public creation dates and a comparable baseline are required. Missing data cannot fire.</td></tr><tr><td>Same text</td><td>At least ${state.config.minCopies} copies and ${state.config.minCopyShare * 100}% of the cluster; four-word shingle overlap at least ${state.config.textJaccard * 100}%.</td></tr><tr><td>Same links</td><td>At least ${state.config.minLinkedPosts} posts and ${state.config.minLinkShare * 100}% share an external link.</td></tr><tr><td>Linked accounts</td><td>Public mutual-follower lists and a topic baseline are required. Missing data cannot fire.</td></tr></tbody></table><p class="small muted">These thresholds were retained unchanged after development and frozen before the held-out publication-set replay. Its retrieval and coverage limits apply to these results.</p><p>Models read, translate and label posts. The verdict is counts against thresholds. Wording never changes it.</p><p>Wording names include Fear appeal, Loaded language, False attribution, Fabricated authority, Whataboutism and Claims of inevitable victory. An exact phrase is required for each label.</p></section><section id="speed"><h2>Speed</h2>${m.speed?.sampleSize ? `<p>Across ${m.speed.sampleSize} measured pushes, the median first-post-to-alert time is ${duration(m.speed.medianFirstPostToAlertMs)}. The slowest is ${duration(m.speed.slowestFirstPostToAlertMs)}.</p>` : "<p>First-post-to-alert time is not measured yet. It appears after a real evidence pack has been built.</p>"}<p class="small secondary">${esc(m.speed?.note || "Backfilled posts are not evidence of early detection.")}</p><table><thead><tr><th>Context.dev operation</th><th>Successful calls timed</th><th>Median call time</th></tr></thead><tbody>${(m.speed?.perEndpoint || []).map((row) => `<tr><td>${esc(row.endpoint === "/web/urls" ? "Site URL discovery" : row.endpoint === "/web/scrape" ? "Page retrieval and parsers" : row.endpoint === "/web/search" ? "Web search" : row.endpoint === "/news/search" ? "News search" : row.endpoint === "/batch/submit" ? "Batch submission" : row.endpoint.startsWith("/batch/") ? "Batch status and results" : row.endpoint === "/monitors/run" ? "Monitor run" : row.endpoint.startsWith("/monitors") ? "Monitor management" : "Context.dev account request")}</td><td>${row.calls}</td><td>${duration(row.medianMs)}</td></tr>`).join("")}</tbody></table></section><section id="live-web"><h2>Built on live web data</h2><p>Public TikTok feeds, comments and profiles, Instagram feeds and posts, Reddit search, and YouTube pages and available transcripts are read through Context.dev. Scrape and search retain the source records. Structured extraction checks origin fields; batches collect multiple site indexes together.</p><table><thead><tr><th>Feature</th><th>Requests</th><th>Billed credits</th><th>Reserved</th></tr></thead><tbody>${(m.features || []).map((f) => `<tr><td>${esc(f.name)}</td><td>${f.calls}</td><td>${f.credits.toFixed(3)}</td><td>${f.reserved.toFixed(3)}</td></tr>`).join("")}</tbody></table><p>${m.monitors?.registered || 0} monitors configured · ${m.monitors?.active || 0} enabled · ${m.monitors?.verifiedEvents || 0} signed updates verified · ${m.monitors?.changes || 0} changes received · ${m.monitors?.processed || 0} change notifications processed.</p><p class="small secondary">Changed page and search monitors notify the VPS by a signed webhook. The receiver verifies the timestamp and signature, stores each event once, and queues collection. Platform parsers keep a slower safety-net sweep. New watches are private to their creator and expire after 24 hours.</p></section><section id="network"><h2>The known network in this watch</h2><p>The shipped watch follows the Pravda network across the Baltics and Finland. Its membership and bulk republication are documented by the sources below. This does not establish the truth of any one claim or the identity of an individual poster.</p>${(state.watch.networkEvidence || []).map((e) => `<p class="small">${external(e.url, e.name)}</p>`).join("")}<p class="small secondary">CheckFirst reports 15,046,455 articles as of 28 October 2026 across 88 sites and 47 languages, and about 18,000 new articles per day in the preceding month. These are CheckFirst’s figures, not Signal Fire’s collection. TigerWeb’s EU designation is dated 15 July 2025 in the linked official tracker. The current public CheckFirst repository contains aggregated visualisation data. The November 2026 article describes the full article archive as a separate feed. Signal Fire retrieves article-level evidence directly and does not claim to have replayed 15 million articles.</p></section><section id="running"><h2>Running now</h2><table class="facts"><tr><td>Hosted on</td><td>${state.commit === "local" ? "Local development. VPS deployment pending." : "Hostinger VPS"}</td></tr><tr><td>Watches</td><td>${m.watches}</td></tr><tr><td>Sources read</td><td>${fmt(m.sources)}</td></tr><tr><td>Posts stored</td><td>${fmt(m.posts)}</td></tr><tr><td>Accounts stored</td><td>${fmt(m.accounts)}</td></tr><tr><td>Sweeps</td><td>${m.sweeps}</td></tr>${m.calls.map((c) => `<tr><td>${c.provider === "context" ? "Context.dev" : "AI Router"} calls today</td><td>${c.n}</td></tr>`).join("")}<tr><td>Models in use</td><td>${esc((m.models || []).join(" · "))} · multilingual MiniLM-L12-v2</td></tr><tr><td>Pushes flagged</td><td>${coordinated.length}</td></tr><tr><td>Disputed by a reviewer</td><td>${m.disputed}</td></tr></table><p class="small muted">As of ${date(m.asOf, true)} Vilnius time. Sweep interval: 30 minutes. ${m.coverage.filter((c) => c.complete).length} public channels have reached the start of the 14-day backfill window.</p>${m.credits.map((c) => `<p class="small">${c.provider === "context" ? "Context.dev" : "Hostinger AI Router"}: ${Number(c.measured || 0).toFixed(3)} measured credits; ${Number(c.charged_or_reserved || 0).toFixed(3)} charged or reserved for requests without returned usage.</p>`).join("")}</section><section id="limits"><h2>Where it fails</h2><ul><li>It reads public pages only. Private groups, closed channels and X are not covered.</li><li>Follower lists are not public on every platform. Missing lists mean Linked accounts cannot fire.</li><li>A real community reacting to real news can post fast and alike. The verdict says "looks", lists what could explain it, and a person decides.</li><li>A patient campaign that posts slowly with old accounts and varied wording will be missed.</li><li>Trusted sources can be wrong or silent. Weak evidence means none of them supports the claim, not that it is untrue.</li><li>English glosses, when available, are machine translations. Read the original before acting.</li><li>News search sometimes returns articles outside the requested language. Returned language labels and coverage need independent checks.</li><li>The replay covers supplied publication sets from one documented network. End-to-end discovery, other campaign families and early-warning lead time remain unmeasured.</li></ul><h2>What Signal Fire never does</h2><p>It does not report, remove or block anything. It does not say who is behind a push. It does not judge opinions.</p></section>${strongest ? `<a class="primary" href="${pathPush(strongest)}">See the strongest push this week</a>` : ""}${footer()}</article></div>`;
  $$("[data-count]").forEach(
    (btn) =>
      (btn.onclick = () => {
        setQuery("count", btn.dataset.count);
        method();
      }),
  );
  icons();
}
async function boot() {
  try {
    const parts = location.pathname.split("/").filter(Boolean),
      wid = parts[0] === "w" ? parts[1] : "baltics";
    route =
      parts[0] === "method"
        ? "method"
        : parts[0] === "watches"
          ? "new"
          : parts[3]
            ? parts[4] || "push"
            : "home";
    state = await api("/api/state?watch=" + wid);
    renderShell();
    if (parts[3]) {
      push = await api("/api/push/" + parts[3]);
      if (route === "trail") await trail();
      else if (route === "pack") pack();
      else pushPage();
    } else if (route === "method") method();
    else if (route === "new") newWatch();
    else home();
    document.title =
      (push
        ? push.title
        : route === "new"
          ? "New watch"
          : route === "method"
            ? "Method"
            : state.watch.name) + " · Signal Fire";
  } catch (e) {
    if (!e.userFacing) console.error("Evidence page failed", e);
    const message = e.userFacing
      ? e.message
      : "This evidence page could not be read.";
    $("#main").innerHTML =
      `<div class="error-page"><h1>${esc(message)}</h1><p>Nothing is shown from memory. Try again in a moment.</p><button class="quiet" id="retry">Try again</button> <a class="text-button" href="/w/baltics">Back to the list</a></div>`;
    $("#retry").onclick = () => location.reload();
  }
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $("#watch-dropdown")?.remove();
    $("#slice-clear")?.click();
  }
  if (e.target.closest("input,textarea,select")) return;
  if (route === "home" && ["j", "k", "Enter"].includes(e.key)) {
    let rows = $$("tr[data-push]");
    if (e.key === "Enter") rows[selected]?.click();
    else {
      e.preventDefault();
      selected = Math.max(
        0,
        Math.min(rows.length - 1, selected + (e.key === "j" ? 1 : -1)),
      );
      rows.forEach((r, i) => r.classList.toggle("selected", i === selected));
      rows[selected]?.focus();
    }
  }
  if (push) {
    if (/^[1-7]$/.test(e.key))
      $("#" + ids[Number(e.key) - 1])?.scrollIntoView();
    if (e.key.toLowerCase() === "z") {
      let buttons = $$("[data-zoom]"),
        i = buttons.findIndex((b) => b.getAttribute("aria-pressed") === "true");
      buttons[(i + 1) % buttons.length]?.click();
    }
    if (e.key.toLowerCase() === "p") $("#lanes")?.click();
    if (e.key.toLowerCase() === "t") location.href = pathPush(push) + "/trail";
    if (e.key.toLowerCase() === "e") location.href = pathPush(push) + "/pack";
    if (route === "trail" && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
      let n = Number(new URL(location.href).searchParams.get("step") || 1);
      $(
        `[data-step="${Math.max(1, Math.min(5, n + (e.key === "ArrowRight" ? 1 : -1)))}"]`,
      )?.click();
    }
  }
});
setInterval(async () => {
  if (route !== "home" || document.hidden) return;
  try {
    const fresh = await api("/api/state?watch=" + state.watch.id);
    if (JSON.stringify(fresh.pushes) !== JSON.stringify(state.pushes)) {
      state = fresh;
      home();
    } else state = fresh;
    renderShell();
    icons();
  } catch {}
}, 30000);
boot();

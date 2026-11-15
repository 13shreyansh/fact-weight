/* Signal Fire front end. Plain JS, no build step. Reads the JSON API only. */
(() => {
  "use strict";
  const API = window.SF_API || "";
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  async function api(path, opts) {
    const r = await fetch(API + path, { headers: { Accept: "application/json" }, ...opts });
    let body = null;
    try { body = await r.json(); } catch { /* not JSON */ }
    if (!r.ok) {
      const e = new Error((body && (body.error || body.message)) || `Request failed (${r.status})`);
      e.status = r.status; e.body = body; throw e;
    }
    return body;
  }
  const list = (v, key) => (Array.isArray(v) ? v : (v && Array.isArray(v[key]) ? v[key] : []));

  /* ---------- formatting ---------- */
  const ts = (v) => (v ? new Date(v) : null);
  const valid = (d) => d && !isNaN(d);
  const hhmm = (v) => { const d = ts(v); return valid(d) ? d.toISOString().slice(11, 16) : "--:--"; };
  const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const dmy = (v) => { const d = ts(v); return valid(d) ? `${d.getUTCDate()} ${MON[d.getUTCMonth()]}` : ""; };
  const stamp = (v) => (valid(ts(v)) ? `${dmy(v)} ${hhmm(v)} UTC` : "time unknown");
  function ago(v) {
    const d = ts(v); if (!valid(d)) return "";
    const m = Math.round((Date.now() - d) / 60000);
    if (m < 2) return "just now";
    if (m < 90) return `${m} min ago`;
    const h = Math.round(m / 60);
    return h < 36 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
  }
  const mins = (a, b) => Math.round((ts(b) - ts(a)) / 60000);
  const num = (v) => (v == null || v === "" ? "–" : Number(v).toLocaleString("en"));
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return String(u || ""); } };
  const short = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");
  const plural = (n, w, p) => `${num(n)} ${Number(n) === 1 ? w : p || w + "s"}`;

  function verdictOf(v) {
    const s = String(v || "").toLowerCase();
    if (s.includes("coordinated")) return { cls: "co", text: v };
    if (s.includes("organic")) return { cls: "org", text: v };
    return { cls: "nd", text: v || "Not enough data" };
  }
  const vstamp = (v, big) => { const x = verdictOf(v); return `<span class="stamp ${x.cls}${big ? " big" : ""}">${esc(x.text)}</span>`; };

  /* ---------- country names ---------- */
  const CODES = "AF AX AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW".split(" ");
  let dn = null; try { dn = new Intl.DisplayNames(["en"], { type: "region" }); } catch { /* old browser */ }
  const cname = (c) => { try { return (dn && dn.of(c)) || c; } catch { return c; } };
  const ALL = CODES.map((c) => ({ code: c, name: cname(c) })).sort((a, b) => a.name.localeCompare(b.name));

  /* ---------- postmark ---------- */
  let uid = 0;
  function hash(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }
  function postmark({ top, bottom, mid, sub, kind = "copy", seed = "" }) {
    const id = "pm" + ++uid;
    const r = (hash(seed + top) % 15) - 7;
    const t = esc(String(top || "").toUpperCase().slice(0, 22));
    const b = esc(String(bottom || "").toUpperCase().slice(0, 20));
    const fs = t.length > 16 ? 9.4 : 11;
    return `<div class="pm ${kind}" style="--r:${r}deg;transform:rotate(${r}deg)"><svg viewBox="-60 -60 120 120" aria-hidden="true" filter="url(#ink)">
<defs><path id="${id}t" d="M -41 0 A 41 41 0 0 1 41 0"/><path id="${id}b" d="M -48.5 0 A 48.5 48.5 0 0 0 48.5 0"/></defs>
<circle class="ring" r="56" stroke-width="3.2"/><circle class="ring" r="33" stroke-width="1.6"/>
<circle r="2.6" cx="-45" cy="0" fill="currentColor"/><circle r="2.6" cx="45" cy="0" fill="currentColor"/>
<text font-size="${fs}" letter-spacing="1.1"><textPath href="#${id}t" startOffset="50%" text-anchor="middle">${t}</textPath></text>
<text font-size="10.5" letter-spacing="1.6"><textPath href="#${id}b" startOffset="50%" text-anchor="middle">${b}</textPath></text>
<text y="3" font-size="${String(mid).length > 6 ? 15 : 19}" text-anchor="middle" font-weight="800">${esc(mid)}</text>
<text y="17" font-size="9" text-anchor="middle" letter-spacing=".8">${esc(sub)}</text>${kind === "copy" ? `<path class="waves" d="M58 -12 q5 -4 10 0 t10 0 t10 0 M58 -3 q5 -4 10 0 t10 0 t10 0 M58 6 q5 -4 10 0 t10 0 t10 0"/>` : ""}</svg></div>`;
  }
  // one shared ink filter
  document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="ink" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.4 1.75" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="s"/><feDisplacementMap in="s" in2="n" scale="1.4" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`);

  function stampIn(container, sel = ".pm", gap = 140) {
    if (reduce) return;
    const els = [...container.querySelectorAll(sel)];
    els.forEach((el) => { el.style.opacity = "0"; });
    els.forEach((el, i) => setTimeout(() => {
      el.style.opacity = "";
      el.animate(
        [{ opacity: 0, transform: `scale(1.4) rotate(${el.style.getPropertyValue("--r")})`, filter: "blur(4px)" },
         { opacity: 1, transform: `scale(.96) rotate(${el.style.getPropertyValue("--r")})`, filter: "blur(0)", offset: 0.6 },
         { opacity: 1, transform: `scale(1) rotate(${el.style.getPropertyValue("--r")})` }],
        { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" });
    }, 250 + i * gap));
  }

  /* densest window of copies: max copies inside 60 minutes */
  function burst(copies) {
    const t = copies.map((c) => +ts(c.published_at)).filter((x) => !isNaN(x)).sort((a, b) => a - b);
    let best = { n: 0, a: null, b: null };
    for (let i = 0, j = 0; i < t.length; i++) {
      while (t[i] - t[j] > 3600e3) j++;
      if (i - j + 1 > best.n) best = { n: i - j + 1, a: t[j], b: t[i] };
    }
    return best;
  }
  const countriesOf = (copies) => new Set(copies.map((c) => c.country).filter(Boolean)).size;

  /* ---------- country search ---------- */
  function picker(root, ready) {
    const input = $("input", root), box = $(".suggest", root.parentNode) || null;
    const sug = document.createElement("div");
    sug.className = "suggest"; sug.hidden = true; sug.setAttribute("role", "listbox"); sug.id = "sug" + ++uid;
    input.setAttribute("aria-controls", sug.id); input.setAttribute("aria-autocomplete", "list"); input.setAttribute("role", "combobox"); input.setAttribute("aria-expanded", "false");
    root.parentNode.appendChild(sug);
    const status = (c) => { const r = ready.get(c); return r ? (r.status === "ready" ? `ready · ${plural(r.clusters ?? 0, "group")}` : r.status === "building" ? "building" : "precomputing") : "build live"; };
    let items = [], sel = 0;
    const go = (c) => { location.href = `/country?cc=${encodeURIComponent(c)}`; };
    function draw() {
      const q = input.value.trim().toLowerCase();
      if (!q) { sug.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
      items = ALL.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q)
        .sort((a, b) => (a.name.toLowerCase().startsWith(q) ? -1 : 0) - (b.name.toLowerCase().startsWith(q) ? -1 : 0)).slice(0, 8);
      sel = 0;
      sug.innerHTML = items.length
        ? items.map((c, i) => `<button type="button" role="option" aria-selected="${i === sel}" data-c="${c.code}"><span>${esc(c.name)}</span><span>${status(c.code)}</span></button>`).join("")
        : `<button type="button" disabled><span>No country matches “${esc(input.value)}”</span></button>`;
      sug.hidden = false; input.setAttribute("aria-expanded", "true");
    }
    input.addEventListener("input", draw);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (!items.length) return;
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        [...sug.children].forEach((b, i) => b.setAttribute("aria-selected", i === sel));
      } else if (e.key === "Escape") { sug.hidden = true; }
    });
    sug.addEventListener("click", (e) => { const b = e.target.closest("button[data-c]"); if (b) go(b.dataset.c); });
    root.addEventListener("submit", (e) => {
      e.preventDefault();
      if (items[sel] && !sug.hidden) return go(items[sel].code);
      const q = input.value.trim().toLowerCase();
      const hit = ALL.find((c) => c.name.toLowerCase() === q || c.code.toLowerCase() === q) || ALL.find((c) => c.name.toLowerCase().startsWith(q));
      if (hit) go(hit.code); else { input.focus(); draw(); }
    });
    document.addEventListener("click", (e) => { if (!root.parentNode.contains(e.target)) sug.hidden = true; });
  }


  /* ---------- live machine ---------- */
  const STAT_LABELS = [
    ["stories_read", "stories read"], ["pages_fetched", "pages fetched and compared"], ["copies_confirmed", "copies confirmed"], ["sites_seen", "sites seen copying"],
    ["groups", "coordinated groups"], ["monitors_live", "pages under live watch"], ["languages", "languages read"], ["last_event_at", "last new copy"]];
  async function counters() {
    const el = $("#counters"); if (!el) return null;
    el.innerHTML = STAT_LABELS.map(() => `<div><span class="skel sk" style="display:block"></span></div>`).join("");
    try {
      const s = await api("/api/stats");
      el.innerHTML = STAT_LABELS.map(([k, l]) => {
        const v = s[k];
        const shown = k === "last_event_at" ? (v ? esc(ago(v)) : "–") : num(Array.isArray(v) ? v.length : v);
        return `<div><b>${shown}</b><span>${esc(l)}</span></div>`;
      }).join("");
      document.querySelectorAll(".line>li[data-stat]").forEach((li) => {
        const k = li.dataset.stat, v = s[k];
        if (v != null && !li.querySelector(".lv")) li.insertAdjacentHTML("afterbegin", `<span class="lv">${num(Array.isArray(v) ? v.length : v)} ${esc((STAT_LABELS.find((x) => x[0] === k) || [, ""])[1])}</span>`);
      });
      return s;
    } catch { el.remove(); return null; }
  }
  const EVT = { copy_detected: "New copy", group_grew: "Group grew", build_done: "Country read", new_story: "New story" };
  function liveWire(country) {
    const box = $("#events"), meta = $("#wiremeta"); if (!box) return;
    const seen = new Set(); let first = true;
    async function tick() {
      try {
        const ev = list(await api(`/api/live?limit=20${country ? `&country=${country}` : ""}`), "events");
        meta.textContent = `updated ${hhmm(new Date().toISOString())} UTC · refreshes every 20 s`;
        if (!ev.length && first) box.innerHTML = `<li><span class="empty">Monitors are armed. New copies appear here the moment a watched site publishes one.</span></li>`;
        const fresh = ev.filter((e) => !seen.has(e.id || e.url + e.at));
        if (fresh.length && first) box.innerHTML = "";
        fresh.reverse().forEach((e) => {
          seen.add(e.id || e.url + e.at);
          const li = document.createElement("li"); if (!first) li.className = "new";
          const href = e.story_id ? `/story?id=${encodeURIComponent(e.story_id)}` : e.url;
          li.innerHTML = `<span class="t">${esc(dmy(e.at))} ${esc(hhmm(e.at))}</span><span class="ty${e.type === "copy_detected" ? "" : " g"}">${esc(EVT[e.type] || e.type)}</span><span class="h"><a href="${esc(href || "#")}">${esc(e.headline || e.site || "")}</a><span>${esc(e.site || host(e.url))}${e.country ? " · " + esc(e.country) : ""} · via ${esc(e.source || "monitor")}</span></span><span class="lag">${e.lag_min != null ? "+" + num(e.lag_min) + "<small style='font-size:13px'> min</small>" : ""}</span>`;
          box.prepend(li);
        });
        while (box.children.length > 30) box.lastChild.remove();
      } catch { if (first) { meta.textContent = "live feed unavailable"; box.innerHTML = `<li><span class="empty">The live feed could not be reached. It retries every 20 seconds.</span></li>`; } }
      first = false;
    }
    tick(); setInterval(() => { if (!document.hidden) tick(); }, 20000);
  }
  function watchForm(cc) {
    const f = $("#watch"); if (!f) return;
    const sel = $("#wcc");
    sel.innerHTML = ALL.map((c) => `<option value="${c.code}"${c.code === (cc || "FI") ? " selected" : ""}>${esc(c.name)}</option>`).join("");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = $("#wmsg"), btn = $("button", f); btn.disabled = true; msg.textContent = "Registering…";
      try {
        const r = await api("/api/watch", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ country: sel.value, webhook_url: $("#wurl").value }) });
        msg.textContent = `Alerts on for ${cname(sel.value)}. Watch id ${r.id || "created"}. Each new copy is posted to your URL as JSON.`;
      } catch (err) { msg.textContent = `Could not start alerts: ${err.message}`; }
      btn.disabled = false;
    });
  }

  /* ---------- network graph ---------- */
  function layout(nodes, edges, W, H) {
    // Fruchterman-Reingold, deterministic start
    const idx = new Map(nodes.map((n, i) => [n.id, i]));
    const PW = W - 220, PH = H - 60, n = nodes.length, k = Math.sqrt((PW * PH) / n) * 0.9;
    nodes.forEach((p) => { p.x = PW / 2 + ((hash(p.id) & 1023) / 1023 - 0.5) * PW * 0.6; p.y = PH / 2 + ((hash(p.id + "y") & 1023) / 1023 - 0.5) * PH * 0.6; });
    const E = edges.map((e) => [idx.get(e.a), idx.get(e.b), e.w || 1]).filter((e) => e[0] != null && e[1] != null && e[0] !== e[1]);
    let t = PW / 8;
    for (let it = 0; it < 300; it++) {
      const dx = new Float64Array(n), dy = new Float64Array(n);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        let x = nodes[i].x - nodes[j].x, y = nodes[i].y - nodes[j].y; const d = Math.max(0.5, Math.hypot(x, y)), f = (k * k) / d;
        x = (x / d) * f; y = (y / d) * f; dx[i] += x; dy[i] += y; dx[j] -= x; dy[j] -= y;
      }
      E.forEach(([i, j, w]) => {
        const x = nodes[i].x - nodes[j].x, y = nodes[i].y - nodes[j].y, d = Math.max(0.5, Math.hypot(x, y)), f = ((d * d) / k) * (0.6 + Math.log(1 + w) * 0.5);
        dx[i] -= (x / d) * f; dy[i] -= (y / d) * f; dx[j] += (x / d) * f; dy[j] += (y / d) * f;
      });
      nodes.forEach((p, i) => {
        dx[i] += (PW / 2 - p.x) * 0.14 * k / 40; dy[i] += (PH / 2 - p.y) * 0.16 * k / 40;
        const d = Math.max(0.5, Math.hypot(dx[i], dy[i])), m = Math.min(d, t);
        p.x = Math.max(0, Math.min(PW, p.x + (dx[i] / d) * m)); p.y = Math.max(0, Math.min(PH, p.y + (dy[i] / d) * m));
      });
      t = Math.max(1, t * 0.985);
    }
    nodes.forEach((p) => { p.x += 30; p.y += 30; });
    return E;
  }
  async function network(cc, clusters) {
    const host_ = $("#net"); if (!host_) return;
    let g; try { g = await api(`/api/countries/${cc}/graph`); } catch { host_.remove(); return; }
    const nodes = list(g.nodes, "nodes").slice(0, 160), edges = list(g.edges, "edges");
    if (nodes.length < 3) { host_.remove(); return; }
    const W = 1200, H = 560, E = layout(nodes, edges, W, H);
    const co = new Set(clusters.filter((c) => verdictOf(c.verdict).cls === "co").map((c) => c.id));
    const col = (n) => (n.cluster_id && co.has(n.cluster_id) ? "var(--cancel)" : n.cluster_id ? "var(--ink)" : "var(--muted-stamp)");
    const maxw = Math.max(1, ...E.map((e) => e[2]));
    const lab = new Set(nodes.slice().sort((p, q) => (q.stories || 0) - (p.stories || 0)).slice(0, 7).map((n) => n.id));
    const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Network of ${nodes.length} sites and ${E.length} co-copy links">
${E.map(([i, j, w]) => `<line x1="${nodes[i].x.toFixed(1)}" y1="${nodes[i].y.toFixed(1)}" x2="${nodes[j].x.toFixed(1)}" y2="${nodes[j].y.toFixed(1)}" stroke="${nodes[i].cluster_id && nodes[i].cluster_id === nodes[j].cluster_id && co.has(nodes[i].cluster_id) ? "rgba(200,35,27,.45)" : "rgba(20,20,20,.18)"}" stroke-width="${(0.6 + (w / maxw) * 3.4).toFixed(2)}"/>`).join("")}
${nodes.map((n) => { const r = 5 + Math.sqrt(n.stories || 1) * 2.6; return `<g class="node" data-id="${esc(n.id)}" data-s="${num(n.stories)}" transform="translate(${n.x.toFixed(1)},${n.y.toFixed(1)})"><circle r="${r.toFixed(1)}" fill="${col(n)}"${n.documented ? ` stroke="var(--airmail)" stroke-width="3"` : ` stroke="var(--stock)" stroke-width="1.5"`}/>${lab.has(n.id) ? `<text x="${(r + 4).toFixed(1)}" y="4">${esc(short(n.id, 26))}</text>` : ""}</g>`; }).join("")}</svg>`;
    host_.innerHTML = `<div class="label-head"><span>Co-copy network · ${plural(nodes.length, "site")} · ${plural(E.length, "link")}</span><span class="code">computed ${esc(stamp(g.computed_at))}</span></div><div class="netbox">${svg}<div class="tip" hidden></div></div>
<div class="legend"><span><i style="background:var(--cancel)"></i>In a coordinated group</span><span><i style="background:var(--ink)"></i>Other group</span><span><i style="background:var(--muted-stamp)"></i>Copied, not grouped</span><span><i style="background:var(--stock);border:3px solid var(--airmail)"></i>Documented in published research</span><span>Line thickness: stories copied within 60 minutes of each other. Dot size: stories copied.</span></div>`;
    const tip = $(".tip", host_), box = $(".netbox", host_);
    box.addEventListener("mousemove", (e) => {
      const n = e.target.closest(".node"); if (!n) { tip.hidden = true; return; }
      const r = box.getBoundingClientRect(); tip.hidden = false; tip.textContent = `${n.dataset.id} · ${n.dataset.s} stories`;
      tip.style.left = e.clientX - r.left + "px"; tip.style.top = e.clientY - r.top + "px";
    });
    box.addEventListener("mouseleave", () => { tip.hidden = true; });
  }

  /* =============== LANDING =============== */
  async function landing() {
    let countries = [];
    try { countries = list(await api("/api/countries"), "countries"); } catch { /* shown below */ }
    const ready = new Map(countries.map((c) => [c.code, c]));
    picker($("#pick"), ready);
    $("#pick input").placeholder = "Type a country, e.g. Finland";

    // chips: ready countries with most groups
    const rdy = countries.filter((c) => c.status === "ready").sort((a, b) => (b.clusters || 0) - (a.clusters || 0));
    $("#chips").innerHTML = rdy.slice(0, 6).map((c) => `<a class="chip" href="/country?cc=${c.code}"><b>${esc(c.code)}</b>${esc(c.name || cname(c.code))}</a>`).join("");

    // rack
    const rack = $("#rack");
    if (countries.length) {
      rack.innerHTML = countries.map((c) => {
        const st = c.status === "ready"
          ? (c.clusters ? `${plural(c.clusters, "group")} copying<br>${esc(ago(c.built_at))}` : `No coordinated group<br>${esc(ago(c.built_at))}`)
          : c.status === "building" ? "Reading now" : "Queued, next 6-hour refresh";
        return `<a class="cell ${esc(c.status)}${c.clusters ? " hot" : ""}" href="/country?cc=${esc(c.code)}"><span class="cc">${esc(c.code)}</span><span class="nm">${esc(c.name || cname(c.code))}</span><span class="st">${st}</span></a>`;
      }).join("");
      const n = rdy.length;
      $("#rackcount").textContent = `${n} of ${countries.length} countries are ready now. The rest refresh every 6 hours.`;
    } else {
      rack.outerHTML = `<p class="intro">The country list could not load. Reload the page in a moment.</p>`;
    }
    picker($("#any"), ready);
    counters(); liveWire(null); watchForm("FI");

    // specimen slip
    const slip = $("#slip");
    try {
      const cands = rdy.filter((c) => c.clusters > 0);
      const pick = cands.find((c) => c.code === "FI") || cands[0];
      if (!pick) throw new Error("none");
      const stories = list(await api(`/api/stories?country=${pick.code}`), "stories");
      const top = stories.filter((s) => verdictOf(s.verdict).cls === "co").sort((a, b) => (b.copies || 0) - (a.copies || 0))[0];
      if (!top) throw new Error("none");
      const x = await api(`/api/stories/${encodeURIComponent(top.id)}`);
      const copies = list(x.copies, "copies").filter((c) => c.published_at).sort((a, b) => ts(a.published_at) - ts(b.published_at));
      const b = burst(copies);
      const first = copies[0];
      const marks = copies.slice(0, 12).map((c) => postmark({ top: host(c.url) || c.site, bottom: c.country || c.lang, mid: hhmm(c.published_at), sub: `+${mins(first.published_at, c.published_at)} MIN`, seed: c.url }));
      slip.innerHTML = `<div class="label-head"><span>Copied story · ${esc(pick.name || cname(pick.code))}</span><span class="code">${esc(dmy(first.published_at))} UTC</span></div>
<div class="slip-body"><h2>${esc(x.title)}</h2>
<p class="from">First copy ${esc(stamp(first.published_at))}</p>
<div class="marks inked">${marks.join("")}</div></div>
<div class="tally"><div><b>${num(copies.length)}</b><span>copies</span></div><div><b>${num(x.countries_reached ?? countriesOf(copies))}</b><span>countries</span></div><div><b>${b.n > 1 ? num(Math.round((b.b - b.a) / 60000)) : "–"}</b><span>min for ${num(b.n)} copies</span></div></div>
<div class="slip-foot">${vstamp(x.verdict)}<a href="/story?id=${encodeURIComponent(top.id)}">Open the Story X-ray</a></div><div class="perf" aria-hidden="true"></div>`;
      stampIn(slip);
    } catch {
      slip.innerHTML = `<div class="label-head"><span>Copied story</span></div><div class="slip-empty"><p><strong>Countries are being read right now.</strong></p><p>The most-copied story of the week appears here as soon as the first country finishes. Pick a country to see its progress.</p></div>`;
    }
  }

  /* =============== COUNTRY =============== */
  function sitesList(sites, count) {
    const names = (sites || []).map((s) => (typeof s === "string" ? s : s.domain || s.site || host(s.url)));
    const show = names.slice(0, 9);
    const more = (count || names.length) - show.length;
    return `<ul class="sites">${show.map((s) => `<li>${esc(s)}</li>`).join("")}${more > 0 ? `<li class="more">+${num(more)} more</li>` : ""}</ul>`;
  }
  function ages(a) {
    if (a == null) return `<span class="none">Not measured</span>`;
    if (typeof a === "object" && !Array.isArray(a)) {
      if (a.median_days != null) return `<span class="bignum">${num(Math.round(a.median_days / 30.4))}<small>months, median domain age${a.min_days != null ? `; youngest ${num(a.min_days)} days` : ""}</small></span>`;
      if (a.reason) return `<span class="none">${esc(a.reason)}</span>`;
    }
    if (Array.isArray(a) && a.length) {
      const d = a.map((x) => x.days ?? x.age_days).filter((x) => x != null).sort((p, q) => p - q);
      if (d.length) return `<span class="bignum">${num(Math.round(d[d.length >> 1] / 30.4))}<small>months, median domain age</small></span>`;
    }
    return `<span class="none">Not measured</span>`;
  }
  function docBy(d) {
    const arr = (d || []).map((x) => (typeof x === "string" ? { name: x } : x));
    if (!arr.length) return `<span class="none">Not named in published research</span>`;
    return `<div class="doc">${arr.map((x) => (x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name || host(x.url))}</a>` : `<span>${esc(x.name)}</span>`)).join("<span>·</span>")}</div>`;
  }
  function origins(o) {
    const arr = (o || []).map((x) => (typeof x === "string" ? { name: x } : x));
    if (!arr.length) return `<span class="none">No shared source found</span>`;
    return `<ul class="plain">${arr.slice(0, 5).map((x) => `<li><span>${esc(x.name || x.url || x.source)}</span>${x.count != null ? `<span class="mono">${plural(x.count, "cite")}</span>` : ""}</li>`).join("")}</ul>`;
  }
  function infra(s) {
    const arr = (s || []).map((x) => (typeof x === "string" ? x : x.label || x.value || JSON.stringify(x)));
    if (!arr.length) return `<span class="none">Nothing shared that we could resolve</span>`;
    return `<ul class="plain">${arr.map((x) => `<li><span>${esc(x)}</span></li>`).join("")}</ul>`;
  }
  function cluster(c, i) {
    return `<article class="label cl" id="${esc(c.id)}">
<div class="label-head"><h3>${esc(c.label || `Group ${i + 1}`)}</h3>${vstamp(c.verdict)}<span class="code">${plural(c.site_count ?? (c.sites || []).length, "site")}</span></div>
<div class="cl-body">
<section><span class="k">${plural(c.site_count ?? (c.sites || []).length, "site")}</span>${sitesList(c.sites, c.site_count)}
<dl style="margin-top:18px"><div><dt class="k">Documented by</dt><dd>${docBy(c.documented_by)}</dd></div></dl></section>
<section><dl>
<div><dt class="k">Copied together</dt><dd><span class="bignum">${num(c.stories_copied)}<small>stories</small></span></dd></div>
<div><dt class="k">Typical copy delay</dt><dd>${c.median_copy_lag_min != null ? `<span class="bignum">${num(c.median_copy_lag_min)}<small>min, median</small></span>` : `<span class="none">Not measured</span>`}</dd></div>
<div><dt class="k">Domain age</dt><dd>${ages(c.domain_ages)}</dd></div></dl></section>
<section><dl>
<div><dt class="k">Most-cited origins</dt><dd>${origins(c.origins_top)}</dd></div>
<div><dt class="k">Shared infrastructure</dt><dd>${infra(c.shared_infra)}</dd></div></dl></section>
</div>
${(c.reasons || []).length ? `<ul class="reasons">${c.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
</article>`;
  }
  function trend(arr, dates) {
    const v = (arr || []).map((x) => (typeof x === "object" ? x.count ?? x.n ?? 0 : x));
    if (!v.length) return `<span class="none">No trend yet</span>`;
    const max = Math.max(1, ...v), w = 300, h = 84, bw = w / v.length;
    const bars = v.map((n, i) => { const bh = Math.max(n ? 3 : 1, (n / max) * (h - 14)); return `<rect x="${(i * bw + 1).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" fill="${n ? "var(--ink)" : "var(--hair)"}"><title>${esc(dates?.[i] || "Day " + (i + 1))}: ${num(n)} retrieved source pages</title></rect>`; }).join("");
    const total = v.reduce((a, b) => a + b, 0);
    return `<div class="chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${total} retrieved source pages over 30 days, peak ${max} in one day">${bars}<text x="${w}" y="9" text-anchor="end" font-size="10" font-family="JetBrains Mono" fill="var(--ink-3)">peak ${max}/day</text></svg><div class="axis"><span>Past 30 days</span><span>today</span></div></div>`;
  }
  function narrative(n, clusters) {
    const c = clusters.find((x) => x.id === n.cluster_id);
    const ex = (n.examples || []).map((e) => (typeof e === "string" ? { headline: e } : e));
    return `<div class="nrow"><div><h3>${esc(n.label)}</h3><p class="sub">${plural(n.articles, "article")}${c ? ` from <a href="#${esc(c.id)}">${esc(c.label)}</a>` : ""}${n.first_seen ? ` · first seen ${esc(dmy(n.first_seen))}` : ""}</p></div>
<div>${trend(n.trend_30d,n.trend_dates)}${n.timeline_store?`<p class="sub">${esc(n.timeline_store)} · ${n.timeline_cached?"cached source counts":n.timeline_scope==="linked_examples"?"linked examples by publication day":"source counts by publication day"}</p>`:""}${n.models?.verda?`<p class="sub">Summary checked with NVIDIA Nemotron on Verda</p>`:""}</div>
<div><span class="k">Examples</span><ul class="ex">${ex.slice(0, 3).map((e) => `<li>${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.headline || e.title || host(e.url))}</a>` : esc(e.headline || e.title)}</li>`).join("") || `<li class="none">No examples stored</li>`}</ul></div></div>`;
  }
  function storyRows(stories) {
    return `<table class="ledger"><thead><tr><th>Story</th><th style="text-align:right">Copies</th><th style="text-align:right">Countries</th><th>Verdict</th></tr></thead><tbody>${stories.map((s) => {
      const href = `/story?id=${encodeURIComponent(s.id)}`;
      return `<tr data-href="${href}"><td class="t"><a href="${href}">${esc(s.title || s.headline)}</a><span class="mono">${esc(s.outlet || host(s.url))} · ${esc(stamp(s.published_at))}</span></td><td class="n">${num(s.copies ?? s.copy_count)}</td><td class="n">${num(s.countries_reached)}</td><td>${vstamp(s.verdict)}</td></tr>`;
    }).join("")}</tbody></table>`;
  }


  function baseDomain(h) { const p = String(h || "").replace(/^www\./, "").split("."); return p.length > 2 ? p.slice(-2).join(".") : p.join("."); }
  function groupName(c) {
    const raw = String(c.label || "");
    if (raw && !/^(group|cluster|network)?\s*[a-z]?\d+$/i.test(raw.trim()) && !/^group\b/i.test(raw.trim())) return raw;
    const names = (c.sites || []).map((s) => (typeof s === "string" ? s : s.domain || s.site || host(s.url)));
    const count = {}; names.forEach((n) => { const b = baseDomain(n); count[b] = (count[b] || 0) + 1; });
    const top = Object.entries(count).sort((p, q) => q[1] - p[1])[0];
    const n = c.site_count || names.length;
    if (top && top[1] >= 2) return `${top[0]} network, ${n} sites`;
    if (top) return `${n} sites incl. ${names[0]}`;
    return `${n}-site network`;
  }
  function pushCard(s, x, clusters) {
    const main = x ? list(x.mainstream, "mainstream").filter((m) => m.published_at).sort((p, q) => ts(p.published_at) - ts(q.published_at)) : [];
    const cps = x ? list(x.copies, "copies").filter((c) => c.published_at).sort((p, q) => ts(p.published_at) - ts(q.published_at)) : [];
    const bu = burst(cps);
    const cid = s.cluster_id || (cps.find((c) => c.cluster_id) || {}).cluster_id;
    const cl = clusters.find((c) => c.id === cid);
    const spin = x ? list(x.spin, "spin") : [];
    const added = [...new Set(spin.flatMap((p) => p.added_phrases || []))].slice(0, 5);
    const labels = [...new Set(spin.flatMap((p) => (p.labels || []).map((l) => (typeof l === "string" ? l : l.name))))].slice(0, 4);
    const m0 = main[0];
    const twist = added.length
      ? `<div class="ins">${added.map((p) => `<mark>${esc(p)}</mark>`).join("")}</div>${labels.length ? `<div class="tags">${labels.map((l) => `<span>${esc(l)}</span>`).join("")}</div>` : ""}`
      : cps[0] ? `<blockquote>${esc(cps[0].headline || s.title)}</blockquote><cite>${esc(host(cps[0].url) || cps[0].site)}</cite><p class="none">No added wording found; the copies repeat the story as is.</p>` : `<p class="none">Copies not loaded.</p>`;
    const href = `/story?id=${encodeURIComponent(s.id)}`;
    const o = cps[0] && cps[0].published_at;
    return `<article class="push label">
<div class="label-head">${vstamp(s.verdict)}<span class="code">${esc(stamp(s.published_at || (m0 && m0.published_at)))}</span></div>
<div class="pbody"><h3><a href="${href}">${esc(s.title)}</a></h3>
<p class="pline"><strong>${plural(s.copies ?? cps.length, "copy", "copies")} in ${plural(s.countries_reached ?? countriesOf(cps), "country", "countries")}</strong>${bu.n > 2 ? `, ${num(bu.n)} of them within ${num(Math.round((bu.b - bu.a) / 60000))} minutes` : ""}${cl ? `, by the <a href="#${esc(cl.id)}">${esc(cl.label)}</a>${(cl.documented_by || []).length ? ` (documented by ${esc((cl.documented_by.map((d) => (typeof d === "string" ? d : d.name)))[0])})` : ""}` : ""}.</p>
${cps.length ? `<div class="marks">${cps.slice(0, 9).map((c) => postmark({ top: host(c.url) || c.site, bottom: c.country || c.lang, mid: hhmm(c.published_at), sub: `+${mins(o, c.published_at)} MIN`, seed: c.url })).join("")}</div>` : ""}
${x ? `<div class="pgrid"><div><span class="k">What news outlets reported</span>${m0 ? `<blockquote>${esc(m0.headline || s.title)}</blockquote><cite>${esc(m0.outlet || host(m0.url))}, ${esc(stamp(m0.published_at))}</cite>` : `<p class="none">No mainstream report matched.</p>`}</div>
<div><span class="k">What the copies added</span>${twist}</div></div>` : ""}
<a class="btn ghost" href="${href}">See every copy and the timeline</a></div></article>`;
  }

  // Briefing: the top of a country page reads like an analyst's note.
  const CLAIM = {
    reported: ["Reported by news outlets", "ok"], matches: ["Reported by news outlets", "ok"], confirmed: ["Reported by news outlets", "ok"],
    contradicted: ["Contradicted by news outlets", "no"],
    only_copies: ["Only in the copies", "only"], unsupported: ["Only in the copies", "only"], adds: ["Only in the copies", "only"], not_in_mainstream: ["Only in the copies", "only"],
    unclear: ["Unclear", "unc"],
  };
  const claimOf = (st) => CLAIM[String(st || "").toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "")] || CLAIM.unclear;
  const srcLinks = (arr) => list(arr, "sources").map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.outlet || host(x.url))}</a>`).join(", ");
  function dossier(p, i, stories, clusters) {
    const s = stories.find((x) => x.id === p.story_id) || {};
    const sp = p.spread || {}, bh = p.behind || {}, pl = p.plain || {};
    const cl = clusters.find((c) => c.id === bh.cluster_id);
    const href = `/story?id=${encodeURIComponent(p.story_id)}`;
    const conf = list(p.confirmed, "confirmed"), claims = list(p.claims, "claims");
    const tg = list(sp.telegram, "telegram");
    const pf = Object.entries(sp.platforms || {}).filter(([, n]) => n);
    const PF = { tiktok: "TikTok", youtube: "YouTube", reddit: "Reddit", instagram: "Instagram", telegram: "Telegram" };
    const dur = (m) => (m == null ? "" : m < 120 ? `${num(m)} minutes` : m < 2880 ? `${num(Math.round(m / 60))} hours` : `${num(Math.round(m / 1440))} days`);
    const docs = list(bh.documented_by, "documented_by").map((d) => (typeof d === "string" ? d : d.name));
    const bad = claims.filter((c) => claimOf(c.status)[1] === "no"), only = claims.filter((c) => claimOf(c.status)[1] === "only");
    const wrong = pl.wrong || (bad.length ? `News outlets contradict this: “${bad[0].text}”` : only.length ? `No news outlet reports this: “${only[0].text}”` : "Nothing false found. The facts are real, but a network is re-pushing them to steer how readers see them.");
    const message = pl.message || p.want || "";
    const why = pl.why || [sp.sites ? `${num(sp.sites)} linked sites reposted it${sp.minutes_to_spread != null ? ` within ${dur(sp.minutes_to_spread)}` : ""}` : "", sp.countries > 1 ? `in ${num(sp.countries)} countries` : "", tg.length ? `plus ${plural(tg.length, "Telegram channel")}` : ""].filter(Boolean).join(", ") + ".";
    const who = pl.who || `${bh.network || (cl && cl.label) || "An unnamed group of sites"}${docs.length ? `, documented by ${docs.slice(0, 2).join(" and ")}` : ""}.`;
    const truth = pl.true || (conf[0] ? conf[0].text : "");
    const rows = [["wrong", "✕ What’s wrong", wrong], ["msg", "The message being pushed", message], ["true", "✓ What’s actually true", truth], ["why", "Why it’s spreading", why], ["who", "Who is behind it", who]].filter(([, , t]) => t && t !== ".");
    return `<article class="dossier label">
<div class="label-head"><span class="rank">${String(i + 1).padStart(2, "0")}</span><span>Pushed at this country</span><span class="code">${esc(stamp(sp.first_copy_at || s.published_at))}</span></div>
<div class="dbody"><h3><a href="${href}">${esc(p.headline || s.title)}</a></h3>
<dl class="plain">${rows.map(([k, l, t]) => `<div class="pr pr-${k}"><dt>${esc(l)}</dt><dd>${esc(t)}</dd></div>`).join("")}</dl>
<details class="evid"><summary>Show the evidence</summary>
<p class="vline">${s.verdict ? vstamp(s.verdict) : ""} <span>Sites copied it almost word for word, minutes apart. That timing is what gives a network away.</span></p>
<div class="dgrid">
<div class="dcol"><span class="k">Each claim in the copies, checked</span>${claims.length ? `<ul class="claims">${[...bad, ...only, ...claims.filter((c) => !bad.includes(c) && !only.includes(c))].map((c) => { const [lab, cls] = claimOf(c.status); const ev = list(c.evidence, "evidence"); return `<li class="cl-${cls}"><span class="cstamp">${esc(lab)}</span><p>${esc(c.text)}</p>${ev.map((e) => `${e.quote ? `<blockquote>${esc(e.quote)}</blockquote>` : ""}<cite><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.outlet || host(e.url))}</a></cite>`).join("")}</li>`; }).join("")}</ul>` : `<p class="none">The copies add nothing beyond the original report.</p>`}</div>
<div class="dcol"><span class="k">What news outlets confirm</span>${conf.length ? `<ul class="conf">${conf.map((c) => `<li><p>${esc(c.text)}</p>${list(c.sources, "sources").length ? `<cite>${srcLinks(c.sources)}</cite>` : ""}</li>`).join("")}</ul>` : `<p class="none">No established outlet reported this story.</p>`}</div>
</div>
<div class="dgrid small">
<div class="dcol"><span class="k">How we know who</span>${cl ? `<p><a href="#${esc(cl.id)}">${esc(bh.network || cl.label)}</a></p>` : ""}${list(bh.infra, "infra").map((t) => `<p>${esc(t)}</p>`).join("")}</div>
<div class="dcol"><span class="k">Where it spread</span>${tg.length ? `<p>${tg.map((t) => `<a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.channel || host(t.url))}</a>`).join(", ")}</p>` : ""}${pf.length ? `<p class="mono">${pf.map(([k, n]) => `${esc(PF[k] || k)} ${num(n)}`).join(" · ")}</p>` : ""}${!tg.length && !pf.length ? `<p class="none">No pickup outside news sites found.</p>` : ""}</div>
</div>
<a class="btn ghost" href="${href}">Every copy and the timeline</a>
</details></div></article>`;
  }

  async function country() {
    const cc = (new URLSearchParams(location.search).get("cc") || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    const name = cname(cc);
    document.title = `${name} · Signal Fire`;
    $("#cc").textContent = cc || "??";
    $("#cname").textContent = name;
    if (!cc || !CODES.includes(cc)) {
      $("#summary").innerHTML = `That is not a country code we know. <a href="/">Pick a country</a>.`;
      return;
    }
    let d = null, err = null;
    try { d = await api(`/api/countries/${cc}`); } catch (e) { err = e; }
    if (!d || d.status === "building" || d.status === "not_built" || (err && err.status === 404)) return buildPanel(cc, name, d);
    if (err) { $("#summary").textContent = `This country could not load (${err.message}). Reload in a moment.`; return; }

    const clusters = list(d.clusters, "clusters");
    const narratives = list(d.narratives, "narratives");
    clusters.forEach((c) => { c.label = groupName(c); });
    let stories = [];
    try { stories = list(await api(`/api/stories?country=${cc}`), "stories"); } catch { /* optional */ }
    const docd = (c) => !!(c && (c.documented_by || []).length);
    clusters.sort((p, q) => docd(q) - docd(p));
    const isDoc = (s) => docd(clusters.find((c) => c.id === s.cluster_id));
    const strong = (s) => verdictOf(s.verdict).text.includes("strong");
    // Lead with pushes by a network that published research has documented, then strong, then most copied.
    const hot = stories.filter((s) => verdictOf(s.verdict).cls === "co")
      .sort((p, q) => (isDoc(q) - isDoc(p)) || (strong(q) - strong(p)) || (q.copies || 0) - (p.copies || 0)).slice(0, 4);
    // Watched stories: the obvious stories for this country, always fetched and always shown near the top.
    const watched = stories.filter((s) => s.watched && !hot.includes(s));
    const rest = stories.filter((s) => !hot.includes(s) && !watched.includes(s));
    const details = await Promise.all(hot.map((s) => api(`/api/stories/${encodeURIComponent(s.id)}`).catch(() => null)));

    const lead = hot[0], ld = details[0];
    if (lead) {
      const cps = ld ? list(ld.copies, "copies").filter((c) => c.published_at) : [];
      const bu = burst(cps);
      $("#summary").innerHTML = `<strong>${hot.length === 1 ? "One story" : `${num(hot.length)} stories`} about ${esc(name)} ${hot.length === 1 ? "was" : "were"} pushed in coordinated bursts this week.</strong> The biggest: “${esc(lead.title)}”, copied by ${plural(lead.copies ?? cps.length, "site")} in ${plural(lead.countries_reached ?? countriesOf(cps), "country", "countries")}${bu.n > 2 ? `, ${num(bu.n)} of them within ${num(Math.round((bu.b - bu.a) / 60000))} minutes` : ""}.`;
    } else {
      $("#summary").innerHTML = clusters.length
        ? `<strong>${plural(clusters.length, "network")} copied ${esc(name)}’s news in coordinated bursts this week.</strong>`
        : `<strong>Nothing about ${esc(name)} was pushed in coordinated bursts this week.</strong> We checked ${plural(d.stories_checked, "story", "stories")}; outlets covering them used their own wording and timing.`;
    }
    $("#meta").innerHTML = `<div><b>${num(hot.length)}</b><span>coordinated pushes</span></div><div><b>${num(clusters.length)}</b><span>networks behind them</span></div><div><b>${num(d.stories_checked)}</b><span>stories checked</span></div><div><b>${esc(dmy(d.built_at || d.computed_at))} ${esc(hhmm(d.built_at || d.computed_at))}</b><span>last read, UTC</span></div>`;
    $("#meta").hidden = false;

    const out = [];
    const br = d.briefing && list(d.briefing.pushes, "pushes").length ? d.briefing : null;
    if (br) {
      const sm = br.plain_summary || br.summary;
      if (sm) $("#summary").innerHTML = `<strong>${esc(sm.split(/(?<=\.)\s/)[0])}</strong> ${esc(sm.split(/(?<=\.)\s/).slice(1).join(" "))}`;
      out.push(`<section class="block brief"><div class="wrap"><h2>The briefing: ${esc(name)} this week</h2><p class="intro">The stories pushed hardest at ${esc(name)} this week, in four lines each. Every line comes from real pages we read; open “Show the evidence” for the sources. Updated ${esc(dmy(br.generated_at))} ${esc(hhmm(br.generated_at))} UTC.</p><div class="dossiers">${list(br.pushes, "pushes").map((p, i) => dossier(p, i, stories, clusters)).join("")}</div></div></section>`);
    }
    const briefed = new Set(br ? list(br.pushes, "pushes").map((p) => p.story_id) : []);
    const hotRest = hot.filter((s) => !briefed.has(s.id));
    if (br && hotRest.length) out.push(`<section class="block"><div class="wrap"><h2>More coordinated pushes</h2><div class="pushes">${hotRest.map((s) => pushCard(s, details[hot.indexOf(s)], clusters)).join("")}</div></div></section>`);
    if (!br && hot.length) out.push(`<section class="block"><div class="wrap"><h2>Being pushed at ${esc(name)} now</h2><p class="intro">Stories that many sites republished almost word for word within minutes of each other. Left: what news outlets reported. Right: what the copies added.</p><div class="pushes">${hot.map((s, i) => pushCard(s, details[i], clusters)).join("")}</div></div></section>`);
    if (watched.length) out.push(`<section class="block"><div class="wrap"><h2>The stories everyone is talking about in ${esc(name)}</h2><p class="intro">The week's most obvious stories about ${esc(name)}, checked every time we read the country, with every copy we could find. Open one to see who copied it and when.</p>${storyRows(watched)}</div></section>`);
    if (narratives.length) out.push(`<section class="block"><div class="wrap"><h2>What they want ${esc(name)} to believe</h2><p class="intro">The lines these networks keep repeating about ${esc(name)}, and how often. A line is only shown when two independent AI models agree on it.</p><div class="narr">${narratives.map((n) => narrative(n, clusters)).join("")}</div></div></section>`);
    if (clusters.length) out.push(`<section class="block"><div class="wrap"><h2>Who is behind it</h2><p class="intro">The sites that did the copying, grouped by how often they copy together. Nobody is on a list in advance; a network is only named when published research has documented it.</p><div class="clusters">${clusters.map(cluster).join("")}</div><div class="net" id="net"></div></div></section>`);

    const more = [];
    if (rest.length) more.push(`<h3 class="mh">${plural(rest.length, "other story", "other stories")} we checked</h3><p class="intro">Covered normally, or too few copies to tell. Open any story to see the evidence.</p>${storyRows(rest)}`);
    const org = list(d.organic_examples, "organic_examples");
    if (org.length) more.push(`<h3 class="mh">Looks organic</h3><p class="intro">Widely covered stories where outlets used their own words on their own schedule. This is what normal news looks like.</p><div class="organic">${org.map((o) => `<div class="label">${vstamp("Looks organic")}<h3>${o.story_id ? `<a href="/story?id=${encodeURIComponent(o.story_id)}">${esc(o.title)}</a>` : esc(o.title)}</h3><ul>${o.outlets != null ? `<li>${plural(o.outlets, "outlet")}</li>` : ""}${(o.reasons || []).map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>`).join("")}</div>`);
    const pick = list(d.pickup || d.social_pickup, "items");
    if (pick.length) more.push(`<h3 class="mh">Where it travels next</h3><p class="intro">The same stories picked up on TikTok, Instagram, YouTube and Reddit. X is not covered.</p><div class="pickup">${pick.map((p) => `<a href="${esc(p.url)}" target="_blank" rel="noopener"><span class="pf">${esc(p.platform)}</span><span class="tt">${esc(p.title || host(p.url))}</span><span class="mono">${esc(stamp(p.published_at))}${p.views != null ? ` · ${num(p.views)} views` : ""}</span></a>`).join("")}</div>`);
    more.push(`<h3 class="mh">Live for ${esc(name)}</h3><p class="intro">Pages of every network above stay under watch. New copies arrive here without a rebuild.</p><div class="wire label" style="margin-top:20px"><div class="label-head"><span class="livedot" aria-hidden="true"></span><span>Live wire · ${esc(name)}</span><span class="code" id="wiremeta">connecting</span></div><ol class="events" id="events"></ol></div>
<div class="apigrid" style="margin-top:24px"><form class="label watch" id="watch"><div class="label-head"><span>Alert me about ${esc(name)}</span><span class="code">POST /api/watch</span></div><div class="wbody"><label for="wcc">Country</label><select id="wcc" required></select><label for="wurl">Your webhook (https)</label><input id="wurl" type="url" required placeholder="https://newsroom.example/hooks/signal-fire" pattern="https://.+"><button class="btn" type="submit">Start alerts</button><p class="wmsg" id="wmsg" role="status"></p></div></form>
<div class="label code-card"><div class="label-head"><span>Same data as JSON</span><span class="code">GET</span></div><pre><code>curl ${esc(location.origin)}/api/countries/${esc(cc)}
curl ${esc(location.origin)}/api/countries/${esc(cc)}/graph
curl ${esc(location.origin)}/api/live?country=${esc(cc)}</code></pre></div></div>`);
    out.push(`<section class="block"><div class="wrap"><details class="more"${hot.length ? "" : " open"}><summary>Everything else we checked</summary>${more.join("")}</details></div></section>`);
    $("#body").innerHTML = out.join("");
    document.querySelectorAll(".push .marks").forEach((m) => stampIn(m, ".pm", 90));
    network(cc, clusters); liveWire(cc); watchForm(cc);
    document.querySelectorAll("tr[data-href]").forEach((tr) => tr.addEventListener("click", (e) => { if (!e.target.closest("a")) location.href = tr.dataset.href; }));
    if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
  }

  const STEP_NAMES = { stories: "Read the week’s top stories", copies: "Search the open web for copies", clusters: "Group sites that copy together", who: "Look up who runs them", narratives: "Find what they push", organic: "Check organic coverage" };
  async function buildPanel(cc, name, d) {
    $("#summary").innerHTML = `<strong>${esc(name)} has not been read yet.</strong> Signal Fire can read it now: about ${d && d.eta_min ? num(d.eta_min) : "5 to 10"} minutes, from the open web, with nothing prepared in advance.`;
    $("#body").innerHTML = `<section class="block"><div class="wrap"><div class="label build"><div class="label-head"><span>Read ${esc(name)} now</span><span class="code">${esc(cc)}</span></div><div id="bstate" class="notice"><button class="btn" id="go">Start reading ${esc(name)}</button></div><ol class="steps" id="steps" hidden></ol></div></div></section>`;
    const go = $("#go");
    const poll = async (id) => {
      const steps = $("#steps"); steps.hidden = false;
      for (;;) {
        let b;
        try { b = await api(`/api/builds/${encodeURIComponent(id)}`); } catch (e) { $("#bstate").innerHTML = `<strong>Lost track of the build</strong>${esc(e.message)}. Reload to check again.`; return; }
        const st = list(b.steps, "steps");
        steps.innerHTML = st.map((s) => `<li class="${esc(s.status || "")}"><span class="dot"></span><span>${esc(s.label || STEP_NAMES[s.name] || s.name)}${s.detail ? ` <span class="mono">${esc(s.detail)}</span>` : ""}</span><span class="mono">${s.ms != null ? (s.ms / 1000).toFixed(1) + " s" : ""}${s.calls ? ` · ${esc(Object.entries(s.calls).map(([k, v]) => `${k} ${v}`).join(", "))}` : ""}</span></li>`).join("");
        if (b.status === "done" || b.status === "ready") { $("#bstate").innerHTML = `<strong>Done</strong>Loading ${esc(name)}…`; setTimeout(() => location.reload(), 700); return; }
        if (b.status === "failed" || b.status === "error") { $("#bstate").innerHTML = `<strong>The build stopped</strong>${esc(b.error || "One of the steps failed.")} <button class="btn ghost" onclick="location.reload()">Try again</button>`; return; }
        $("#bstate").innerHTML = `<strong>Reading ${esc(name)}</strong>${esc(b.message || "Searching the open web. You can leave this page; the result is kept.")}`;
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    const existing = d && (d.build_id || (d.build && d.build.id));
    if (existing) return poll(existing);
    go.addEventListener("click", async () => {
      go.disabled = true; go.textContent = "Starting…";
      try {
        const r = await api(`/api/countries/${cc}/build`, { method: "POST" });
        poll(r.id || r.build_id || (r.build && r.build.id));
      } catch (e) {
        const cap = e.status === 429 || /cap|budget|limit/i.test(e.message);
        $("#bstate").innerHTML = cap ? `<strong>Today’s build budget is used up</strong>${esc(e.message)}. New countries can be read again tomorrow; the 30 ready countries still work.` : `<strong>Could not start</strong>${esc(e.message)}`;
      }
    });
  }

  /* =============== STORY X-RAY =============== */
  function lanePos(t, a, b) { return 6 + ((t - a) / Math.max(1, b - a)) * 88; }
  function laneMarks(items, a, b, kind, origin, opts = {}) {
    const near = opts.near || 7, groups = [];
    items.forEach((c) => {
      const x = lanePos(+ts(c.published_at), a, b);
      const g = groups[groups.length - 1];
      if (g && x - g.x < near) g.items.push(c); else groups.push({ x, items: [c] });
    });
    const mark = (c) => postmark({ top: c.outlet || host(c.url) || c.site, bottom: c.country || c.lang || "", mid: hhmm(c.published_at), sub: origin ? `+${mins(origin, c.published_at)} MIN` : dmy(c.published_at), kind, seed: c.url });
    return groups.map((g) => {
      if (g.items.length >= 3 && opts.pile) {
        const span = mins(g.items[0].published_at, g.items[g.items.length - 1].published_at);
        return `<div class="at" style="left:${g.x.toFixed(2)}%;top:50%">${g.items.slice(0, 4).map((c, i) => `<div class="at" style="left:${i * 9}px;top:${(i % 2 ? 1 : -1) * i * 5}px">${mark(c)}</div>`).join("")}<a class="pile" href="#burst">${plural(g.items.length, "copy", "copies")} in ${num(span)} min</a></div>`;
      }
      return g.items.map((c, i) => {
        const x = lanePos(+ts(c.published_at), a, b);
        const dy = g.items.length > 1 ? (i % 2 ? 1 : -1) * (opts.dy || 34) : 0;
        return `<div class="at" style="left:${x.toFixed(2)}%;top:calc(50% + ${dy}px)">${mark(c)}</div>`;
      }).join("");
    }).join("");
  }
  function sheet(main, copies, origin) {
    const all = [...main.map((m) => ({ ...m, k: "main" })), ...copies.map((c) => ({ ...c, k: "copy" }))].sort((p, q) => ts(p.published_at) - ts(q.published_at));
    return `<div class="sheet">${all.map((c) => postmark({ top: c.outlet || host(c.url) || c.site, bottom: c.country || c.lang || "", mid: hhmm(c.published_at), sub: c.k === "copy" && origin ? `+${mins(origin, c.published_at)} MIN` : dmy(c.published_at), kind: c.k, seed: c.url })).join("")}</div>`;
  }
  function scale(a, b) {
    const span = b - a, steps = 5;
    return Array.from({ length: steps + 1 }, (_, i) => { const t = a + (span * i) / steps; return `<span style="left:${lanePos(t, a, b)}%">${hhmm(new Date(t).toISOString())}</span>`; }).join("");
  }
  async function story() {
    const id = new URLSearchParams(location.search).get("id");
    if (!id) { $("#title").textContent = "No story selected"; return; }
    let x;
    try { x = await api(`/api/stories/${encodeURIComponent(id)}`); } catch (e) {
      $("#title").textContent = e.status === 404 ? "This story is no longer stored" : "The story could not load";
      $("#xbody").innerHTML = `<section class="block"><div class="wrap"><p class="intro">${esc(e.message)}. <a href="/">Back to countries</a>.</p></div></section>`; return;
    }
    document.title = `${x.title} · Story X-ray · Signal Fire`;
    $("#title").textContent = x.title;
    $("#verdict").innerHTML = vstamp(x.verdict, true);
    const main = list(x.mainstream, "mainstream").filter((m) => m.published_at).sort((p, q) => ts(p.published_at) - ts(q.published_at));
    const copies = list(x.copies, "copies").filter((c) => c.published_at).sort((p, q) => ts(p.published_at) - ts(q.published_at));
    const all = [...main, ...copies].map((m) => +ts(m.published_at));
    const a = Math.min(...all), b = Math.max(...all);
    const origin = main[0] ? main[0].published_at : copies[0] && copies[0].published_at;
    const bu = burst(copies);
    const cc = x.countries_reached ?? countriesOf(copies);
    if (x.back_country) $("#back").href = `/country?cc=${encodeURIComponent(x.back_country)}`;

    const gap = `<div class="gap"><div><b>${esc(hhmm(x.first_mainstream_at || origin))}</b><span>first mainstream, ${esc(dmy(x.first_mainstream_at || origin))} UTC</span></div><div><b>${esc(hhmm(x.first_copy_at || (copies[0] && copies[0].published_at)))}</b><span>first copy</span></div><div><b>${bu.n > 1 ? num(Math.round((bu.b - bu.a) / 60000)) : "–"}<small style="font-size:18px"> min</small></b><span>for ${plural(bu.n, "copy", "copies")} to appear</span></div><div><b>${num(cc)}</b><span>countries reached</span></div></div>`;

    let lanes = "";
    if (all.length) {
      lanes = `<div class="lanes" id="lanes"><div class="label-head"><span>Route sheet · all times UTC</span><button class="btn" id="replay" type="button">Replay</button></div>
<div class="lane main"><h3>Mainstream<small>${plural(main.length, "outlet")}</small></h3><div class="track">${laneMarks(main, a, b, "main", null)}</div></div>
<div class="lane copy"><h3>Copies<small>${plural(copies.length, "site")}</small></h3><div class="track">${laneMarks(copies, a, b, "copy", origin, { pile: true })}</div></div>
<div class="ticks"><div></div><div class="scale">${scale(a, b)}</div></div>${sheet(main, copies, origin)}</div>`;
      if (bu.n >= 3 && (bu.b - bu.a) < (b - a) * 0.4) {
        const pad = Math.max(60e3, (bu.b - bu.a) * 0.08);
        const inb = copies.filter((c) => +ts(c.published_at) >= bu.a && +ts(c.published_at) <= bu.b);
        lanes += `<div class="lanes" id="burst" style="margin-top:20px"><div class="label-head"><span>Zoom on the burst · ${plural(bu.n, "copy", "copies")} in ${num(Math.round((bu.b - bu.a) / 60000))} minutes</span><span class="code">${esc(hhmm(new Date(bu.a).toISOString()))} to ${esc(hhmm(new Date(bu.b).toISOString()))}</span></div>
<div class="lane copy"><h3>Burst<small>${esc(dmy(new Date(bu.a).toISOString()))}</small></h3><div class="track" style="min-height:250px">${laneMarks(inb, bu.a - pad, bu.b + pad, "copy", inb[0].published_at, { near: 9.5, dy: 50 })}</div></div>
<div class="ticks"><div></div><div class="scale">${scale(bu.a - pad, bu.b + pad)}</div></div></div>`;
      }
    }

    const spin = list(x.spin, "spin");
    const spinHtml = spin.length ? `<section class="block"><div class="wrap"><h2>What the copies added</h2><p class="intro">Phrases present in the copy and absent from the closest mainstream article. Labels come from the DISARM and EUvsDisinfo vocabularies, shown only when two AI model families agree.</p><div class="spin">${spin.map((s) => `<div class="label"><div class="src">${esc(s.copy_url)}</div><div class="ins">${(s.added_phrases || []).map((p) => `<mark>${esc(p)}</mark>`).join("") || `<span class="none">No added phrases</span>`}</div>${(s.labels || []).length ? `<div class="tags">${s.labels.map((l) => `<span>${esc(typeof l === "string" ? l : l.name)}</span>`).join("")}</div>` : ""}</div>`).join("")}</div></div></section>` : "";

    const rows = (arr, kind) => arr.map((c) => `<tr><td class="mono">${esc(stamp(c.published_at))}</td><td class="t"><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.headline || c.title || c.url)}</a><span class="mono">${esc(c.outlet || c.site || host(c.url))}${c.country ? " · " + esc(c.country) : ""}${c.lang ? " · " + esc(c.lang) : ""}${c.jaccard != null ? ` · wording match ${Math.round(c.jaccard * 100)}%` : ""}${c.cosine != null ? ` · meaning match ${Math.round(c.cosine * 100)}%` : ""}${c.time_source || c.published_at_source ? ` · time from ${esc(c.time_source || c.published_at_source)}` : ""}</span></td><td class="n">${kind === "copy" && origin ? "+" + num(mins(origin, c.published_at)) : ""}</td></tr>`).join("");
    $("#xbody").innerHTML = `<section class="block"><div class="wrap">${gap}${lanes}</div></section>${spinHtml}
<section class="block"><div class="wrap"><h2>Every copy</h2><p class="intro">Each copy links to the page itself. The number is minutes after the first mainstream report.</p><table class="ledger"><thead><tr><th>Published</th><th>Headline</th><th style="text-align:right">Min</th></tr></thead><tbody>${rows(copies, "copy")}</tbody></table></div></section>
<section class="block"><div class="wrap"><h2>Mainstream coverage</h2><table class="ledger"><thead><tr><th>Published</th><th>Headline</th><th></th></tr></thead><tbody>${rows(main, "main")}</tbody></table>${x.method_note ? `<p class="intro" style="margin-top:20px">${esc(x.method_note)} <a href="/method">How it works</a>.</p>` : ""}</div></section>`;
    const run = () => { stampIn($("#lanes"), innerWidth <= 680 ? ".sheet .pm" : ".lane .pm", 110); const z = $("#burst"); if (z) setTimeout(() => stampIn(z, ".pm", 220), 300); };
    const rp = $("#replay"); if (rp) rp.addEventListener("click", run);
    run();
  }

  /* =============== METHOD =============== */
  async function method() {
    try {
      const m = await api("/api/method");
      const rows = [];
      const add = (k, v) => { if (v != null && v !== "") rows.push(`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`); };
      const th = m.thresholds || {};
      add("Copy match", th.jaccard != null ? `Shingle overlap ≥ ${th.jaccard}` : null);
      add("Copy window", th.window_min != null ? `${th.window_min} minutes` : null);
      add("Group size", th.min_sites != null ? `≥ ${th.min_sites} sites and ≥ ${th.min_stories} shared stories` : null);
      const sp = m.spend || m.credits || {};
      Object.entries(sp).forEach(([k, v]) => add(k === "verda" ? "Verda request attempts" : `Spent: ${k}`, k === "verda" ? `${v.calls} today, limit ${v.cap}/day; price not reported` : typeof v === "object" ? `${v.used ?? "?"} of ${v.cap ?? "?"}` : v));
      const ev = m.eval || m.evaluation || {};
      Object.entries(ev).forEach(([k, v]) => add(`Eval: ${k.replace(/_/g, " ")}`, typeof v === "object" ? JSON.stringify(v) : v));
      if (rows.length) $("#live").innerHTML = `<h2>Live numbers</h2><p>Read from the running system${m.computed_at ? ` at ${esc(stamp(m.computed_at))}` : ""}.</p><table class="facts"><tbody>${rows.join("")}</tbody></table>`;
    } catch { /* static text stands */ }
  }

  const page = document.body.dataset.page;
  ({ landing, country, story, method }[page] || (() => {}))();
})();

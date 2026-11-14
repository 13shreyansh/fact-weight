const $ = (id) => document.getElementById(id);
let last = null;
const statusNames = {
  supported: "Supported by retrieved evidence",
  contradicted: "Contradicted by retrieved evidence",
  contested: "Conflicting retrieved evidence",
  unsupported: "Insufficient retrieved evidence",
};
const el = (tag, text, cls) => {
  const x = document.createElement(tag);
  if (text !== undefined) x.textContent = text;
  if (cls) x.className = cls;
  return x;
};
const date = (s) =>
  s
    ? new Date(s).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Helsinki",
      }) + " Helsinki"
    : "Not available";
async function loadEvaluation() {
  try {
    const d = await (await fetch("/api/evaluation")).json();
    if ($("eval-summary"))
      $("eval-summary").textContent =
        d.display || d.note || "No completed evaluation yet.";
    if ($("eval-detail")) {
      const box = $("eval-detail");
      box.replaceChildren();
      if (!d.heldout) {
        box.append(el("p", d.note || "Evaluation pending."));
        return;
      }
      const table = el("table");
      const head = el("tr");
      for (const s of ["Held-out test", "Baseline", "Fact Weight"])
        head.append(el("th", s));
      table.append(head);
      for (const [name, key] of [
        ["Label agreement", "accuracy"],
        ["Flag precision", "precision"],
        ["Flag recall", "recall"],
        ["False-positive rate", "fpr"],
      ]) {
        const row = el("tr");
        row.append(el("td", name));
        for (const method of ["baseline", "pipeline"])
          row.append(
            el(
              "td",
              d.heldout[method][key] === null
                ? "N/A"
                : (100 * d.heldout[method][key]).toFixed(1) + "%",
            ),
          );
        table.append(row);
      }
      box.append(
        table,
        el(
          "p",
          d.datasetDescription ||
            `Synthetic constructed test, ${d.heldout.n} held-out cases. Shared templates with development. No human labels or live retrieval in this test. See the full ledger and raw traces in the repository.`,
        ),
      );
    }
  } catch {
    if ($("eval-summary"))
      $("eval-summary").textContent =
        "The evaluation summary is unavailable. The methodology and raw runs are in the code repository.";
  }
}
loadEvaluation();
if ($("connection"))
  fetch("/api/health")
    .then((r) => r.json())
    .then((d) => {
      $("connection").textContent =
        d.contextConfigured && d.hostingerRouterConfigured
          ? "Providers configured · live calls on submit"
          : "Local build · provider setup pending";
    })
    .catch(() => {
      $("connection").textContent = "Service check unavailable";
    });
if ($("post"))
  $("post").addEventListener("input", () => {
    $("count").textContent = $("post").value.length + " / 6000";
  });
function showResult(data) {
  last = data;
  const out = $("results");
  out.replaceChildren();
  if (!data.claims.length)
    out.append(
      el("h3", "No checkable claim was extracted."),
      el(
        "p",
        "Try a specific statement with a place, date, quantity or event. Opinions and predictions cannot be settled by counting sources.",
      ),
    );
  for (const c of data.claims) {
    const section = el("article", undefined, "claim");
    section.append(
      el("span", statusNames[c.status] || c.status, "status " + c.status),
      el("h3", c.claim),
      ...(c.postQuote
        ? [el("p", `In your post: “${c.postQuote}”`, "gap")]
        : []),
    );
    const counts = el("div", undefined, "counts");
    counts.append(
      el("span", c.supportGroups + " supporting source groups"),
      el("span", c.contradictionGroups + " conflicting source groups"),
    );
    section.append(counts, el("p", c.explanation));
    if (c.missing)
      section.append(el("p", "Still missing: " + c.missing, "gap"));
    if (!c.evidence.length)
      section.append(
        el(
          "p",
          "No verified matching passage was returned. This does not mean the claim is false.",
          "gap",
        ),
      );
    for (const e of c.evidence) {
      const evidence = el("div", undefined, "evidence");
      const line = el("div", undefined, "source-line");
      const a = el("a", e.title);
      a.href = e.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      line.append(a, el("span", `${e.sourceId} · ${e.group} · ${e.relation}`));
      evidence.append(
        line,
        el("blockquote", e.quote),
        el("p", e.reason),
        el(
          "div",
          "Retrieved " +
            date(e.fetchedAt) +
            (e.publishedAt
              ? " · Published " + date(e.publishedAt)
              : " · Publication time not supplied"),
          "timestamp",
        ),
      );
      section.append(evidence);
    }
    out.append(section);
  }
  if (data.discovery)
    out.append(
      el(
        "p",
        `Context.dev searched the curated reference pool for: ${data.discovery.query}`,
        "result-note",
      ),
    );
  const sourceDetails = el("details");
  sourceDetails.append(
    el(
      "summary",
      `Retrieved sources and change record (${data.sources.length})`,
    ),
  );
  for (const s of data.sources) {
    sourceDetails.append(
      el("p", `${s.id} · ${s.group} · ${s.url}`),
      el(
        "p",
        `Retrieved ${date(s.fetchedAt)}. ${s.cached ? "Reused from our five-minute cache." : "Fresh retrieval requested."} ${s.changed === true ? "Extracted text changed since the previous fetch." : s.changed === false ? "Extracted text matches the previous fetch." : "First observation; no earlier version to compare."}`,
        "timestamp",
      ),
    );
  }
  out.append(
    sourceDetails,
    el("p", data.groupingNote, "result-note"),
    el("p", data.scope, "result-note"),
    ...(data.verifierModel
      ? [
          el(
            "p",
            `A second model family checked proposed relations: ${data.verifierModel} through Hostinger AI Router. This check has no human calibration.`,
            "result-note",
          ),
        ]
      : []),
    el(
      "p",
      `${data.retrieval} retrieval · ${data.model} through Hostinger AI Router · ${(data.elapsedMs / 1000).toFixed(1)} seconds for this request · ${data.rejectedCitations} rejected citations. This is not a probability score.`,
      "result-note",
    ),
  );
  for (const w of data.warnings || [])
    out.append(
      el("p", `Source unavailable: ${w.url}. ${w.error}`, "result-note"),
    );
  $("result-actions").hidden = false;
}
async function run() {
  const text = $("post").value.trim();
  const urls = $("urls")
    .value.split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  $("error").hidden = true;
  $("progress").hidden = false;
  $("progress").textContent =
    "Retrieving article text with Context.dev. Then we compare claims and verify every quotation. This can take up to two minutes.";
  $("submit").disabled = true;
  $("submit").textContent = "Inspecting evidence…";
  $("result-actions").hidden = true;
  try {
    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        urls,
        fresh: $("fresh").checked,
        discover: $("discover").checked,
      }),
      signal: AbortSignal.timeout(140000),
    });
    const d = await r.json();
    if (!r.ok)
      throw new Error(
        d.error +
          (d.warnings?.length
            ? " " + d.warnings.map((w) => w.error).join(" ")
            : ""),
      );
    showResult(d);
  } catch (e) {
    $("error").textContent =
      e.name === "TimeoutError"
        ? "The request took too long. Try fewer article URLs."
        : e.message;
    $("error").hidden = false;
  } finally {
    $("progress").hidden = true;
    $("submit").disabled = false;
    $("submit").replaceChildren(
      document.createTextNode("Compare claim with evidence"),
      el("span", "→"),
    );
  }
}
if ($("check-form"))
  $("check-form").addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
if ($("again"))
  $("again").addEventListener("click", () => {
    $("fresh").checked = true;
    run();
  });
if ($("export"))
  $("export").addEventListener("click", () => {
    if (!last) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(last, null, 2)], { type: "application/json" }),
    );
    a.download = "fact-weight-evidence.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

if ($("demo"))
  $("demo").addEventListener("click", () => {
    $("post").value =
      "Estonia, Latvia and Lithuania synchronised their electricity systems with continental Europe on 9 February 2025. Consumers were affected by power interruptions during the frequency stability tests.";
    $("urls").value =
      "https://data.consilium.europa.eu/doc/document/ST-6668-2025-INIT/en/pdf";
    $("discover").checked = false;
    $("fresh").checked = true;
    $("example-note").hidden = false;
    $("count").textContent = $("post").value.length + " / 6000";
    $("post").focus();
  });

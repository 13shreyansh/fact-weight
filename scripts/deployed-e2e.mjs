import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const base =
    process.env.SIGNAL_URL || "https://signal-fire.72.61.22.106.sslip.io",
  id = "a6b0d22b1d61",
  route = "/w/baltics/p/" + id,
  root = "artifacts/e2e";
await fs.mkdir(root + "/contextdev", { recursive: true });
await fs.mkdir("screenshots/signalfire", { recursive: true });
const browser = await chromium.launch({ headless: true }),
  errors = [],
  checks = [],
  shots = [];
let privateId = null,
  ownerContext = null,
  reviewSaved = false;
const expected = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const client = await browser.newContext();
const health = await (await client.request.get(base + "/api/health")).json();
assert.equal(
  health.commit,
  expected,
  "Deployed commit must equal HEAD before testing",
);
const state = await (await client.request.get(base + "/api/state")).json(),
  push = await (await client.request.get(base + "/api/push/" + id)).json();
assert.ok(push && ["moderate", "strong"].includes(push.verdict));
assert.ok(push.origins?.length);
assert.ok(push.pickups?.length);
await fs.writeFile(
  root + "/state-at-start.json",
  JSON.stringify(state, null, 2),
);
function observe(page) {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept());
}
async function ready(page, selector) {
  try {
    await page.locator(selector).first().waitFor();
  } catch (error) {
    console.log(
      "FAILED SCREEN",
      page.url(),
      (await page.locator("body").innerText()).slice(0, 1500),
    );
    await page.screenshot({ path: root + "/failure.png", fullPage: true });
    throw error;
  }
  await page.evaluate(() => document.fonts.ready);
}
async function shot(page, name, selector) {
  if (selector) {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(180);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(overflow, false, name + " horizontal overflow");
  let visible = await page.evaluate(() => {
    let copy = document.body.cloneNode(true);
    copy
      .querySelectorAll("pre,script,style,details:not([open])")
      .forEach((e) => e.remove());
    return copy.innerText || copy.textContent;
  });
  assert.ok(
    !/not supplied|\bundefined\b|\bnull\b|\/api\/|\/web\/scrape|‹|›/i.test(
      visible,
    ),
    name + " raw internals",
  );
  let path = root + "/" + name + ".png";
  await page.screenshot({ path, fullPage: false });
  await fs.copyFile(path, "screenshots/signalfire/" + name + ".png");
  shots.push({
    name,
    path,
    primary: await page.locator(".primary:visible").count(),
  });
  console.log("screenshot", name);
}
try {
  for (const width of [1440, 390]) {
    let context = await browser.newContext({
        viewport: { width, height: width === 390 ? 844 : 900 },
        acceptDownloads: true,
      }),
      page = await context.newPage();
    observe(page);
    let suffix = width === 1440 ? "desktop" : "phone";
    await page.goto(base + route);
    await ready(page, "#burst");
    await shot(page, "04-push-top-" + suffix);
    await page.locator("#plot-larger").click();
    await shot(page, "00-video-opening-" + suffix, "#timeline");
    await page.locator('[data-zoom="10min"]').click();
    await page.waitForTimeout(750);
    let canvas = page.locator("#burst"),
      box = await canvas.boundingBox(),
      columns = Math.floor(box.width / 5),
      min = Date.parse(push.peakAt),
      max = min + 600000,
      all = [...push.posts, ...(push.backgroundPosts || [])];
    const occupied = [
      ...new Set(
        push.posts
          .filter(
            (p) =>
              Date.parse(p.postedAt) >= min && Date.parse(p.postedAt) <= max,
          )
          .map((p) =>
            Math.min(
              columns - 1,
              Math.floor(
                ((Date.parse(p.postedAt) - min) / (max - min)) * columns,
              ),
            ),
          ),
      ),
    ];
    for (let bin of occupied.slice(0, 5)) {
      await canvas.click({
        position: { x: bin * 5 + 2, y: Math.min(70, box.height / 2) },
      });
      const urls = await page
        .locator("#posts-table tbody a[href]")
        .evaluateAll((a) => a.map((x) => x.href).sort());
      const expectedURLs = all
        .filter((p) => {
          let t = Date.parse(p.postedAt),
            i = Math.floor(((t - min) / (max - min)) * columns);
          if (i === columns && t === max) i = columns - 1;
          return i === bin;
        })
        .map((p) => p.url)
        .sort();
      assert.deepEqual(
        urls,
        expectedURLs,
        "Bin must list precisely its real posts",
      );
    }
    checks.push("Exact bin membership " + width);
    await shot(page, "05-push-peak-" + suffix, "#timeline");
    assert.ok(page.url().includes("slice="));
    const savedURL = page.url();
    await page.reload();
    await ready(page, "#slice-clear");
    assert.equal(page.url(), savedURL);
    await page.locator("#slice-clear").click();
    await page.locator("#lanes").click();
    await shot(page, "06-push-lanes-" + suffix, "#timeline");
    await page.locator("#plot-table").click();
    assert.ok((await page.locator("#bins-table tbody tr").count()) > 0);
    await page.locator("#plot-table").click();
    await page.locator(".brand").click();
    await ready(page, "tr[data-push]");
    await shot(page, "01-home-" + suffix);
    if (width === 1440) {
      await page.keyboard.press("j");
      await page.keyboard.press("Enter");
      await ready(page, "#burst");
      await page.locator(".brand").click();
      await ready(page, "tr[data-push]");
    }
    await page.goto(base + "/w/baltics?verdict=organic");
    await ready(page, "tr[data-push]");
    await shot(page, "02-home-organic-" + suffix);
    let organicURL = await page
      .locator("tr[data-push] a.push-name")
      .first()
      .getAttribute("href");
    await page.goto(base + organicURL);
    await ready(page, "#burst");
    assert.equal(await page.locator(".push-header .primary").count(), 0);
    await shot(page, "14-push-organic-" + suffix);
    await page.goto(base + route);
    await ready(page, "#burst");
    for (let [section, num] of [
      ["accounts", "07"],
      ["same-text", "08"],
      ["site", "09"],
      ["claims", "10"],
      ["wording", "11"],
      ["seen-before", "11b"],
    ]) {
      await page.locator('.section-tabs a[href="#' + section + '"]').click();
      await shot(page, num + "-push-" + section + "-" + suffix, "#" + section);
    }
    checks.push("All evidence sections " + width);
    if (width === 1440) {
      await page.locator("#review-open").click();
      await shot(page, "12-push-review-desktop", ".review-form");
      await page.locator(".review-form button[type=submit]").click();
      reviewSaved = true;
      await ready(page, "#review-reopen");
      await shot(page, "13-push-reviewed-desktop", "#review-slot");
      const second = await browser.newContext(),
        other = await second.newPage();
      observe(other);
      await other.goto(base + route);
      await ready(other, "#review-reopen");
      assert.ok(
        (await other.locator("#review-slot").innerText()).includes(
          "A real event explains the spike",
        ),
      );
      let changed = await (
        await second.request.get(base + "/api/state")
      ).json();
      assert.equal(changed.metrics.disputed, state.metrics.disputed + 1);
      await other.locator("#review-reopen").click();
      reviewSaved = false;
      await second.close();
      checks.push("Review persists across clean browser and is reopened");
    }
    await page.goto(base + route + "/trail");
    await ready(page, ".trail-chain");
    await page.locator(".trail-body details summary").first().click();
    await shot(page, "15-trail-step1-" + suffix);
    for (let step of [2, 3, 4, 5]) {
      await page.locator('[data-step="' + step + '"]').click();
      await shot(page, "16-trail-step" + step + "-" + suffix);
    }
    checks.push("All five measured trail stations " + width);
    await page.locator(".trail-head a").first().click();
    await ready(page, "#burst");
    await page.locator(".push-header .primary").click();
    await ready(page, ".sheet");
    await shot(page, "17-pack-" + suffix);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#pdf-download").click(),
    ]);
    await download.saveAs(root + "/evidence-" + suffix + ".pdf");
    await page.getByText("Downloaded", { exact: true }).waitFor();
    checks.push("Real PDF download " + width);
    await page.goto(base + "/method");
    await ready(page, "#running");
    await shot(page, "20-method-replay-" + suffix, "#replay");
    await page.locator('[data-count="strong"]').click();
    assert.ok(page.url().includes("count=strong"));
    await page.locator('[data-count="both"]').click();
    await shot(page, "21-method-lead-" + suffix, "#lead");
    await shot(page, "22-method-wrong-" + suffix, "#wrong");
    await shot(page, "27-method-speed-" + suffix, "#speed");
    await page.locator("#switcher").click();
    await page.locator('#watch-dropdown a[href^="/watches/new"]').click();
    await ready(page, "#watch-form");
    await page.locator("input[name=conflict]").fill("Sudan civil war");
    await page.locator('[data-token-field="countries"] input').fill("Sudan");
    await page.locator('[data-token-field="countries"] input').press("Enter");
    await page.locator('[data-token-field="keyword-en"] input').fill("Sudan");
    await page.locator('[data-token-field="keyword-en"] input').press("Enter");
    await page
      .locator("textarea[name=sources]")
      .fill(
        "https://www.aljazeera.com/where/sudan/\nhttps://www.bbc.com/news/world/africa",
      );
    await page.locator("textarea[name=sources]").blur();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("#source-checks .source-row").length === 2 &&
        !document
          .querySelector("#source-checks")
          .textContent.includes("checking"),
      {},
      { timeout: 120000 },
    );
    await page.waitForFunction(
      () =>
        !document
          .querySelector("#preview-posts")
          .textContent.includes("Looking…"),
      {},
      { timeout: 120000 },
    );
    await shot(page, "19-new-watch-" + suffix);
    if (width === 1440) {
      await page
        .locator("input[name=name]")
        .fill("E2E test watch — delete after acceptance");
      const response = page.waitForResponse(
        (r) =>
          r.url() === base + "/api/watch" && r.request().method() === "POST",
      );
      await page.locator("button[type=submit].primary").click();
      let result = await (await response).json();
      assert.ok(result.id, result.error);
      privateId = result.id;
      ownerContext = context;
      await page.waitForURL("**/w/" + privateId);
      await ready(page, "h1");
      await shot(page, "03-home-first-sweep-desktop");
      let denied = await client.request.get(
        base + "/api/state?watch=" + privateId,
      );
      assert.equal(denied.status(), 404);
      let del = await context.request.delete(base + "/api/watch/" + privateId);
      assert.ok(del.ok());
      privateId = null;
      ownerContext = null;
      checks.push("Private test watch created, isolated and deleted");
    }
    await page.goto(base + "/w/baltics");
    await ready(page, "h1");
    await context.close();
  }
  const contextCut = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  observe(contextCut);
  await contextCut.goto(base + route + "/trail");
  await ready(contextCut, ".trail-chain");
  await contextCut.screenshot({ path: root + "/contextdev/01-live-trail.png" });
  await contextCut.locator('[data-step="1"]').click();
  await contextCut.locator(".trail-body details summary").first().click();
  await contextCut.screenshot({
    path: root + "/contextdev/02-real-request.png",
  });
  await contextCut.getByRole("link", { name: "Method", exact: true }).click();
  await ready(contextCut, "#speed");
  await contextCut.locator("#speed").scrollIntoViewIfNeeded();
  await contextCut.screenshot({ path: root + "/contextdev/03-speed.png" });
  await contextCut.goto(base + route);
  await ready(contextCut, "#burst");
  await contextCut.screenshot({ path: root + "/contextdev/04-live-push.png" });
  await contextCut.close();
  checks.push("Context.dev cut: live trail → Speed → live push");
  let response = await client.request.get(base + "/api/push/" + id + "/pdf");
  assert.ok(response.ok());
  let pdf = await response.body();
  assert.equal(
    response.headers()["x-evidence-sha256"],
    crypto.createHash("sha256").update(pdf).digest("hex"),
  );
  await fs.writeFile(root + "/evidence.pdf", pdf);
  await fs.copyFile(
    root + "/evidence.pdf",
    "screenshots/signalfire/18-pack-print.pdf",
  );
  let zip = await client.request.get(base + "/api/push/" + id + "/zip");
  assert.ok(zip.ok());
  await fs.writeFile(root + "/evidence.zip", await zip.body());
  const zipData = JSON.parse(
    execFileSync(
      "python3",
      [
        "-c",
        'import zipfile,json,csv,io,hashlib;z=zipfile.ZipFile("artifacts/e2e/evidence.zip");print(json.dumps({"posts":len(list(csv.DictReader(io.StringIO(z.read("posts.csv").decode())))),"accounts":len(list(csv.DictReader(io.StringIO(z.read("accounts.csv").decode())))),"sha256":hashlib.sha256(z.read("pack.pdf")).hexdigest()}))',
      ],
      { encoding: "utf8" },
    ),
  );
  assert.equal(zipData.posts, push.posts.length);
  assert.equal(zipData.accounts, push.accounts.length);
  assert.equal(
    zipData.sha256,
    crypto.createHash("sha256").update(pdf).digest("hex"),
  );
  checks.push("PDF byte SHA-256 and ZIP row counts match live push");
  for (const row of state.pushes) {
    const p = await (
      await client.request.get(base + "/api/push/" + row.id)
    ).json();
    const { verdict } = await import("../signal/detect.mjs");
    assert.equal(
      verdict(p.signals, p.posts.length, p.accounts.length),
      p.verdict,
    );
    for (const e of p.evidence)
      assert.ok(
        p.sources.find((s) => s.id === e.sourceId)?.text.includes(e.quote),
      );
  }
  checks.push(
    "Every displayed verdict recomputes; every evidence quote is exact",
  );
  assert.deepEqual(errors, []);
} finally {
  if (reviewSaved)
    await client.request.post(base + "/api/push/" + id + "/review", {
      data: { reopen: true },
    });
  if (privateId && ownerContext)
    await ownerContext.request.delete(base + "/api/watch/" + privateId);
  await fs.writeFile(
    root + "/acceptance-report.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        base,
        commit: health.commit,
        pushA: id,
        verdict: push.verdict,
        checks,
        errors,
        shots,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
console.log(
  "PASS",
  checks.length,
  "acceptance checks",
  shots.length,
  "screenshots",
);

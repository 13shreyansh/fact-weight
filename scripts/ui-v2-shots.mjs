// Screenshots of the deployed UI v2 at 1440x900 and 390 wide, after real content loads.
import { chromium } from "playwright";
const B = process.env.BASE || "https://signal-fire.72.61.22.106.sslip.io";
const story = process.argv[2];
const pages = [["home", "/"], ["country-FI", "/country?cc=FI"], ["country-US", "/country?cc=US"], ["method", "/method"]];
if (story) pages.push(["story", "/story?id=" + story]);
const browser = await chromium.launch();
const errors = [];
for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "phone"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  for (const [name, path] of pages) {
    const p = await ctx.newPage();
    p.on("console", (m) => m.type() === "error" && errors.push(`${name} ${tag}: ${m.text()}`));
    p.on("pageerror", (e) => errors.push(`${name} ${tag}: ${e.message}`));
    await p.goto(B + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    const text = await p.evaluate(() => document.body.innerText);
    if (/undefined|null|NaN|\[object/.test(text)) errors.push(`${name} ${tag}: internal value on screen`);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) errors.push(`${name} ${tag}: horizontal overflow`);
    await p.screenshot({ path: `artifacts/ui-v2/${name}-${tag}.png`, fullPage: false });
    await p.screenshot({ path: `artifacts/ui-v2/${name}-${tag}-full.png`, fullPage: true });
    await p.close();
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no console errors, no overflow, no internal values");

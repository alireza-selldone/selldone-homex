/* Evidence-pack screenshots, captured from the deployed site.

   Two rules learned the hard way:

   1. A full-page screenshot taken while scrolled paints a sticky header at its
      pinned position, which reads as "the header is in the middle of the page".
      Every full-page capture scrolls back to 0 and waits before shooting.
   2. Lazy content never loads in a viewport-only shot, and hydration is not
      finished at domcontentloaded. Every page is scrolled to the bottom to
      trigger loading, then back to the top, then given a settle.

   Usage: node scripts/pack-shots.mjs [baseUrl]
*/
import { chromium } from "playwright";
import { mkdirSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const BASE = (process.argv[2] || "http://localhost:8788").replace(/\/+$/, "");
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "pack");
mkdirSync(OUT, { recursive: true });

/* A signed-in session cannot be produced non-interactively — OAuth needs a
   password. The token is injected and the profile call stubbed, so the real
   signed-in branch renders. Only the identity is simulated; the pack README
   says so beside the screenshot. */
const TOKEN = JSON.stringify({
  access_token: "simulated-session-for-pack-screenshot",
  refresh_token: "",
  expires_at: Date.now() + 86400000,
  token_type: "Bearer",
});
const PROFILE = { user: { name: "Robert Donnie", email: "demo@example.com", id: 8 } };
const BAG = JSON.stringify([{ id: 710462, qty: 1 }, { id: 710456, qty: 2 }]);

async function settle(p) {
  await p.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await p.evaluate(async () => {
    const step = Math.round(innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 130));
    }
    scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 450));
  });
  await p.evaluate(() =>
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]),
  ).catch(() => {});
  await p.waitForTimeout(500);
}

const shots = [];
async function shoot(p, name, opts = {}) {
  await p.screenshot({ path: join(OUT, name), ...opts });
  shots.push(name);
  console.log("  " + name);
}

const browser = await chromium.launch();

async function page({ width = 1440, height = 900, signedIn = false, bag = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  if (signedIn) {
    await ctx.addInitScript((t) => localStorage.setItem("pajulina_storefront_oauth_tokens_v1", t), TOKEN);
    /* Must NOT swallow the avatar image: it lives under the same
       /users/{id}/profile/ prefix, and fulfilling it with JSON renders a broken
       image in the panel. Only the profile JSON is stubbed; the avatar is
       fetched for real. */
    await ctx.route(
      (u) => /selldone\.com\/.*(user|profile|me)/i.test(u.href) && !/avatar/i.test(u.href),
      (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PROFILE) }),
    );
  }
  if (bag) await ctx.addInitScript((v) => localStorage.setItem("storefront_bag_v1", v), BAG);
  return { ctx, p: await ctx.newPage() };
}

async function go(p, path, ready) {
  await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
  if (ready) await p.waitForSelector(ready, { timeout: 45000 });
  await settle(p);
}

console.log(`Capturing from ${BASE}\n`);

/* ---- 01-06 homepage ---- */
{
  const { ctx, p } = await page();
  await go(p, "/", "#catgrid .cat");
  await shoot(p, "02-hero.png");
  await shoot(p, "20-selldone-bar.png", { clip: { x: 0, y: 0, width: 1440, height: 260 } });

  /* The hotspot shot comes BEFORE the full-page one. A fullPage capture
     temporarily resizes the viewport, and the markers are positioned by
     projecting image space into box space in JS — after that resize they are
     stale until another resize event fires, and the click times out on an
     element that reports visible but sits nowhere useful.

     Clicked, not simulated: a coordinate assertion cannot tell you the card
     actually rendered over the photograph. */
  const spot = p.locator(".hspot").first();
  if (await spot.count()) {
    await spot.waitFor({ state: "visible", timeout: 20000 });
    await spot.click();
    await p.waitForTimeout(900);
    const open = await p.locator(".hcard").first().isVisible().catch(() => false);
    if (!open) console.log("  !! hotspot card did not open — 03 shows a closed marker");
    await shoot(p, "03-hero-hotspot-open.png");
    await p.keyboard.press("Escape");
    await p.waitForTimeout(500);
  } else {
    console.log("  !! no .hspot found — 03 not captured");
  }

  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(400);
  await shoot(p, "01-homepage-full.png", { fullPage: true });

  for (const [name, sel] of [
    ["04-collections-grid.png", "#catgrid"],
    ["05-salon.png", "#service"],
    ["06-reviews.png", "#reviews"],
  ]) {
    const el = await p.$(sel);
    if (!el) { console.log(`  !! ${sel} not found — ${name} not captured`); continue; }
    await el.scrollIntoViewIfNeeded();
    await p.waitForTimeout(600);
    await shoot(p, name, { clip: await el.boundingBox() });
  }
  await ctx.close();
}

/* ---- 07-08 shop ---- */
{
  const { ctx, p } = await page();
  await go(p, "/shop.html", "#pgrid .pcard");
  await shoot(p, "07-shop-listing.png");
  /* Only `cat` and `brand` come from the URL; the price band is a pair of
     logarithmic sliders, so it has to be driven through the UI. Assert the
     count actually drops — a filtered screenshot that filtered nothing is
     worse than no screenshot. */
  await go(p, "/shop.html?cat=dining-table", "#pgrid .pcard");
  const beforeN = await p.locator("#pgrid .pcard").count();
  await p.$eval("#phi", (el) => {
    el.value = "94";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await p.waitForTimeout(900);
  const afterN = await p.locator("#pgrid .pcard").count();
  const band = await p.textContent("#pout");
  /* "Fewer cards" is NOT enough: the no-results state renders closest-match
     suggestions that are also .pcard, so a band excluding everything counts as
     3 and looks like a successful filter. It has to be a real subset — fewer
     than before, more than none, and no empty-state heading. */
  const empty = await p.locator("text=Nothing in this range").count();
  console.log(`     dining-table ${beforeN} -> ${afterN} with band ${String(band).trim()}`);
  if (empty) console.log("  !! no results — 08 shows the empty state, not faceting");
  else if (afterN >= beforeN || afterN === 0) console.log("  !! band is not a real subset — 08 would prove nothing");
  await shoot(p, "08-shop-filtered.png");
  await ctx.close();
}

/* ---- 09-10 product, with a variant actually selected ---- */
{
  const { ctx, p } = await page();
  await go(p, "/product.html?id=710462", "#pdp h1");
  await p.waitForSelector(".sw", { timeout: 30000 });
  await shoot(p, "09-product.png");
  const before = await p.textContent("[data-price]");
  await p.click('.sw[data-i="2"]');           // the $58,900 finish
  await p.waitForTimeout(900);
  const after = await p.textContent("[data-price]");
  if (before.trim() === after.trim()) {
    console.log(`  !! price did not change (${before.trim()}) — 10 would prove nothing`);
  } else {
    console.log(`     price ${before.trim()} -> ${after.trim()}`);
  }
  await shoot(p, "10-product-variant.png");
  await ctx.close();
}

/* ---- 11-13 blog, article, checkout ---- */
{
  const { ctx, p } = await page({ bag: true });
  await go(p, "/blog", ".post");
  await shoot(p, "11-blog.png");
  // .post IS the anchor, not a card containing one, and it links to
  // /article?slug=… — no .html, because linking article.html would cost a
  // redirect on every click.
  const href = await p.getAttribute("a.post", "href");
  await go(p, "/" + String(href).replace(/^\//, ""), "[data-article-body] p");
  await shoot(p, "12-article.png");
  await go(p, "/checkout.html", "#sumrows .sum__row");
  await shoot(p, "13-checkout.png");
  await ctx.close();
}

/* ---- 14-15 account, both states ---- */
for (const [name, signedIn] of [["14-account-signedout.png", false], ["15-account-signedin.png", true]]) {
  const { ctx, p } = await page({ signedIn });
  await go(p, "/", "#catgrid .cat");
  await p.click("[data-open='account']");
  await p.waitForTimeout(2600);
  const note = await p.$(".setupnote");
  const expected = !signedIn;
  if (Boolean(note) !== expected) {
    console.log(`  !! ${name}: callout ${note ? "present" : "absent"}, expected ${expected ? "present" : "absent"}`);
  }
  await shoot(p, name);
  await ctx.close();
}

/* ---- 16 policy page ---- */
{
  const { ctx, p } = await page();
  await go(p, "/terms", ".prose h2");
  await shoot(p, "16-page-terms.png");
  await ctx.close();
}

/* ---- 17-19 mobile ---- */
for (const [name, path, ready] of [
  ["17-mobile-home.png", "/", "#catgrid .cat"],
  ["18-mobile-shop.png", "/shop.html", "#pgrid .pcard"],
  ["19-mobile-product.png", "/product.html?id=710462", "#pdp h1"],
]) {
  const { ctx, p } = await page({ width: 390, height: 844 });
  await go(p, path, ready);
  await shoot(p, name);
  await ctx.close();
}

await browser.close();

const files = readdirSync(OUT).filter((f) => f.endsWith(".png")).sort();
const total = files.reduce((n, f) => n + statSync(join(OUT, f)).size, 0);
console.log(`\n${files.length} screenshots, ${(total / 1048576).toFixed(2)} MB total`);
files.forEach((f) => console.log(`  ${f.padEnd(30)} ${(statSync(join(OUT, f)).size / 1024).toFixed(0)} KB`));

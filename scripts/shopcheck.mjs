import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const BASE = (process.argv[2] || "http://localhost:8788").replace(/\/+$/, "");
const SHOP_CONFIG = JSON.parse(await readFile(new URL("../shop.config.json", import.meta.url), "utf8"));
const FURNITURE = SHOP_CONFIG.navigation?.furniture || { title: "Furniture", excludeCategories: [] };
const browser = await chromium.launch();
let failures = 0;
const pass = (message) => console.log(`  ok    ${message}`);
const fail = (message) => { failures++; console.log(`  FAIL  ${message}`); };

for (const [width, height] of [[1440, 1000], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`${BASE}/shop.html?cat=dining-table`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelectorAll("#pgrid .pcard").length === 6, { timeout: 20000 });
  const state = await page.evaluate(() => ({
    title: document.querySelector("#listtitle")?.textContent.trim(),
    chips: document.querySelectorAll("#category-chips a").length,
    filters: [...document.querySelectorAll(".filters .fgroup h4 button")].map((button) => button.textContent.trim().replace(/[+−]/g, "").trim()),
    priceOpen: document.querySelector("#fg-price button")?.getAttribute("aria-expanded"),
    columns: getComputedStyle(document.querySelector("#pgrid")).gridTemplateColumns.split(" ").length,
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  console.log(`\n  ${width}px`);
  state.title === "Dining Table" ? pass("category title is human-readable") : fail(`wrong title: ${state.title}`);
  state.chips >= 7 && state.chips <= 8 ? pass("compact related-category chip row") : fail(`${state.chips} category chips`);
  JSON.stringify(state.filters) === JSON.stringify(["Product Type", "Price", "Availability", "Design Style", "Color", "Indoor / Outdoor"])
    ? pass("reference filter groups are present") : fail(`wrong filter groups: ${state.filters.join(", ")}`);
  state.priceOpen === "true" ? pass("price filter opens by default") : fail("price filter is not open");
  state.columns === (width > 900 ? 3 : 2) ? pass("responsive product columns match the design") : fail(`${state.columns} product columns`);
  state.pageOverflow === 0 ? pass("no horizontal overflow") : fail(`${state.pageOverflow}px overflow`);
  await page.close();
}

const all = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await all.goto(`${BASE}/shop.html`, { waitUntil: "domcontentloaded" });
await all.waitForFunction(() => document.querySelectorAll("#pgrid .pcard").length === 24, { timeout: 20000 });
const allState = await all.evaluate(() => ({ title: document.querySelector("#listtitle")?.textContent.trim(), count: document.querySelector("#count")?.textContent.trim() }));
allState.title === "All products" && allState.count === "100 products" ? pass("all-products page exposes the full 100-product catalog") : fail(`${allState.title}: ${allState.count}`);
await all.close();

const furniture = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await furniture.goto(`${BASE}/shop.html?view=furniture`, { waitUntil: "domcontentloaded" });
await furniture.waitForFunction(() => document.querySelectorAll("#pgrid .pcard").length === 24, { timeout: 20000 });
const furnitureState = await furniture.evaluate(() => ({
  title: document.querySelector("#listtitle")?.textContent.trim(),
  crumb: document.querySelector("#crumbtitle")?.textContent.trim(),
  chip: document.querySelector("#category-chips [aria-current=page]")?.textContent.trim(),
  count: document.querySelector("#count")?.textContent.trim(),
  filters: [...document.querySelectorAll("#catfilters input")].map((input) => input.value),
}));
const furnitureOnly = !(FURNITURE.excludeCategories || []).some((slug) => furnitureState.filters.includes(slug));
furnitureState.title === FURNITURE.title && furnitureState.crumb === FURNITURE.title && furnitureState.chip === FURNITURE.title && furnitureOnly
  ? pass(`${FURNITURE.title} menu opens its configured ${furnitureState.count} view`)
  : fail(`Furniture view is wrong: ${JSON.stringify(furnitureState)}`);
await furniture.close();

await browser.close();
console.log(failures ? `\n${failures} FAILURE(S)\n` : "\nShop checks passed.\n");
process.exit(failures ? 1 : 0);

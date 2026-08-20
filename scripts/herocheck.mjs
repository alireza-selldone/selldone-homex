/* Verify the responsive Homex campaign hero against its current design rules. */
import { chromium } from "playwright";

const BASE = (process.argv[2] || "http://localhost:8788").replace(/\/+$/, "");
const browser = await chromium.launch();
let failures = 0;
const fail = (message) => { failures++; console.log(`  FAIL  ${message}`); };
const pass = (message) => console.log(`  ok    ${message}`);

for (const [width, height] of [[1440, 900], [1024, 900], [820, 1000], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const image = document.querySelector("[data-hero-img]");
    return image?.complete && image.naturalWidth > 0;
  });
  await page.waitForTimeout(300);

  const state = await page.evaluate(() => {
    const hero = document.querySelector(".campaign-hero");
    const image = document.querySelector("[data-hero-img]");
    const copy = document.querySelector(".campaign-hero__copy");
    const heading = copy.querySelector("h1");
    const dots = [...document.querySelectorAll(".campaign-hero__dots button")];
    const hr = hero.getBoundingClientRect();
    const ir = image.getBoundingClientRect();
    const cr = copy.getBoundingClientRect();
    const tr = heading.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      hero: { top: hr.top, bottom: hr.bottom, width: hr.width },
      image: { top: ir.top, bottom: ir.bottom, width: ir.width, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight },
      copy: { top: cr.top, bottom: cr.bottom, width: cr.width },
      heading: { top: tr.top, bottom: tr.bottom, text: heading.textContent.trim() },
      fit: getComputedStyle(image).objectFit,
      dots: dots.map((dot) => ({ width: parseFloat(getComputedStyle(dot, "::after").width), height: parseFloat(getComputedStyle(dot, "::after").height) })),
      heroCenter: { x: hr.left + hr.width / 2, y: hr.top + hr.height / 2 },
      copyCenter: { x: cr.left + cr.width / 2, y: cr.top + cr.height / 2 },
      actions: copy.querySelectorAll("a.btn").length,
    };
  });

  console.log(`\n  ${width}px`);
  state.overflow === 0 ? pass("no horizontal overflow") : fail(`${state.overflow}px horizontal overflow`);
  state.fit === "cover" ? pass("campaign image uses object-fit: cover") : fail(`unexpected object-fit: ${state.fit}`);
  state.image.naturalWidth > state.image.naturalHeight ? pass("landscape campaign artwork loaded") : fail("campaign artwork is not landscape");
  const copyVisible = state.heading.top >= state.hero.top && state.heading.bottom <= state.hero.bottom && state.heading.text.length > 10;
  copyVisible ? pass("campaign heading is fully visible") : fail("campaign heading is clipped or empty");
  Math.abs(state.image.top - state.hero.top) < 1 && Math.abs(state.image.bottom - state.hero.bottom) < 1 && Math.abs(state.image.width - state.hero.width) < 1
    ? pass("campaign photograph fills the whole hero") : fail("campaign photograph does not fill the hero");
  Math.abs(state.heroCenter.x - state.copyCenter.x) < 2 && Math.abs(state.heroCenter.y - state.copyCenter.y) < 2
    ? pass("title, button and subline are centred on the image") : fail("hero copy is not centred");
  state.actions === 1 ? pass("hero contains one focused action") : fail(`${state.actions} hero actions rendered`);
  state.dots.length === 3 && state.dots.every((dot) => dot.width <= 10 && dot.height <= 10)
    ? pass("slider uses three small dots") : fail("slider dots are missing or oversized");
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURE(S)\n` : "\nHero checks passed.\n");
process.exit(failures ? 1 : 0);

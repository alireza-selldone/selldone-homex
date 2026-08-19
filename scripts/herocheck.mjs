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
    };
  });

  console.log(`\n  ${width}px`);
  state.overflow === 0 ? pass("no horizontal overflow") : fail(`${state.overflow}px horizontal overflow`);
  state.fit === "cover" ? pass("campaign image uses object-fit: cover") : fail(`unexpected object-fit: ${state.fit}`);
  state.image.naturalWidth > state.image.naturalHeight ? pass("landscape campaign artwork loaded") : fail("campaign artwork is not landscape");
  const copyVisible = state.heading.top >= state.hero.top && state.heading.bottom <= state.hero.bottom && state.heading.text.length > 10;
  copyVisible ? pass("campaign heading is fully visible") : fail("campaign heading is clipped or empty");
  if (width <= 820) {
    const expectedHeight = width <= 760 ? 270 : 300;
    Math.round(state.image.bottom - state.image.top) === expectedHeight ? pass(`responsive image zone is ${expectedHeight}px`) : fail("responsive image zone changed");
    const overlap = state.image.bottom - state.copy.top;
    overlap <= 24.5 ? pass(overlap > 0 ? "mobile copy uses the intentional 24px overlap" : "tablet copy follows the image") : fail("copy obscures too much of the image");
  } else {
    state.copy.width < state.hero.width * .55 ? pass("desktop copy leaves the product scene visible") : fail("desktop copy obscures too much artwork");
  }
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURE(S)\n` : "\nHero checks passed.\n");
process.exit(failures ? 1 : 0);

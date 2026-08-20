/* Regression check for the homepage merchandising, category copy, and the
   single footer newsletter. These are data/layout failures, so verify both the
   backend-derived card membership and the rendered geometry at each breakpoint. */
import { chromium } from "playwright";

const BASE = (process.argv[2] || "http://localhost:8788").replace(/\/+$/, "");
const browser = await chromium.launch();
let failures = 0;
const fail = (message) => { failures++; console.log(`  FAIL  ${message}`); };
const pass = (message) => console.log(`  ok    ${message}`);

for (const [width, height] of [[1440, 900], [1024, 900], [768, 900], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() =>
    document.querySelectorAll("#trending-products .pcard").length === 20 &&
    document.querySelectorAll("#best-seller-products .pcard").length === 20,
  { timeout: 20000 });

  const state = await page.evaluate(() => {
    const all = (selector) => [...document.querySelectorAll(selector)];
    const ids = (selector) => all(selector).map((card) => card.dataset.productId);
    const trending = ids("#trending-products .pcard");
    const best = ids("#best-seller-products .pcard");
    const categoryClipping = all(".homex-cat").filter((card) => {
      const copy = card.querySelector(".homex-cat__copy");
      const cr = copy.getBoundingClientRect();
      const rr = card.getBoundingClientRect();
      return copy.scrollHeight > copy.clientHeight + 1 || cr.bottom > rr.bottom + 1;
    }).map((card) => card.textContent.trim());
    const footerForms = all(".homex-footer .sub");
    const form = footerForms[0];
    const input = form?.querySelector("input")?.getBoundingClientRect();
    const button = form?.querySelector("button")?.getBoundingClientRect();
    const formRect = form?.getBoundingClientRect();
    const policyOverflow = all(".homex-footer a,.homex-footer button").some((link) => {
      const rect = link.getBoundingClientRect();
      return rect.left < 0 || rect.right > innerWidth;
    });
    return {
      trending,
      best,
      trendingBadges: all("#trending-products .pcard__badge").filter((badge) => badge.textContent.trim() === "Trending").length,
      bestBadges: all("#best-seller-products .pcard__badge").filter((badge) => badge.textContent.trim() === "Best seller").length,
      sectionOrder: document.querySelector(".products-section--best").offsetTop > document.querySelector(".products-section--trending").offsetTop,
      categoryClipping,
      standaloneNewsletter: Boolean(document.querySelector(".newsletter-band")),
      footerForms: footerForms.length,
      footerGap: input && button ? Math.abs(button.left - input.right) : Infinity,
      footerInputRatio: input && button ? input.width / button.width : 0,
      footerContained: formRect && input && button ? input.left >= formRect.left && button.right <= formRect.right + 1 : false,
      socialLabels: all(".homex-footer .ft__socials [aria-label]").map((icon) => icon.getAttribute("aria-label")),
      footerColumns: all(".homex-footer .ft__cols>.ft__col").length,
      policyOverflow,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  console.log(`\n  ${width}px`);
  state.trending.length === 20 ? pass("20 Survey-tagged Trending products") : fail(`${state.trending.length} Trending products`);
  state.best.length === 20 ? pass("20 Survey-tagged Best Seller products") : fail(`${state.best.length} Best Seller products`);
  state.trending.filter((id) => state.best.includes(id)).length === 0 ? pass("merchandising sets are disjoint") : fail("Trending and Best Seller overlap");
  state.trendingBadges === 20 && state.bestBadges === 20 ? pass("all merchandising badges match their rail") : fail("a merchandising badge is missing or wrong");
  state.sectionOrder ? pass("Best Sellers follows Trending") : fail("merchandising section order changed");
  state.categoryClipping.length === 0 ? pass("category names and counts stay inside cards") : fail(`category copy clipped: ${state.categoryClipping.join(", ")}`);
  !state.standaloneNewsletter && state.footerForms === 1 ? pass("only the footer newsletter remains") : fail("duplicate or missing newsletter");
  state.footerColumns === 3 ? pass("footer uses the three reference columns") : fail(`${state.footerColumns} footer columns rendered`);
  state.footerGap <= 1 && state.footerContained ? pass("newsletter field and button form one contained control") : fail("newsletter control is split or overflowing");
  width < 1280 || state.footerInputRatio >= 2 ? pass("newsletter field keeps the wide desktop proportion") : fail(`newsletter input/button ratio is ${state.footerInputRatio.toFixed(2)}`);
  JSON.stringify(state.socialLabels) === JSON.stringify(["Instagram", "Twitter", "Facebook", "TikTok"]) ? pass("four requested social icons are present") : fail(`wrong social icons: ${state.socialLabels.join(", ")}`);
  !state.policyOverflow ? pass("footer policy links remain on canvas") : fail("footer policy link overflow");
  state.pageOverflow === 0 ? pass("no page-level horizontal overflow") : fail(`${state.pageOverflow}px horizontal overflow`);
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURE(S)\n` : "\nHomepage checks passed.\n");
process.exit(failures ? 1 : 0);

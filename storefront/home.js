/* Homex homepage — live Selldone catalog with an editorial furniture shell. */

import { loadCatalog, loadReviews } from "./shop-data.js";
import { cardHTML, esc, productTags } from "./app.js";

const CAMPAIGNS = [
  {
    image: "assets/homex/hero-dining.webp",
    alt: "Sunlit contemporary dining room with an oak table and upholstered chairs",
    kicker: "The gathering edit",
    title: "Made for lingering longer.",
    titleLines: ["Made for", "lingering longer."],
    lede: "Warm woods, soft upholstery, and room for everyone at the table.",
    label: "Shop dining",
    href: "shop.html?cat=dining-table",
  },
  {
    image: "assets/homex/living-editorial.webp",
    alt: "Warm contemporary living room with a cream sofa and walnut coffee table",
    kicker: "A quieter kind of luxury",
    title: "Comfort, with a point of view.",
    titleLines: ["Comfort, with", "a point of view."],
    lede: "Sculptural seating and grounded natural materials for the everyday room.",
    label: "Shop living",
    href: "shop.html?cat=sofa-bed",
  },
  {
    image: "assets/homex/bedroom-editorial.webp",
    alt: "Serene bedroom with an upholstered bed and walnut writing desk",
    kicker: "Rooms that work beautifully",
    title: "Rest, focus, repeat.",
    titleLines: ["Rest, focus,", "repeat."],
    lede: "A softer bedroom and a more considered place to work, in one calm palette.",
    label: "Shop bedroom",
    href: "shop.html?cat=beds",
  },
];

function initCampaigns() {
  const image = document.querySelector("[data-hero-img]");
  const kicker = document.querySelector("[data-campaign-kicker]");
  const title = document.querySelector("[data-campaign-title]");
  const lede = document.querySelector("[data-campaign-lede]");
  const link = document.querySelector("[data-hero-link]");
  const dots = document.querySelector("[data-campaign-dots]");
  if (!image || !dots) return;

  let active = 0;
  let timer;
  const paint = (index, restart = true) => {
    active = (index + CAMPAIGNS.length) % CAMPAIGNS.length;
    const item = CAMPAIGNS[active];
    image.src = item.image;
    image.alt = item.alt;
    kicker.textContent = item.kicker;
    title.innerHTML = item.titleLines.map((line) => `<span>${esc(line)}</span>`).join("");
    lede.textContent = item.lede;
    link.textContent = item.label;
    link.href = item.href;
    dots.querySelectorAll("button").forEach((button, i) => {
      button.setAttribute("aria-current", i === active ? "true" : "false");
    });
    if (restart) {
      clearInterval(timer);
      timer = setInterval(() => paint(active + 1, false), 6500);
    }
  };

  dots.innerHTML = CAMPAIGNS.map((item, i) =>
    `<button type="button" aria-label="Show ${esc(item.kicker)} campaign" aria-current="${i === 0}"></button>`,
  ).join("");
  dots.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button) paint([...dots.children].indexOf(button));
  });
  paint(0);
}

function initBeforeAfter() {
  const comparison = document.querySelector("[data-before-after]");
  const range = comparison?.querySelector("[data-before-after-range]");
  if (!comparison || !range) return;
  const paint = () => {
    comparison.style.setProperty("--split", `${range.value}%`);
    range.setAttribute("aria-valuetext", `${range.value}% room concept`);
  };
  range.addEventListener("input", paint);
  paint();
}

function fillHome(catalog) {
  const grid = document.getElementById("catgrid");
  const categorySection = grid?.closest("section");
  if (categorySection) categorySection.hidden = catalog.cats.length === 0;
  if (grid) {
    const featuredCategories = catalog.cats.slice(0, 6);
    grid.dataset.n = String(featuredCategories.length);
    grid.innerHTML = featuredCategories.map((category) => {
      return `<a class="cat homex-cat" href="shop.html?cat=${encodeURIComponent(category.slug)}">
        <span class="homex-cat__art"><img src="${category.image}" alt="${esc(category.name)}" loading="lazy" width="500" height="500"></span>
        <span class="homex-cat__copy"><b>${esc(category.name)}</b><small>${category.count} products</small></span>
      </a>`;
    }).join("");
  }

  document.querySelectorAll("[data-all-refs]").forEach((link) => {
    link.textContent = `All ${catalog.products.length} products →`;
  });

  const fillMerchandisingRail = (id, tag) => {
    const rail = document.getElementById(id);
    if (!rail) return;
    const products = catalog.products.filter((product) => productTags(product).includes(tag)).slice(0, 20);
    rail.dataset.count = String(products.length);
    rail.innerHTML = products.map(cardHTML).join("");
    rail.closest("section")?.toggleAttribute("hidden", products.length === 0);
  };

  fillMerchandisingRail("trending-products", "trending");
  fillMerchandisingRail("best-seller-products", "best seller");

  const categories = catalog.cats.length;
  document.querySelectorAll("[data-category-count]").forEach((el) => { el.textContent = categories; });

  renderHomeReviews(catalog.products);
}

function renderHomeReviews(products) {
  const summary = loadReviews(products);
  const average = document.querySelector("[data-home-review-average]");
  const count = document.querySelector("[data-home-review-count]");
  const mode = document.querySelector("[data-home-review-mode]");
  const breakdown = document.querySelector("[data-home-review-breakdown]");
  const grid = document.querySelector("[data-home-reviews]");
  const disclosure = document.querySelector("[data-home-review-disclosure]");
  if (!grid || !breakdown) return;

  if (average) average.textContent = summary.average.toFixed(1);
  if (count) count.textContent = `${summary.total} ${summary.sample ? "sample reviews" : "live ratings"}`;
  if (mode) mode.textContent = summary.sample ? "Sample customer notes" : "Live customer ratings";
  if (disclosure) {
    disclosure.textContent = summary.sample
      ? "Sample reviews are shown for this demonstration storefront."
      : "Score and distribution are calculated from live product ratings.";
  }

  breakdown.innerHTML = summary.counts.map(({ star, count: starCount, pct }) => `
    <div class="home-rating-row">
      <span>${star} star</span>
      <i aria-hidden="true"><b style="width:${pct}%"></b></i>
      <em>${starCount}</em>
    </div>`).join("");

  grid.innerHTML = summary.reviews.slice(0, 3).map((review) => {
    const rating = Math.max(1, Math.min(5, Math.round(review.rating || 0)));
    const label = `${rating} out of 5 stars`;
    const initials = String(review.name || "Homex customer")
      .split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    const body = review.body || `Customer rating for ${review.name || "a Homex product"}.`;
    const meta = [summary.sample ? "Sample review" : "Live product rating", review.city].filter(Boolean).join(" · ");
    return `<article class="home-review-card">
      <div class="home-review-card__top"><span class="home-review-quote" aria-hidden="true">“</span><span class="review-stars" role="img" aria-label="${label}">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span></div>
      <p>${esc(body)}</p>
      <footer><span class="home-review-avatar" aria-hidden="true">${esc(initials || "HC")}</span><span><b>${esc(review.name || "Homex customer")}</b><small>${esc(meta)}</small></span></footer>
    </article>`;
  }).join("");
}

initCampaigns();
initBeforeAfter();

loadCatalog()
  .then(fillHome)
  .catch((error) => {
    console.error(error);
    const message = document.querySelector("[data-catalog-error]");
    if (message) {
      message.hidden = false;
      message.textContent = "The live catalog could not be loaded. Please try again shortly.";
    }
  });

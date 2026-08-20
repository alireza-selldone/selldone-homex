/* Homex homepage — live Selldone catalog with an editorial furniture shell. */

import { loadCatalog, loadReviews, loadBlog } from "./shop-data.js";
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

function configuredCampaigns(catalog) {
  const slides = catalog?.cfg?.hero?.mode === "slides" ? catalog.cfg.hero.slides : [];
  const products = new Map((catalog?.products || []).map((product) => [Number(product.id), product]));
  const live = (slides || []).map((slide) => {
    const product = products.get(Number(slide.productId));
    if (!product) return null;
    return {
      image: product.image,
      alt: product.name,
      kicker: slide.kicker || product.catName || "Featured",
      title: slide.title || product.name,
      titleLines: [slide.title || product.name],
      lede: slide.lede || `${product.name} from the live store catalog.`,
      label: "View product",
      href: `product.html?id=${product.id}`,
    };
  }).filter(Boolean);
  return live.length ? live : CAMPAIGNS;
}

function initCampaigns(catalog) {
  const campaigns = configuredCampaigns(catalog);
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
    active = (index + campaigns.length) % campaigns.length;
    const item = campaigns[active];
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

  dots.innerHTML = campaigns.map((item, i) =>
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

async function fillHomeJournal() {
  const grid = document.querySelector("[data-home-journal-grid]");
  const count = document.querySelector("[data-home-journal-count]");
  if (!grid) return;
  try {
    const { posts, total } = await loadBlog();
    const featured = posts.slice(0, 3);
    if (count) count.textContent = `Read all ${total} ${total === 1 ? "story" : "stories"} →`;
    grid.innerHTML = featured.map((post) => {
      const href = post.slug ? `article?slug=${encodeURIComponent(post.slug)}` : `article?id=${post.blogId}`;
      return `<a class="guide-card" href="${href}">${post.image ? `<img src="${esc(post.image)}" alt="${esc(post.title)}" loading="lazy" width="800" height="450">` : ""}<span><small>${esc(post.category?.name || "Journal")}</small><b>${esc(post.title)}</b><em>Read the journal →</em></span></a>`;
    }).join("");
    grid.closest("section")?.toggleAttribute("hidden", featured.length === 0);
  } catch (error) {
    console.warn("[homex] homepage journal fallback", error);
  }
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
  if (mode) mode.textContent = summary.sample ? "Sample customer stories" : "Verified customer stories";
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

  const reviewImages = [
    ["assets/generated/rooms/living.webp", "Warm contemporary living room"],
    ["assets/generated/rooms/dining.webp", "Elegant contemporary dining room"],
    ["assets/homex/bedroom-editorial.webp", "Serene bedroom with warm wood furniture"],
    ["assets/generated/rooms/decor.webp", "Walnut console and sculptural wall decor"],
    ["assets/generated/rooms/outdoor.webp", "Mediterranean outdoor dining terrace"],
    ["assets/homex/hero-dining.webp", "Sunlit dining room with an oak table"],
  ];
  const reviewTitles = [
    "Exactly what we were looking for.",
    "Clear advice before ordering.",
    "Thoughtful design, carefully delivered.",
    "Service that made the second order easy.",
    "A good piece, honestly reviewed.",
    "Quality that feels right at home.",
  ];

  grid.innerHTML = summary.reviews.map((review, index) => {
    const rating = Math.max(1, Math.min(5, Math.round(review.rating || 0)));
    const label = `${rating} out of 5 stars`;
    const initials = String(review.name || "Homex customer")
      .split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    const body = review.body || `Customer rating for ${review.name || "a Homex product"}.`;
    const meta = [summary.sample ? "Sample review" : "Verified rating", review.city].filter(Boolean).join(" · ");
    const [sampleImage, sampleImageAlt] = reviewImages[index % reviewImages.length];
    const image = summary.sample ? sampleImage : review.image;
    const imageAlt = summary.sample ? sampleImageAlt : review.productName || review.name;
    const title = summary.sample ? reviewTitles[index % reviewTitles.length] : review.productName;
    return `<article class="home-review-card" data-review-card>
      <img class="home-review-card__image" src="${image}" alt="${esc(imageAlt)}" loading="lazy" width="640" height="430">
      <div class="home-review-card__body">
        <div class="home-review-card__top"><span class="home-review-quote" aria-hidden="true">“</span><span class="review-stars" role="img" aria-label="${label}">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span></div>
        <h3>${esc(title || "Customer rating")}</h3>
        <p>${esc(body)}</p>
        <footer><span class="home-review-avatar" aria-hidden="true">${esc(initials || "HC")}</span><span><b>${esc(review.name || "Homex customer")}</b><small>${esc(meta)}</small></span></footer>
      </div>
    </article>`;
  }).join("");

  initHomeReviewCarousel();
}

function initHomeReviewCarousel() {
  const carousel = document.querySelector("[data-home-review-carousel]");
  const viewport = carousel?.querySelector("[data-home-review-viewport]");
  const track = carousel?.querySelector("[data-home-reviews]");
  const dots = carousel?.querySelector("[data-review-dots]");
  const previous = carousel?.querySelector("[data-review-prev]");
  const next = carousel?.querySelector("[data-review-next]");
  const toggle = carousel?.querySelector("[data-review-toggle]");
  const progress = carousel?.querySelector("[data-review-progress]");
  if (!carousel || !viewport || !track || !dots || !previous || !next || !toggle || !progress) return;

  const originals = [...track.querySelectorAll("[data-review-card]")];
  if (!originals.length) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = 4;
  let active = 0;
  let timer = 0;
  let pausedByUser = reducedMotion.matches;
  let suspended = false;
  let transitioning = false;

  dots.innerHTML = originals.map((_, index) => `<button type="button" aria-label="Show review ${index + 1}" data-review-dot="${index}"></button>`).join("");

  const visibleCount = () => window.innerWidth <= 620 ? 1 : window.innerWidth <= 980 ? 2 : 4;
  const stepSize = () => {
    const card = track.querySelector("[data-review-card]");
    if (!card) return 0;
    return card.getBoundingClientRect().width + (Number.parseFloat(getComputedStyle(track).columnGap) || 0);
  };
  const updateControls = () => {
    dots.querySelectorAll("button").forEach((dot, index) => dot.setAttribute("aria-current", index === active ? "true" : "false"));
    toggle.querySelector("span").textContent = pausedByUser ? "▶" : "Ⅱ";
    toggle.querySelector("b").textContent = pausedByUser ? "Play" : "Pause";
    toggle.setAttribute("aria-label", `${pausedByUser ? "Start" : "Pause"} review autoplay`);
    carousel.classList.toggle("is-paused", pausedByUser || suspended);
  };
  const setTransform = (position, animate = true) => {
    track.classList.toggle("is-jumping", !animate);
    track.style.transform = `translate3d(${-position * stepSize()}px,0,0)`;
    if (!animate) requestAnimationFrame(() => track.classList.remove("is-jumping"));
  };
  const resetProgress = () => {
    progress.classList.remove("is-running");
    void progress.offsetWidth;
    if (!pausedByUser && !suspended) progress.classList.add("is-running");
  };
  const restart = () => {
    clearInterval(timer);
    if (!pausedByUser && !suspended && originals.length > 1) timer = window.setInterval(() => move(1), 5200);
    updateControls();
    resetProgress();
  };
  const move = (direction, manual = false) => {
    if (transitioning) return;
    transitioning = true;
    active += direction;
    setTransform(visible + active);
    if (manual) restart(); else { updateControls(); resetProgress(); }
  };
  const rebuild = () => {
    clearInterval(timer);
    track.querySelectorAll("[data-review-clone]").forEach((clone) => clone.remove());
    visible = Math.min(visibleCount(), originals.length);
    const before = originals.slice(-visible).map((card) => card.cloneNode(true));
    const after = originals.slice(0, visible).map((card) => card.cloneNode(true));
    before.reverse().forEach((card) => { card.dataset.reviewClone = ""; card.setAttribute("aria-hidden", "true"); track.prepend(card); });
    after.forEach((card) => { card.dataset.reviewClone = ""; card.setAttribute("aria-hidden", "true"); track.append(card); });
    active = ((active % originals.length) + originals.length) % originals.length;
    transitioning = false;
    requestAnimationFrame(() => setTransform(visible + active, false));
    restart();
  };

  track.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "transform") return;
    if (active >= originals.length) { active = 0; setTransform(visible, false); }
    if (active < 0) { active = originals.length - 1; setTransform(visible + active, false); }
    transitioning = false;
    updateControls();
  });
  previous.addEventListener("click", () => move(-1, true));
  next.addEventListener("click", () => move(1, true));
  dots.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-review-dot]");
    if (!dot || transitioning) return;
    const target = Number(dot.dataset.reviewDot);
    if (target === active) { restart(); return; }
    active = target;
    transitioning = true;
    setTransform(visible + active);
    restart();
  });
  toggle.addEventListener("click", () => { pausedByUser = !pausedByUser; restart(); });
  carousel.addEventListener("mouseenter", () => { suspended = true; restart(); });
  carousel.addEventListener("mouseleave", () => { suspended = false; restart(); });
  carousel.addEventListener("focusin", () => { suspended = true; restart(); });
  carousel.addEventListener("focusout", (event) => { if (!carousel.contains(event.relatedTarget)) { suspended = false; restart(); } });
  document.addEventListener("visibilitychange", () => { suspended = document.hidden; restart(); });
  reducedMotion.addEventListener?.("change", (event) => { if (event.matches) pausedByUser = true; restart(); });
  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(rebuild, 140); });
  rebuild();
}

initBeforeAfter();

loadCatalog()
  .then((catalog) => {
    initCampaigns(catalog);
    fillHome(catalog);
  })
  .catch((error) => {
    console.error(error);
    const message = document.querySelector("[data-catalog-error]");
    if (message) {
      message.hidden = false;
      message.textContent = "The live catalog could not be loaded. Please try again shortly.";
    }
  });

fillHomeJournal();

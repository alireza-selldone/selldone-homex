/* Homex — product detail. Works for every product via ?id=.
   Ported from design-reference initPDP(), with three corrections agreed with
   the client: real finishes only, real spec data instead of invented details,
   and clearly disclosed sample reviews for the demonstration storefront. */

import {
  loadCatalog, loadProduct, money, byId, catOf, img,
  variantsOf, swatchStyle, swatchLabel, isComposite,
  addToBag,
} from "./shop-data.js";
import { cardHTML, esc, initAcc, openLightbox } from "./app.js";

/* Spec keys worth surfacing, in reading order. Only those the record actually
   holds are rendered; nothing is filled in. */
const SPEC_ORDER = [
  "Material", "Frame Material", "Upholstery", "Finish", "Color",
  "Width", "Depth", "Height", "Seat Height", "Dimensions", "Item weight",
  "Assembly", "Care", "Style", "Model number", "Special Features", "Design Style",
];

function specRows(spec) {
  if (!spec) return [];
  const rows = [];
  const seen = new Set();
  SPEC_ORDER.forEach((k) => {
    const v = spec[k];
    if (!v || v === "group" || seen.has(k)) return;
    seen.add(k);
    rows.push([k, Array.isArray(v) ? v.join(", ") : String(v)]);
  });
  Object.entries(spec).forEach(([k, v]) => {
    if (v === "group" || seen.has(k) || !v) return;
    seen.add(k);
    rows.push([k, Array.isArray(v) ? v.join(", ") : String(v)]);
  });
  return rows;
}

const SAMPLE_REVIEWS = [
  ["Maya R.", "Thoughtfully designed and exactly as described. The proportions sit naturally in the room and the material feels considered."],
  ["Daniel K.", "The build quality feels excellent. Delivery was well coordinated and every piece arrived protected."],
  ["Sofia L.", "A polished piece with the right balance of comfort and structure. I would happily choose it again."],
  ["Noah T.", "The dimensions were clear, the purchase was easy, and the finish looks even better in natural light."],
  ["Ava M.", "It looks beautiful, feels solid, and has made the room much more useful for daily life."],
];

function ratingBlock(p) {
  return `<div class="reviews-block">
    <div class="reviews-summary">
      <div><p class="eyebrow eyebrow--onink">Customer reviews</p><h2>What customers say</h2></div>
      <div class="reviews-score"><strong>5.0</strong><span class="review-stars" role="img" aria-label="5 out of 5 stars">★★★★★</span><small>5 sample reviews</small></div>
    </div>
    <div class="reviews-grid">
      ${SAMPLE_REVIEWS.map(([name, text]) => `<article class="review-card">
        <span class="review-stars" role="img" aria-label="5 out of 5 stars">★★★★★</span>
        <p>${esc(text)}</p>
        <footer><b>${esc(name)}</b><span>Sample review · REF. ${p.id}</span></footer>
      </article>`).join("")}
    </div>
    <p class="reviews-disclosure">Sample reviews are shown for this demonstration storefront.</p>
  </div>`;
}

async function initPDP(cat) {
  const root = document.getElementById("pdp");
  if (!root) return;

  const id = new URLSearchParams(location.search).get("id");
  const p = byId(cat, id);

  if (!p) {
    root.innerHTML = `<div class="notfound">
      <p class="h1" style="margin-bottom:14px">Product not found</p>
      <p class="lede" style="margin:0 auto 28px">${id ? `Product ${esc(id)} is not in the catalog.` : "No product was requested."}</p>
      <a class="btn" href="shop.html">Browse all products</a></div>`;
    document.title = "Product not found — Homex";
    return;
  }

  document.title = `${p.name} — Homex`;
  const c = catOf(cat, p.cat);
  const others = cat.products.filter((x) => x.cat === p.cat && x.id !== p.id);

  /* Real gallery from products/{id}/info; falls back to the list icon. */
  let gallery = [{ src: p.image, alt: `${p.name}, main view`, w: 1000, h: 1000 }];
  try {
    const detail = await loadProduct(p.id);
    if (detail.gallery.length) gallery = detail.gallery;
  } catch (e) {
    console.warn("[homex] gallery fallback to icon", e);
  }

  /* Every variant the shop defines, not a filtered subset. */
  const variants = variantsOf(p.raw);
  const showSwatches = variants.length >= 2;
  /* A variant's own price/stock when it sets one, the product's otherwise. */
  const priceOf = (v) => (v && v.price > 0 ? v.price - (v.discount || 0) : p.price);
  const stockOf = (v) => (v && v.qty ? v.qty : p.qty);
  const rows = specRows(p.spec);
  const railRef = document.querySelector("[data-rail-ref]");
  if (railRef) railRef.textContent = `REF ${p.id}`;

  root.innerHTML = `
  <p class="crumb"><a href="index.html">Home</a> &nbsp;/&nbsp; <a href="shop.html?cat=${c.slug}">${esc(c.name)}</a> &nbsp;/&nbsp; ${esc(p.name)}</p>
  <div class="pdp">
    <div class="gal">
      <div class="thumbs" role="group" aria-label="Gallery views"${gallery.length < 2 ? ' hidden' : ''}>
        ${gallery.map((g, i) => `
          <button class="thumb${i ? "" : " is-on"}" type="button" data-i="${i}" aria-label="View ${i + 1} of ${gallery.length}">
            <img src="${g.src}" alt="" width="120" height="120" loading="lazy">
          </button>`).join("")}
      </div>
      <button class="galmain" id="galmain" type="button" aria-label="Enlarge image">
        <img src="${gallery[0].src}" alt="${esc(gallery[0].alt)}" width="${gallery[0].w}" height="${gallery[0].h}" fetchpriority="high">
      </button>
    </div>

    <div class="pinfo">
      <p class="eyebrow eyebrow--blued mb0">${esc(c.name)}</p>
      <h1 class="h1">${esc(p.name)}</h1>
      <p class="ref">REF. ${p.id}${p.brand ? ` &middot; ${esc(p.brand.toUpperCase())}` : ""}</p>

      <p class="price" style="font-size:24px;margin:22px 0 0" data-price>${money(showSwatches ? priceOf(variants[0]) : p.price)}${p.was ? `<s>${money(p.was)}</s>` : ""}</p>
      <p class="cap" style="margin-top:6px">Duties and taxes calculated at checkout</p>

      <div class="pline"></div>

      ${showSwatches ? `
      <p class="eyebrow mb0" style="margin-bottom:14px">Case &amp; strap</p>
      <div class="swatches" role="radiogroup" aria-label="Case and strap finish">
        ${variants.map((v, i) => `
          <button class="sw${v.image ? " sw--img" : ""}${i ? "" : " is-on"}" type="button" role="radio"
                  aria-checked="${i ? "false" : "true"}"
                  data-i="${i}"
                  ${v.image ? "" : `style="${swatchStyle(v.color)}"`}
                  aria-label="Finish ${i + 1} of ${variants.length}, ${esc(swatchLabel(v.color))}">
            ${v.image ? `<img src="${esc(img(v.image))}" alt="" width="60" height="60" loading="lazy">
              <span class="sw__dot" aria-hidden="true" style="${swatchStyle(v.color)}"></span>` : ""}
          </button>`).join("")}
      </div>
      <p class="swname mb0">Finish <span class="swhex" data-sw-hex>${esc(variants[0].color)}</span>${variants[0].sku ? ` <span class="swsku" data-sw-sku>${esc(variants[0].sku)}</span>` : `<span class="swsku" data-sw-sku hidden></span>`}</p>
      <p class="swpos" data-sw-pos>Finish 1 of ${variants.length}</p>
      ` : `
      <p class="eyebrow mb0" style="margin-bottom:8px">Case &amp; strap</p>
      <p class="cap" style="margin-bottom:4px">A single option is recorded for this product.</p>
      `}

      <p class="stock" data-stock><i class="dot"></i> ${(showSwatches ? stockOf(variants[0]) : p.qty) > 0 ? `${showSwatches ? stockOf(variants[0]) : p.qty} in stock &middot; ships within 3 working days` : "Currently unavailable"}</p>

      <div class="purchase-actions">
        <button class="btn btn--primary" type="button" data-add="${p.id}">Add to bag</button>
        <button class="btn btn--buy" type="button" data-buy="${p.id}">Buy now</button>
      </div>
      <p class="cap" style="margin-top:14px">Taxes and delivery are calculated at checkout.</p>

      <div class="pinfo-accordions">
        <div class="acc is-open">
          <button class="acc__hd" type="button" aria-expanded="true">Description <span class="acc__ico">–</span></button>
          <div class="acc__bd">
            <p class="mt0">${esc(cat.cats.find((c) => c.slug === p.cat)?.blurb || "")}</p>
            <p class="cap mb0">Category description. Selldone holds no separate long description for this product.</p>
          </div>
        </div>
        <div class="acc">
          <button class="acc__hd" type="button" aria-expanded="false">Specifications <span class="acc__ico">+</span></button>
          <div class="acc__bd">
            ${rows.length ? `<table class="spectable"><tbody>
              ${rows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}
              <tr><th scope="row">Product ID</th><td>${p.id}</td></tr>
            </tbody></table>` : `<p class="mt0 mb0">No specifications are recorded for REF. ${p.id}.</p>`}
          </div>
        </div>
        <div class="acc">
          <button class="acc__hd" type="button" aria-expanded="false">Shipping &amp; returns <span class="acc__ico">+</span></button>
          <div class="acc__bd"><p class="mt0 mb0">Shipping options appear at checkout. Returns are accepted within 30 days when the product remains eligible under the store policy.</p></div>
        </div>
        <div class="acc" style="border-bottom:1px solid var(--rule)">
          <button class="acc__hd" type="button" aria-expanded="false">Authentication <span class="acc__ico">+</span></button>
          <div class="acc__bd"><p class="mt0 mb0">Opened, timed on six positions, and certified by our workshop before dispatch.</p></div>
        </div>
      </div>
    </div>
  </div>`;

  /* Reviews */
  const rev = document.getElementById("reviews");
  if (rev) rev.innerHTML = ratingBlock(p);

  /* Related */
  const rt = document.getElementById("reltitle");
  if (rt) rt.textContent = others.length ? `More in ${c.name}` : "Explore the catalog";
  const rel = document.getElementById("related");
  const relatedProducts = (others.length ? others : cat.products.filter((x) => x.id !== p.id)).slice(0, 12);
  if (rel) rel.innerHTML = relatedProducts.map(cardHTML).join("");
  const relatedSection = document.querySelector("[data-related-section]");
  if (relatedSection) relatedSection.hidden = relatedProducts.length === 0;

  const relatedViewport = document.querySelector("[data-related-viewport]");
  const relatedControls = document.querySelector("[data-related-controls]");
  const relatedPrev = document.querySelector("[data-related-prev]");
  const relatedNext = document.querySelector("[data-related-next]");
  const updateRelatedControls = () => {
    if (!relatedViewport || !relatedControls) return;
    const max = relatedViewport.scrollWidth - relatedViewport.clientWidth;
    relatedControls.hidden = max < 2;
    if (relatedPrev) relatedPrev.disabled = relatedViewport.scrollLeft < 2;
    if (relatedNext) relatedNext.disabled = relatedViewport.scrollLeft >= max - 2;
  };
  const moveRelated = (direction) => relatedViewport?.scrollBy({ left: direction * relatedViewport.clientWidth * .82, behavior: "smooth" });
  relatedPrev?.addEventListener("click", () => moveRelated(-1));
  relatedNext?.addEventListener("click", () => moveRelated(1));
  relatedViewport?.addEventListener("scroll", updateRelatedControls, { passive: true });
  if (relatedViewport && "ResizeObserver" in window) new ResizeObserver(updateRelatedControls).observe(relatedViewport);
  requestAnimationFrame(updateRelatedControls);

  /* Gallery interaction */
  const main = document.querySelector("#galmain img");
  let current = 0;
  const show = (i) => {
    current = i;
    const g = gallery[i];
    main.src = g.src; main.alt = g.alt;
    root.querySelectorAll(".thumb").forEach((t, n) => t.classList.toggle("is-on", n === i));
  };
  root.querySelectorAll(".thumb").forEach((t) =>
    t.addEventListener("click", () => show(Number(t.dataset.i))));
  document.getElementById("galmain")?.addEventListener("click", () =>
    openLightbox(gallery[current].src, gallery[current].alt));

  /* Swatches — hex label plus a visible ordinal, so colour is never alone.
     Each finish receives one stable gallery image. A real variant image wins
     when it exists in the gallery and is not the default hero; otherwise the
     finishes are distributed across the remaining gallery views. This keeps
     incomplete Selldone variant-image links useful without leaving every
     colour stuck on the same main photograph. */
  const galleryIndexForVariant = (v, variantIndex) => {
    if (v?.image) {
      const want = img(v.image);
      const exact = gallery.findIndex((g) => g.src === want);
      if (exact > 0) return exact;
    }
    if (gallery.length > 1) return 1 + (variantIndex % (gallery.length - 1));
    return 0;
  };
  const variantGalleryIndexes = variants.map(galleryIndexForVariant);
  const showGallery = (i) => {
    if (i < 0 || i >= gallery.length) return;
    current = i;
    const main = root.querySelector("#galmain img");
    if (main) { main.src = gallery[i].src; main.alt = gallery[i].alt; }
    root.querySelectorAll(".thumb").forEach((t) =>
      t.classList.toggle("is-on", Number(t.dataset.i) === i));
  };

  root.querySelectorAll(".sw").forEach((sw) =>
    sw.addEventListener("click", () => {
      root.querySelectorAll(".sw").forEach((x) => { x.classList.remove("is-on"); x.setAttribute("aria-checked", "false"); });
      sw.classList.add("is-on"); sw.setAttribute("aria-checked", "true");
      const i = Number(sw.dataset.i);
      const v = variants[i];
      const hexEl = root.querySelector("[data-sw-hex]");
      const posEl = root.querySelector("[data-sw-pos]");
      const skuEl = root.querySelector("[data-sw-sku]");
      const priceEl = root.querySelector("[data-price]");
      const stockEl = root.querySelector("[data-stock]");
      if (hexEl) hexEl.textContent = v.color;
      if (posEl) posEl.textContent = `Finish ${i + 1} of ${variants.length}`;
      if (skuEl) { skuEl.textContent = v.sku || ""; skuEl.hidden = !v.sku; }
      if (priceEl) priceEl.innerHTML = `${money(priceOf(v))}${p.was ? `<s>${money(p.was)}</s>` : ""}`;
      if (stockEl) {
        const q = stockOf(v);
        stockEl.innerHTML = `<i class="dot"></i> ${q > 0 ? `${q} in stock &middot; ships within 3 working days` : "Currently unavailable"}`;
      }
      showGallery(variantGalleryIndexes[i]);
    }));

  initAcc(root);

  /* Add to bag */
  root.querySelector("[data-add]")?.addEventListener("click", (e) => {
    addToBag(Number(e.currentTarget.dataset.add), 1);
    document.querySelector('[data-open="cart"]')?.click();
  });
  root.querySelector("[data-buy]")?.addEventListener("click", (e) => {
    addToBag(Number(e.currentTarget.dataset.buy), 1);
    location.href = "checkout.html";
  });

  /* Mobile sticky buy bar */
  const bar = document.querySelector(".buybar");
  if (bar) {
    bar.querySelector(".price").innerHTML = `${money(p.price)}${p.was ? `<s>${money(p.was)}</s>` : ""}`;
    bar.querySelector(".cap").textContent = p.qty > 0 ? `${p.qty} in stock` : "Unavailable";
    bar.querySelector("button").addEventListener("click", () => {
      addToBag(p.id, 1);
      document.querySelector('[data-open="cart"]')?.click();
    });
    const gal = root.querySelector(".gal");
    if (gal) {
      const sync = () => bar.classList.toggle("is-on", gal.getBoundingClientRect().bottom < 0);
      new IntersectionObserver(([en]) => bar.classList.toggle("is-on", !en.isIntersecting), { threshold: 0 }).observe(gal);
      /* Scroll fallback: the observer does not fire in environments where
         rendering updates are suspended, and the bar is the only way to buy
         on mobile. */
      addEventListener("scroll", sync, { passive: true });
      sync();
    }
  }
}

document.addEventListener("catalog:ready", async () => initPDP(await loadCatalog()));

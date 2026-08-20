/* Homex — shop listing.
   Ported from design-reference/shop.html + initShop(), extended with the
   brand filter. All data live from XAPI. */

import { loadCatalog, money, catOf, variantColors } from "./shop-data.js";
import { cardHTML, esc } from "./app.js";
import { furnitureNavigation } from "./shop-config.js";

const lg = Math.log10;

/* Paging. The filters always run over the WHOLE catalogue; only how much of the
   result is painted is paged. Unpaged, the mobile listing ran past 30,000px,
   which is roughly forty screens of scrolling to reach the footer —
   and the footer now carries seven real destinations. Deliberately a button and
   not infinite scroll, which would take the footer away entirely. */
const PAGE = 24;

function initShop(cat) {
  const grid = document.getElementById("pgrid");
  const more = document.querySelector("[data-more]");
  const moreBtn = document.querySelector("[data-more-btn]");
  const moreCap = document.querySelector("[data-more-cap]");
  let shown = PAGE;
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  const presetCat = params.get("cat");
  const presetBrand = params.get("brand");
  const furnitureView = params.get("view") === "furniture" && !presetCat;
  const furniture = furnitureNavigation(cat.cfg);
  const excludedFurnitureCategories = new Set(furniture.excludeCategories);
  const viewCategories = furnitureView
    ? cat.cats.filter((category) => !excludedFurnitureCategories.has(category.slug))
    : cat.cats;
  const viewCategorySlugs = new Set(viewCategories.map((category) => category.slug));
  const viewProducts = furnitureView
    ? cat.products.filter((product) => viewCategorySlugs.has(product.cat))
    : cat.products;

  const chips = document.getElementById("category-chips");
  const activeCategory = cat.cats.find((category) => category.slug === presetCat);
  const chipCategories = (activeCategory
    ? [activeCategory, ...viewCategories.filter((category) => category.slug !== presetCat)]
    : viewCategories).slice(0, 8);
  if (chips) chips.innerHTML = [
    ...(presetCat ? [] : [furnitureView
      ? `<a href="shop.html?view=furniture" aria-current="page">${esc(furniture.title)}</a>`
      : `<a href="shop.html" aria-current="page">All products</a>`]),
    ...chipCategories.map((c) => `<a href="shop.html?cat=${encodeURIComponent(c.slug)}"${presetCat === c.slug ? ' aria-current="page"' : ""}>${esc(c.name)}</a>`),
  ].join("");

  /* ---- Filter 1: collection ---- */
  const catBox = document.getElementById("catfilters");
  catBox.innerHTML = viewCategories.map((c) => `
    <label class="check">
      <input type="checkbox" value="${c.slug}"${presetCat === c.slug ? " checked" : ""}>
      ${esc(c.name)}<span class="cap">${c.count}</span>
    </label>`).join("");

  /* ---- Filter 4: brand ---- */
  const brandBox = document.getElementById("brandfilters");
  const viewBrands = cat.brands
    .map((brand) => ({ ...brand, count: viewProducts.filter((product) => product.brand === brand.name).length }))
    .filter((brand) => brand.count > 0);
  brandBox.innerHTML = viewBrands.map((b) => `
    <label class="check">
      <input type="checkbox" value="${esc(b.name)}"${presetBrand === b.name ? " checked" : ""}>
      ${esc(b.name)}<span class="cap">${b.count}</span>
    </label>`).join("");

  const colorBox = document.getElementById("colorfilters");
  const colorCounts = new Map();
  viewProducts.forEach((product) => variantColors(product.raw).forEach((color) => {
    String(color).split("/").forEach((value) => colorCounts.set(value, (colorCounts.get(value) || 0) + 1));
  }));
  const colors = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (colorBox) colorBox.innerHTML = colors.map(([color, total]) => `<label class="check check--color"><input type="checkbox" value="${esc(color)}"><i style="background:${esc(color)}" aria-hidden="true"></i><span>${esc(color)}</span><span class="cap">${total}</span></label>`).join("");
  const locationBox = document.getElementById("locationfilters");

  document.querySelectorAll(".filters .fgroup").forEach((group, index) => {
    const heading = group.querySelector(":scope > h4");
    if (!heading) return;
    const body = [...group.children].filter((child) => child !== heading);
    const id = `filter-panel-${index}`;
    body.forEach((child) => child.classList.add("filter-panel-part"));
    heading.innerHTML = `<button type="button" aria-expanded="${index === 1 ? "true" : "false"}" aria-controls="${id}"><span>${heading.textContent}</span><i aria-hidden="true">${index === 1 ? "−" : "+"}</i></button>`;
    group.id = id;
    group.classList.toggle("is-open", index === 1);
    heading.querySelector("button")?.addEventListener("click", (event) => {
      const open = group.classList.toggle("is-open");
      event.currentTarget.setAttribute("aria-expanded", String(open));
      event.currentTarget.querySelector("i").textContent = open ? "−" : "+";
    });
  });

  /* ---- Filter 2: price, logarithmic ----
     most references sit in the lower decade against a six-figure ceiling. On a
     linear track they occupy the first eighth and the control is unusable. */
  const viewPrices = viewProducts.map((product) => product.price).filter((price) => Number(price) > 0);
  const LO = Math.max(viewPrices.length ? Math.min(...viewPrices) : cat.lo, 0.01);
  const HI = Math.max(viewPrices.length ? Math.max(...viewPrices) : cat.hi, LO);
  const span = lg(HI) - lg(LO);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const toVal = (pos) => span === 0 ? LO : Math.pow(10, lg(LO) + (Number(pos) / 100) * span);
  const toPos = (value) => span === 0 ? 0 : ((lg(clamp(value, LO, HI)) - lg(LO)) / span) * 100;

  const lo = document.getElementById("plo");
  const hi = document.getElementById("phi");
  const out = document.getElementById("pout");
  const outLo = document.getElementById("poutlo");
  const outHi = document.getElementById("pouthi");
  const manualLo = document.getElementById("pmin");
  const manualHi = document.getElementById("pmax");
  const rangeBox = document.getElementById("price-range");
  const sort = document.getElementById("sort");
  const stock = document.getElementById("instock");
  const count = document.getElementById("count");
  const title = document.getElementById("listtitle");
  const intro = document.getElementById("listintro");
  const crumbTitle = document.getElementById("crumbtitle");

  [manualLo, manualHi].forEach((field) => {
    field.min = String(Math.floor(LO));
    field.max = String(Math.ceil(HI));
  });

  function paintPrice(syncFields = true) {
    const a = toVal(lo.value), b = toVal(hi.value);
    const minPrice = Math.floor(a), maxPrice = Math.ceil(b);
    const minText = money(minPrice), maxText = money(maxPrice);
    rangeBox.style.setProperty("--range-start", `${lo.value}%`);
    rangeBox.style.setProperty("--range-end", `${hi.value}%`);
    outLo.textContent = minText;
    outHi.textContent = maxText;
    out.textContent = `Price from ${minText} to ${maxText}`;
    lo.setAttribute("aria-valuetext", minText);
    hi.setAttribute("aria-valuetext", maxText);
    lo.style.zIndex = Number(lo.value) > 88 ? "4" : "3";
    hi.style.zIndex = Number(hi.value) < 12 ? "4" : "3";
    if (syncFields) {
      manualLo.value = String(minPrice);
      manualHi.value = String(maxPrice);
      manualLo.closest(".price-field")?.classList.remove("is-invalid");
      manualHi.closest(".price-field")?.classList.remove("is-invalid");
    }
    return { a, b };
  }

  function render({ syncPriceFields = true } = {}) {
    const picked = [...catBox.querySelectorAll("input:checked")].map((i) => i.value);
    const brands = [...brandBox.querySelectorAll("input:checked")].map((i) => i.value);
    const selectedColors = colorBox ? [...colorBox.querySelectorAll("input:checked")].map((i) => i.value) : [];
    const locations = locationBox ? [...locationBox.querySelectorAll("input:checked")].map((i) => i.value) : [];
    const { a, b } = paintPrice(syncPriceFields);
    const atFloor = Number(lo.value) === 0, atCeil = Number(hi.value) === 100;

    const list = viewProducts.filter((p) =>
      (!picked.length || picked.includes(p.cat)) &&
      (!brands.length || brands.includes(p.brand)) &&
      (!selectedColors.length || variantColors(p.raw).some((color) => String(color).split("/").some((value) => selectedColors.includes(value)))) &&
      (!locations.length || locations.includes(/outdoor/i.test(`${p.name} ${p.cat}`) ? "outdoor" : "indoor")) &&
      (atFloor || p.price >= a) && (atCeil || p.price <= b) &&
      (!stock.checked || p.qty > 0));

    if (sort.value === "low") list.sort((x, y) => x.price - y.price);
    if (sort.value === "high") list.sort((x, y) => y.price - x.price);
    if (sort.value === "new") list.sort((x, y) =>
      String(y.raw.created_at || "").localeCompare(String(x.raw.created_at || "")) || y.id - x.id);

    const one = picked.length === 1 ? catOf(cat, picked[0]) : null;
    const pageName = one ? one.name : furnitureView ? furniture.title : "All products";
    title.textContent = pageName;
    if (crumbTitle) crumbTitle.textContent = one ? one.name : furnitureView ? furniture.title : "Products";
    if (intro) intro.textContent = one ? one.blurb
      : furnitureView
        ? `${viewProducts.length} furniture products across ${viewCategories.length} categories.`
        : `${cat.products.length} products across ${cat.cats.length} categories.`;
    count.textContent = `${list.length} ${list.length === 1 ? "product" : "products"}`;
    if (shown > list.length) shown = Math.max(PAGE, Math.ceil(list.length / PAGE) * PAGE);
    document.title = `${pageName} — Homex`;

    if (list.length) {
      const page = list.slice(0, shown);
      grid.className = "pgrid";
      grid.innerHTML = page.map(cardHTML).join("");
      more.hidden = page.length >= list.length;
      if (!more.hidden) {
        const left = list.length - page.length;
        moreBtn.textContent = `Load more (${left} remaining)`;
        moreCap.textContent = `Showing ${page.length} of ${list.length}`;
      }
    } else {
      more.hidden = true;
      /* Never a blank page: offer three real references either side of the band. */
      const near = [...viewProducts]
        .sort((x, y) => Math.abs(x.price - (a + b) / 2) - Math.abs(y.price - (a + b) / 2))
        .slice(0, 3);
      grid.className = "";
      grid.innerHTML = `<div class="empty">
        <p class="h3" style="margin-bottom:8px">Nothing in this range</p>
        <p class="cap" style="margin-bottom:28px">Widen the price band or clear a filter. These sit closest to what you asked for.</p>
        <div class="pgrid" style="text-align:left">${near.map(cardHTML).join("")}</div>
      </div>`;
    }
  }

  /* Any filter change resets paging: staying on page 3 of a set the reader just
     narrowed would hide results they had asked to see. */
  const reset = () => { shown = PAGE; render(); };
  const onSliderInput = (event) => {
    if (event.target === lo && Number(lo.value) > Number(hi.value)) lo.value = hi.value;
    if (event.target === hi && Number(hi.value) < Number(lo.value)) hi.value = lo.value;
    reset();
  };
  [lo, hi].forEach((el) => el.addEventListener("input", onSliderInput));
  [sort, stock].forEach((el) => el.addEventListener("input", reset));

  const applyManual = (field, slider, isMinimum, commit = false) => {
    if (field.value.trim() === "") {
      field.closest(".price-field")?.classList.toggle("is-invalid", !commit);
      if (commit) paintPrice(true);
      return;
    }
    let value = Number(field.value);
    const other = toVal(isMinimum ? hi.value : lo.value);
    const floor = isMinimum ? LO : other;
    const ceiling = isMinimum ? other : HI;
    const valid = Number.isFinite(value) && value >= floor && value <= ceiling;
    field.closest(".price-field")?.classList.toggle("is-invalid", !valid);
    if (!valid && !commit) return;
    value = clamp(Number.isFinite(value) ? value : (isMinimum ? LO : HI), floor, ceiling);
    slider.value = String(toPos(value));
    shown = PAGE;
    render({ syncPriceFields: commit });
  };
  manualLo.addEventListener("input", () => applyManual(manualLo, lo, true));
  manualHi.addEventListener("input", () => applyManual(manualHi, hi, false));
  manualLo.addEventListener("change", () => applyManual(manualLo, lo, true, true));
  manualHi.addEventListener("change", () => applyManual(manualHi, hi, false, true));

  rangeBox.addEventListener("click", (event) => {
    if (event.target.closest(".dual-range__input")) return;
    const rect = rangeBox.getBoundingClientRect();
    const pos = clamp(((event.clientX - rect.left - 8) / Math.max(1, rect.width - 16)) * 100, 0, 100);
    const slider = Math.abs(pos - Number(lo.value)) <= Math.abs(pos - Number(hi.value)) ? lo : hi;
    slider.value = String(pos);
    onSliderInput({ target: slider });
    slider.focus();
  });
  moreBtn.addEventListener("click", () => {
    const before = grid.querySelectorAll(".pcard").length;
    shown += PAGE;
    render();
    // Move focus to the first newly-revealed card so the keyboard does not jump
    // back to the top of the listing.
    grid.querySelectorAll(".pcard")[before]?.focus();
  });
  catBox.addEventListener("change", reset);
  brandBox.addEventListener("change", reset);
  colorBox?.addEventListener("change", reset);
  locationBox?.addEventListener("change", reset);
  document.getElementById("clear")?.addEventListener("click", () => {
    catBox.querySelectorAll("input").forEach((i) => (i.checked = false));
    brandBox.querySelectorAll("input").forEach((i) => (i.checked = false));
    colorBox?.querySelectorAll("input").forEach((i) => (i.checked = false));
    locationBox?.querySelectorAll("input").forEach((i) => (i.checked = false));
    lo.value = 0; hi.value = 100; stock.checked = false; sort.value = "new";
    render();
  });

  render();
}

document.addEventListener("catalog:ready", async () => initShop(await loadCatalog()));

/* Homex storefront UI — live Selldone data inside an original editorial shell. */

import {
  loadCatalog, money, img, catOf, byId,
  swatchStyle, swatchLabel, isComposite,
  readBag, addToBag, removeFromBag, bagCount, bagLines, bagSubtotal,
  subscribe, loadOrders,
} from "./shop-data.js";
import { storefrontAuth } from "../shared/auth-client.js";
import { shopConfig, isUnconfigured } from "./shop-config.js";

let CAT = null;

/* ---------- Shared storefront chrome ----------
   Every public page uses one header and footer contract. Older standalone
   pages still carry their reusable template markup as a no-JS fallback; this
   replacement runs before any header behavior is wired, so the live interface
   is identical everywhere and future chrome changes have one source. */
const SHARED_HEADER_HTML = `<header class="hdr homex-header">
  <div class="topbar"><span class="topbar__long" data-announce-long>Complimentary delivery on selected pieces · Secure checkout · Thoughtful design guides</span><span class="topbar__short" data-announce-short>Selected delivery included · Secure checkout</span></div>
  <div class="wrap hdr__in homex-head-main">
    <button class="burger mobonly" type="button" data-open="nav" aria-label="Open menu"><span></span></button>
    <a class="logo homex-logo" href="index.html" aria-label="Homex home">homex<span>.</span></a>
    <button class="header-search" type="button" data-open="search" aria-label="Search products"><span>What can we help you find?</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg></button>
    <div class="hdr__tools">
      <div class="hdr__act">
        <button class="iconbtn" type="button" data-open="account" aria-label="Account"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg><span class="homex-action-label">Account</span></button>
        <button class="iconbtn" type="button" data-open="cart" aria-label="Open bag, 0 items"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><span class="homex-action-label">Cart</span><span class="cartdot" data-cart-count hidden>0</span></button>
      </div>
    </div>
  </div>
  <div class="homex-navrow homex-navrow"><div class="wrap"><nav class="nav header-nav" aria-label="Main"><a href="shop.html"><b>Furniture</b></a><a href="shop.html?cat=sofa-bed">Living</a><a href="shop.html?cat=dining-table">Dining</a><a href="shop.html?cat=beds">Bedroom</a><a href="shop.html?cat=office-tables">Office</a><a href="shop.html?cat=home-decor">Decor</a><a href="/blog">Journal</a></nav><div class="mega"><div class="mega__grid" id="megagrid"></div></div></div></div>
</header>`;

const SOCIAL_ICONS = `<div class="ft__socials" aria-label="Social media"><a href="https://www.instagram.com/" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.5" cy="6.5" r="1" class="fill"/></svg></a><a href="https://twitter.com/" rel="noopener" aria-label="Twitter"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg></a><a href="https://www.facebook.com/" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 20v-7h2.5l.4-3H14V8.2c0-.9.3-1.7 1.8-1.7H17V4.2c-.5-.1-1.4-.2-2.4-.2-2.5 0-4.2 1.5-4.2 4.3V10H8v3h2.4v7"/></svg></a><a href="https://www.tiktok.com/" rel="noopener" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v10.3a4 4 0 1 1-3-3.9"/><path d="M14 4c.4 2.4 1.8 3.8 4 4"/></svg></a></div>`;

const SHARED_FOOTER_HTML = `<footer class="ft homex-footer"><div class="wrap"><div class="ft__cols"><section class="ft__col"><h4>Customer Service</h4><ul><li><a href="/contact-us">Contact Information</a></li><li><a href="/terms#returns">Refund Policy</a></li><li><a href="/terms#delivery">Shipping Policy</a></li><li><a href="/terms">Terms of Service</a></li><li><a href="/privacy">Privacy Policy</a></li></ul></section><section class="ft__col"><h4>About Us</h4><ul><li><a href="/about-us">About Homex</a></li><li><a href="/blog">Journal</a></li><li><button class="ft__link" type="button" data-open="search">Search</button></li></ul></section><section class="ft__col ft__newsletter"><h4>Sign up to our Newsletter</h4><p>Be the first to know about new collections, room ideas, and offers.</p><div class="sub"><label class="sr" for="footer-email">Email address</label><input id="footer-email" type="email" placeholder="Email address"/><button type="button">Subscribe</button></div></section></div><div class="ft__bottom"><div class="ft__commerce">${SOCIAL_ICONS}<div class="ft__payments" aria-label="Accepted payment methods"><span>AMEX</span><span>Apple Pay</span><span>Diners</span><span>Discover</span><span>G Pay</span><span class="ft__mc" aria-label="Mastercard"><i></i><i></i></span><span>PayPal</span><span>Shop</span><span>VISA</span></div></div><p class="ft__copyright">© 2026 Homex. All Rights Reserved.</p><a class="ft__follow" href="https://homex.selldone.shop/" rel="noopener">♡ Follow Homex</a></div></div></footer>`;

const SHARED_OVERLAYS_HTML = `<div class="drawer ink" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true"><div class="drawer__top"><span class="eyebrow">Menu</span><button class="xbtn" type="button" data-close>Close</button></div><nav data-drawer-nav aria-label="Mobile"></nav></div>
<aside class="cart" role="dialog" aria-modal="true" aria-label="Shopping bag" aria-hidden="true"><div class="cart__hd"><span class="eyebrow mb0" data-cart-label>Your bag · 0</span><button class="xbtn" type="button" data-close>Close</button></div><div class="cart__body" data-cart-body></div><div class="cart__ft" data-cart-foot hidden><div class="sum__tot"><span class="eyebrow mb0">Subtotal</span><span class="price" data-cart-total>$0</span></div><a class="btn btn--full" href="checkout.html">Checkout</a><p class="cap center">Taxes and delivery are calculated at checkout.</p></div></aside>
<aside class="sheet sheet--search" role="dialog" aria-modal="true" aria-label="Search products" aria-hidden="true"><div class="sheet__hd"><span class="eyebrow mb0">Search Homex</span><button class="xbtn" type="button" data-close>Close</button></div><div class="sheet__pad"><label class="sr" for="q">Search products</label><input id="q" type="search" autocomplete="off" placeholder="Product, category, or material" data-search-input data-autofocus /><p class="cap" data-search-count></p></div><div class="sheet__body" data-search-results></div></aside>
<aside class="sheet sheet--account" role="dialog" aria-modal="true" aria-label="Account" aria-hidden="true"><div class="sheet__hd"><span class="eyebrow mb0">Account</span><button class="xbtn" type="button" data-close>Close</button></div><div class="sheet__body" data-account-body></div></aside>
<div class="scrim"></div>`;

function initSharedChrome() {
  document.querySelectorAll(".rail").forEach((rail) => rail.remove());
  document.querySelector(".page")?.classList.add("homex-page");

  const header = document.querySelector("header.hdr,header.cohdr");
  if (header) header.outerHTML = SHARED_HEADER_HTML;

  const footer = document.querySelector("footer.ft");
  if (footer) footer.outerHTML = SHARED_FOOTER_HTML;

  if (!document.querySelector(".drawer")) {
    document.body.insertAdjacentHTML("beforeend", SHARED_OVERLAYS_HTML);
  }
}

/* ---------- Shared card ---------- */
export function productTags(p) {
  return (Array.isArray(p.raw?.tags) ? p.raw.tags : String(p.raw?.tags || "").split(","))
    .map((tag) => String(tag).trim().toLowerCase().replace(/[_-]+/g, " "))
    .filter(Boolean);
}

export function cardHTML(p) {
  const tags = productTags(p);
  const badge = tags.includes("trending") ? "Trending" : tags.includes("best seller") ? "Best seller" : "";
  return `<a class="pcard" href="product.html?id=${p.id}" data-product-id="${p.id}" data-product-tags="${esc(tags.join(","))}">
    <div class="pcard__art">
      ${badge ? `<span class="pcard__badge">${badge}</span>` : ""}
      <img src="${p.image}" alt="${esc(p.name)}" loading="lazy" width="500" height="500">
    </div>
    <p class="eyebrow" style="margin-bottom:6px">${esc(p.catName)}</p>
    <span class="pcard__name">${esc(p.name)}</span>
    <p class="price mb0">${p.range?.varies ? `<span class="price__from">from</span> ${money(p.range.from)}` : money(p.price)}</p>
  </a>`;
}

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Template banner ----------
   Fires on "still the template OR no shop id at all" — never on a specific
   shop id. The storefront has no fallback shop any more, so an empty config
   produces an empty catalogue rather than someone else's; either way the
   operator needs telling, loudly, before they show it to a customer.

   Amber, the same #E0A800 on #FFF8E1 as the demo-content banner and the
   sign-in callout: one amber across the site means one category of message —
   this is scaffolding, not the shop speaking. Above everything, including the
   platform credit, because it is the most important thing on the page until
   it goes away. */
async function initTemplateBanner() {
  const cfg = await shopConfig();
  if (!isUnconfigured(cfg)) return;
  const name = cfg.shop?.name || "the demonstration";
  const el = document.createElement("div");
  el.className = "tplbanner";
  el.setAttribute("role", "status");
  el.innerHTML = `<p class="tplbanner__in">
    <b>These are sample products from the ${esc(name)} demonstration shop, not yours.</b>
    <span>Ask your agent to add your products to make this site your own.</span>
  </p>`;
  document.body.insertBefore(el, document.body.firstChild);
}

/* ---------- Brand copy ----------
   Founding year, cities, tagline and the announcement line all come from the
   config. Where the shop has no equivalent the element is REMOVED, not filled
   with a placeholder: an empty rail label is invisible, whereas "EST. ----"
   is a lie with a hyphen in it. */
async function fillBrandCopy() {
  const cfg = await shopConfig();
  const b = cfg.brand || {};

  const set = (sel, text) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (text) el.textContent = text;
      else el.remove();
    });
  };

  set("[data-brand-est]", b.foundedYear ? `EST. ${b.foundedYear}` : "");
  set("[data-announce-long]", b.announcement || "");
  set("[data-announce-short]", b.announcementShort || b.announcement || "");

  // Tagline and cities are two sentences; either can be absent on its own.
  const line = [b.tagline, b.cities ? `${b.cities}.` : ""].filter(Boolean).join(" ");
  set("[data-brand-tagline]", line);

  // Checkout's hand-delivery line names the cities where it is offered. With
  // no cities configured it stays "By appointment" rather than naming nowhere.
  document.querySelectorAll("[data-brand-cities-line]").forEach((el) => {
    el.textContent = b.cities ? `By appointment, ${b.cities} only` : "By appointment";
  });
}

/* ---------- Theme picker ---------- */
const HOMEX_THEMES = [
  { id: "blue", name: "Ocean", description: "Deep blue and bright red", swatch: "#005BD4" },
  { id: "violet", name: "Violet", description: "Electric purple and pink", swatch: "#6D28D9" },
  { id: "emerald", name: "Emerald", description: "Modern green and orange", swatch: "#047857" },
  { id: "amber", name: "Amber", description: "Warm ochre and clear blue", swatch: "#B45309" },
  { id: "rose", name: "Rose", description: "Deep rose and muted teal", swatch: "#BE123C" },
];

function initThemePicker() {
  const storageKey = "homex_theme_v1";
  const themeIds = new Set(HOMEX_THEMES.map(({ id }) => id));
  let activeTheme = "blue";

  try {
    const savedTheme = localStorage.getItem(storageKey);
    if (themeIds.has(savedTheme)) activeTheme = savedTheme;
  } catch {
    // Storage can be unavailable in private or hardened browser contexts.
  }

  const applyTheme = (theme, persist = true) => {
    const nextTheme = themeIds.has(theme) ? theme : "blue";
    const themeDetails = HOMEX_THEMES.find(({ id }) => id === nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.querySelectorAll("[data-theme-option]").forEach((button) => {
      button.setAttribute("aria-checked", String(button.dataset.themeOption === nextTheme));
    });
    document.querySelectorAll("[data-theme-current]").forEach((label) => {
      label.textContent = themeDetails.name;
    });
    document.querySelectorAll("[data-theme-trigger]").forEach((trigger) => {
      trigger.style.setProperty("--swatch", themeDetails.swatch);
    });
    if (persist) {
      try { localStorage.setItem(storageKey, nextTheme); } catch { /* no-op */ }
    }
  };

  document.querySelectorAll(".sdbar__in").forEach((bar) => {
    if (bar.querySelector("[data-theme-picker]")) return;
    const picker = document.createElement("span");
    picker.className = "theme-picker";
    picker.dataset.themePicker = "";
    picker.innerHTML = `<button class="theme-picker__trigger" type="button" data-theme-trigger aria-haspopup="menu" aria-expanded="false">
      <span class="theme-picker__swatch" aria-hidden="true"></span>
      <span data-theme-current>Ocean</span>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
    </button>
    <span class="theme-picker__menu" data-theme-menu role="menu" aria-label="Colour theme" hidden>
      <span class="theme-picker__title">Colour theme</span>
      ${HOMEX_THEMES.map(({ id, name, description, swatch }) =>
        `<button class="theme-picker__item" type="button" role="menuitemradio" data-theme-option="${id}" aria-checked="false" style="--swatch:${swatch}">
          <span class="theme-picker__swatch" aria-hidden="true"></span>
          <span><strong>${name}</strong><small>${description}</small></span>
          <span class="theme-picker__check" aria-hidden="true">✓</span>
        </button>`
      ).join("")}
    </span>`;
    const trigger = picker.querySelector("[data-theme-trigger]");
    const menu = picker.querySelector("[data-theme-menu]");
    const closeMenu = (restoreFocus = false) => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    };
    trigger.addEventListener("click", () => {
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      trigger.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) menu.querySelector('[aria-checked="true"]')?.focus();
    });
    picker.addEventListener("click", (event) => {
      const option = event.target.closest("[data-theme-option]");
      if (option) {
        applyTheme(option.dataset.themeOption);
        closeMenu(true);
      }
    });
    document.addEventListener("click", (event) => {
      if (!picker.contains(event.target)) closeMenu();
    });
    picker.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) {
        event.preventDefault();
        closeMenu(true);
      }
    });
    bar.append(picker);
  });

  applyTheme(activeTheme, false);
}

/* ---------- Header, rail, drawers ---------- */
function initHeader() {
  const hdr = document.querySelector(".hdr");
  if (hdr) {
    const s = () => hdr.classList.toggle("is-stuck", scrollY > 120);
    s();
    addEventListener("scroll", s, { passive: true });
  }

  const scrim = document.querySelector(".scrim");
  let lastFocus = null;

  const open = (el) => {
    if (!el) return;
    lastFocus = document.activeElement;
    el.classList.add("is-open");
    scrim?.classList.add("is-on");
    document.documentElement.classList.add("is-locked");
    el.setAttribute("aria-hidden", "false");
    // The first focusable in a panel is its Close button. Where the panel has a
    // field that is the point of opening it, send focus there instead.
    (el.querySelector("[data-autofocus]") || focusables(el)[0])?.focus();
  };
  const closeAll = () => {
    let had = false;
    document.querySelectorAll(".drawer,.cart,.filters,.sheet").forEach((e) => {
      if (e.classList.contains("is-open")) had = true;
      e.classList.remove("is-open");
      if (!e.classList.contains("filters")) e.setAttribute("aria-hidden", "true");
    });
    scrim?.classList.remove("is-on");
    if (!document.querySelector(".lbox.is-open")) document.documentElement.classList.remove("is-locked");
    if (had && lastFocus) { lastFocus.focus(); lastFocus = null; }
  };

  document.querySelector('[data-open="nav"]')?.addEventListener("click", () => open(document.querySelector(".drawer")));
  document.querySelector('[data-open="cart"]')?.addEventListener("click", () => open(document.querySelector(".cart")));
  document.querySelector('[data-open="filters"]')?.addEventListener("click", () => open(document.querySelector(".filters")));
  document.querySelectorAll('[data-open="search"]').forEach((button) =>
    button.addEventListener("click", () => open(document.querySelector(".sheet--search"))));
  document.querySelector('[data-open="account"]')?.addEventListener("click", () => {
    open(document.querySelector(".sheet--account"));
    renderAccount();   // refetches, so a session that expired while the tab sat open shows as signed out
  });
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeAll));
  scrim?.addEventListener("click", closeAll);

  addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeAll(); closeLightbox(); return; }
    if (e.key !== "Tab") return;
    const panel = document.querySelector(".drawer.is-open,.cart.is-open,.lbox.is-open,.sheet.is-open");
    if (!panel) return;
    trapTab(e, panel);
  });

  /* Dev affordance: ?open=nav|cart opens a drawer directly so a panel state can
     be captured without a click. */
  const want = new URLSearchParams(location.search).get("open");
  if (want === "nav") open(document.querySelector(".drawer"));
  if (want === "cart") open(document.querySelector(".cart"));
}

const focusables = (root) =>
  [...root.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter((el) => el.offsetParent !== null || el === document.activeElement);

function trapTab(e, panel) {
  const f = focusables(panel);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function initRail() {
  const m = document.querySelector(".rail__marker"), t = document.querySelector(".rail__ticks");
  if (!m || !t) return;
  const move = () => {
    const max = document.body.scrollHeight - innerHeight;
    m.style.top = ((max > 0 ? Math.min(1, scrollY / max) : 0) * (t.clientHeight - 2)) + "px";
  };
  move();
  addEventListener("scroll", move, { passive: true });
  addEventListener("resize", move);
}

function initReveal() {
  const els = [...document.querySelectorAll(".reveal")];
  if (!els.length) return;
  // No observer support: leave everything visible, skip the animation entirely.
  if (!("IntersectionObserver" in window)) return;

  // Arm the animation. Everything above was rendered opaque, so reaching this
  // line is what opts the page into hiding-then-revealing.
  document.documentElement.classList.add("js-reveal");
  // Same synchronous task: anything already on screen is marked revealed before
  // the browser paints, so nothing that was visible flashes out.
  els.forEach((e) => {
    if (e.getBoundingClientRect().top < innerHeight) e.classList.add("is-in");
  });

  const io = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
    { rootMargin: "0px 0px -8% 0px" }
  );
  els.forEach((e) => io.observe(e));
}

export function initAcc(root = document) {
  root.querySelectorAll(".acc__hd").forEach((h) => {
    if (h.dataset.wired) return;
    h.dataset.wired = "1";
    h.addEventListener("click", () => {
      const a = h.closest(".acc"), open = a.classList.toggle("is-open");
      h.setAttribute("aria-expanded", String(open));
      h.querySelector(".acc__ico").textContent = open ? "–" : "+";
    });
  });
}

/* ---------- Mega menu + footer collections ---------- */
function fillNav() {
  const mega = document.getElementById("megagrid");
  if (mega) {
    const bySlug = new Map(CAT.cats.map((category) => [category.slug, category]));
    const groups = [
      ["Living room", ["sofa-bed", "chairs", "coffee-tables", "home-and-living"]],
      ["Dining room", ["dining-table", "chairs", "cabinets"]],
      ["Bedroom", ["beds", "drawers", "vanity-desks"]],
      ["Office", ["office-tables", "office-chairs", "gaming-chairs"]],
      ["Finishing touches", ["home-decor", "rugs", "lighting"]],
    ];
    mega.innerHTML = groups.map(([title, slugs]) => `<section class="mega__group"><h3>${title}</h3>${slugs.map((slug) => bySlug.get(slug)).filter(Boolean).map((category) => `<a href="shop.html?cat=${category.slug}">${esc(category.name)}<small>${category.count}</small></a>`).join("")}</section>`).join("") +
      `<a class="mega__feature" href="shop.html?cat=chairs"><img src="assets/homex/living-editorial.webp" alt="Warm contemporary living room" width="1536" height="1024"><b>Living, considered</b></a>`;
  }

  document.querySelectorAll("[data-collections]").forEach((ul) => {
    ul.innerHTML = CAT.cats.slice(0, 6).map((c) =>
      `<li><a href="shop.html?cat=${c.slug}">${esc(c.name)}</a></li>`).join("") +
      `<li><a href="shop.html"><b>View all categories</b></a></li>`;
  });

  document.querySelectorAll("[data-drawer-nav]").forEach((nav) => {
    nav.innerHTML =
      `<a href="shop.html">View all categories<small>${CAT.cats.length} categories · ${CAT.products.length} products</small></a>` +
      CAT.cats.map((c) =>
        `<a href="shop.html?cat=${c.slug}">${esc(c.name)}<small>${c.count} products · from ${money(c.from)}</small></a>`).join("") +
      `<a href="/contact-us">Customer support</a>`;
  });
}

/* ---------- Bag drawer ---------- */
function renderBag() {
  const n = bagCount();
  document.querySelectorAll("[data-cart-count]").forEach((e) => {
    e.textContent = String(n);
    e.hidden = n === 0;
  });
  document.querySelectorAll("[data-cart-label]").forEach((e) => {
    e.textContent = `Your bag · ${n}`;
  });
  const btn = document.querySelector('[data-open="cart"]');
  if (btn) btn.setAttribute("aria-label", n === 1 ? "Open bag, 1 item" : `Open bag, ${n} items`);

  const body = document.querySelector("[data-cart-body]");
  const foot = document.querySelector("[data-cart-foot]");
  if (!body) return;

  const lines = bagLines(CAT);
  if (!lines.length) {
    body.innerHTML = `<div style="padding:48px 0;text-align:center">
      <p class="h3" style="margin-bottom:8px">Your bag is empty</p>
      <p class="cap" style="margin-bottom:24px">Nothing selected yet.</p>
      <a class="btn btn--line" href="shop.html">Browse products</a></div>`;
    if (foot) foot.hidden = true;
    return;
  }
  if (foot) foot.hidden = false;

  body.innerHTML = lines.map((r) => `
    <div class="cart__row">
      <img src="${r.p.image}" alt="${esc(r.p.name)}" width="64" height="64" loading="lazy">
      <div>
        <b style="font-weight:500;font-size:14px">${esc(r.p.name)}</b>
        <p class="ref mb0" style="margin-top:4px">REF. ${r.p.id} · Qty ${r.qty}</p>
        <button class="cap" data-remove="${r.p.id}" style="margin-top:8px;text-decoration:underline;min-height:44px">Remove</button>
      </div>
      <span class="price">${money(r.p.price * r.qty)}</span>
    </div>`).join("");

  const tot = document.querySelector("[data-cart-total]");
  if (tot) tot.textContent = money(bagSubtotal(CAT));

  body.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => removeFromBag(b.dataset.remove)));
}

/* ---------- Gallery lightbox ---------- */
export function openLightbox(src, cap) {
  let box = document.querySelector(".lbox");
  if (!box) return;
  const im = box.querySelector("img");
  im.src = src;
  im.alt = cap || "";
  im.hidden = false;
  box.querySelector(".lbox__cap").textContent = cap || "";
  box.classList.add("is-open");
  box.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("is-locked");
  box.querySelector(".lbox__x")?.focus();
}
export function closeLightbox() {
  const box = document.querySelector(".lbox.is-open");
  if (!box) return;
  box.classList.remove("is-open");
  box.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".drawer.is-open,.cart.is-open")) document.documentElement.classList.remove("is-locked");
}

/* ---------- Newsletter ---------- */
/* The footer Subscribe button had no handler on all seven pages that carry a
   footer. It posts to the Selldone audience stream now. Unlike the rest of the
   storefront this is a write, so it is the one control that needs in-flight
   state and a spoken result — a form that silently does nothing is worse than
   one that is visibly absent. */
function initNewsletter() {
  document.querySelectorAll(".sub").forEach((box) => {
    const input = box.querySelector("input[type=email]");
    const btn = box.querySelector("button");
    if (!input || !btn) return;

  const say = document.createElement("p");
  say.className = "cap sub__say";
  say.setAttribute("role", "status");        // announced without stealing focus
  say.hidden = true;
  box.after(say);

  const show = (msg, bad) => {
    say.textContent = msg;
    say.hidden = false;
    say.classList.toggle("is-bad", Boolean(bad));
  };

  let busy = false;
  async function send() {
    if (busy) return;
    const email = input.value.trim();
    // Let the browser's own email validation speak first; it is localised.
    if (!email || !input.checkValidity()) {
      show("Enter an email address so we know where to write.", true);
      input.focus();
      return;
    }
    busy = true;
    btn.disabled = true;
    input.disabled = true;
    show("Signing you up…");
    try {
      await subscribe(email);
      show("Thank you — we will write when something arrives.");
      input.value = "";
    } catch (err) {
      show(err.message || "That did not go through. Try again shortly.", true);
      console.error("[homex] subscribe failed", err);
    } finally {
      busy = false;
      btn.disabled = false;
      input.disabled = false;
    }
  }

  btn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); send(); }
  });
  });
}

/* ---------- Search ---------- */
/* Client-side over the catalogue already in memory, matching the reference app.
   a catalogue this size does not justify a round-trip per keystroke, and the
   storefront has the whole list loaded before the button can be clicked. */
function initSearch() {
  const sheet = document.querySelector(".sheet--search");
  if (!sheet) return;
  const input = sheet.querySelector("[data-search-input]");
  const out = sheet.querySelector("[data-search-results]");
  const count = sheet.querySelector("[data-search-count]");

  const norm = (v) => String(v ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

  function run() {
    if (!CAT) { count.textContent = "Loading the catalog…"; return; }
    const q = norm(input.value).trim();
    if (!q) {
      out.innerHTML = "";
      count.textContent = `${CAT.products.length} products in the catalog`;
      return;
    }
    // Every term must appear somewhere in the record, so "molino gold" narrows
    // rather than widening the way an OR match would.
    const terms = q.split(/\s+/);
    const hits = CAT.products.filter((p) => {
      const hay = norm([p.name, p.brand, p.catName, p.id].join(" "));
      return terms.every((t) => hay.includes(t));
    });

    count.textContent = hits.length === 1 ? "1 product" : `${hits.length} products`;
    out.innerHTML = hits.length
      ? hits.map((p) => `<a class="sres" href="product.html?id=${p.id}">
          <span class="sres__art"><img src="${p.image}" alt="" loading="lazy" width="56" height="56"></span>
          <span><b>${esc(p.name)}</b><span class="cap">${esc(p.catName)}${p.brand ? " · " + esc(p.brand) : ""}</span></span>
          <span class="price">${money(p.price)}</span>
        </a>`).join("")
      : `<div class="sempty">
           <p class="h3" style="margin-bottom:6px">Nothing matches “${esc(input.value.trim())}”</p>
           <p class="cap">Try a brand, category, or part of a product name.</p>
         </div>`;
  }

  input.addEventListener("input", run);
  // The catalogue may still be loading when the sheet is first opened.
  document.addEventListener("catalog:ready", run);
  run();
}

/* ---------- Account ---------- */
/* Authorization Code + PKCE, public client. Customer-facing copy never names
   Selldone: the customer is signing in to Homex. Selldone is our
   infrastructure, not the shop's brand.

   Nothing raw is ever shown to a visitor. A failure gets a plain sentence here
   and the detail goes to the console — a stale-cache invalid_client once
   reached the panel as a JSON dump, which told the visitor nothing and hid the
   one line that would have identified it immediately. */
/* Guidance for someone evaluating Selldone, not shop copy. Direct customer
   sign-in only works once the shop owner has set a shop email address; without
   it the visitor is sent to Selldone to register there instead. Nobody cloning
   this repo would guess that, so the storefront says it out loud.

   Amber on purpose — the same amber as the demo-content banner, so it reads as
   "this is scaffolding" rather than as part of the shop's own palette. Rendered
   only when signed out: setup instructions inside an account someone already
   has are clutter. A real shop deletes this once the setting is in place. */
const SIGNIN_NOTE = `<div class="setupnote">
  <span class="setupnote__k">Building your own shop?</span>
  <p>Direct sign-in only works once the shop owner has set an email address under
     <b>Store dashboard → Settings → Email</b>. Until then, customers are sent to
     Selldone to create an account there instead of signing in to the shop itself.</p>
  <p>It is a shop-level setting, so a visitor cannot change it.</p>
</div>`;

async function renderAccount() {
  const body = document.querySelector("[data-account-body]");
  if (!body) return;
  body.innerHTML = `<p class="cap" style="padding:24px 0">Checking your session…</p>`;

  let s;
  try {
    s = await storefrontAuth.session();
  } catch (err) {
    console.error("[homex] session lookup failed", err);
    body.innerHTML = `<div class="acct">
      <p class="lede" style="margin-bottom:20px">We could not check whether you are signed in. Try again in a moment.</p>
      <button class="btn btn--full" type="button" data-signin>Sign in</button>
      ${SIGNIN_NOTE}
    </div>`;
    wire(body);
    return;
  }

  if (!s.authenticated) {
    body.innerHTML = `<div class="acct">
      <p class="lede" style="margin-bottom:8px">Sign in to see your orders and saved addresses.</p>
      <p class="cap" style="margin-bottom:24px">Use your email address. This is a demonstration storefront — no order is ever placed.</p>
      <button class="btn btn--full" type="button" data-signin>Sign in</button>
      <p class="cap center" style="margin-top:14px">New here? <button class="linkish" type="button" data-signin>Create account</button></p>
      ${SIGNIN_NOTE}
    </div>`;
    wire(body);
    return;
  }

  /* Name and avatar, order history, sign out. Nothing else — the email sat under
     the name AND in a row of its own, and a "Shop" row interpolated an object
     into a template and rendered [object Object]. */
  const u = s.user || {};
  body.innerHTML = `<div class="acct">
    <div class="acct__id">
      ${u.avatar ? `<img class="acct__av" src="${esc(u.avatar)}" alt="" width="52" height="52">` : `<span class="acct__av"></span>`}
      <span>
        <span class="acct__nm">${esc(u.name || "Signed in")}</span>
        ${u.email ? `<span class="cap" style="display:block">${esc(u.email)}</span>` : ""}
      </span>
    </div>
    <div data-orders><p class="cap" style="margin:22px 0">Loading your orders…</p></div>
    <button class="btn btn--line btn--full" type="button" data-signout>Sign out</button>
  </div>`;
  wire(body);
  renderOrders(body.querySelector("[data-orders]"), s.accessToken);
}

/* Real order history. An empty list says so; a failure says so plainly and logs
   the reason. Neither pretends the feature does not exist. */
async function renderOrders(host, token) {
  if (!host) return;
  try {
    const orders = await loadOrders(token);
    if (!orders || !orders.length) {
      host.innerHTML = `<p class="cap" style="margin:22px 0">No orders yet.</p>`;
      return;
    }
    host.innerHTML = `<p class="eyebrow" style="margin:24px 0 10px">Your orders</p>` +
      orders.map((o) => `<div class="acct__row">
        <span>${o.date ? new Date(o.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : `Order ${o.id}`}${o.status ? ` · ${esc(o.status)}` : ""}</span>
        <span class="price">${money(o.total)}</span>
      </div>`).join("");
  } catch (err) {
    console.error("[homex] order history failed", err);
    host.innerHTML = `<p class="cap" style="margin:22px 0">Your orders could not be loaded just now.</p>`;
  }
}

function wire(root) {
  root.querySelectorAll("[data-signin]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.currentTarget.disabled = true;
      storefrontAuth.startLogin(location.pathname + location.search);
    }));
  root.querySelector("[data-signout]")?.addEventListener("click", () => storefrontAuth.logout(location.pathname));
}

/* Reflect the signed-in state on the header button without opening the sheet,
   so the control is not silent about state it already knows. */
async function markAccountState() {
  const btn = document.querySelector('[data-open="account"]');
  if (!btn) return;
  try {
    const s = await storefrontAuth.session();
    if (s.authenticated) btn.setAttribute("aria-label", `Account — signed in as ${s.user?.name || s.user?.email || "you"}`);
  } catch { /* the button still opens the sheet, which reports the failure */ }
}

/* ---------- Deep-link re-anchor ---------- */
/* The browser jumps to a #hash before the web fonts have loaded. Bodoni and
   Archivo are metrically different from the fallbacks, so the document reflows
   underneath the jump — on a cold load /terms#delivery landed 62px high, which
   put the heading behind the sticky header. Re-anchor once metrics are final,
   but never fight a reader who has already started scrolling. */
function initDeepLink() {
  const id = decodeURIComponent(location.hash.slice(1));
  const target = id && document.getElementById(id);
  if (!target || !document.fonts) return;

  let moved = false;
  const release = () => { moved = true; };
  const opts = { passive: true, once: true };
  ["wheel", "touchstart", "keydown"].forEach((e) => addEventListener(e, release, opts));

  document.fonts.ready.then(() => {
    if (!moved) target.scrollIntoView(); // honours scroll-margin-top
    ["wheel", "touchstart", "keydown"].forEach((e) => removeEventListener(e, release, opts));
  });
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  initSharedChrome();
  // First, so the warning is up before the catalogue resolves. Awaited: the
  // banner shifts the page, and shifting it after the reader has started is
  // worse than a few milliseconds of delay.
  await initTemplateBanner();
  fillBrandCopy();
  initHeader();
  initRail();
  initReveal();
  initAcc();
  initDeepLink();
  initNewsletter();
  initSearch();
  markAccountState();
  document.querySelector(".lbox__x")?.addEventListener("click", closeLightbox);
  document.querySelector(".lbox")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("lbox")) closeLightbox();
  });

  try {
    CAT = await loadCatalog();
  } catch (err) {
    document.querySelectorAll("[data-catalog-error]").forEach((e) => {
      e.hidden = false;
      e.textContent = "The catalog could not be loaded from Selldone. Refresh to try again.";
    });
    console.error("[homex] catalog load failed", err);
    return;
  }

  window.__HOMEX__ = CAT; // inspection handle for verification
  fillNav();
  renderBag();
  document.addEventListener("bag:changed", renderBag);
  document.dispatchEvent(new Event("catalog:ready"));
});

export { CAT };

/* Homex — checkout.
   Five steps, validation on blur only, sticky summary from the live bag.
   This is a demonstration storefront: nothing is written to the shop and no
   order is placed. The physical basket path is documented inline so the real
   wiring is a substitution, not a rewrite. */

import { loadCatalog, loadShop, money, bagLines, bagSubtotal, readBag } from "./shop-data.js";
import { esc } from "./app.js";

const STEPS = ["Contact", "Shipping", "Delivery", "Payment", "Review"];
const TAX_RATE = 0.08;
const HAND_DELIVERY = 450;

/* Real physical-basket endpoints, from _generated/api-url-builders.md.
   Left unwired deliberately: writing a basket would mutate the live shop.
     GET  /shops/@{shop}/basket/physical/bill
     PUT  /shops/@{shop}/basket/{product_id}
     PUT  /shops/@{shop}/baskets/{basket_id}/config
     POST /shops/@{shop}/basket/physical/buy/{gateway_code}                   */

let step = 0;
let CAT = null;
let SHOP = null;

const $ = (s, r = document) => r.querySelector(s);

function renderSteps() {
  const wrap = $("#steps");
  wrap.innerHTML = STEPS.map((label, i) => `
    <span class="step${i < step ? " is-done" : ""}${i === step ? " is-now" : ""}"${i === step ? ' aria-current="step"' : ""}>
      <i></i><em>${label}</em>${i < STEPS.length - 1 ? "<b></b>" : ""}
    </span>`).join("");
  document.querySelectorAll("[data-panel]").forEach((p) => {
    p.hidden = Number(p.dataset.panel) !== step;
  });
  const back = $("#back"), next = $("#next");
  back.hidden = step === 0;
  next.textContent = step === STEPS.length - 1 ? "Place order" : "Continue";
  $("#stepnote").textContent = step === STEPS.length - 1
    ? "This is a demonstration. Nothing is charged and no order is created."
    : "You will see a full summary before anything is charged.";
}

/* Validation runs on blur, never while typing. */
function invalid(input) {
  const v = input.value.trim();
  if (!v) return true;
  if (input.type === "email") return !/^\S+@\S+\.\S+$/.test(v);
  if (input.type === "tel") return v.replace(/\D/g, "").length < 6;
  return false;
}
function wireValidation(root) {
  root.querySelectorAll("input[required]").forEach((i) => {
    i.addEventListener("blur", () => i.closest(".fld").classList.toggle("has-err", invalid(i)));
    i.addEventListener("input", () => {
      /* only ever clear an existing error while typing, never raise one */
      if (i.closest(".fld").classList.contains("has-err") && !invalid(i)) {
        i.closest(".fld").classList.remove("has-err");
      }
    });
  });
}
function validateStep() {
  const panel = $(`[data-panel="${step}"]`);
  if (!panel) return true;
  let ok = true;
  panel.querySelectorAll("input[required]").forEach((i) => {
    const bad = invalid(i);
    i.closest(".fld").classList.toggle("has-err", bad);
    if (bad && ok) { ok = false; i.focus(); }
  });
  return ok;
}

function shippingCost() {
  const hand = $('input[name="ship"]:checked')?.value === "hand";
  return hand ? HAND_DELIVERY : 0;
}

function renderSummary() {
  const lines = bagLines(CAT);
  const rows = $("#sumrows");
  if (!lines.length) {
    rows.innerHTML = `<p class="cap" style="padding:12px 0">Your bag is empty. <a href="shop.html" style="text-decoration:underline">Browse products</a>.</p>`;
    $("#sumtotals").hidden = true;
    $("#next").disabled = true;
    return;
  }
  $("#sumtotals").hidden = false;
  $("#next").disabled = false;
  rows.innerHTML = lines.map((r) => `
    <div class="sum__row">
      <img src="${r.p.image}" alt="${esc(r.p.name)}" width="64" height="64" loading="lazy">
      <div>
        <b style="font-weight:500;font-size:14px">${esc(r.p.name)}</b>
        <p class="ref mb0" style="margin-top:4px">REF. ${r.p.id} · Qty ${r.qty}</p>
      </div>
      <span class="price">${money(r.p.price * r.qty)}</span>
    </div>`).join("");

  const sub = bagSubtotal(CAT);
  const ship = shippingCost();
  const tax = Math.round((sub + ship) * TAX_RATE * 100) / 100;
  $("#subtotal").textContent = money(sub);
  $("#shipline").textContent = ship ? money(ship) : "Included";
  $("#taxline").textContent = money(tax);
  $("#total").textContent = money(sub + ship + tax);
}

function renderReview() {
  const box = $("#reviewbox");
  if (!box) return;
  const val = (id) => $("#" + id)?.value.trim() || "—";
  const ship = $('input[name="ship"]:checked');
  const pay = $('input[name="pay"]:checked');
  box.innerHTML = `
    <table class="spectable"><tbody>
      <tr><th scope="row">Contact</th><td>${esc(val("email"))}<br>${esc(val("tel"))}</td></tr>
      <tr><th scope="row">Ship to</th><td>${esc(val("fn"))} ${esc(val("ln"))}<br>${esc(val("addr"))}<br>${esc(val("city"))} ${esc(val("zip"))}<br>${esc($("#ctry")?.value || "")}</td></tr>
      <tr><th scope="row">Delivery</th><td>${esc(ship?.dataset.label || "—")}</td></tr>
      <tr><th scope="row">Payment</th><td>${esc(pay?.dataset.label || "—")}</td></tr>
    </tbody></table>`;
}

function showSuccess() {
  /* No confetti. A ruled receipt and a reference number. */
  const ref = "WD-" + String(readBag().reduce((n, r) => n + r.id * r.qty, 0)).slice(-6).padStart(6, "0");
  $("#coform").hidden = true;
  $(".sum").hidden = true;
  $("#steps").hidden = true;
  $("#done").hidden = false;
  $("#doneref").textContent = ref;
  $("#done").focus();
}

async function init() {
  if (!$("#coform")) return;
  CAT = await loadCatalog();
  try { SHOP = await loadShop(); } catch { SHOP = null; }

  /* Payment options come from the shop's enabled gateways. The Stripe
     publishable key is read from shop info at runtime; it is never written
     into a file. If it cannot be resolved the card option stays visible but
     is marked unavailable rather than silently faked. */
  const payBox = $("#paymethods");
  const gws = SHOP?.gateways || [];
  payBox.innerHTML = (gws.length ? gws : [{ code: "card", name: "Card" }]).map((g, i) => `
    <label class="opt">
      <input type="radio" name="pay" value="${esc(g.code)}" data-label="${esc(g.name)}"${i ? "" : " checked"}>
      <span><b>${esc(g.name)}</b><br><span class="cap">${/stripe/i.test(g.code)
        ? (SHOP?.stripeKeyResolved ? "Visa, Mastercard, American Express" : "Publishable key unavailable — unconfigured")
        : esc(g.currency || "")}</span></span>
    </label>`).join("") + `
    <label class="opt">
      <input type="radio" name="pay" value="transfer" data-label="Bank transfer">
      <span><b>Bank transfer</b><br><span class="cap">Order ships once funds clear</span></span>
    </label>`;

  const note = $("#gatewaynote");
  if (note) {
    note.textContent = SHOP?.stripeKeyResolved
      ? `Card payments configured through ${gws.find((g) => /stripe/i.test(g.code))?.name || "Stripe"}. Key read from shop settings at runtime.`
      : "No card gateway key could be resolved from shop settings.";
  }

  wireValidation($("#coform"));
  renderSummary();
  renderSteps();

  document.querySelectorAll('input[name="ship"]').forEach((r) =>
    r.addEventListener("change", renderSummary));

  $("#next").addEventListener("click", () => {
    if (!validateStep()) return;
    if (step === STEPS.length - 1) { showSuccess(); return; }
    step += 1;
    if (step === STEPS.length - 1) renderReview();
    renderSteps();
    $("#coform").scrollIntoView({ block: "start", behavior: "smooth" });
  });
  $("#back").addEventListener("click", () => {
    if (step > 0) step -= 1;
    renderSteps();
  });

  $(".promo")?.addEventListener("click", function () {
    const f = $("#promofield"), on = f.hasAttribute("hidden");
    on ? f.removeAttribute("hidden") : f.setAttribute("hidden", "");
    this.textContent = on ? "Hide discount code" : "Add a discount code";
  });
}

document.addEventListener("DOMContentLoaded", init);

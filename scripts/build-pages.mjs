/* Render store-pages/*.md into the four Blued Steel content pages.

   The Markdown is the source of truth and keeps its {{PLACEHOLDER}} tokens;
   this fills them and emits static HTML that shares index.html's chrome, so the
   header, footer and rail can never drift away from the rest of the site.

   Run after editing any store-pages/*.md:  npm run build:pages

   Deliberately not part of build:static. The output is committed HTML, so a
   clone builds and deploys with no extra step, and a change to page copy shows
   up as a reviewable diff rather than appearing at deploy time.
*/
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), ".."));
const SRC = join(ROOT, "store-pages");
const OUT = join(ROOT, "storefront");

/* Shop-specific values come from shop.config.json, so there is one place to
   change them and no second copy to drift. Anything the config leaves null
   stays an UNFILLED token and renders visibly — an invented address looks
   exactly like a real one, which is the problem with inventing it. */
const CFG = JSON.parse(readFileSync(join(ROOT, "shop.config.json"), "utf8"));

const TOKENS = {
  SHOP_NAME: CFG.shop?.name || "",
  SHOP_DOMAIN: CFG.shop?.domain || "",
  FOUNDED_YEAR: CFG.brand?.foundedYear != null ? String(CFG.brand.foundedYear) : "",
  COUNTRY: CFG.brand?.country || "your applicable jurisdiction",
  CURRENCY: CFG.brand?.currency || "USD",
  LAST_UPDATED: CFG.brand?.lastUpdated || "17 August 2026",
  RETURN_DAYS: "30",
  REFUND_DAYS: "14",
  DAMAGE_WINDOW: "7",
  RECORD_YEARS: "10",
  SUPPORT_RETENTION: "3",
  LOG_RETENTION: "90",
  RESPONSE_DAYS: "30",
  OPENING_HOURS: CFG.brand?.openingHours || "",
};

// A token the config leaves empty is treated as unfilled, not as a blank.
for (const [k, v] of Object.entries(TOKENS)) if (!v) delete TOKENS[k];

/* This shop has no real contact details. These stay visible as tokens: an
   invented address looks like a fact and cannot be told apart from a real one
   by anybody reading the page. The shop record does carry values, but they are
   demo seed data — a Los Angeles address on a shop whose country is Switzerland. */
const UNFILLED = new Set(["SHOP_EMAIL", "SHOP_PHONE", "SHOP_ADDRESS", "COMPANY_REGISTRATION"]);

const PAGES = {
  "about-us": ["About Homex", "How Homex selects useful furniture and helps customers choose with confidence."],
  terms: ["Client care", "Terms and conditions covering orders, prices, delivery, returns and warranty."],
  privacy: ["Client care", "What personal information this shop collects, why, and how to have it removed."],
  "contact-us": ["Client care", "How to reach us, what to include, and how long a reply takes."],
};

const BANNER = `<div class="demobanner">
            <b>⚠️ Demonstration content — not a real policy</b>
            <span>This page is placeholder text in a <strong>Selldone demo store</strong>, written to show how the Pages feature works. Nothing here is a binding statement, a legal document, or a description of a real business. <strong>Replace this content before going live.</strong></span>
          </div>`;

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fill(text) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (_, name) => {
    if (name in TOKENS) return escape(TOKENS[name]);
    if (UNFILLED.has(name)) return `<span class="tok">{{${name}}}</span>`;
    throw new Error(`unknown token {{${name}}}`);
  });
}

const inline = (t) => fill(escape(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"));

/* The Markdown subset the sources actually use: headings, paragraphs, bold,
   bullet lists, pipe tables, and the raw <h2 id> the footer anchors need. */
function render(md) {
  const lines = md.split(/\r?\n/);
  const body = [];
  let title = null, meta = null, i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('<div style="border:1px solid #E0A800')) {
      while (!lines[i].startsWith("</div>")) i++;
      body.push(BANNER);
      i++;
      continue;
    }
    // Raw <h2 id="…">: Markdown has no syntax for an id, and the footer links
    // straight to these sections.
    if (line.startsWith("<h2 id=")) { body.push("          " + fill(line)); i++; continue; }
    if (line.startsWith("# ")) { title = inline(line.slice(2).trim()); i++; continue; }
    if (line.startsWith("## ")) { body.push(`          <h2>${inline(line.slice(3).trim())}</h2>`); i++; continue; }

    if (line.startsWith("|") && /^\|[-:| ]+\|$/.test(lines[i + 1] ?? "")) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      const empty = !cells.some(Boolean);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i].slice(1, -1).split("|").map((c) => c.trim()));
        i++;
      }
      // A two-column table with no header reads as a definition list; drop the
      // empty header rather than rendering a blank strip.
      const thead = `<thead${empty ? ' class="is-empty"' : ""}><tr>${cells.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>`;
      const tbody = rows.map((r) => `\n              <tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("");
      body.push(`          <table>\n            ${thead}\n            <tbody>${tbody}\n            </tbody>\n          </table>`);
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(`            <li>${inline(lines[i].slice(2).trim())}</li>`);
        i++;
      }
      body.push(`          <ul>\n${items.join("\n")}\n          </ul>`);
      continue;
    }

    if (!line.trim()) { i++; continue; }

    const para = [];
    while (i < lines.length && lines[i].trim() && !/^[#\-|<]/.test(lines[i])) {
      para.push(inline(lines[i].trim()));
      i++;
    }
    const text = para.join("<br>\n            ");
    if (text.startsWith("Last updated:") && meta === null) meta = text;
    else body.push(`          <p>${text}</p>`);
  }
  return { title, meta, body: body.join("\n") };
}

/* Header, footer and drawers are lifted from index.html rather than duplicated,
   so a footer change reaches these pages the next time they are built. */
function chrome() {
  const src = readFileSync(join(OUT, "index.html"), "utf8");
  const rawHead = src.slice(src.indexOf("<head>"), src.indexOf("</head>"));
  // home.js drives the homepage only. Strip it with a newline-agnostic pattern:
  // index.html is CRLF, and a literal "…</script>\n" match silently no-ops,
  // which shipped homepage JS onto all four content pages once already.
  const head = rawHead.replace(/[ \t]*<script type="module" src="home\.js"><\/script>\r?\n/, "");
  if (head === rawHead) throw new Error("home.js script tag not found in index.html head — refusing to emit pages that would load it");
  // #service is a homepage section; from another page the link needs the page.
  const top = src.slice(src.indexOf("  <body>"), src.indexOf('<main id="main"')).replaceAll('href="#service"', 'href="index.html#service"');
  return { head, top, tail: src.slice(src.indexOf("      </main>")) };
}

const { head, top, tail } = chrome();
for (const [slug, [eyebrow, desc]] of Object.entries(PAGES)) {
  const { title, meta, body } = render(readFileSync(join(SRC, `${slug}.md`), "utf8"));
  if (!title) throw new Error(`${slug}.md has no H1`);

  const pageHead = head
    .replace(/<title>.*?<\/title>/, `<title>${title} — ${TOKENS.SHOP_NAME || ""}</title>`)
    .replace(/(name="description"\s*\n\s*content=)"[^"]*"/, `$1"${desc}"`);

  const metaHtml = meta ? `\n              <p class="pghead__meta">${meta}</p>` : "";
  const main = `<main id="main" tabindex="-1">

        <section class="pghead ink">
          <div class="wrap">
            <div class="pgcol">
              <p class="eyebrow eyebrow--onink">${eyebrow}</p>
              <h1 class="h1">${title}</h1>${metaHtml}
            </div>
          </div>
        </section>

        <div class="wrap"><div class="tickrule"></div></div>

        <section class="section">
          <div class="wrap">
            <article class="prose">
${body}
            </article>
          </div>
        </section>

`;

  const out = `<!doctype html>\n<html lang="en">\n${pageHead}</head>\n${top}${main}${tail}`;
  writeFileSync(join(OUT, `${slug}.html`), out);
  console.log(`  ${slug}.html`.padEnd(20) + `${out.length.toLocaleString().padStart(7)} bytes   unfilled tokens: ${(out.match(/class="tok"/g) || []).length}`);
}

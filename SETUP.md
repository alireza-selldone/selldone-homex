# Taking this repo to a new shop

Three steps. No file is edited by hand, and nothing asks you which shop — the
connector already knows.

---

## 1. Connect the Selldone MCP connector to your shop

Connect it at <https://selldone.com/mcp/connections> and choose the shop you
want the storefront to serve. That choice is the only place a shop is chosen;
everything downstream reads it from the connection.

## 2. Clone and run

```bash
git clone https://github.com/<you>/<this-repo>.git my-shop
cd my-shop
npm install                  # wrangler and playwright, both dev-only
npx playwright install chromium
npm run dev:static           # http://localhost:8788/
```

`npm install` pulls no runtime dependencies — the storefront ships as plain
HTML, CSS and ES modules. Playwright is only for the verification suite.

What you will see is the **demonstration catalogue** with an amber banner
across the top saying so. That banner is the point: the repo ships configured
for the demo shop, so a fresh clone runs and looks finished rather than blank,
and it says out loud that the products are not yours.

If this is a new shop rather than a contribution back, start its history clean:

```bash
rm -rf .git && git init && git add -A && git commit -m "Initial commit from the template"
```

> Resetting history is irreversible for the clone. "Go and find the old
> implementation in git history" stops being possible the moment you do it.

## 3. Say one sentence to your agent

> Add my products, categories and blog.

That is the whole interface. The agent reads the connected shop from
`selldone_current_connection`, runs `npm run setup`, writes the category blurbs
and hero copy from what your products actually are, and adds a blog if the shop
has none.

What `npm run setup` does, and what it deliberately does not:

| It does | It does not |
|---|---|
| Read your live categories and products from XAPI | Ask which shop — the connector already chose |
| Derive a slug per category **from its live title** | Carry any other shop's category ids |
| Pick a hero image per collection, and three hero slides | Write the copy for them |
| Write `shop.config.json` and set `isTemplate: false` | Invent a founding year, cities or a tagline |
| Propagate shop identity into every meta tag | Invent contact details |

Blurbs and hero copy are left for the agent because they have to be written
from what the products actually are. A script that generated them would be
inventing data, and this project has removed fabricated copy twice.

**Re-running `npm run setup` is safe and is the intended workflow**: it carries
forward anything already written for a category that still exists, and rewrites
the rest.

### Everything shop-specific lives in one file

`shop.config.json` at the repo root. Shop id, handle, name, OAuth client,
founding year, cities, tagline, category slugs and blurbs, hero mode and
slides, spotlight rule, contact details. The build copies it beside the pages,
so replacing that one file repoints a built site without rebuilding.

`isTemplate` is the safety flag. While it is `true` — **or while the shop id is
missing** — the amber banner shows. The condition is deliberately not "is this
the demo shop's id": an empty config is just as dangerous as one still naming
the demo shop, and an operator who deleted the values believes they unset
something.

### Categories: any number from three to ten

The grid adapts. Below three the section is dropped rather than showing a
lonely tile; above ten the ten largest are kept and the run report says which
were left out.

| Categories | Desktop grid |
|---|---|
| 3 | 3 across |
| 4 | 4 across |
| 5 or 6 | 3 across, two rows |
| 7 or 8 | 4 across, two rows |
| 9 or 10 | 5 across, two rows |

---

## 4. Create the OAuth client

The storefront signs customers in with **Authorization Code + PKCE as a public
client**. There is no client secret, and there must not be one: the whole flow
runs in the browser, where a secret could not be kept.

In Selldone, create an OAuth client with:

- **Type:** public / PKCE (`token_endpoint_auth_method = none`)
- **PKCE method:** S256
- **Scopes:** `profile`, `phone`, `address`, `user:profile:write`, `buy`,
  `order-history`, `my-gift-cards`
- **Redirect URIs:** one for **every domain the storefront will ever serve from**

Put the client id into **`shop.config.json`** under `oauth.clientId`, then run
`npm run setup` again — it writes the meta tags in all three files for you.
Leave any secret field empty.

### Redirect URIs — the step whose absence costs an afternoon

The redirect URI is matched **exactly**, character for character, **including
the trailing slash**. `https://shop.example.com/callback` and
`https://shop.example.com/callback/` are different URIs. The storefront builds
its redirect from `window.location.origin` plus `pajulina-callback-path`, so
whatever that produces is what must be registered.

Register all of these before you need them:

```
http://localhost:8788/callback/            local development
https://<shop>.myselldone.com/callback/    the Selldone-hosted domain
https://<your-custom-domain>/callback/     step 6
```

Cloudflare preview deployments get their own hostname per branch
(`https://<branch>-<worker>.<subdomain>.workers.dev`). Those are **not**
registered, so sign-in will be rejected on a preview URL. That is expected —
test sign-in on production, or add the specific preview alias if you need it.

If a redirect URI is missing you get `invalid_client`, and the message does not
tell you which URI it objected to. See [troubleshooting](#troubleshooting) —
there is a second, more misleading cause.

## 5. Set the shop email address

Do this in the same sitting as the OAuth client. The two together are what make
customer sign-in work; the OAuth client alone is not enough.

**Store dashboard → Settings → Email.**

The two states, plainly:

| Shop email | What a customer gets when they tap *Sign in* |
|---|---|
| **Not set** | Redirected to Selldone and asked to create an account **on Selldone**. They end up with a Selldone account, not a session on your shop. Nothing in the storefront can override this. |
| **Set** | Signed in to your shop directly, with their email address. They return to the page they left. |

It is a **shop-level** setting. A visitor cannot change it, and neither can the
storefront — so there is no code fix, only the dashboard.

Because this is invisible until a customer hits it, this storefront ships an
amber callout under the *Sign in* button naming the setting. It renders only
when signed out. **Once your shop is configured, delete it** — it is guidance
for someone evaluating Selldone, not shop copy. One constant, `SIGNIN_NOTE` in
`storefront/app.js`, plus `.setupnote` in `storefront/styles.css`.

> Homex does not ship a fabricated contact email. Add the merchant-verified
> address in **Store dashboard → Settings → Email** before enabling production
> customer sign-in.

## 6. Cloudflare Workers Builds

Deployment is git-driven: push to `main` and Cloudflare builds and publishes.

**Create the Worker first, then connect the build from inside it.** In the
Cloudflare dashboard:

1. Create a Worker whose name matches the `name` field in `wrangler.toml`
2. Open that Worker → **Settings → Builds → Connect**
3. Pick the repository and branch

Connecting from **Workers & Pages → Create** instead makes Cloudflare generate a
Worker named after the repository. That name will not match `wrangler.toml`, and
the build fails at the deploy step with a name mismatch that is easy to misread
as a permissions problem.

Build settings:

| Field | Value |
|---|---|
| Build command | `npm run build:static` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |
| Production branch | `main` |

`wrangler.toml` itself needs only:

```toml
name = "<your-worker-name>"
compatibility_date = "2026-06-22"

[assets]
directory = "./dist/"
not_found_handling = "single-page-application"
html_handling = "auto-trailing-slash"
```

`html_handling = "auto-trailing-slash"` is what makes `/about-us` serve
`about-us.html`. It also strips `.html` in the other direction: a link to
`/shop.html` answers **307** to `/shop`. Link extensionless to avoid a redirect
on every click.

## 7. Custom domain

Add the domain to the Worker (**Settings → Domains & Routes**), then — and this
is the step people forget — **add `https://<that-domain>/callback/` to the OAuth
client's redirect URIs**. Sign-in works on the old domain and fails on the new
one otherwise, which looks like a broken deploy rather than a missing URI.

## 8. Run the verification suite

Start the dev server, then run the checks:

```bash
npm run dev:static      # http://localhost:8788/
npm run check           # in a second terminal
```

| Script | What it proves |
|---|---|
| `check:audit` | 10 accessibility/layout checks across every page at 11 widths, 1440→390. Contrast, tap targets, horizontal overflow, broken images, console errors |
| `check:images` | No image escapes its container's **content** box, and any element declaring `aspect-ratio` actually renders at it |
| `check:pages` | Every footer link resolves to content that is **not** the homepage, with a deliberately unrouted path kept in the run as a negative control |
| `check:controls` | Every visible button and link does something, detected by instrumenting `addEventListener` — not inferred from class names |
| `check:hero` | The hero crop keeps both watch hotspots in frame at 1440/1280/1024, with a knowingly-wrong crop as the negative control |
| `check:port` | The storefront works for a shop that is not this one: 3 to 10 categories, slugs derived from live titles, the banner firing on template-or-missing |
| `check:leak` | No category id, product id or brand copy string survives in `storefront/`, and every shop-id meta agrees with the config |

Each accepts a base URL, so the same checks run against a deployment:

```bash
node scripts/pagecheck.mjs https://your-shop.example.com
```

**Run them against production after deploying, not only locally.** That
distinction has caught real bugs here twice.

## 9. Catalogue expectations

The storefront reads everything live. For it to work:

- **Every product needs a category.** One uncategorised product does not error —
  it silently vanishes from the filters. Verify with a single call rather than
  assuming
- **Images resolve through the central helper** (`selldoneImagePathToUrl`), never
  by string-concatenating a CDN path
- **The price slider calibrates itself** from the live minimum and maximum. Do
  not write bounds down; a product outside a hardcoded band becomes unreachable
- **Products need variants only if they have them.** Variant swatches fall back
  to colour circles where no variant image exists
- **Ratings may be zero.** The reviews block shows an honest empty state rather
  than inventing anything

`store-pages/BLOG-INSTRUCTION.md` describes what to do about the blog on a new
shop; it runs automatically for an agent working from the skill.

---

## Troubleshooting

**`invalid_client` on sign-in.** Two causes, and the second is far more
misleading than the first.

1. The redirect URI is not registered, or differs by a trailing slash. Compare
   the `redirect_uri` query parameter in the authorize URL against the client's
   registered list, character for character.
2. **A stale browser cache.** A previously-cached copy of the auth module can
   keep sending an old client id long after the config is correct. This produced
   an `invalid_client` here that survived several rounds of checking the
   configuration, because the configuration was already right. Hard-reload, or
   test in a private window, **before** concluding anything about the client.

**A page that does not exist returns 200.** `not_found_handling =
"single-page-application"` serves the homepage for any unmatched path. A link to
a page you never created answers 200 with the wrong content, so a status-code
check proves nothing. Compare the response against the homepage — that is what
`check:pages` does, and why it keeps an unrouted path in the run.

**`wrangler` fails with a 403 and a Cloudflare Ray ID.** Some networks get
bot-challenged by Cloudflare's API, and it looks exactly like an expired token.
This is the main reason deployment goes through Workers Builds rather than a
local `wrangler deploy`.

**The dev server disagrees with production about routing.** `dev-static.mjs`
emulates `html_handling`. If you change routing behaviour in `wrangler.toml`,
change the emulation too, or local checks will stop predicting production.

**Playwright cannot launch.** `npm install` does not fetch browsers. Run
`npx playwright install chromium` once per machine.

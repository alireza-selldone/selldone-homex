# AI Agent Guide

This project is a fully static Selldone storefront plus browser-side dashboard. Follow these rules when editing it.

## Core Architecture

- Storefront source lives in `storefront/` and is served at `/`.
- Dashboard source lives in `dashboard/` and is served at `/dashboard/`.
- OAuth callback source lives in `callback/` and is served at `/callback/`.
- Shared browser modules live in `shared/`.
- Static production output is generated into `dist/` by `scripts/build-static.mjs`.
- `scripts/dev-static.mjs` is only a local development file server. Do not add production Node server behavior.
- Cloudflare Workers Static Assets must deploy `dist/` only through `wrangler deploy`. Do not deploy `.env`, logs, temp files, auth files, local browser profiles, or `dist/` source artifacts to git.

## Runtime Config

- Public runtime config is stored in HTML meta tags in `storefront/index.html`, `dashboard/index.html`, and `callback/index.html`.
- Do not add client secrets, API keys, refresh tokens, access tokens, MCP credentials, Cloudflare tokens, or private `.env` values to any public file.
- `.env` is only for local dev server settings such as `STATIC_DEV_PORT` and optional debug proxy settings.

## Selldone API Rules

- Storefront calls must go browser-direct to `https://xapi.selldone.com`.
- Dashboard/backoffice calls must go browser-direct to `https://api.selldone.com`.
- OAuth must use public-client PKCE against `https://selldone.com/oauth`; never use a client secret.
- Storefront and dashboard OAuth tokens must stay separate in localStorage:
  - `pajulina_storefront_oauth_tokens_v1`
  - `pajulina_dashboard_oauth_tokens_v1`
- Do not add Node-only API routes for production features.
- **The `/api/storefront/*` shim is gone** (removed 14 Aug 2026). There is no
  `storefront/static-storefront-api.js`; call `storefrontAuth.session()` and the XAPI
  endpoints directly. Translating a fake path into a real one was all the shim ever did,
  and the indirection hid which XAPI call a feature actually made. Do not reintroduce it.
- Storefront search is client-side over the catalogue already in memory, matching the
  reference app. 35 references do not justify a network round-trip per keystroke.
- Storefront customer identity comes from `storefrontAuth.session()`, which reads
  XAPI `/me` for the storefront context — never `api.selldone.com`.
- Storefront order history is physical-only and loads from XAPI `GET /shops/@{shop}/basket/orders-PHYSICAL` with the `order-history` scope.
- Storefront order detail loads from XAPI `GET /shops/@{shop}/baskets/{basket_id}` with the storefront customer token.
- Storefront cart reads and mutations must use real Selldone XAPI. This shop sells physical products only, so cart state must load the physical basket from shop-info `baskets` and bill data. Basket item updates use `PUT /shops/@{shop}/basket/{product_id}` with the final `count`.
- Storefront checkout is physical-only: save basket config, refresh physical bill, then call `POST /shops/@{shop}/basket/physical/buy/{gateway_code}`.
- Storefront Stripe checkout must read the publishable key dynamically from Selldone storefront shop info gateway data. Never hardcode Stripe keys.
- Blog reads use the registry endpoints `xapi.blogs.list` (`GET /shops/@{shop}/blogs`)
  and `xapi.blogs.get` (`GET /shops/@{shop}/blogs/{blog_id}`). Three traps, all found by
  testing rather than by reading the docs:
  - `blog_id` on the detail route is the article's **`parent_id`** (the shop-blog record),
    not the article id. Passing the article id returns "Blog not found", which reads like
    a missing endpoint. It is not missing.
  - `?extra=true` returns the category list but an **empty** `articles` array, filling
    `last_articles` instead. Categories and articles need separate calls.
  - The public list carries no category per article, so `loadBlog()` builds the map with
    one filtered call per category (`?category=<id>`). That is bounded by category count
    rather than the N+1 over articles the detail route would force. It is still N+1 in
    the number of categories — acceptable at four, worth revisiting past a dozen.
- Article publication dates cannot be backdated through the API. `created_at` is ignored
  by `api.articles.shop_blog.upsert`, and a past `schedule_at` fires immediately, is
  cleared, and resets `created_at` to the publish moment. Display `created_at` as the
  truth rather than faking a spread. Verified 14 Aug 2026.
- Product comments are article comments. Resolve the product article from `product.article_pack.article.id` or equivalent product info fields; do not use `/shops/@{shop}/products/{id}/reviews` as the primary XAPI path.

## Selldone Image URL Standard

- Use the central Selldone image helpers where present.
- Do not create local one-off image resolvers in feature files.
- Selldone underscore paths must be converted consistently, for example `shops_15574_products_demo` -> `https://cdn.selldone.com/app/shops/15574/products/demo128.png`.

## Dashboard Code Organization

- Keep dashboard feature logic split under `dashboard/features/`.
- `dashboard/app.js` should mainly wire state, top-level rendering, and event bindings.
- New dashboard feature modules should export a `createXFeature(deps)` factory.
- Do not grow `dashboard/app.js` with large feature-specific blocks.

## UI Rules

- Dashboard UI should be English.
- Use Bootstrap-compatible markup and Bootstrap Icons where the dashboard already uses them.
- Keep the visual direction modern, minimal, operational, and compact.
- Do not duplicate account controls; the user account menu belongs in the left sidebar profile.
- Homepage reviews are sample content and must keep their visible label. The average and
  the star distribution are computed by `summariseReviews()` from the review array — never
  typed in. `loadReviews()` is the single switch point: when any product has
  `rate_count > 0` it uses real ratings and the label disappears on its own.
- Storefront `blog.html` and `article.html` are generated by `scripts/build-blog-pages.mjs`
  from index.html's chrome, same as the content pages. Keep the empty state in `blog.js`
  even when posts exist — the next shop starts with none.
- Search and account were rebuilt from scratch, not recovered. The reference app's
  `user-menu`, `account-profile`, `profile-pages` and `static-storefront-api` modules exist
  in no git object: history was reset at project start and the first commit already had
  them removed. Do not go looking for them.
- Storefront content pages (`about-us`, `terms`, `privacy`, `contact-us`) are generated from
  `store-pages/*.md`. Edit the Markdown, not the HTML, and keep the `{{PLACEHOLDER}}` tokens in the
  source.
- Never link a storefront path that only resolves through `not_found_handling`. With
  `single-page-application` set, a missing page answers 200 with the homepage, so a broken link is
  invisible to a status-code check. Assert the response differs from the homepage as well.
  `dev-static.mjs` emulates Cloudflare's `html_handling` so this is testable locally.

## Git And Editing Hygiene

- The worktree may contain user changes. Do not revert unrelated files.
- Use focused patches and avoid broad refactors unless requested.
- Do not commit `.env`, tokens, secrets, generated `dist/`, logs, temp files, local auth files, or browser profile folders.
- When adding or deleting source files for this static package, stage the relevant source changes with git so they are not missed before deployment.
- If a new Selldone API behavior or project convention is discovered and applied, update this file in the same change.

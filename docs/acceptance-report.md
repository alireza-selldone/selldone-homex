# Homex acceptance report

Verified on 2026-08-20 against the connected Selldone shop and the deployed Cloudflare Worker.

## Release identity

- Shop: Homex (`15574`, `@homex`), physical goods, English, USD
- Repository: https://github.com/alireza-selldone/selldone-homex
- Audited application commit: `dd7b14aaa8c0126807912aafb151b442fdd05ec9`
- Production: https://homex.selldone.shop/
- Provider URL: https://selldone-homex.ee-shirdel.workers.dev/
- Cloudflare build trigger: `b39e8f13-dc00-4fe5-9b3a-c628c303d2ad`
- Verified build: `dbc85fed-fe36-4095-9add-db9a8b1a0d96` (`success`)
- Deployment: `f9cac00f-e7a2-4ffc-9eab-1da257a9e4e4`
- Worker version: `057133ee-d076-401e-8361-c34d13dbd515`
- OAuth: public Authorization Code + PKCE client; no client secret exists

## Catalog evidence

| Check | Result |
| --- | ---: |
| Physical products | 100 |
| Categories with uploaded images | 15 / 15 |
| Variants | 133 |
| Product SKUs missing | 0 |
| Variant SKUs missing | 0 |
| Visual variants missing an image | 0 |
| `trending` products | 20 |
| `Best seller` products | 20 |
| Tag overlap | 0 |
| Published journal posts | 6 |

Category titles are human-readable, including **Dining Table**. Category, listing, and product-detail image stages contain transparent imagery at 70% with `object-fit: contain`. Uploaded product/category assets and generated editorial WebP files are below 500 KB per source file.

The latest variant database audit found **133 variants, 0 missing images, 0 missing colors**. The two previously incomplete dining sets now have generated transparent finish imagery, persistent Selldone gallery links, visible color dots (including the first finish), and deterministic gallery switching.

Live Selldone XAPI remains the first source. A versioned snapshot of the same 100 products, 15 categories, and 133 variants is loaded only when the public catalog endpoint is unavailable or returns an application error. This was exercised from an environment whose egress IP Selldone blocks.

## Verification results

- `npm run build`: pass
- `npm run check:leak`: pass, including the planted negative control
- `npx wrangler deploy --dry-run`: pass
- `audit-run` at 1440, 1024, 768, and 390 CSS px: **40 / 40 local and 40 / 40 production page states pass**
- `imgsweep`: **1,563 images checked, 0 outside their content box**; negative controls detected both planted failures
- `pagecheck`: all content routes, footer links, policy anchors, token disclosures, and unknown-route behavior pass
- `deadctl`: 0 dead controls
- `herocheck`: all four tested breakpoints pass
- `homecheck`: 20 Trending + 20 disjoint Best Sellers, one newsletter, three-column footer, four requested social icons, and zero overflow pass at four breakpoints
- `shopcheck`: category and all-product titles, compact category chips, six functional filter groups, three/two-column responsive grids, and the complete 100-product count pass
- `portcheck`: template portability and category edge cases pass
- Production screenshots: 17 fresh captures under [`docs/pack`](pack/)

The production route check covers home, shop/category, product, cart, checkout, blog, article, account states, policy pages, assets, callback route, unknown-route fallback, responsive refreshes, and both production hostnames.

## Checklist disposition

The furniture-relevant requirements in the supplied acceptance checklist are complete. Fashion-only audience, size-guide, garment fit/care, sleeve/length, Baby taxonomy, and clothing-size matrix items are not applicable to this physical furniture catalog. Product color controls remain keyboard accessible and deterministically map by variant id/image.

The storefront now includes the full-width centered campaign hero, four-square room grid, interactive visual-board/room-concept comparison, reference-structured category filters, and compact three-column service footer. It is an original Homex design inspired by the general information architecture of premium furniture retail. No Memoky logo, photograph, legal copy, promotional copy, source code, or other protected asset is included.

## Merchant-owned items still open

- Legal business name, registration number, postal address, support email, phone, and opening hours were not supplied. Policy/contact pages visibly keep these facts unfilled rather than inventing them.
- The storefront is explicitly a demonstration checkout and does not place a live order or charge a card. A real payment/order acceptance test requires merchant authorization and configured live gateway details.
- Sample reviews are labeled and excluded from live rating claims.
- The signed-in screenshot uses a documented simulated browser session only; no password, access token, refresh token, or customer identity is stored in the repository.

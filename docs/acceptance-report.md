# Homex acceptance report

Verified on 2026-08-20 against the connected Selldone shop and the deployed Cloudflare Worker.

## Release identity

- Shop: Homex (`15574`, `@homex`), physical goods, English, USD
- Repository: https://github.com/alireza-selldone/selldone-homex
- Audited application commit: `f353da96b95cea7a31262da3599a250410bb791a`
- Production: https://homex.selldone.shop/
- Provider URL: https://selldone-homex.ee-shirdel.workers.dev/
- Cloudflare build trigger: `b39e8f13-dc00-4fe5-9b3a-c628c303d2ad`
- Verified build: `17301ec1-fa91-41b7-b7a7-201c02cbd0db` (`success`)
- Deployment: `614ce837-eca7-4bb4-9f0e-348bccf2595a`
- Worker version: `56292076-063d-4f1e-80ea-583b6470a9ab`
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

Live Selldone XAPI remains the first source. A versioned snapshot of the same 100 products, 15 categories, and 133 variants is loaded only when the public catalog endpoint is unavailable or returns an application error. This was exercised from an environment whose egress IP Selldone blocks.

## Verification results

- `npm run build`: pass
- `npm run check:leak`: pass, including the planted negative control
- `npx wrangler deploy --dry-run`: pass
- `audit-run` at 1440, 1024, 768, and 390 CSS px: **40 / 40 local and 40 / 40 production page states pass**
- `imgsweep`: **1,292 images checked, 0 outside their content box**; negative controls detected both planted failures
- `pagecheck`: all content routes, footer links, policy anchors, token disclosures, and unknown-route behavior pass
- `deadctl`: 0 dead controls
- `herocheck`: all four tested breakpoints pass
- `portcheck`: template portability and category edge cases pass
- Production screenshots: 17 fresh captures under [`docs/pack`](pack/)

The production route check covers home, shop/category, product, cart, checkout, blog, article, account states, policy pages, assets, callback route, unknown-route fallback, responsive refreshes, and both production hostnames.

## Checklist disposition

The furniture-relevant requirements in the supplied acceptance checklist are complete. Fashion-only audience, size-guide, garment fit/care, sleeve/length, Baby taxonomy, and clothing-size matrix items are not applicable to this physical furniture catalog. Product color controls remain keyboard accessible and deterministically map by variant id/image.

The storefront is an original Homex design inspired by the general information architecture of premium furniture retail. No Memoky logo, photograph, legal copy, promotional copy, source code, or other protected asset is included.

## Merchant-owned items still open

- Legal business name, registration number, postal address, support email, phone, and opening hours were not supplied. Policy/contact pages visibly keep these facts unfilled rather than inventing them.
- The storefront is explicitly a demonstration checkout and does not place a live order or charge a card. A real payment/order acceptance test requires merchant authorization and configured live gateway details.
- Sample reviews are labeled and excluded from live rating claims.
- The signed-in screenshot uses a documented simulated browser session only; no password, access token, refresh token, or customer identity is stored in the repository.

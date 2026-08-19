# Homex implementation decisions

## Scope and source of truth

The connected Selldone shop is Homex (`15574`, handle `homex`). Live Selldone data remains authoritative for products, categories, variants, inventory, tags, and journal content. The repository owns layout, interaction, generated editorial imagery, configuration, and deployment.

Merchant facts that were not verified—email, phone, street address, company registration, opening hours, legal jurisdiction, and production return terms—were not inferred. Pages retain visible demonstration notices and explicit unfilled tokens.

## Reference comparison

Three current furniture storefronts were compared on 19 August 2026:

1. **Memoky** — strongest information hierarchy for this brief: slim utility bar, logo plus broad search, room-led secondary navigation, large editorial hero, visual room shortcuts, dense product merchandising, and a split product-detail layout.
2. **Article** — useful for its room taxonomy, high-density catalog grid, combined sort/filter controls, material/color filters, and repeated service reassurance after product listings.
3. **West Elm** — useful for category storytelling, new-arrival merchandising, room-based discovery, and a balance between editorial photography and shoppable product modules.

Homex adopts those general patterns but uses its own name, warm neutral palette, Caslon/DM Sans type pairing, copy, layout proportions, generated photography, and product data. Memoky's logo, product photos, legal copy, promotional copy, source code, and distinctive trade dress were not copied.

## Visual system

- Warm ivory surfaces, walnut/graphite text, muted terracotta accents, and brass calls to action.
- Search-led desktop header with a second room-navigation row; compact two-row mobile header.
- Original editorial hero and two supporting room scenes generated specifically for Homex.
- Desktop hero keeps text below 55% of the canvas; tablet separates image and copy; mobile uses a deliberate 24 px card overlap.
- Home categories feature six rooms at a time while the menu and shop expose all 15 categories.
- Category media occupies 69% of each card; the transparent subject is constrained to 70% width and height with `object-fit: contain`.
- Product grids use four columns on wide desktop, three on smaller desktop/tablet, and two on mobile.

## Catalog and merchandising

The final catalog contains 100 physical products and 133 variants across 15 categories. Category display titles are human-readable (for example, `Dining Table`) while URL slugs remain machine-safe (`dining-table`). Color variants point to corresponding gallery imagery. The two survey tags are assigned to disjoint sets: 20 `trending` and 20 `Best seller` products.

Exactly six furniture journal articles remain published after removing four unrelated seed articles. Each has a rectangular cover image and approximately 100 words of original furniture guidance.

## Reliability and accessibility

- Shared header, footer, drawers, bag, search, and account panels are injected from one runtime component to prevent route drift.
- No-JavaScript fallback identity was also converted to Homex so stale template branding cannot flash before hydration.
- Related-product controls stay hidden until related data exists.
- Every newsletter form instance is wired, not only the first one on a page.
- Desktop, tablet, and mobile hero geometry has a dedicated regression check.
- Template portability is checked with a synthetic shop whose category ids are unrelated to Homex.
- Policy anchors, footer routes, image containment, alt text, target sizes, overflow, and font loading are checked automatically.

## Known merchant-owned follow-ups

- Replace demonstration policy/contact content with merchant-approved legal and support information.
- Decide whether the demo checkout should be connected to real order creation and payment.
- Supply exact social profile URLs if social icons should become outbound links.

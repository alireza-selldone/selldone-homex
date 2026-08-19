# Homex content-page sources

The Markdown files in this folder generate the Homex About, Terms, Privacy, and Contact pages through `npm run build:pages`.

`shop.config.json` supplies verified shop identity fields. Merchant-owned facts such as email, phone, address, company registration, opening hours, jurisdiction, and final legal policy must not be invented. Until the merchant supplies them, the generated pages keep a clear demonstration notice and render the corresponding tokens visibly.

After editing a Markdown source, run:

```bash
npm run build:pages
npm run build
```

Then verify `/about-us`, `/terms`, `/privacy`, and `/contact-us` at desktop and mobile widths.

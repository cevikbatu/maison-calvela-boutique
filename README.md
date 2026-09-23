# Maison Calvela 

Create a brand-new Lovable project named "Maison Calvela". This is a premium fashion e-commerce site that replaces and improves an older Bolt-based Maison Calvela site.

PRIMARY GOAL
Build a refined, modern, luxury Turkish e-commerce storefront for Maison Calvela with BOTH women's and men's fashion. The brand should feel premium, contemporary, clean, editorial and commercially credible—not like a generic template.

BRAND DIRECTION
- Brand: Maison Calvela
- Language: Turkish
- Visual identity: luxury, minimal, modern, elegant, premium
- Core palette: white background, black typography, restrained warm-gold accents
- Avoid eye strain, clutter, overly dark layouts, cheap gradients, or generic SaaS styling
- Typography should feel fashion-editorial and upscale
- Use generous whitespace, strong imagery, polished micro-interactions
- Make the Maison Calvela branding visually dominant but tasteful

LOGO / BRAND MARK
- Use a refined Maison Calvela wordmark plus an elegant MC monogram treatment consistent with the approved brand direction.
- Do NOT include a star.
- Do NOT include "EST. 2026".
- Keep the logo elegant, patent-friendly, simple, premium, and suitable for embroidery/garment branding.
- Use the logo in header, footer, product presentation, packaging-style details, and editorial sections.
- Since the exact previously approved logo asset is not attached here, create the site with a clean replaceable logo asset slot and use a temporary vector-style mark consistent with this brief. Keep the component isolated so the exact approved logo can be swapped in later without redesign.

CATALOG-INSPIRED PRODUCT DIRECTION
The product visual language should be inspired by a Maison Calvela fashion catalog:
- premium silhouettes
- refined materials
- fashion-forward but wearable
- modern European luxury feel
- clean styling, subtle branding
- commercial but distinctive
Use these product categories for BOTH women and men:
1) T-shirt
2) Polo yaka
3) Uzun kollu

The old version was male-only. This new project must balance women's and men's collections equally.

IMPORTANT IMAGE / MODEL DIRECTION
- Hero and campaign visuals should feature attractive, polished male and female fashion models
- Models should communicate luxury, quality, confidence, modernity
- Garments shown on models should visually match Maison Calvela's own collection language
- Garments should visibly carry tasteful Maison Calvela branding/logo placement
- Avoid stock-photo feeling, random logos, irrelevant garments, or mismatched fashion
- Keep imagery editorial, luxury-campaign quality, clean backgrounds, strong clothing focus
- If generated placeholder visuals are used, structure the site so all imagery can easily be replaced later with exact Maison Calvela catalog assets

SITE STRUCTURE
Header:
- Maison Calvela logo
- Ana Sayfa
- Kadın
- Erkek
- Yeni Gelenler
- Koleksiyon
- Hakkımızda
- İletişim
- Arama
- Favoriler
- Sepet
- Profil

Home page:
1. Premium hero section
   - Maison Calvela statement
   - female + male fashion imagery
   - CTAs: "Kadın Koleksiyonu", "Erkek Koleksiyonu", "Yeni Gelenler"
2. Featured categories
   - Kadın T-shirt
   - Kadın Polo Yaka
   - Kadın Uzun Kollu
   - Erkek T-shirt
   - Erkek Polo Yaka
   - Erkek Uzun Kollu
3. Yeni Gelenler
4. Öne Çıkan Ürünler
5. Editorial / Lookbook section
6. Short premium brand story
7. Newsletter / membership area
8. Footer with:
   - Hakkımızda
   - İletişim
   - Teslimat
   - İade
   - Gizlilik
   - Sosyal medya

CATEGORY PAGES
Separate women and men experiences:
Kadın:
- T-shirt
- Polo yaka
- Uzun kollu

Erkek:
- T-shirt
- Polo yaka
- Uzun kollu

Each category experience should support:
- filters
- sorting
- size
- price
- quick view
- favorites
- clean product cards
- responsive grid
- strong product photography
- visible price and color options where appropriate

PRODUCT DETAIL PAGE
Include:
- large image gallery
- product name
- price
- color
- size selection
- quantity
- add to cart
- add to favorites
- product description
- fabric / material details
- fit information
- care information
- shipping / returns summary
- similar products
- "Bu görünümü tamamla" recommendations

ADMIN / PRODUCT MANAGEMENT
Prepare a private admin architecture that regular visitors cannot access.
It should be suitable for:
- adding/editing/removing products
- product title
- gender
- category
- price
- sale price
- sizes
- colors
- inventory
- description
- images
- featured/new-arrival state
- visibility
- collection assignment
Keep it ready for Supabase integration.

TECHNICAL REQUIREMENTS
- Full responsive design
- Excellent iPhone/mobile usability
- Desktop and tablet polished
- Clean React/TypeScript structure
- Tailwind + shadcn/ui styling
- Reusable components
- Clear product data model
- Clear category model
- Ready for Supabase
- Prepare data structures for:
  products
  categories
  collections
  profiles
  favorites
  cart
  orders
  order_items
  product_images
  product_variants
- Do not expose secrets
- Do not create insecure fake auth
- Keep admin routes architecturally separated and ready for role-based authorization
- Use placeholder local mock data initially if database connection is not yet configured

UX REQUIREMENTS
- Search must not crowd "Hakkımızda"
- Header spacing should be visually balanced
- Maison Calvela branding must never overlap page headings
- Luxury but practical navigation
- Fast-feeling transitions
- Sticky/minimal header behavior where appropriate
- Accessible contrast
- Turkish copy throughout

PRODUCT SEED DATA
Create a tasteful initial demo collection so the site is visually complete:
- 6 women's products: 2 T-shirt, 2 polo, 2 long sleeve
- 6 men's products: 2 T-shirt, 2 polo, 2 long sleeve
Use premium Maison Calvela-style Turkish product names and realistic TRY prices.
These are DEMO products only and must be clearly structured so they can be replaced by the owner's real inventory later.

IMPORTANT:
Do not make this look like a generic Shopify clone.
Design it like a real emerging European premium fashion house.
Prioritize brand prestige, visual identity, elegant product storytelling, and a clean conversion-focused shopping experience.

Build the first complete working version now.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e230c0b3-cb3f-43f3-a6c8-ae3b53811a17).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

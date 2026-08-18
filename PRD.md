# Ya Gameela V1 Product Requirements Document

## Summary

Ya Gameela V1 is a production-ready marketing catalog with a custom content management system. It targets young, women-first and unisex shoppers globally with an accessible-premium, soft-feminine identity.

The primary goal is to generate qualified product inquiries. Supporting goals are increasing catalog engagement and growing the brand's Instagram and TikTok audiences. Ecommerce functionality will be developed separately in V2.

## Product Requirements

- Provide a fixed-layout homepage, searchable shop, editable category pages, product details, contact page, privacy policy, and terms page.
- Seed Perfumes, Bags, Beauty, and Clothing as editable top-level categories. Administrators can create additional categories and subcategories.
- Provide text search, category-specific filters, availability and price filters, and featured, newest, and price sorting.
- Support structured product variants such as perfume volume, beauty shade, bag color and size, and clothing size and color.
- Display regular prices only, with variant-level availability statuses: available, low stock, coming soon, and unavailable.
- Use AED as the initial global base currency. The administrator may select AED, USD, or PHP as the global base currency.
- Automatically detect the visitor's country and display an estimated conversion in the country's local currency. V1 will not include a visitor-facing currency selector.
- Fall back to the configured base currency when location detection or currency conversion is unavailable.
- When changing the global base currency, show a preview of the exchange rate and affected prices. Require confirmation before converting all catalog prices atomically.
- Provide product-specific WhatsApp inquiry links and a website inquiry form.
- Collect the customer's name, email, optional phone or WhatsApp number, country, message, and prefilled product and variant context.
- Persist website inquiries before attempting to send an email notification.
- Allow the administrator to mark inquiries as read, archive or restore them, and permanently delete them.
- Retain inquiries until the administrator deletes them. Disclose this retention policy and support customer deletion requests.
- Track page views, searches, product views, completed inquiry forms, WhatsApp clicks, and Instagram and TikTok clicks.

### Out of Scope for V1

- Cart and checkout
- Payments, taxes, shipping calculations, and orders
- Customer accounts and wishlists
- Inventory quantities
- Sale or promotional pricing
- Newsletter signup
- Multiple product brands
- Multilingual content
- Blog or editorial publishing

## Storefront Experience

### Homepage

The homepage uses a fixed sequence of sections whose content can be changed through the CMS:

1. Optional announcement bar
2. Header and primary navigation
3. Hero campaign
4. Featured categories
5. Featured products
6. New arrivals
7. Brand or promotional banner
8. Instagram and TikTok call to action
9. Footer with contact and legal links

Administrators can edit copy, imagery, links, and selected products or categories but cannot construct arbitrary layouts or reorder the sections.

### Catalog

- Support editable top-level categories and subcategories.
- Search product names, descriptions, categories, and relevant tags.
- Filter by category, subcategory, price range, availability, and category-specific attributes.
- Sort by featured, newest, price low to high, and price high to low.
- Paginate results appropriately for an initial catalog of fewer than 100 products.

### Product Details

Each published product can contain:

- Name, slug, short description, and full description
- Category and optional subcategory
- Image gallery with required alternative text
- Category-specific specifications
- Structured option groups and variants
- Optional internal SKU for future V2 use
- Variant price and availability status
- Featured and new-arrival controls
- SEO title, description, and social image
- Related products

Unavailable and coming-soon products remain discoverable. Their inquiry labels should adapt to actions such as asking about restocking or requesting updates.

### Inquiries

- WhatsApp actions open a prefilled conversation containing the product, selected variant, and product URL.
- Website product inquiries are prefilled with the same product and variant context.
- The contact page also supports general inquiries without product context.
- Successful submissions show a clear confirmation and do not create duplicate inquiries when retried.
- Add server-side validation, rate limiting, and bot protection.
- Inquiry forms must include consent to the privacy policy.

## CMS Requirements

### Authentication and Authorization

- Use Google OAuth through Supabase.
- Restrict CMS access to one configured Gmail address.
- Deny access to every other authenticated Google account.
- Require Google two-step verification as an operational launch requirement.
- Enforce authorization on the server and through Supabase row-level security.

### Admin Areas

- Dashboard with catalog and unread-inquiry summaries
- Products and variants
- Categories and subcategories
- Fixed homepage content
- Media library
- Inquiry inbox
- Privacy and terms content
- Contact, WhatsApp, and social settings
- Default SEO settings
- Global currency settings

### Content Workflow

- Support draft, protected preview, publish, and unpublish states.
- Keep draft and preview content out of search engines.
- Revalidate affected public pages after publishing or unpublishing content.
- Prevent deletion of categories that are still assigned to products unless those products are reassigned.

## Technical Design

- Continue using Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4.
- Use Supabase for PostgreSQL, Google authentication, row-level security, and media storage.
- Use Resend for inquiry email notifications.
- Use ExchangeRate-API for daily exchange-rate data and cache the last successful snapshot in the database.
- Use the last successful exchange-rate snapshot when the provider is temporarily unavailable. If no rate exists for the detected currency, display the base price.
- Label all converted amounts as estimates and state that final pricing is confirmed during an inquiry.
- Use Vercel Analytics to measure traffic and defined conversion events.
- Keep service credentials and administrator configuration in protected environment variables.
- Expose no external public application API in V1.

### Core Data Contracts

The implementation should define validated application contracts for:

- `Product`
- `ProductVariant`
- `Category`
- `HomepageContent`
- `SiteSettings`
- `Inquiry`
- `MediaAsset`
- `ExchangeRateSnapshot`

The data model should preserve stable product and variant identifiers so V2 ecommerce records can reference the same catalog without a destructive migration.

## Design and Content Direction

- Use a soft-feminine, accessible-premium visual system aimed at younger shoppers.
- Combine elegant typography, blush or warm neutral colors, generous imagery, and restrained accents.
- Create mixed lifestyle and still-life AI campaign visuals, subject to owner approval.
- Use accurate real photography for individual products. Generated imagery must not misrepresent an actual item's appearance or features.
- Build mobile-first layouts that remain polished across phones, tablets, laptops, and wide desktop screens.
- Meet WCAG 2.2 AA accessibility expectations, including keyboard operation, visible focus states, semantic structure, sufficient contrast, and useful alternative text.

## SEO and Performance

- Render public catalog content for search-engine discovery.
- Generate page metadata, canonical URLs, XML sitemap, and robots directives.
- Provide Open Graph images and Product and Breadcrumb structured data where appropriate.
- Prevent indexing of admin, authentication, draft, and preview routes.
- Optimize responsive images and fonts and minimize unnecessary client-side JavaScript.
- Target Lighthouse scores of at least 90 for performance, accessibility, best practices, and SEO on representative production pages.

## Analytics and Success Measures

Primary KPI:

- Qualified website inquiry submissions and product-specific WhatsApp inquiry starts

Supporting KPIs:

- Product and category views
- Search and filter usage
- Catalog-to-product-detail engagement
- Instagram and TikTok outbound clicks
- Returning visitors and traffic sources

Initial numerical targets will be established after collecting a 30-day production baseline.

## Validation and Acceptance

### Automated Testing

- Unit-test country-to-currency mapping, conversion, formatting, rounding, stale-rate fallback, and base-currency migration.
- Unit-test inquiry and catalog validation, variant rules, and availability behavior.
- Integration-test Google account allowlisting and Supabase authorization policies.
- Integration-test product and category CRUD, draft previews, publishing, and cache revalidation.
- Integration-test inquiry persistence, email notification failures, archiving, restoration, and permanent deletion.
- End-to-end test product discovery, filtering, sorting, variant selection, localized prices, both inquiry paths, and essential CMS workflows.

### Launch Acceptance

- Validate mobile, tablet, and desktop layouts in current major browsers.
- Verify keyboard navigation and screen-reader labels.
- Confirm admin and preview content cannot be publicly indexed or accessed without authorization.
- Confirm secrets and protected records are not exposed to the browser.
- Confirm analytics events in the production dashboard.
- Replace all development placeholders with approved launch content.
- Complete a final review of currency disclaimers, privacy terms, and inquiry retention language.

## Delivery and Dependencies

The target is a balanced, production-ready implementation over approximately four to six weeks after required accounts and content are available.

Launch dependencies include:

- Final logo and favicon
- Real product data and photography
- Approved AI-generated campaign visuals
- Authorized administrator Gmail address
- WhatsApp business number
- Inquiry notification email address
- Instagram and TikTok URLs
- Approved privacy and terms copy
- Custom domain and DNS access
- Verified sending domain for email notifications
- Supabase, Resend, exchange-rate, analytics, and hosting configuration

Vercel Hobby may be used for private development. Public production hosting must use a plan that permits commercial use; Vercel Pro is the preferred deployment target.

Legal and privacy content must be supplied or reviewed by the owner or a qualified legal professional before launch.

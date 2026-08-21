# Ya Gameela V1 Implementation Tasks

This roadmap turns the approved [product requirements](PRD.md), [architecture](ARCHITECTURE.md), and [agent workflow](AGENTS.md) into an ordered implementation sequence for the V1 marketing catalog and CMS.

## How to Use This Roadmap

- Work on one top-level task at a time and normally follow numerical order.
- Before changing code, configuration, schema, dependencies, or providers, inspect the affected area, present a concise task plan, and obtain the approval required by `AGENTS.md`.
- Obtain explicit approval before every package installation and external-provider change.
- Treat each **Setup** entry as a prerequisite, not as permission to change an external system.
- Keep the application buildable and preserve unrelated work after every task.
- Check a task only after its deliverables and focused verification are complete. If blocked, leave it unchecked and record the blocker in the handoff.
- Placeholder content is acceptable through prelaunch work, but it must remain identifiable and cannot satisfy Task 33.
- Update this roadmap with `PRD.md` or `ARCHITECTURE.md` whenever an approved product or architecture change alters the remaining work.

## Foundation

- [x] **1. Establish the repository and runtime baseline**
  - **Depends on:** None.
  - **Setup:** Confirm the development machine can run Node.js 24 LTS and identify the exact npm version to pin; read the installed Next.js guides for configuration and Cache Components.
  - **Deliver:** Pin Node.js and npm in repository metadata, add the agreed format/type/test scripts without installing packages, enable Next.js 16 Cache Components, and document the standard local commands.
  - **Verify:** Check runtime/version declarations, run existing lint, type, and production-build commands, and confirm no generated or unrelated files entered the diff.
  - **Complete when:** A clean checkout uses the documented Node/npm versions and the unchanged starter passes the available baseline checks.

- [x] **2. Install the approved application and testing foundations**
  - **Depends on:** Task 1.
  - **Setup:** Present one exact dependency/version proposal and obtain approval before each `npm install`; cover Supabase SSR/client libraries, Zod, `server-only`, decimal money arithmetic, Resend, Vercel integrations, owned shadcn/Radix utilities, Vitest, Testing Library, Playwright, and formatting tools.
  - **Deliver:** Install only approved packages, keep lockfile changes paired with them, configure unit/component/browser test entry points, and add a minimal passing test at each configured layer that does not require Supabase.
  - **Verify:** Run formatting checks, ESLint, TypeScript, the starter unit/component tests, Playwright discovery, and a production build.
  - **Complete when:** Every required tool has an approved, locked dependency and repeatable npm script, with no unused package added speculatively.

- [x] **3. Create the modular application foundation**
  - **Depends on:** Task 2.
  - **Setup:** Read the installed Next.js guidance for Server Components, Server Actions, data security, route groups, and environment variables.
  - **Deliver:** Establish the documented `app`, `modules`, `components`, and `lib` boundaries; add server-only import guards, common DTO and `ActionResult` conventions, validated environment access, correlation IDs, and allowlisted structured logging with PII redaction.
  - **Verify:** Test valid/invalid environment loading and log redaction, run dependency-boundary checks where configured, then run focused lint, types, tests, and build verification.
  - **Complete when:** New features have canonical locations and browser code cannot import server-only clients, secrets, provider payloads, or raw database rows.

- [x] **4. Set up local Supabase**
  - **Depends on:** Tasks 2–3.
  - **Setup:** Confirm Docker is available; propose and obtain approval for the Supabase CLI installation method; no production Supabase project or credential is required.
  - **Deliver:** Add local Supabase configuration, ordered migration and pgTAP directories, deterministic seed data, local-only test identities, database reset/test/type-generation scripts, and setup documentation.
  - **Verify:** Start local services, rebuild from an empty database, apply seed data, run a starter pgTAP test, regenerate checked-in TypeScript database types, and stop services cleanly.
  - **Complete when:** A contributor can reproduce the local database and generated types from repository files alone.

- [x] **5. Build core database security primitives**
  - **Depends on:** Task 4.
  - **Setup:** Define the migration boundary for admin identity, append-only audit events, release foundations, shared update timestamps, job tracking, and authorization helpers.
  - **Deliver:** Add UUID/UTC conventions, `admin_accounts`, PII-safe `admin_audit_events`, release shell tables, `job_runs`, hardened `is_admin()` and security-definer patterns, grants, baseline RLS, and minimum-exposure policies.
  - **Verify:** Run migrations from empty and prior states, pgTAP tests for anonymous/admin/system access, function `search_path` and execution grants, audit immutability, constraints, and generated-type consistency.
  - **Complete when:** Every foundational table has explicit RLS/grants and critical authorization invariants are enforced and tested in PostgreSQL.

- [x] **6. Implement Google OAuth and the protected CMS shell**
  - **Depends on:** Tasks 3–5.
  - **Setup:** Configure local Supabase Google OAuth callbacks and local test values for `ADMIN_EMAIL`; production Google/Supabase configuration remains deferred to Task 32.
  - **Deliver:** Add typed browser/server/proxy Supabase clients, PKCE sign-in and callback, server-confirmed claim validation, normalized Gmail allowlisting, first-login ID binding, protected admin layout, sign-out, safe redirects, and admin/auth `noindex` behavior.
  - **Verify:** Test the approved account, rejected accounts, forged or stale sessions, callback/state failures, direct Server Action invocation, sign-out, RLS enforcement, and authenticated route behavior.
  - **Complete when:** Only the bound administrator can enter the CMS or execute protected application/database operations.

## Catalog and Publishing

- [x] **7. Implement categories and field schemas**
  - **Depends on:** Tasks 5–6.
  - **Setup:** Lock validation rules for two taxonomy levels and text, number, measurement, boolean, select, and multi-select specification fields from the architecture.
  - **Deliver:** Add stable category identities and immutable versions, parent/depth/slug constraints, field-schema validation, archive/reassignment safeguards, DTOs, server-only DAL/services, authorized actions, and accessible category CMS screens.
  - **Verify:** Test CRUD drafts, two-level limits, slug uniqueness, invalid field definitions, referenced-category deletion denial, optimistic conflicts, RLS, and CMS keyboard/form behavior.
  - **Complete when:** The administrator can safely manage category drafts and schemas without exposing drafts or raw rows publicly.

- [x] **8. Implement media management**
  - **Depends on:** Tasks 5–7.
  - **Setup:** Configure the local public bucket through migrations; define JPEG, PNG, WebP, and AVIF validation with the 10 MB source limit; prepare an owner-controlled archive procedure.
  - **Deliver:** Add UUID object paths, admin-only write policies, file extension/MIME/signature/size/dimension checks, metadata/checksum/alt/source records, media CMS upload and metadata flows, reference-aware deletion, and orphan reporting.
  - **Verify:** Test anonymous denial, approved uploads, spoofed/oversized/SVG/HTML rejection, required alt text, referenced deletion denial, orphan behavior, and responsive `next/image` rendering.
  - **Complete when:** Approved media can be managed safely and every usable asset has validated database metadata and alternative text.

- [ ] **9. Implement products and variants**
  - **Depends on:** Tasks 7–8.
  - **Setup:** Confirm minor-unit handling for AED/USD/PHP, the four availability values, maximum three option groups, optional unique SKUs, and category-schema validation rules.
  - **Deliver:** Add stable product/variant identities and immutable versions, draft copy and SEO fields, category/specifications, merchandising flags, media ordering, related products, option combinations, prices, availability, DTOs, DAL/services/actions, and product CMS workflows.
  - **Verify:** Test variant combinations, SKU uniqueness, money bounds, invalid specifications, missing media/alt text, relations, archive behavior, stale edits, authorization, and accessible complex-form interactions.
  - **Complete when:** A complete product with valid variants can be drafted and edited without weakening version, category, media, or authorization invariants.

- [ ] **10. Build the published catalog DAL and search**
  - **Depends on:** Tasks 7–9.
  - **Setup:** Define canonical URL parameters for query, category, subcategory, price, availability, specification filters, sort, and page; keep offset pagination with stable product-ID tie-breaking.
  - **Deliver:** Add security-invoker published projections or restricted functions, weighted full-text vectors and GIN indexes, composable parameterized queries, minimal product/category DTOs, and DAL methods that never return drafts or raw generated rows.
  - **Verify:** Test search weighting, combined filters, all sorts, pagination stability, malformed parameters, empty results, archived/unpublished exclusion, anonymous RLS, query plans, and DTO serialization.
  - **Complete when:** Storefront data can be queried securely and deterministically for the complete V1 catalog experience.

- [ ] **11. Implement homepage, legal, and site settings content**
  - **Depends on:** Tasks 6, 8–9.
  - **Setup:** Use the fixed homepage section order; seed privacy/terms identities and AED as the initial base currency; identify contact, WhatsApp, social, and default SEO validation rules.
  - **Deliver:** Add immutable homepage/legal versions, fixed-section schemas, non-secret site settings, CMS screens for homepage, privacy, terms, contact/social/SEO/currency values, authorized actions, audit hooks, and minimal public DTOs.
  - **Verify:** Test fixed order enforcement, required links/content, invalid URLs/currencies, draft isolation, authorization, optimistic conflicts, settings cache-tag planning, and accessible CMS forms.
  - **Complete when:** All non-catalog storefront content and non-secret settings can be safely drafted or managed through the CMS.

- [ ] **12. Implement atomic releases and rollback**
  - **Depends on:** Tasks 7–11.
  - **Setup:** Define release validation errors and affected cache tags for categories, products/variants, homepage, and legal pages; preserve current published pointers during editing.
  - **Deliver:** Add release membership/publication records, optimistic tokens, complete resulting-storefront validation, one locked restricted publish function, publish/unpublish actions, immutable history, rollback as a new release, audit events, and cache-outbox insertion in the same transaction.
  - **Verify:** Test successful multi-entity release, every validation failure, concurrent/stale publish, partial-failure rollback, immutable published versions, unpublish, rollback history, RLS/function grants, and audit/cache records.
  - **Complete when:** A release changes every intended published pointer or none, and prior published content remains visible after any failure.

- [ ] **13. Implement protected Draft Mode preview**
  - **Depends on:** Tasks 6 and 12.
  - **Setup:** Read the installed Next.js Draft Mode and async request API guides; configure local signing secrets and approved callback origins.
  - **Deliver:** Add authenticated preview enable/disable handlers, signed HTTP-only release identifiers, draft-overlay DAL reads, dynamic cache bypass, release authorization, private cache headers, and `noindex` metadata.
  - **Verify:** Test valid preview, tampered/expired identifiers, unauthorized access, disabled preview, concurrent releases, draft/public separation, indexing headers, and cache isolation.
  - **Complete when:** The administrator can preview one release accurately while anonymous visitors and search engines see only published content.

- [ ] **14. Implement cache invalidation and slug redirects**
  - **Depends on:** Tasks 10 and 12–13.
  - **Setup:** Read the installed Next.js caching/revalidation guides and define tag ownership for catalog, products, categories, homepage, settings, legal pages, and rates.
  - **Deliver:** Add explicit cache lifetimes/tags to public DAL reads, post-commit invalidation, a secured idempotent cache-outbox retry path, health visibility, old-slug records, flattened redirect creation, canonical lookup, and permanent `308` responses.
  - **Verify:** Test tag selection, no invalidation before commit, retry after application failure, duplicate jobs, product/category slug changes, redirect flattening/loops, canonical metadata, and preview bypass.
  - **Complete when:** Published changes become visible through precise recoverable invalidation and every historical slug reaches its canonical URL directly.

## Currency and Storefront

- [ ] **15. Implement exchange-rate snapshots**
  - **Depends on:** Tasks 3–5.
  - **Setup:** Create validated success, invalid, rate-limited, timeout, and unavailable ExchangeRate-API fixtures; use mocks locally and defer production credentials.
  - **Deliver:** Add snapshot/proposal schema foundations, a server-only provider adapter with timeout and response validation, normalized rates, idempotent refresh service/job, current-rate DAL, job records, and 48-hour warning/seven-day critical health calculations.
  - **Verify:** Test valid ingestion, malformed responses, provider failure, duplicate refresh, base/rate validation, last-successful indefinite fallback, no-initial-snapshot behavior, staleness boundaries, and RLS.
  - **Complete when:** The application has an authoritative, observable exchange snapshot without depending on provider availability during requests.

- [ ] **16. Implement localized pricing**
  - **Depends on:** Tasks 10 and 15.
  - **Setup:** Add a reviewed ISO country-to-currency map and native currency precision table; read installed Next.js Proxy/request/caching documentation.
  - **Deliver:** Add trusted country derivation in `proxy.ts`, spoof-resistant internal forwarding, decimal half-up conversion/formatting, streamed request-specific price components, estimate messaging, fallback rules, and conversion of local filter bounds back to base currency.
  - **Verify:** Test supported/unsupported countries, zero/two/three-decimal currencies, rounding edges, stale snapshots, absent rates, spoofed headers, localized filters, streaming behavior, hydration, and base-price SEO separation.
  - **Complete when:** Visitors see only the detected local estimate when possible, while catalog queries and authoritative data remain in the configured base currency.

- [ ] **17. Implement base-currency releases**
  - **Depends on:** Tasks 12 and 15–16.
  - **Setup:** Use only AED, USD, and PHP; define proposal expiry/conflict behavior around the architecture's exact snapshot and content-hash requirements.
  - **Deliver:** Add authorized proposal generation, timestamp/affected-count/examples/rounding preview, proposal hash confirmation, serializable locked conversion, native precision, new versioned prices, base-setting change, atomic publish, and PII-safe audit records.
  - **Verify:** Test every currency pair, rounding, changed prices/settings/rates, stale or replayed proposals, concurrent edits, transaction failure, release history, cache tags, and authorization.
  - **Complete when:** Confirmed conversion atomically updates every authoritative variant price and the global base currency from the exact preview shown.

- [ ] **18. Build the Ya Gameela design system and storefront shell**
  - **Depends on:** Tasks 2–3 and 11.
  - **Setup:** Obtain approval for final brand assets when available; placeholders must be labeled; approve any additional Radix package before installation.
  - **Deliver:** Add soft-feminine accessible-premium design tokens, typography, owned primitives, responsive grids/containers, header, navigation, optional announcement bar, footer, loading/error/empty states, and reusable image/content patterns.
  - **Verify:** Run component tests and browser QA across phone/tablet/desktop widths for semantics, keyboard navigation, focus, contrast, reduced motion, landmarks, overflow, and console errors.
  - **Complete when:** Public routes can share a polished mobile-first shell and accessible component foundation without duplicating one-off UI.

- [ ] **19. Build the public homepage**
  - **Depends on:** Tasks 10–12, 16, and 18.
  - **Setup:** Seed representative placeholder homepage content, products, categories, and media; do not classify it as launch content.
  - **Deliver:** Render the fixed announcement/header/hero/categories/products/new arrivals/banner/social/footer sequence from published DTOs, with responsive media, cached non-price content, streamed localized prices, and resilient empty sections.
  - **Verify:** Test section order and optional content, publish/cache behavior, links, image sizes/alt text, localized prices, loading/failure states, responsive layouts, keyboard/screen-reader behavior, and client-JavaScript budget.
  - **Complete when:** The published CMS selection drives the full accessible homepage without allowing arbitrary layout construction.

- [ ] **20. Build shop and category browsing**
  - **Depends on:** Tasks 10, 14, 16, and 18.
  - **Setup:** Use the canonical URL contract from Task 10 and representative data for every filter/type/availability state.
  - **Deliver:** Add `/shop` and category routes, search, category/subcategory/custom-field/availability/local-price filters, featured/newest/price sorts, pagination, accessible mobile filter controls, active-filter summaries, and empty/error states.
  - **Verify:** Test composable and malformed URLs, back/forward/share behavior, local-to-base bounds, stable pagination, all filters/sorts, cached category content versus dynamic results, `308` redirects, responsive keyboard use, and no-results recovery.
  - **Complete when:** Visitors can discover every published product through URL-addressable, accessible, correctly localized catalog controls.

- [ ] **21. Build product details**
  - **Depends on:** Tasks 9–11, 14, 16, and 18.
  - **Setup:** Seed products covering multiple option groups and every availability state; configure a local placeholder WhatsApp setting.
  - **Deliver:** Add canonical product routes with gallery, copy, specifications, variant selection, availability-aware labels, localized estimates, related products, and properly encoded WhatsApp links containing product, variant, and canonical URL.
  - **Verify:** Test variant combinations and price/availability updates, gallery alt text, unavailable/coming-soon actions, related products, missing optional data, old slugs, WhatsApp encoding, responsive/keyboard behavior, and minimal client state.
  - **Complete when:** A visitor can understand a product, select a valid variant, and begin a correctly contextualized WhatsApp inquiry.

- [ ] **22. Implement website inquiry capture**
  - **Depends on:** Tasks 5, 9, 18, and 21.
  - **Setup:** Add local Turnstile fixtures/test keys and rate-limit HMAC secret; production keys remain deferred; finalize field limits and privacy-consent wording from the PRD/legal review.
  - **Deliver:** Add inquiry/rate-limit/outbox schema, general and product forms, `InquiryCommand` validation, client UUID idempotency, product/variant context, consent timestamp, honeypot, server-side Turnstile, short-lived HMAC IP/email limits, and one transactional inquiry/outbox function.
  - **Verify:** Test valid/general/product submissions, duplicate retries, malformed/stale product context, absent consent, honeypot, Turnstile failure, both rate limits, raw-IP non-storage, PII-safe errors/logs/audit, database failure, and accessible form feedback.
  - **Complete when:** A successful response always represents one durable inquiry and one email job, while abuse and retries cannot create duplicates.

- [ ] **23. Implement Resend delivery and the email outbox**
  - **Depends on:** Task 22.
  - **Setup:** Use mocked Resend fixtures locally; approve the SDK in Task 2 or before installation; production API key, sender domain, and recipient remain deferred.
  - **Deliver:** Add escaped maintained text/HTML templates, PII-free subjects, immediate post-commit attempt, concurrency-safe claiming, provider idempotency, retries near 5 minutes/30 minutes/2 hours/8 hours/24 hours, terminal state, manual retry service, and sanitized job logging.
  - **Verify:** Test success, timeout, invalid/rate-limited responses, process interruption, overlapping workers, retry timing, provider IDs, terminal/manual retry, inquiry preservation, permanent deletion interaction, and absence of PII in subjects/logs/audit.
  - **Complete when:** Email failure can never lose or duplicate an inquiry and every unresolved job is observable and safely retryable.

- [ ] **24. Build the inquiry CMS**
  - **Depends on:** Tasks 6 and 22–23.
  - **Setup:** Seed synthetic inquiries and job states only; never use production PII in local data, fixtures, snapshots, or screenshots.
  - **Deliver:** Add authorized inbox/list/detail DTOs, unread/read state, archive/restore, permanent deletion confirmation, email status/manual retry, product/variant context, safe message rendering, filtering/pagination, and opaque audit events.
  - **Verify:** Test every state transition, unauthorized access, concurrent updates, permanent deletion of live PII and unsent jobs, delivered-email limitation messaging, retry eligibility, output escaping, and keyboard/screen-reader workflows.
  - **Complete when:** The administrator can manage the full inquiry lifecycle without leaking customer data or rewriting audit history.

- [ ] **25. Build the CMS dashboard and health area**
  - **Depends on:** Tasks 6, 9, 14–15, and 23–24.
  - **Setup:** Define healthy, warning, and critical presentation for rates, email jobs, invalidation jobs, job runs, backup confirmation, and critical audit events.
  - **Deliver:** Add authorized aggregate DTOs, catalog/unread-inquiry summaries, system health cards, failed-job actions/links, latest job and backup status, critical audit feed, and protected `/api/health` behavior without exposing secrets or PII.
  - **Verify:** Test all health thresholds and empty/failure states, aggregation accuracy, authorization, redaction, responsive layout, keyboard access, and provider/database degradation behavior.
  - **Complete when:** The administrator can identify and act on V1 operational failures from one protected dashboard.

## Platform Completion

- [ ] **26. Implement SEO and discovery**
  - **Depends on:** Tasks 11 and 19–21.
  - **Setup:** Confirm canonical production origin handling and prepare approved default SEO/social-image placeholders pending Task 33.
  - **Deliver:** Add route metadata, canonical URLs, Open Graph data, XML sitemap, robots directives, Product and Breadcrumb structured data, base-currency authoritative prices, and explicit exclusion for admin/auth/preview/drafts.
  - **Verify:** Test metadata for homepage/category/product/legal routes, escaping and valid structured data, slug redirects/canonicals, sitemap publication filtering, robots/indexability, social fallbacks, and no localized estimate in Product price data.
  - **Complete when:** Search engines can discover only canonical published storefront content with accurate non-estimated structured data.

- [ ] **27. Implement privacy-safe analytics**
  - **Depends on:** Tasks 19–24.
  - **Setup:** Approve any analytics dependency/provider configuration and define a typed allowlist for page, category, product, search/filter, inquiry-complete, WhatsApp, Instagram, and TikTok events.
  - **Deliver:** Add Vercel Analytics and minimal client event boundaries with opaque product/category identifiers or non-sensitive properties, graceful provider failure, and documentation prohibiting inquiry/contact/admin data.
  - **Verify:** Test event names/properties, duplicate interaction prevention, successful-inquiry-only completion, outbound clicks, navigation events, disabled/provider-failure behavior, and automated rejection of disallowed PII keys.
  - **Complete when:** Every approved KPI is measurable without placing PII or secrets in analytics payloads.

- [ ] **28. Implement maintenance mode and browser security**
  - **Depends on:** Tasks 6 and 18–27.
  - **Setup:** Read installed Next.js Proxy/CSP documentation; use a local Edge Config adapter and defer production writes; define the approved maintenance message and retry bounds.
  - **Deliver:** Add authorized maintenance settings, fail-open Edge Config reads, public HTML rewrite to a no-store `503` response with `Retry-After`, all documented exclusions, static storefront CSP, nonce-based dynamic admin CSP, HSTS, clickjacking, MIME, referrer, and permissions headers.
  - **Verify:** Test enabled/disabled/read/write failure, exclusions, static/assets/metadata, status and cache headers, storefront/admin CSP differences, OAuth/Turnstile/analytics/image allowlists, injection attempts, and no regression to caching or forms.
  - **Complete when:** Maintenance can isolate public HTML safely and browser defenses protect both cached storefront and dynamic CMS without weakening required features.

- [ ] **29. Complete cron and housekeeping operations**
  - **Depends on:** Tasks 14–15, 23, and 28.
  - **Setup:** Configure local `CRON_SECRET`; decide documented timeouts and batch sizes within provider/platform limits; production schedules remain deferred to Task 32.
  - **Deliver:** Add secured handlers for five-minute email work and daily rate/housekeeping work, advisory or row locks, idempotent job records, short-lived rate-limit hash cleanup, cache retry, orphan-media reporting, correlation IDs, and sanitized outcomes.
  - **Verify:** Test missing/incorrect secrets, overlapping invocations, partial batches, timeouts, retries, duplicate prevention, cleanup age boundaries, orphan reporting without deletion, job-run accuracy, and failure recovery.
  - **Complete when:** All recurring V1 work is secured, bounded, idempotent, concurrency-safe, and visible in CMS health.

- [ ] **30. Complete cross-system quality verification**
  - **Depends on:** Tasks 1–29.
  - **Setup:** Map every PRD acceptance criterion and architecture-required scenario to an automated test or documented manual check; prepare synthetic fixtures for all supported states.
  - **Deliver:** Close gaps across Vitest, Testing Library, local-Supabase integration, pgTAP, and Playwright; add accessibility, responsive, provider-failure, security-header, caching, release, currency, inquiry, maintenance, and critical browser journeys; meet domain/DAL coverage targets.
  - **Verify:** Run the full local suite, production build, representative current-browser viewport/keyboard checks, automated accessibility scans, and production-mode Lighthouse measurements for representative pages.
  - **Complete when:** Every required scenario has evidence, critical domains have explicit success/failure tests, coverage targets pass, and unresolved risks are documented rather than hidden.

- [ ] **31. Implement CI/CD gates**
  - **Depends on:** Tasks 4 and 30.
  - **Setup:** Obtain approval before changing GitHub/Vercel settings; define protected `main`, GitHub Environment approval, `backup_completed` confirmation, Mumbai deployment, and read-only smoke expectations.
  - **Deliver:** Add gated GitHub Actions for `npm ci`, formatting, ESLint, TypeScript, Vitest/Testing Library, local Supabase migrations/seed/pgTAP, production build, and Playwright; add compatible migration/deploy/smoke workflows and operator instructions.
  - **Verify:** Exercise pull-request CI without production credentials, failure gates, artifact/log redaction, local Supabase isolation, manual production approval, backup gate, migration ordering, deployment selection, and read-only smoke behavior.
  - **Complete when:** Only one reviewed, fully tested commit from protected `main` can pass the approved backup, migration, deployment, and smoke sequence.

- [ ] **32. Provision production services and recovery controls**
  - **Depends on:** Task 31.
  - **Setup:** Obtain explicit approval for every external change and access to Vercel Pro, Supabase, Google OAuth, Resend, Cloudflare Turnstile, ExchangeRate-API, Edge Config, Analytics, GitHub environments, domain/DNS, secure backup storage, and the administrator Gmail account.
  - **Deliver:** Provision Supabase Mumbai and Vercel Mumbai resources, callbacks, sender verification, cron/Edge Config/Analytics, least-privilege secrets, provider limits/alerts, manual pre-migration and weekly encrypted dumps, original-media archive, rotation procedures, quarterly restore test, and forward-repair/application rollback runbooks.
  - **Verify:** Validate regions, plans, callback origins, secret separation, no production credentials in pull requests, provider contract checks, backup creation/encryption/retention, restore rehearsal, alerts, and documented RPO/RTO acceptance.
  - **Complete when:** Production infrastructure and recovery procedures are securely configured and independently reproducible without exposing secrets or inquiry PII.

- [ ] **33. Complete content, launch, and production validation**
  - **Depends on:** Tasks 1–32.
  - **Setup:** Obtain approved logo/favicon, real product data/photos, approved campaign visuals, legal copy/review, contact and notification details, WhatsApp/social URLs, custom domain/DNS access, administrator two-step verification, and launch approval.
  - **Deliver:** Replace every placeholder, import and publish final content through the release workflow, validate media accuracy/attribution/alt text, configure public settings/domain, take and record a fresh backup, execute the gated production deployment, run read-only smoke tests, and prepare the operational handoff.
  - **Verify:** Complete PRD launch acceptance across current major mobile/tablet/desktop browsers; verify accessibility, Lighthouse targets, SEO/indexability, localized prices/disclaimers, inquiries/WhatsApp, analytics dashboards, CMS authorization, secret/draft/PII isolation, email delivery, jobs, maintenance, logs, and rollback readiness.
  - **Complete when:** The owner approves the final content and legal wording, every launch gate has recorded evidence, production smoke checks pass, and no placeholder or unresolved critical issue remains.

## V1 Guardrails

- Generated Supabase row types stop at the server-only DAL. UI and Client Components receive only minimal serializable DTOs.
- Preserve `MoneyDTO`, `LocalizedMoneyDTO`, catalog DTO, `InquiryCommand`, and `ActionResult` boundaries from `ARCHITECTURE.md` unless an approved architecture change updates both documents.
- Internal handlers remain private implementation details. Do not enable CORS or expose a supported third-party API in V1.
- Keep authoritative money in integer minor units and time in UTC `timestamptz`; never use binary floating-point arithmetic for monetary calculations.
- Do not add carts, checkout, payments, orders, customer accounts, wishlists, inventory quantities, shipping, taxes, promotional pricing, newsletters, multiple brands, multilingual content, or a blog in V1.
- Never weaken authentication, authorization, RLS, CSP, validation, rate limiting, idempotency, privacy, caching, or audit controls to complete a task.
- Full CI is mandatory before merge even when an individual task uses only focused local checks.

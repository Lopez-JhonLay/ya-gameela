# Ya Gameela

Ya Gameela V1 is a marketing catalog and custom CMS for perfumes, bags, beauty products, and clothing. Product behavior and technical decisions are documented in [PRD.md](PRD.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

- Node.js `24.13.1` (Node.js 24 LTS)
- npm `11.8.0`
- Docker Desktop with the Linux container engine running

The repository declares its package manager in `package.json` and includes an `.nvmrc` for compatible Node version managers.

## Local Development

Install the locked dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Reuse an existing development server instead of starting another instance.

Copy the non-secret defaults from `.env.example` into a local environment file only when an override is needed. Application code reads environment variables through the validated `lib/env` boundary.

## Project Structure

- `app/(storefront)/` composes public routes without changing their URLs.
- `modules/` owns business contracts and implementation by capability.
- `components/ui/` owns accessible component primitives.
- `components/storefront/` owns shared public presentation.
- `lib/` owns shared environment, logging, Supabase, and security infrastructure.

Consumers import another module through its public `index.ts`. Server-only DAL, secret, and provider modules must begin with `import "server-only"` and return minimal serializable DTOs.

## Checks

```bash
npm run lint
npm run typecheck
npm run format:check
npm test
npm run test:coverage
npm run test:e2e:list
npm run test:e2e
npm run check
npm run build
```

`npm run check` runs formatting, lint, type, and unit/component tests. `npm run test:e2e:list` validates Playwright discovery without starting a browser. Running the browser suite requires the relevant Playwright browser binaries.

Editor-neutral whitespace and indentation conventions are defined in `.editorconfig`; Prettier provides the automated formatting checks.

## Local Supabase

The Supabase CLI runs PostgreSQL, Auth, Storage, Studio, and supporting services in Docker. No production Supabase project or credentials are required for local development.

Start the services:

```bash
npm run db:start
```

Rebuild the database from the ordered migrations and deterministic seed data:

```bash
npm run db:reset
```

Run the pgTAP database tests and regenerate the checked-in public-schema types:

```bash
npm run db:test
npm run db:types
```

Inspect service URLs and status, then stop the services when finished:

```bash
npm run db:status
npm run db:stop
```

Supabase Studio is available at [http://localhost:54323](http://localhost:54323) while the services are running. The seed creates two fake email identities for later authorization tests:

- `admin@ya-gameela.test`
- `visitor@ya-gameela.test`

Both use the local-only password `LocalOnlyPassword123!`. Resetting the database deletes local changes and recreates these identities. Never reuse these credentials or seed identities in production.

## Project Workflow

Read [AGENTS.md](AGENTS.md) before making changes. Implementation progress is tracked in [TASK.md](TASK.md), and every code, configuration, schema, dependency, or provider change requires the planning and approval workflow defined there.

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

Copy `.env.example` to `.env.local` and replace its local Supabase placeholders before starting Next.js. Application code reads environment variables through the validated `lib/env` boundary. `.env.local` is ignored by Git and must never be committed.

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

Apply only migrations that have not yet run, then lint the public and private database schemas:

```bash
npm run db:migrate
npm run db:lint
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

Supabase Studio is available at [http://localhost:54323](http://localhost:54323) while the services are running. The seed creates two fake non-Google identities for database tests:

- `admin@ya-gameela.test`
- `visitor@ya-gameela.test`

Both use the local-only password `LocalOnlyPassword123!`, but neither is bound as the CMS administrator. Resetting the database deletes local changes and recreates these identities. Never reuse these credentials or seed identities in production.

### Local Google OAuth

Create a Google OAuth Web client with these local values:

- Authorized JavaScript origins: `http://localhost:3000` and `http://127.0.0.1:3000`
- Authorized redirect URI: `http://127.0.0.1:54321/auth/v1/callback`
- Audience: External/Testing with the administrator Gmail account added as a test user

Copy `supabase/.env.example` to the ignored `supabase/.env` file and add the Google Client ID and Client Secret. Do not place either value in `supabase/config.toml`.

After `npm run db:start`, run `npm run db:status` and copy its local `PUBLISHABLE_KEY` and `SECRET_KEY` into the corresponding `.env.local` variables. Set `ADMIN_EMAIL` to the same normalized Gmail address registered as the Google test user and keep `APP_ORIGIN=http://localhost:3000`.

The database intentionally begins without an administrator. The first successful sign-in from the exact confirmed Google account creates an atomic stable user-ID binding. Later identities cannot replace that binding. Use `npm run db:reset` only when you intentionally want to erase and recreate the disposable local database, including that binding.

## Project Workflow

Read [AGENTS.md](AGENTS.md) before making changes. Implementation progress is tracked in [TASK.md](TASK.md), and every code, configuration, schema, dependency, or provider change requires the planning and approval workflow defined there.

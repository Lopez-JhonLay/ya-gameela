# Ya Gameela

Ya Gameela V1 is a marketing catalog and custom CMS for perfumes, bags, beauty products, and clothing. Product behavior and technical decisions are documented in [PRD.md](PRD.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

- Node.js `24.13.1` (Node.js 24 LTS)
- npm `11.8.0`

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

## Project Workflow

Read [AGENTS.md](AGENTS.md) before making changes. Implementation progress is tracked in [TASK.md](TASK.md), and every code, configuration, schema, dependency, or provider change requires the planning and approval workflow defined there.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ya Gameela Project Instructions

## Non-Negotiable Quick Rules

- Read [PRD.md](PRD.md), [ARCHITECTURE.md](ARCHITECTURE.md), and the relevant bundled Next.js documentation before writing code.
- Before every code, configuration, schema, or dependency change, present a concise implementation plan and wait for explicit user approval.
- Ask for approval before every package installation or external-provider change.
- Never commit, push, alter remote state, or open a pull request unless explicitly requested.
- Keep the requested diff focused. Report unrelated issues without changing them.
- Run targeted verification and state exactly what was and was not tested.

## Sources of Truth

Use these sources in this order and for these responsibilities:

1. The user-approved request controls the current task.
2. [PRD.md](PRD.md) controls product behavior, audience, scope, and acceptance requirements.
3. [ARCHITECTURE.md](ARCHITECTURE.md) controls technical design, boundaries, data flow, security, deployment, and testing strategy.
4. This `AGENTS.md` controls workflow and engineering conduct.
5. Documentation under `node_modules/next/dist/docs/` controls version-specific Next.js APIs and conventions.

If these sources conflict, stop and ask the user instead of silently choosing one. Product intent belongs in the PRD; technical implementation strategy belongs in the architecture document.

After the user approves a product or architectural change, update the affected [PRD.md](PRD.md) and/or [ARCHITECTURE.md](ARCHITECTURE.md) in the same task. Do not churn those documents for ordinary implementation details that remain within the approved design.

## Required Workflow

1. Inspect Git status, related files, current tests, and the relevant project/framework documentation.
2. Explain the intended edits, affected areas, assumptions, and focused verification plan.
3. Wait for explicit user approval before making any code, configuration, schema, dependency, or provider change.
4. Implement the smallest approved diff while preserving unrelated user changes.
5. Review the final diff for scope, security, accidental files, and documentation consistency.
6. Run focused checks and provide an evidence-based handoff.

A concrete implementation request does not bypass the planning gate. Documentation-only edits explicitly requested by the user may proceed without a second redundant approval unless they alter product or architecture decisions.

## Beginner-Friendly Action Explanations

Before each meaningful inspection, implementation, dependency/provider operation, database command, test, build, or verification action, give the user a short explanation using this exact structure:

**What is it?**
Explain the tool, file, command, or concept in plain language.

**How does it work?**
Explain what the action will do and what result to expect.

**Why do we use it this way?**
Explain why the action or approach is appropriate for Ya Gameela, including relevant safety or architectural reasons.

Keep each explanation concise and understandable to a beginner. Closely related commands may share one explanation when they form a single action. If an action fails, explain the failure and intended correction with the same structure before retrying. Never include secrets or sensitive values in an explanation. These explanations supplement and do not replace the planning and approval requirements above.

## Architecture Guardrails

- Follow the module boundaries, routes, interfaces, and implementation order in [ARCHITECTURE.md](ARCHITECTURE.md).
- Prefer React Server Components. Use Client Components only for browser interaction.
- Keep database access in a `server-only` Data Access Layer that returns minimal, serializable DTOs.
- Treat Server Actions as directly callable. Validate input and repeat authentication and authorization inside every action.
- Use typed Supabase clients, versioned SQL migrations, RLS, Zod validation, immutable published versions, durable outboxes, and explicit cache tags.
- Never make production schema or policy changes only through the Supabase dashboard.
- Store authoritative money as integer minor units and timestamps as UTC `timestamptz`.
- Do not expose service-role credentials, secrets, draft content, inquiry PII, or raw database rows to the browser.
- Do not add public APIs, providers, packages, architectural patterns, or cross-module shortcuts without approval.
- Keep V1 ecommerce exclusions intact. Do not introduce carts, checkout, payments, orders, customers, shipping, taxes, or inventory quantities unless the PRD is explicitly changed.

## Next.js Rules

- Preserve the managed Next.js block at the top of this file exactly as generated.
- Read the relevant guide under `node_modules/next/dist/docs/` before using or changing a Next.js API.
- Follow Next.js 16 conventions, including `proxy.ts`, async request APIs, Cache Components, Draft Mode, current cache invalidation functions, and App Router file conventions.
- Prefer the canonical pattern from the installed documentation over remembered or older framework patterns.
- Reuse an existing development server instead of starting a duplicate.
- For UI or runtime work, inspect the rendered page, terminal/browser errors, responsive behavior, and accessibility where relevant.
- Do not use framework errors as a reason to disable caching, security, typing, or validation without understanding and approving the tradeoff.

## UI and Content

- Use the approved component kit and Ya Gameela design tokens consistently across storefront and CMS.
- Preserve the soft-feminine, accessible-premium direction defined by the PRD.
- Build mobile-first layouts and maintain WCAG 2.2 AA expectations for semantics, keyboard access, focus, contrast, labels, and alternative text.
- Prefer owned, composable UI primitives over one-off duplicated components.
- Placeholders may be used during development and prelaunch deployments, but they must remain identifiable and must not be described as final launch content.
- The PRD launch gate still requires approved product data, legal copy, contact details, and imagery before production sign-off.

## Security and Data

- Validate every untrusted input, URL/search parameter, form, file upload, provider response, and environment variable.
- Keep PII out of logs, analytics, URLs, audit payloads, fixtures, snapshots, and public error messages.
- Require versioned migrations and focused policy/function tests for database or RLS changes.
- Enforce authorization in the DAL, Server Actions, route handlers, PostgreSQL functions, and Storage policies as applicable.
- Keep service-role and provider secrets in server-only environment configuration.
- Avoid destructive actions. When destruction is necessary, obtain approval and verify exact targets first.
- Never weaken CSP, RLS, authentication, rate limiting, idempotency, privacy, or audit controls merely to make a feature work.
- Do not use real production inquiry data in local development or automated tests.

## Verification

Use focused checks appropriate to the changed surface rather than automatically running the entire suite locally.

- TypeScript changes: run focused lint/type checks and relevant unit tests.
- Database changes: apply migrations locally, run relevant pgTAP/RLS tests, and regenerate/check database types.
- UI changes: run relevant component tests and browser QA for affected routes and viewport/keyboard behavior.
- Routing, caching, Proxy, security headers, or production configuration: run focused build and runtime verification.
- Provider adapters: test success, invalid, rate-limited, timeout, and unavailable responses with mocks or contract fixtures.
- Documentation-only changes: verify Markdown structure, links, managed-marker integrity, and Git whitespace.

Full CI remains mandatory before merge even when the local agent runs only targeted checks. Never claim that a command, test, build, browser flow, or deployment passed if it was not run. If a check cannot run, state why and describe the remaining risk.

## Git and Dependency Discipline

- Inspect and preserve dirty-worktree changes. Existing and unrelated changes belong to the user.
- Do not reformat, rename, or clean up unrelated code while completing a focused task.
- Report unrelated bugs, security concerns, or technical debt separately without changing them.
- Do not use destructive Git commands such as `git reset --hard` or discard user work.
- Do not commit, push, create branches, alter remote state, or open a pull request unless explicitly requested.
- Obtain approval before every `npm install`, including runtime, development, type, and test packages.
- Keep each approved dependency change and its lockfile update together.
- Do not replace a dependency or provider simply because another tool is more familiar.

## Handoff Expectations

At the end of an implementation task, report:

- The user-visible and technical outcome.
- The important files or modules changed.
- The focused checks actually run and their results.
- Any checks not run and the reason.
- Known limitations, placeholders, migration steps, provider setup, or follow-up decisions.

Do not describe unfinished, unverified, placeholder-dependent, or locally mocked behavior as production-ready.

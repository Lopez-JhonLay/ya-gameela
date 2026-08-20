# Supabase Boundary

- `browser.ts` creates the typed publishable browser client.
- `server.ts` creates the typed cookie-based SSR client.
- `proxy.ts` refreshes session cookies at the request boundary.
- `system.ts` is server-only and uses the secret key for narrow system operations.
- `database.types.ts` is generated from local migrations with `npm run db:types`.

Application modules must use these clients through their server-only DAL rather than querying Supabase from components.

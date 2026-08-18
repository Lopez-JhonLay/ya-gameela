# Shared Infrastructure

- `env/` owns validated environment access.
- `logging/` owns structured logs, correlation IDs, field allowlisting, and redaction.
- `supabase/` will own typed browser, server, Proxy, and system clients.
- `security/` will own CSP, hashing, origin, and cron helpers.

Business rules belong in `modules/`, not in this directory.

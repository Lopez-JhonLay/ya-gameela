# Supabase Boundary

Checked-in database types are generated from the local schema with `npm run db:types`.
Future browser and server clients belong in this directory, with server clients protected by
`import "server-only"` and all database access kept behind module DALs.

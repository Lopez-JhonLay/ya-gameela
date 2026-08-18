# Business Modules

Each business capability owns its schemas, DTOs, data access, services, Server Actions, and module-specific UI. The V1 modules are `auth`, `catalog`, `content`, `releases`, `currency`, `inquiries`, `media`, `settings`, and `platform`.

Import another module through its public `index.ts` entry point. Module internals use relative imports, and consumers must not deep-import another module's DAL or implementation files. Database access and provider clients belong in files guarded by `import "server-only"`.

Module directories are added when their first real contract or implementation is introduced; placeholder routes and empty runtime modules are not created.

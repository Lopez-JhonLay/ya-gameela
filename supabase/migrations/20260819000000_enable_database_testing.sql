create extension if not exists pgtap with schema extensions;

comment on extension pgtap is
  'Unit testing for PostgreSQL migrations, functions, grants, and row-level security policies';

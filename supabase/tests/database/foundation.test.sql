begin;

set local search_path = public, extensions;

select plan(3);

select has_extension(
  'pgtap',
  'the pgTAP extension is available for database tests'
);

select is(
  (
    select email::text
    from auth.users
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'admin@ya-gameela.test',
  'the deterministic local admin identity is seeded'
);

select is(
  (
    select email::text
    from auth.users
    where id = '10000000-0000-4000-8000-000000000002'
  ),
  'visitor@ya-gameela.test',
  'the deterministic local non-admin identity is seeded'
);

select * from finish();

rollback;

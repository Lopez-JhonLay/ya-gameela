begin;

set local search_path = public, extensions;

select plan(59);

select has_table('public', 'admin_accounts', 'admin_accounts exists');
select has_table('public', 'admin_audit_events', 'admin_audit_events exists');
select has_table('public', 'releases', 'releases exists');
select has_table('public', 'release_publications', 'release_publications exists');
select has_table('public', 'job_runs', 'job_runs exists');

select ok(
  not has_schema_privilege('authenticated', 'private', 'usage'),
  'authenticated cannot use the private schema'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.admin_accounts'::regclass),
  'admin_accounts has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.admin_audit_events'::regclass),
  'admin_audit_events has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.releases'::regclass),
  'releases has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.release_publications'::regclass),
  'release_publications has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.job_runs'::regclass),
  'job_runs has RLS enabled'
);

select ok(
  (select prosecdef from pg_proc where oid = 'public.is_admin()'::regprocedure),
  'is_admin is a security-definer function'
);
select ok(
  (
    select coalesce(proconfig, '{}') @> array['search_path=""']
    from pg_proc
    where oid = 'public.is_admin()'::regprocedure
  ),
  'is_admin has an empty search_path'
);
select ok(
  has_function_privilege('authenticated', 'public.is_admin()', 'execute'),
  'authenticated may execute is_admin'
);
select ok(
  not has_function_privilege('anon', 'public.is_admin()', 'execute'),
  'anonymous users cannot execute is_admin'
);
select ok(
  not has_function_privilege('service_role', 'public.is_admin()', 'execute'),
  'the system role does not need to execute is_admin'
);

select ok(not has_table_privilege('anon', 'public.admin_accounts', 'select'), 'anonymous cannot read admin_accounts');
select ok(not has_table_privilege('anon', 'public.admin_audit_events', 'select'), 'anonymous cannot read audit events');
select ok(not has_table_privilege('anon', 'public.releases', 'select'), 'anonymous cannot read releases');
select ok(not has_table_privilege('anon', 'public.release_publications', 'select'), 'anonymous cannot read release publications');
select ok(not has_table_privilege('anon', 'public.job_runs', 'select'), 'anonymous cannot read job runs');

select ok(has_table_privilege('authenticated', 'public.admin_accounts', 'select'), 'authenticated has admin-account read privilege');
select ok(has_table_privilege('authenticated', 'public.admin_audit_events', 'select'), 'authenticated has audit read privilege');
select ok(has_table_privilege('authenticated', 'public.releases', 'select'), 'authenticated has release read privilege');
select ok(has_table_privilege('authenticated', 'public.release_publications', 'select'), 'authenticated has publication read privilege');
select ok(has_table_privilege('authenticated', 'public.job_runs', 'select'), 'authenticated has job-run read privilege');
select ok(has_table_privilege('authenticated', 'public.releases', 'insert, update'), 'authenticated can manage draft releases through RLS');
select ok(not has_table_privilege('authenticated', 'public.releases', 'delete'), 'authenticated cannot delete releases');
select ok(not has_table_privilege('authenticated', 'public.admin_audit_events', 'insert'), 'authenticated cannot directly append audit events');
select ok(not has_table_privilege('authenticated', 'public.job_runs', 'insert'), 'authenticated cannot create job runs');

select ok(has_table_privilege('service_role', 'public.admin_accounts', 'select, insert, update'), 'system may bootstrap admin_accounts');
select ok(has_table_privilege('service_role', 'public.admin_audit_events', 'select, insert'), 'system may append audit events');
select ok(not has_table_privilege('service_role', 'public.admin_audit_events', 'update'), 'system cannot update audit events');
select ok(has_table_privilege('service_role', 'public.job_runs', 'select, insert, update'), 'system may manage job runs');

insert into public.admin_accounts (
  id,
  email,
  auth_user_id,
  bound_at,
  created_at,
  updated_at
)
values (
  '30000000-0000-4000-8000-000000000001',
  'admin@ya-gameela.test',
  '10000000-0000-4000-8000-000000000001',
  '2026-01-01 00:00:00+00',
  '2026-01-01 00:00:00+00',
  '2026-01-01 00:00:00+00'
);

select is(
  (select count(*) from public.admin_accounts),
  1::bigint,
  'the test fixture contains exactly one admin account'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select is(public.is_admin(), true, 'the bound local user is an admin');
select is((select count(*) from public.admin_accounts), 1::bigint, 'the admin can read their binding');
select lives_ok(
  $$
    insert into public.releases (id, name, created_by)
    values (
      '40000000-0000-4000-8000-000000000001',
      'Local security test release',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  'the admin can create a draft release'
);

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';

select is(public.is_admin(), false, 'an unbound authenticated user is not an admin');
select is((select count(*) from public.admin_accounts), 0::bigint, 'a non-admin cannot read admin_accounts');
select is((select count(*) from public.releases), 0::bigint, 'a non-admin cannot read releases');

reset role;
set local "request.jwt.claim.sub" = '';
set local "request.jwt.claim.role" = '';

select throws_ok(
  $$insert into public.admin_accounts (email) values ('second@ya-gameela.test')$$,
  '23505',
  'duplicate key value violates unique constraint "admin_accounts_one_row"',
  'the singleton constraint rejects a second admin account'
);
select throws_ok(
  $$update public.admin_accounts set email = 'ADMIN@YA-GAMEELA.TEST'$$,
  '23514',
  'new row for relation "admin_accounts" violates check constraint "admin_accounts_normalized_email"',
  'admin email must remain normalized'
);
select throws_ok(
  $$
    insert into public.admin_audit_events (actor_kind, action, outcome)
    values ('admin', 'auth.login', 'success')
  $$,
  '23514',
  'new row for relation "admin_audit_events" violates check constraint "admin_audit_events_actor"',
  'admin audit events require an actor user ID'
);
select throws_ok(
  $$
    insert into public.admin_audit_events (actor_kind, action, outcome)
    values ('system', 'Contains PII-like free text', 'failure')
  $$,
  '23514',
  'new row for relation "admin_audit_events" violates check constraint "admin_audit_events_action_code"',
  'audit actions must use controlled codes'
);
select throws_ok(
  $$
    insert into public.releases (name, status, created_by)
    values (
      'Invalid published release',
      'published',
      '10000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  'new row for relation "releases" violates check constraint "releases_published_at"',
  'published releases require a publication timestamp'
);
select throws_ok(
  $$
    insert into public.job_runs (job_name, status)
    values ('email_outbox', 'succeeded')
  $$,
  '23514',
  'new row for relation "job_runs" violates check constraint "job_runs_finished_state"',
  'terminal job runs require a finished timestamp'
);
select throws_ok(
  $$
    insert into public.job_runs (
      job_name,
      claimed_count,
      succeeded_count
    )
    values ('email_outbox', 0, 1)
  $$,
  '23514',
  'new row for relation "job_runs" violates check constraint "job_runs_nonnegative_counts"',
  'job outcome counts cannot exceed claimed work'
);

insert into public.admin_audit_events (
  id,
  actor_kind,
  action,
  subject_type,
  subject_id,
  outcome
)
values (
  '50000000-0000-4000-8000-000000000001',
  'system',
  'database.test',
  'release',
  '40000000-0000-4000-8000-000000000001',
  'success'
);

select throws_ok(
  $$
    update public.admin_audit_events
    set outcome = 'failure'
    where id = '50000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'immutable history rows cannot be updated or deleted',
  'audit events cannot be updated'
);
select throws_ok(
  $$
    delete from public.admin_audit_events
    where id = '50000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'immutable history rows cannot be updated or deleted',
  'audit events cannot be deleted'
);

insert into public.release_publications (
  id,
  release_id,
  entity_type,
  entity_id,
  published_version_id
)
values (
  '60000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'product',
  '70000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000001'
);

select throws_ok(
  $$
    update public.release_publications
    set entity_type = 'category'
    where id = '60000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'immutable history rows cannot be updated or deleted',
  'release publications cannot be updated'
);
select throws_ok(
  $$
    delete from public.release_publications
    where id = '60000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  'immutable history rows cannot be updated or deleted',
  'release publications cannot be deleted'
);
select throws_ok(
  $$
    insert into public.release_publications (
      release_id,
      entity_type,
      entity_id
    )
    values (
      '40000000-0000-4000-8000-000000000001',
      'product',
      '70000000-0000-4000-8000-000000000002'
    )
  $$,
  '23514',
  'new row for relation "release_publications" violates check constraint "release_publications_version_change"',
  'a publication must describe a version change'
);

update public.releases
set name = 'Updated local security test release'
where id = '40000000-0000-4000-8000-000000000001';

select ok(
  (
    select updated_at > created_at
    from public.releases
    where id = '40000000-0000-4000-8000-000000000001'
  ),
  'the shared trigger advances updated_at'
);

select hasnt_column('public', 'admin_audit_events', 'metadata', 'audit events have no arbitrary metadata payload');
select hasnt_column('public', 'admin_audit_events', 'email', 'audit events do not store email');
select hasnt_column('public', 'admin_audit_events', 'message', 'audit events do not store messages');

select is(
  (
    select array_agg(enumlabel::text order by enumsortorder)
    from pg_enum
    where enumtypid = 'public.release_status'::regtype
  ),
  array['draft', 'validating', 'ready', 'publishing', 'published', 'failed']::text[],
  'release states match the approved architecture'
);
select is(
  (
    select array_agg(enumlabel::text order by enumsortorder)
    from pg_enum
    where enumtypid = 'public.job_status'::regtype
  ),
  array['running', 'succeeded', 'failed', 'skipped']::text[],
  'job states are explicit and sanitized'
);

select * from finish();

rollback;

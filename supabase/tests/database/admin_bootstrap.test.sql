begin;

set local search_path = public, extensions;

select plan(22);

select has_function(
  'public',
  'bind_admin_account',
  array['uuid', 'text', 'uuid'],
  'admin bootstrap function exists'
);
select ok(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.bind_admin_account(uuid,text,uuid)'::regprocedure
  ),
  'admin bootstrap is a security-definer function'
);
select ok(
  (
    select coalesce(proconfig, '{}') @> array['search_path=""']
    from pg_proc
    where oid = 'public.bind_admin_account(uuid,text,uuid)'::regprocedure
  ),
  'admin bootstrap has an empty search_path'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.bind_admin_account(uuid,text,uuid)',
    'execute'
  ),
  'only the system role needs bootstrap execution access'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.bind_admin_account(uuid,text,uuid)',
    'execute'
  ),
  'authenticated users cannot call admin bootstrap directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.bind_admin_account(uuid,text,uuid)',
    'execute'
  ),
  'anonymous users cannot call admin bootstrap'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'approved@gmail.com',
    '',
    '2026-01-01 00:00:00+00',
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{}'::jsonb,
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'rejected@gmail.com',
    '',
    '2026-01-01 00:00:00+00',
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{}'::jsonb,
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000005',
    'authenticated',
    'authenticated',
    'unconfirmed@gmail.com',
    '',
    null,
    '{"provider":"google","providers":["google"]}'::jsonb,
    '{}'::jsonb,
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '',
    '',
    '',
    ''
  );

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  users.id::text,
  users.id,
  jsonb_build_object(
    'sub',
    users.id::text,
    'email',
    users.email,
    'email_verified',
    users.email_confirmed_at is not null
  ),
  'google',
  '2026-01-01 00:00:00+00',
  '2026-01-01 00:00:00+00',
  '2026-01-01 00:00:00+00'
from auth.users as users
where users.id in (
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005'
);

select is(
  (select count(*) from public.admin_accounts),
  0::bigint,
  'local runtime begins without an administrator binding'
);

set local role service_role;

select is(
  public.bind_admin_account(
    '90000000-0000-4000-8000-000000000001',
    'approved@gmail.com',
    '90000000-0000-4000-8000-000000000002'
  ),
  'denied',
  'a missing Auth user is rejected'
);
select is(
  public.bind_admin_account(
    '10000000-0000-4000-8000-000000000001',
    'admin@ya-gameela.test',
    '90000000-0000-4000-8000-000000000003'
  ),
  'invalid_configuration',
  'a non-Gmail administrator configuration is rejected'
);
select is(
  public.bind_admin_account(
    '10000000-0000-4000-8000-000000000001',
    'approved@gmail.com',
    '90000000-0000-4000-8000-000000000004'
  ),
  'denied',
  'a password identity cannot bootstrap the administrator'
);
select is(
  public.bind_admin_account(
    '10000000-0000-4000-8000-000000000004',
    'approved@gmail.com',
    '90000000-0000-4000-8000-000000000005'
  ),
  'denied',
  'a different confirmed Gmail account is rejected'
);
select is(
  public.bind_admin_account(
    '10000000-0000-4000-8000-000000000005',
    'unconfirmed@gmail.com',
    '90000000-0000-4000-8000-000000000006'
  ),
  'denied',
  'an unconfirmed Google email is rejected'
);

reset role;

insert into public.admin_accounts (
  email,
  auth_user_id,
  bound_at
)
values (
  'rejected@gmail.com',
  '10000000-0000-4000-8000-000000000004',
  pg_catalog.clock_timestamp()
);

set local role service_role;

select is(
  public.bind_admin_account(
    '10000000-0000-4000-8000-000000000003',
    'approved@gmail.com',
    '90000000-0000-4000-8000-000000000009'
  ),
  'denied',
  'an existing administrator cannot be replaced'
);

reset role;

delete from public.admin_accounts;

set local role service_role;

select is(
  public.bind_admin_account(
    '10000000-0000-4000-8000-000000000003',
    '  APPROVED@GMAIL.COM ',
    '90000000-0000-4000-8000-000000000007'
  ),
  'bound',
  'the confirmed allowlisted Google identity is normalized and bound'
);
select is(
  public.bind_admin_account(
    '10000000-0000-4000-8000-000000000003',
    'approved@gmail.com',
    '90000000-0000-4000-8000-000000000008'
  ),
  'already_bound',
  'a retried callback is idempotent'
);

reset role;

select is(
  (select auth_user_id from public.admin_accounts),
  '10000000-0000-4000-8000-000000000003'::uuid,
  'the stable approved Auth user ID remains bound'
);
select is(
  (select email from public.admin_accounts),
  'approved@gmail.com',
  'the stored administrator email is normalized'
);
select is(
  (
    select count(*)
    from public.admin_audit_events
    where action = 'auth.admin_bind'
      and outcome = 'success'
  ),
  1::bigint,
  'the successful first binding is audited once'
);
select is(
  (
    select count(*)
    from public.admin_audit_events
    where action = 'auth.admin_bind'
      and outcome = 'denied'
  ),
  5::bigint,
  'safe denial reasons are retained without email payloads'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000003';
set local "request.jwt.claim.role" = 'authenticated';

select is(public.is_admin(), true, 'the bound identity passes database authorization');
select is(
  (select count(*) from public.admin_accounts),
  1::bigint,
  'the bound administrator can read the protected account row'
);
select throws_ok(
  $$
    select public.bind_admin_account(
      '10000000-0000-4000-8000-000000000003',
      'approved@gmail.com',
      gen_random_uuid()
    )
  $$,
  '42501',
  null,
  'a signed-in browser user still cannot call bootstrap directly'
);

select * from finish();

rollback;

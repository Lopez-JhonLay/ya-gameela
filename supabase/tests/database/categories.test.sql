begin;

set local search_path = public, extensions;

select no_plan();

select has_table('public', 'categories', 'categories exists');
select has_table('public', 'category_versions', 'category_versions exists');
select has_table('public', 'category_slug_claims', 'category_slug_claims exists');

select has_function(
  'public',
  'create_category_draft',
  array['text', 'text', 'uuid', 'text', 'integer', 'jsonb', 'text', 'text', 'uuid'],
  'category creation function exists'
);
select has_function(
  'public',
  'update_category_draft',
  array['uuid', 'bigint', 'text', 'text', 'uuid', 'text', 'integer', 'jsonb', 'text', 'text', 'uuid'],
  'category update function exists'
);
select has_function(
  'public',
  'archive_category',
  array['uuid', 'bigint', 'uuid'],
  'category archive function exists'
);
select has_function(
  'public',
  'restore_category',
  array['uuid', 'bigint', 'uuid'],
  'category restore function exists'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.categories'::regclass),
  'categories has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.category_versions'::regclass),
  'category_versions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.category_slug_claims'::regclass),
  'category_slug_claims has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.categories', 'select'),
  'anonymous users cannot read category identities'
);
select ok(
  not has_table_privilege('anon', 'public.category_versions', 'select'),
  'anonymous users cannot read category drafts'
);
select ok(
  not has_table_privilege('authenticated', 'public.categories', 'insert, update, delete'),
  'authenticated users cannot mutate category identities directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.category_versions', 'insert, update, delete'),
  'authenticated users cannot mutate category versions directly'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_category_draft(text,text,uuid,text,integer,jsonb,text,text,uuid)',
    'execute'
  ),
  'authenticated callers can reach the guarded creation function'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_category_draft(text,text,uuid,text,integer,jsonb,text,text,uuid)',
    'execute'
  ),
  'anonymous callers cannot reach category creation'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  (select count(*) from public.categories),
  0::bigint,
  'an unbound signed-in user cannot read drafts'
);
select throws_ok(
  $$
    select public.create_category_draft(
      'Denied category',
      'denied-category',
      null,
      null,
      0,
      '[]'::jsonb,
      null,
      null,
      gen_random_uuid()
    )
  $$,
  '42501',
  'category_not_authorized',
  'an unbound signed-in user cannot create a category'
);

reset role;

insert into public.admin_accounts (
  id,
  email,
  auth_user_id,
  bound_at
)
values (
  '73000000-0000-4000-8000-000000000001',
  'admin@ya-gameela.test',
  '10000000-0000-4000-8000-000000000001',
  pg_catalog.clock_timestamp()
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$
    select public.create_category_draft(
      'Test parent',
      'test-parent',
      null,
      'A test top-level category.',
      100,
      '[{"key":"size","label":"Size","type":"measurement","required":true,"filterable":true,"unit":"ml"},{"key":"family","label":"Family","type":"select","required":false,"filterable":true,"options":[{"value":"fresh","label":"Fresh"}]}]'::jsonb,
      'Test parent',
      'A test category used by database checks.',
      '74000000-0000-4000-8000-000000000001'
    )
  $$,
  'an administrator can create a top-level category draft'
);

select lives_ok(
  $$
    select public.create_category_draft(
      'Test child',
      'test-child',
      (select category_id from public.category_slug_claims where slug = 'test-parent'),
      null,
      110,
      '[]'::jsonb,
      null,
      null,
      '74000000-0000-4000-8000-000000000002'
    )
  $$,
  'an administrator can create one subcategory level'
);

select throws_ok(
  $$
    select public.create_category_draft(
      'Third level',
      'third-level',
      (select category_id from public.category_slug_claims where slug = 'test-child'),
      null,
      120,
      '[]'::jsonb,
      null,
      null,
      gen_random_uuid()
    )
  $$,
  'P0001',
  'category_depth_exceeded',
  'a third taxonomy level is rejected'
);

select throws_ok(
  $$
    select public.create_category_draft(
      'Duplicate slug',
      'test-parent',
      null,
      null,
      130,
      '[]'::jsonb,
      null,
      null,
      gen_random_uuid()
    )
  $$,
  'P0001',
  'category_slug_conflict',
  'a slug cannot be claimed by another category'
);

select throws_ok(
  $$
    select public.create_category_draft(
      'Invalid schema',
      'invalid-schema',
      null,
      null,
      140,
      '[{"key":"color","label":"Color","type":"select","required":false,"filterable":true,"options":[{"value":"red","label":"Red"},{"value":"red","label":"Rouge"}]}]'::jsonb,
      null,
      null,
      gen_random_uuid()
    )
  $$,
  '23514',
  null,
  'duplicate controlled option values are rejected by the database'
);

select lives_ok(
  $$
    select public.update_category_draft(
      (select category_id from public.category_slug_claims where slug = 'test-parent'),
      1,
      'Updated test parent',
      'test-parent',
      null,
      'An updated immutable draft.',
      100,
      '[]'::jsonb,
      null,
      null,
      '74000000-0000-4000-8000-000000000003'
    )
  $$,
  'a category can append a new version while retaining its own slug'
);

select is(
  (
    select count(*)
    from public.category_versions
    where category_id = (
      select category_id from public.category_slug_claims where slug = 'test-parent'
    )
  ),
  2::bigint,
  'updating appends a second immutable version'
);

select throws_ok(
  $$
    select public.update_category_draft(
      (select category_id from public.category_slug_claims where slug = 'test-parent'),
      1,
      'Stale update',
      'test-parent',
      null,
      null,
      0,
      '[]'::jsonb,
      null,
      null,
      gen_random_uuid()
    )
  $$,
  'P0001',
  'category_stale_revision',
  'a stale optimistic revision cannot overwrite a newer draft'
);

select throws_ok(
  $$
    select public.update_category_draft(
      (select category_id from public.category_slug_claims where slug = 'test-parent'),
      2,
      'Test parent',
      'test-parent',
      (select category_id from public.category_slug_claims where slug = 'bags'),
      null,
      100,
      '[]'::jsonb,
      null,
      null,
      gen_random_uuid()
    )
  $$,
  'P0001',
  'category_has_children',
  'a top-level category with active children cannot become a subcategory'
);

select throws_ok(
  $$
    update public.category_versions
    set name = 'Rewritten history'
    where slug = 'test-parent'
  $$,
  '42501',
  null,
  'the administrator cannot update category version history directly'
);

select throws_ok(
  $$
    delete from public.category_slug_claims where slug = 'test-parent'
  $$,
  '42501',
  null,
  'the administrator cannot delete permanent slug ownership directly'
);

select throws_ok(
  $$
    select public.archive_category(
      (select category_id from public.category_slug_claims where slug = 'test-parent'),
      2,
      gen_random_uuid()
    )
  $$,
  'P0001',
  'category_has_children',
  'a category referenced by an active child cannot be archived'
);

select lives_ok(
  $$
    select public.archive_category(
      (select category_id from public.category_slug_claims where slug = 'test-child'),
      1,
      '74000000-0000-4000-8000-000000000004'
    )
  $$,
  'a child category can be archived without deleting it'
);
select lives_ok(
  $$
    select public.archive_category(
      (select category_id from public.category_slug_claims where slug = 'test-parent'),
      2,
      '74000000-0000-4000-8000-000000000005'
    )
  $$,
  'a parent can be archived after its children are inactive'
);
select lives_ok(
  $$
    select public.restore_category(
      (select category_id from public.category_slug_claims where slug = 'test-parent'),
      3,
      '74000000-0000-4000-8000-000000000006'
    )
  $$,
  'an archived parent can be restored'
);
select lives_ok(
  $$
    select public.restore_category(
      (select category_id from public.category_slug_claims where slug = 'test-child'),
      2,
      '74000000-0000-4000-8000-000000000007'
    )
  $$,
  'an archived child can be restored when its parent is active'
);

select is(
  (
    select count(*)
    from public.admin_audit_events
    where action in (
      'category.create',
      'category.update',
      'category.archive',
      'category.restore'
    )
      and outcome = 'success'
  ),
  7::bigint,
  'successful category mutations append controlled audit events'
);

select is(
  (
    select count(*)
    from public.categories
    where current_published_version_id is not null
  ),
  0::bigint,
  'Task 7 drafts are not exposed through published pointers'
);

reset role;
set local "request.jwt.claim.sub" = '';
set local "request.jwt.claim.role" = '';

select throws_ok(
  $$
    update public.category_versions
    set name = 'Rewritten by a privileged operation'
    where slug = 'test-parent'
  $$,
  '55000',
  'immutable history rows cannot be updated or deleted',
  'the immutable trigger also protects category version history'
);

select throws_ok(
  $$delete from public.category_slug_claims where slug = 'test-parent'$$,
  '55000',
  'immutable history rows cannot be updated or deleted',
  'the immutable trigger also protects permanent slug ownership'
);

select throws_ok(
  $$delete from public.categories where id = '71000000-0000-4000-8000-000000000001'$$,
  '23503',
  null,
  'category identities with version history cannot be hard-deleted'
);

select * from finish();

rollback;

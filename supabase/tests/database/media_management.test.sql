begin;

set local search_path = public, extensions;

-- Keep this test deterministic after a developer has completed local OAuth.
-- The enclosing transaction restores the real local binding on rollback.
delete from public.admin_accounts;

select no_plan();

select has_table('public', 'media_assets', 'media assets exists');
select has_table(
  'public',
  'media_asset_references',
  'media reference registry exists'
);
select has_view(
  'public',
  'media_asset_health',
  'media health report exists'
);
select has_function(
  'public',
  'begin_media_upload',
  array['text', 'text', 'bigint', 'text', 'text', 'uuid'],
  'media upload preparation function exists'
);
select has_function(
  'public',
  'finalize_media_upload',
  array['uuid', 'text', 'integer', 'integer', 'bigint', 'text', 'uuid'],
  'media finalization function exists'
);
select has_function(
  'public',
  'request_media_deletion',
  array['uuid', 'uuid'],
  'media deletion request function exists'
);

select is(
  (select public from storage.buckets where id = 'media'),
  true,
  'media bucket is public for URL-based reads'
);
select is(
  (select file_size_limit from storage.buckets where id = 'media'),
  10485760::bigint,
  'media bucket limits source files to 10 MiB'
);
select is(
  (
    select allowed_mime_types
    from storage.buckets
    where id = 'media'
  ),
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[],
  'media bucket has an exact launch MIME allowlist'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.media_assets'::regclass),
  'media assets has RLS enabled'
);
select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.media_asset_references'::regclass
  ),
  'media references has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.media_assets', 'select'),
  'anonymous visitors cannot read media metadata'
);
select ok(
  not has_table_privilege('authenticated', 'public.media_assets', 'insert, update, delete'),
  'authenticated callers cannot mutate media metadata directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.begin_media_upload(text,text,bigint,text,text,uuid)',
    'execute'
  ),
  'anonymous visitors cannot prepare uploads'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$
    select public.begin_media_upload(
      'jpg',
      'image/jpeg',
      1024,
      'A denied image',
      null,
      gen_random_uuid()
    )
  $$,
  '42501',
  'media_not_authorized',
  'an unbound signed-in user cannot prepare an upload'
);

reset role;

insert into public.admin_accounts (
  id,
  email,
  auth_user_id,
  bound_at
)
values (
  '83000000-0000-4000-8000-000000000001',
  'admin@ya-gameela.test',
  '10000000-0000-4000-8000-000000000001',
  pg_catalog.clock_timestamp()
);

create temporary table media_test_state (
  label text primary key,
  media_id uuid not null,
  object_path text not null
) on commit drop;

grant select, insert on table media_test_state to authenticated;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$
    select public.begin_media_upload(
      'svg',
      'image/svg+xml',
      1024,
      'Unsafe SVG',
      null,
      gen_random_uuid()
    )
  $$,
  '22023',
  'media_type_invalid',
  'SVG uploads are rejected'
);

select throws_ok(
  $$
    select public.begin_media_upload(
      'jpg',
      'text/html',
      1024,
      'Spoofed HTML',
      null,
      gen_random_uuid()
    )
  $$,
  '22023',
  'media_type_invalid',
  'extension and declared MIME must match'
);

select throws_ok(
  $$
    select public.begin_media_upload(
      'png',
      'image/png',
      10485761,
      'Oversized image',
      null,
      gen_random_uuid()
    )
  $$,
  '22023',
  'media_size_invalid',
  'an oversized source is rejected before upload'
);

select throws_ok(
  $$
    select public.begin_media_upload(
      'png',
      'image/png',
      1024,
      '   ',
      null,
      gen_random_uuid()
    )
  $$,
  '22023',
  'media_alt_text_invalid',
  'alternative text is required'
);

insert into media_test_state (label, media_id, object_path)
select 'ready', media_id, object_path
from public.begin_media_upload(
  'jpeg',
  'image/jpeg',
  2048,
  'A perfume bottle on a warm neutral background',
  'Owner-supplied product photograph',
  '84000000-0000-4000-8000-000000000001'
);

select ok(
  (
    select object_path like 'originals/%.jpg'
    from media_test_state
    where label = 'ready'
  ),
  'the database creates a UUID-based normalized object path'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    select
      'media',
      object_path,
      '10000000-0000-4000-8000-000000000001',
      '{"mimetype":"image/jpeg","size":2048}'::jsonb
    from media_test_state
    where label = 'ready'
  $$,
  'the approved admin can upload to a prepared path'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'media',
      'originals/85000000-0000-4000-8000-000000000001.html',
      '10000000-0000-4000-8000-000000000001',
      '{"mimetype":"text/html","size":1024}'::jsonb
    )
  $$,
  '42501',
  null,
  'an unprepared HTML object is denied by Storage RLS'
);

select lives_ok(
  format(
    $$
      select public.finalize_media_upload(
        %L::uuid,
        'image/jpeg',
        1600,
        1200,
        2048,
        repeat('a', 64),
        '84000000-0000-4000-8000-000000000002'
      )
    $$,
    (select media_id from media_test_state where label = 'ready')
  ),
  'verified image metadata can finalize an uploaded object'
);

select is(
  (
    select status::text
    from public.media_assets
    where id = (select media_id from media_test_state where label = 'ready')
  ),
  'ready',
  'a finalized asset becomes usable'
);

select lives_ok(
  format(
    $$
      select public.update_media_metadata(
        %L::uuid,
        'Updated useful alternative text',
        null,
        '84000000-0000-4000-8000-000000000003'
      )
    $$,
    (select media_id from media_test_state where label = 'ready')
  ),
  'the admin can update ready media metadata'
);

reset role;

insert into public.media_asset_references (
  media_asset_id,
  reference_type,
  reference_id
)
select
  media_id,
  'product_version',
  '86000000-0000-4000-8000-000000000001'
from media_test_state
where label = 'ready';

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  format(
    $$
      select public.request_media_deletion(
        %L::uuid,
        '84000000-0000-4000-8000-000000000004'
      )
    $$,
    (select media_id from media_test_state where label = 'ready')
  ),
  '23503',
  'media_still_referenced',
  'referenced media cannot be deleted'
);

reset role;

delete from public.media_asset_references
where media_asset_id = (select media_id from media_test_state where label = 'ready');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  format(
    $$
      select public.request_media_deletion(
        %L::uuid,
        '84000000-0000-4000-8000-000000000005'
      )
    $$,
    (select media_id from media_test_state where label = 'ready')
  ),
  'unreferenced media can enter the protected deletion state'
);

select ok(
  (
    select qual like '%status = ''deleting''%'
      and qual like '%media_asset_references%'
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'media_objects_delete_admin_approved'
  ),
  'Storage deletion policy requires an approved unreferenced deletion state'
);

select lives_ok(
  format(
    $$
      select public.complete_media_deletion(
        %L::uuid,
        '84000000-0000-4000-8000-000000000006'
      )
    $$,
    (select media_id from media_test_state where label = 'ready')
  ),
  'metadata deletion completes after object removal'
);

select is(
  (
    select count(*)
    from public.media_assets
    where id = (select media_id from media_test_state where label = 'ready')
  ),
  0::bigint,
  'completed deletion removes the metadata row'
);

insert into media_test_state (label, media_id, object_path)
select 'orphan', media_id, object_path
from public.begin_media_upload(
  'png',
  'image/png',
  4096,
  'An unfinished upload',
  null,
  '84000000-0000-4000-8000-000000000007'
);

reset role;

update public.media_assets
set created_at = pg_catalog.now() - interval '2 hours'
where id = (select media_id from media_test_state where label = 'orphan');

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select is(
  (
    select issue_code
    from public.media_asset_health
    where media_asset_id = (
      select media_id from media_test_state where label = 'orphan'
    )
  ),
  'pending_without_object',
  'an abandoned pending upload appears in the orphan report'
);

select lives_ok(
  format(
    $$
      select public.request_media_deletion(
        %L::uuid,
        '84000000-0000-4000-8000-000000000008'
      )
    $$,
    (select media_id from media_test_state where label = 'orphan')
  ),
  'an unreferenced abandoned upload can enter cleanup safely'
);

select lives_ok(
  format(
    $$
      select public.complete_media_deletion(
        %L::uuid,
        '84000000-0000-4000-8000-000000000009'
      )
    $$,
    (select media_id from media_test_state where label = 'orphan')
  ),
  'abandoned upload metadata can be removed after Storage cleanup'
);

select ok(
  (
    select count(*)
    from public.admin_audit_events
    where subject_type = 'media_asset'
  ) >= 6,
  'critical media mutations are audited without file content'
);

reset role;

select * from finish();

rollback;

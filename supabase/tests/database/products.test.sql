begin;

set local search_path = public, extensions;

delete from public.admin_accounts;

select no_plan();

select has_table('public', 'products', 'products exists');
select has_table('public', 'product_versions', 'product versions exists');
select has_table('public', 'product_variants', 'stable product variants exist');
select has_table('public', 'product_variant_versions', 'variant versions exist');
select has_table('public', 'product_option_groups', 'option groups exist');
select has_table('public', 'product_option_values', 'option values exist');
select has_table('public', 'product_variant_option_values', 'variant option mappings exist');
select has_table('public', 'product_media', 'ordered product media exists');
select has_table('public', 'product_related_products', 'related products exist');

select has_function(
  'public',
  'create_product_draft',
  array[
    'text', 'text', 'uuid', 'text', 'text', 'text[]', 'jsonb', 'boolean',
    'boolean', 'text', 'text', 'uuid', 'text', 'jsonb', 'jsonb', 'uuid[]',
    'uuid[]', 'uuid'
  ],
  'product creation function exists'
);
select has_function(
  'public',
  'update_product_draft',
  array[
    'uuid', 'bigint', 'text', 'text', 'uuid', 'text', 'text', 'text[]',
    'jsonb', 'boolean', 'boolean', 'text', 'text', 'uuid', 'text', 'jsonb',
    'jsonb', 'uuid[]', 'uuid[]', 'uuid'
  ],
  'product update function exists'
);
select has_function(
  'public',
  'archive_product',
  array['uuid', 'bigint', 'uuid'],
  'product archive function exists'
);
select has_function(
  'public',
  'restore_product',
  array['uuid', 'bigint', 'uuid'],
  'product restore function exists'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.products'::regclass),
  'products has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.product_versions'::regclass),
  'product versions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.product_variant_versions'::regclass),
  'variant versions has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.products', 'select'),
  'anonymous users cannot read product identities'
);
select ok(
  not has_table_privilege('anon', 'public.product_versions', 'select'),
  'anonymous users cannot read product drafts'
);
select ok(
  not has_table_privilege('authenticated', 'public.products', 'insert, update, delete'),
  'authenticated callers cannot mutate products directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.product_variant_versions', 'insert, update, delete'),
  'authenticated callers cannot mutate variant versions directly'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_product_draft(text,text,uuid,text,text,text[],jsonb,boolean,boolean,text,text,uuid,text,jsonb,jsonb,uuid[],uuid[],uuid)',
    'execute'
  ),
  'authenticated callers can reach the guarded product function'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_product_draft(text,text,uuid,text,text,text[],jsonb,boolean,boolean,text,text,uuid,text,jsonb,jsonb,uuid[],uuid[],uuid)',
    'execute'
  ),
  'anonymous callers cannot reach product creation'
);

insert into public.media_assets (
  id,
  object_path,
  original_extension,
  status,
  mime_type,
  width,
  height,
  byte_size,
  checksum_sha256,
  alt_text,
  created_by,
  updated_by,
  created_at,
  updated_at,
  verified_at
)
values
  (
    '81000000-0000-4000-8000-000000000001',
    'originals/81000000-0000-4000-8000-000000000001.jpg',
    'jpg',
    'ready',
    'image/jpeg',
    1200,
    1200,
    4096,
    repeat('a', 64),
    'A test perfume bottle',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    'originals/81000000-0000-4000-8000-000000000002.jpg',
    'jpg',
    'pending',
    null,
    null,
    null,
    null,
    null,
    'A pending test photograph',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    null
  );

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';

select is((select count(*) from public.products), 0::bigint, 'an unbound user cannot read drafts');
select throws_ok(
  $$
    select public.create_product_draft(
      'Denied product',
      'denied-product',
      '71000000-0000-4000-8000-000000000001',
      'Denied summary',
      'Denied description',
      '{}'::text[],
      '{"volume":50}'::jsonb,
      false,
      false,
      null,
      null,
      null,
      'AED',
      '[]'::jsonb,
      '[{"id":null,"sku":null,"priceMinor":"1000","availability":"available","optionValues":{}}]'::jsonb,
      array['81000000-0000-4000-8000-000000000001']::uuid[],
      '{}'::uuid[],
      gen_random_uuid()
    )
  $$,
  '42501',
  'product_not_authorized',
  'an unbound user cannot create products'
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

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$
    select public.create_product_draft(
      'Rose Test Eau de Parfum',
      'rose-test-eau-de-parfum',
      '71000000-0000-4000-8000-000000000001',
      'A floral test fragrance.',
      'A complete test fragrance used only by database checks.',
      array['floral', 'gift-ready'],
      '{"fragrance_family":"floral","volume":50}'::jsonb,
      true,
      true,
      'Rose Test Eau de Parfum',
      'A floral test fragrance for product database checks.',
      '81000000-0000-4000-8000-000000000001',
      'AED',
      '[{"key":"volume","name":"Volume","values":[{"key":"50ml","label":"50 ml"},{"key":"100ml","label":"100 ml"}]},{"key":"color","name":"Bottle color","values":[{"key":"pink","label":"Pink"}]}]'::jsonb,
      '[{"id":null,"sku":"ROSE-50-PINK","priceMinor":"12500","availability":"available","optionValues":{"volume":"50ml","color":"pink"}},{"id":null,"sku":"ROSE-100-PINK","priceMinor":"18500","availability":"low_stock","optionValues":{"volume":"100ml","color":"pink"}}]'::jsonb,
      array['81000000-0000-4000-8000-000000000001']::uuid[],
      '{}'::uuid[],
      '84000000-0000-4000-8000-000000000001'
    )
  $$,
  'an administrator can create a complete product draft'
);

select is((select count(*) from public.products), 1::bigint, 'one stable product identity is created');
select is((select count(*) from public.product_versions), 1::bigint, 'one immutable product version is created');
select is((select count(*) from public.product_variants), 2::bigint, 'two stable variant identities are created');
select is((select count(*) from public.product_variant_versions), 2::bigint, 'two variant snapshots are created');
select is((select count(*) from public.product_option_groups), 2::bigint, 'two relational option groups are created');
select is((select count(*) from public.product_option_values), 3::bigint, 'three relational option values are created');
select is((select count(*) from public.product_variant_option_values), 4::bigint, 'each variant maps one value from every group');
select is((select count(*) from public.product_media), 1::bigint, 'gallery order is stored relationally');
select is(
  (select count(*) from public.media_asset_references where reference_type = 'product_version'),
  1::bigint,
  'gallery and SEO media create one deduplicated immutable reference'
);
select is(
  (
    select price_minor
    from public.product_variant_versions
    where sku = 'ROSE-50-PINK'
  ),
  12500::bigint,
  'authoritative price is stored in integer minor units'
);
select is(
  (
    select currency
    from public.product_variant_versions
    where sku = 'ROSE-50-PINK'
  ),
  'AED',
  'variant price records the draft base currency'
);

select throws_ok(
  $$
    select public.create_product_draft(
      'Missing required specification',
      'missing-required-specification',
      '71000000-0000-4000-8000-000000000001',
      'Missing volume.',
      'This product intentionally omits a required category field.',
      '{}'::text[],
      '{}'::jsonb,
      false,
      false,
      null,
      null,
      null,
      'AED',
      '[]'::jsonb,
      '[{"id":null,"sku":null,"priceMinor":"1000","availability":"available","optionValues":{}}]'::jsonb,
      array['81000000-0000-4000-8000-000000000001']::uuid[],
      '{}'::uuid[],
      gen_random_uuid()
    )
  $$,
  'P0001',
  'product_specifications_invalid',
  'required category specifications are enforced by the database'
);

select throws_ok(
  $$
    select public.create_product_draft(
      'Duplicate combinations',
      'duplicate-combinations',
      '71000000-0000-4000-8000-000000000001',
      'Duplicate combinations.',
      'This product intentionally repeats one variant combination.',
      '{}'::text[],
      '{"volume":50}'::jsonb,
      false,
      false,
      null,
      null,
      null,
      'AED',
      '[{"key":"volume","name":"Volume","values":[{"key":"50ml","label":"50 ml"}]}]'::jsonb,
      '[{"id":null,"sku":null,"priceMinor":"1000","availability":"available","optionValues":{"volume":"50ml"}},{"id":null,"sku":null,"priceMinor":"1100","availability":"available","optionValues":{"volume":"50ml"}}]'::jsonb,
      array['81000000-0000-4000-8000-000000000001']::uuid[],
      '{}'::uuid[],
      gen_random_uuid()
    )
  $$,
  'P0001',
  'product_variant_combination_duplicate',
  'duplicate variant combinations are rejected'
);

select throws_ok(
  $$
    select public.create_product_draft(
      'Pending media product',
      'pending-media-product',
      '71000000-0000-4000-8000-000000000001',
      'Pending media.',
      'This product intentionally references unverified media.',
      '{}'::text[],
      '{"volume":50}'::jsonb,
      false,
      false,
      null,
      null,
      null,
      'AED',
      '[]'::jsonb,
      '[{"id":null,"sku":null,"priceMinor":"1000","availability":"available","optionValues":{}}]'::jsonb,
      array['81000000-0000-4000-8000-000000000002']::uuid[],
      '{}'::uuid[],
      gen_random_uuid()
    )
  $$,
  'P0001',
  'product_media_invalid',
  'only verified media can be attached to products'
);

select throws_ok(
  $$
    select public.create_product_draft(
      'Duplicate SKU product',
      'duplicate-sku-product',
      '71000000-0000-4000-8000-000000000001',
      'Duplicate SKU.',
      'This product intentionally attempts to reuse a claimed SKU.',
      '{}'::text[],
      '{"volume":50}'::jsonb,
      false,
      false,
      null,
      null,
      null,
      'AED',
      '[]'::jsonb,
      '[{"id":null,"sku":"rose-50-pink","priceMinor":"1000","availability":"available","optionValues":{}}]'::jsonb,
      array['81000000-0000-4000-8000-000000000001']::uuid[],
      '{}'::uuid[],
      gen_random_uuid()
    )
  $$,
  'P0001',
  'product_sku_conflict',
  'SKU uniqueness is case insensitive across products'
);

select lives_ok(
  $$
    select public.create_product_draft(
      'Canvas Test Bag',
      'canvas-test-bag',
      '71000000-0000-4000-8000-000000000002',
      'A simple test bag.',
      'A related product used only by database checks.',
      array['canvas'],
      '{"material":"canvas","color":["neutral"]}'::jsonb,
      false,
      false,
      null,
      null,
      null,
      'AED',
      '[]'::jsonb,
      '[{"id":null,"sku":null,"priceMinor":"9500","availability":"coming_soon","optionValues":{}}]'::jsonb,
      array['81000000-0000-4000-8000-000000000001']::uuid[],
      '{}'::uuid[],
      '84000000-0000-4000-8000-000000000002'
    )
  $$,
  'a product without option groups has one default variant'
);

select throws_ok(
  $$
    select public.update_product_draft(
      (select product_id from public.product_slug_claims where slug = 'rose-test-eau-de-parfum'),
      1,
      'Rose Test Eau de Parfum',
      'rose-test-eau-de-parfum',
      '71000000-0000-4000-8000-000000000001',
      'A floral test fragrance.',
      'A complete test fragrance used only by database checks.',
      array['floral'],
      '{"fragrance_family":"floral","volume":50}'::jsonb,
      true,
      true,
      null,
      null,
      null,
      'AED',
      '[]'::jsonb,
      '[{"id":null,"sku":null,"priceMinor":"12500","availability":"available","optionValues":{}}]'::jsonb,
      array['81000000-0000-4000-8000-000000000001']::uuid[],
      array[(select product_id from public.product_slug_claims where slug = 'rose-test-eau-de-parfum')]::uuid[],
      gen_random_uuid()
    )
  $$,
  'P0001',
  'product_relations_invalid',
  'a product cannot relate to itself'
);

select lives_ok(
  $$
    select public.update_product_draft(
      (select product_id from public.product_slug_claims where slug = 'rose-test-eau-de-parfum'),
      1,
      'Rose Test Eau de Parfum Updated',
      'rose-test-eau-de-parfum',
      '71000000-0000-4000-8000-000000000001',
      'An updated floral test fragrance.',
      'The second immutable product draft used by database checks.',
      array['floral'],
      '{"fragrance_family":"floral","volume":50}'::jsonb,
      true,
      false,
      null,
      null,
      null,
      'AED',
      '[{"key":"volume","name":"Volume","values":[{"key":"50ml","label":"50 ml"}]}]'::jsonb,
      jsonb_build_array(
        jsonb_build_object(
          'id', (
            select product_variant_id::text
            from public.product_variant_versions
            where sku = 'ROSE-50-PINK'
          ),
          'sku', 'ROSE-50-PINK',
          'priceMinor', '13000',
          'availability', 'available',
          'optionValues', jsonb_build_object('volume', '50ml')
        )
      ),
      array['81000000-0000-4000-8000-000000000001']::uuid[],
      array[(select product_id from public.product_slug_claims where slug = 'canvas-test-bag')]::uuid[],
      '84000000-0000-4000-8000-000000000003'
    )
  $$,
  'an update appends a complete immutable draft using a stable variant identity'
);

select is(
  (
    select draft_revision
    from public.products
    where id = (select product_id from public.product_slug_claims where slug = 'rose-test-eau-de-parfum')
  ),
  2::bigint,
  'updating advances the optimistic draft revision'
);
select is(
  (
    select count(*)
    from public.product_versions
    where product_id = (select product_id from public.product_slug_claims where slug = 'rose-test-eau-de-parfum')
  ),
  2::bigint,
  'the previous product version remains immutable'
);
select is(
  (
    select count(distinct product_variant_id)
    from public.product_variant_versions
    where sku = 'ROSE-50-PINK'
  ),
  1::bigint,
  'the same stable variant identity survives draft updates'
);
select is((select count(*) from public.product_related_products), 1::bigint, 'related products are stored in order');

select throws_ok(
  $$
    select public.update_product_draft(
      (select product_id from public.product_slug_claims where slug = 'rose-test-eau-de-parfum'),
      1,
      'Stale product',
      'rose-test-eau-de-parfum',
      '71000000-0000-4000-8000-000000000001',
      'Stale summary.',
      'This update intentionally uses an old revision.',
      '{}'::text[],
      '{"volume":50}'::jsonb,
      false,
      false,
      null,
      null,
      null,
      'AED',
      '[]'::jsonb,
      '[{"id":null,"sku":null,"priceMinor":"1000","availability":"available","optionValues":{}}]'::jsonb,
      array['81000000-0000-4000-8000-000000000001']::uuid[],
      '{}'::uuid[],
      gen_random_uuid()
    )
  $$,
  'P0001',
  'product_stale_revision',
  'stale product edits are rejected'
);

select throws_ok(
  $$
    select public.archive_category(
      '71000000-0000-4000-8000-000000000001',
      1,
      gen_random_uuid()
    )
  $$,
  'P0001',
  'category_has_products',
  'an active product prevents category archival'
);

select lives_ok(
  $$
    select public.archive_product(
      (select product_id from public.product_slug_claims where slug = 'rose-test-eau-de-parfum'),
      2,
      '84000000-0000-4000-8000-000000000004'
    )
  $$,
  'a product can be archived without deleting its versions'
);
select throws_ok(
  $$
    select public.update_product_draft(
      (select product_id from public.product_slug_claims where slug = 'rose-test-eau-de-parfum'),
      3,
      'Archived product',
      'rose-test-eau-de-parfum',
      '71000000-0000-4000-8000-000000000001',
      'Archived summary.',
      'Archived products cannot be edited.',
      '{}'::text[],
      '{"volume":50}'::jsonb,
      false,
      false,
      null,
      null,
      null,
      'AED',
      '[]'::jsonb,
      '[{"id":null,"sku":null,"priceMinor":"1000","availability":"available","optionValues":{}}]'::jsonb,
      array['81000000-0000-4000-8000-000000000001']::uuid[],
      '{}'::uuid[],
      gen_random_uuid()
    )
  $$,
  'P0001',
  'product_archived',
  'archived products cannot be edited'
);
select lives_ok(
  $$
    select public.restore_product(
      (select product_id from public.product_slug_claims where slug = 'rose-test-eau-de-parfum'),
      3,
      '84000000-0000-4000-8000-000000000005'
    )
  $$,
  'an archived product can be restored while its category is active'
);

select is(
  (
    select count(*)
    from public.admin_audit_events
    where subject_type = 'product'
      and subject_id = (select product_id from public.product_slug_claims where slug = 'rose-test-eau-de-parfum')
      and action in ('product.create', 'product.update', 'product.archive', 'product.restore')
  ),
  4::bigint,
  'product lifecycle mutations create append-only audit events'
);

select * from finish();

rollback;
